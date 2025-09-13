/**
 * TNG Balance API - Получение баланса TNG токенов
 * GET /api/wallet/tng-balance
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting TNG balance...')

    const userId = auth.userId

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletAddress: true,
        courses: {
          select: {
            totalTokensEarned: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Считаем заработанные токены из курсов
    const totalEarned = (user as any).courses.reduce((sum, uc) => 
      sum + Number(uc.totalTokensEarned || 0), 0
    )

    let blockchainBalance = 0
    let balanceStatus = 'unknown'

    // Пытаемся получить реальный баланс с блокчейна
    if (user.walletAddress) {
      try {
        const { TNGTokenService } = await import('@/lib/onchain/tng-token.service')
        const { PublicKey, Connection, clusterApiUrl } = await import('@solana/web3.js')
        
        const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl('devnet')
        const connection = new Connection(endpoint, 'confirmed')
        const tngService = new TNGTokenService(connection)
        const userPublicKey = new PublicKey(user.walletAddress)
        
        const balanceResult = await tngService.getTNGBalance(userPublicKey)
        
        if (balanceResult.success && balanceResult.data) {
          blockchainBalance = Number(balanceResult.data.balance ? Number(balanceResult.data.balance) / 1e9 : 0)
          balanceStatus = 'synced'
        } else {
          balanceStatus = 'error'
          console.warn('Failed to get blockchain balance:', balanceResult.error)
        }
      } catch (error) {
        console.error('Error getting blockchain balance:', error)
        balanceStatus = 'error'
      }
    } else {
      balanceStatus = 'no_wallet'
    }

    // Расчет статистик
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const todayEarned = 0 // TODO: Получать из транзакций за сегодня
    const weekEarned = 0  // TODO: Получать из транзакций за неделю

    // Определяем тренд
    let trend = 'stable'
    if (blockchainBalance > totalEarned) {
      trend = 'up'
    } else if (blockchainBalance < totalEarned) {
      trend = 'down'
    }

    const response = {
      success: true,
      data: {
        // Основные балансы
        totalEarned,           // Заработано в системе
        blockchainBalance,     // Реальный баланс на блокчейне
        availableBalance: Math.max(totalEarned, blockchainBalance), // Доступный баланс
        
        // Метаданные
        balanceStatus,         // Статус синхронизации
        trend,                 // Тренд изменения
        lastUpdated: new Date().toISOString(),
        
        // Статистики
        stats: {
          todayEarned,
          weekEarned,
          totalTransactions: 0, // TODO: Подсчет транзакций
        },
        
        // Кошелек
        wallet: {
          address: user.walletAddress,
          hasWallet: !!user.walletAddress
        }
      }
    }

    console.log(' TNG balance retrieved:', { 
      userId, 
      totalEarned,
      blockchainBalance,
      status: balanceStatus
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error(' Error getting TNG balance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения баланса TNG',
        code: 'BALANCE_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

