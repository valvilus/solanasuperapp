import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { userIds } = await request.json() as { userIds: string[] }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Список ID пользователей не может быть пустым'
      }, { status: 400 })
    }

    // Ограничиваем количество запросов в одном батче
    if (userIds.length > 100) {
      return NextResponse.json({
        success: false,
        error: 'Слишком много пользователей в одном батче (максимум 100)'
      }, { status: 400 })
    }

    // Получаем уникальные ID
    const uniqueUserIds = [...new Set(userIds)]

    // Получаем данные пользователей из базы данных
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueUserIds
        }
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        isPremium: true,
        photoUrl: true,
        walletAddress: true,
        createdAt: true,
        lastLoginAt: true
      }
    })

    // Создаем карту пользователей для быстрого поиска
    const userMap = new Map(users.map(user => [user.id, user]))

    // Создаем итоговый массив пользователей в том же порядке, что и запросы
    const orderedUsers = userIds.map(userId => userMap.get(userId) || null)

    return NextResponse.json({
      success: true,
      users: orderedUsers,
      count: orderedUsers.length,
      foundCount: users.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Batch user request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения данных пользователей'
    }, { status: 500 })
  }
})
