import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface BalanceRequest {
  userId: string
  token: string
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { requests } = await request.json() as { requests: BalanceRequest[] }

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Список запросов не может быть пустым'
      }, { status: 400 })
    }

    // Ограничиваем количество запросов в одном батче
    if (requests.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Слишком много запросов в одном батче (максимум 50)'
      }, { status: 400 })
    }

    // Получаем уникальные пары userId-token
    const uniqueRequests = requests.filter((request, index, self) => 
      index === self.findIndex(r => r.userId === request.userId && r.token === request.token)
    )

    // Группируем запросы по пользователям для оптимизации
    const userTokenMap = new Map<string, string[]>()
    
    uniqueRequests.forEach(({ userId, token }) => {
      if (!userTokenMap.has(userId)) {
        userTokenMap.set(userId, [])
      }
      userTokenMap.get(userId)!.push(token.toUpperCase())
    })

    // Получаем балансы из базы данных
    const balancePromises = Array.from(userTokenMap.entries()).map(async ([userId, tokens]) => {
      try {
        const balances = await prisma.balance.findMany({
          where: {
            userId: userId,
            assetId: {
              in: tokens
            }
          },
          select: {
            assetId: true,
            availableAmount: true
          }
        })

        // Создаем карту балансов для этого пользователя
        const userBalanceMap = new Map<string, number>()
        balances.forEach(balance => {
          userBalanceMap.set(balance.assetId, Number(balance.availableAmount))
        })

        // Добавляем нулевые балансы для отсутствующих токенов
        tokens.forEach(token => {
          if (!userBalanceMap.has(token)) {
            userBalanceMap.set(token, 0)
          }
        })

        return { userId, balances: userBalanceMap }
      } catch (error) {
        console.error(`Error fetching balances for user ${userId}:`, error)
        // Возвращаем нулевые балансы в случае ошибки
        const errorBalanceMap = new Map<string, number>()
        tokens.forEach(token => errorBalanceMap.set(token, 0))
        return { userId, balances: errorBalanceMap }
      }
    })

    const userBalanceResults = await Promise.all(balancePromises)

    // Создаем итоговый массив балансов в том же порядке, что и запросы
    const balances = requests.map(({ userId, token }) => {
      const userResult = userBalanceResults.find(result => result.userId === userId)
      return userResult?.balances.get(token.toUpperCase()) || 0
    })

    return NextResponse.json({
      success: true,
      balances,
      count: balances.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Batch balance request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения балансов'
    }, { status: 500 })
  }
})
