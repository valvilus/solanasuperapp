/**
 * Sponsor System API - Fee Sponsorship Management
 * GET /api/onchain/sponsor
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { CustodialWalletService } from '@/lib/wallet'
import { SponsorOperation } from '@/lib/wallet/sponsor.service'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/onchain/sponsor - получить статистику sponsor системы
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting sponsor system status...')

    const userId = auth.userId

    // Создаем сервис кошельков
    const walletService = new CustodialWalletService(prisma)

    // Получаем статистику sponsor системы
    const sponsorStats = await walletService.getSponsorStats()

    if (!sponsorStats) {
      return NextResponse.json(
        { error: 'Sponsor система недоступна', code: 'SPONSOR_UNAVAILABLE' },
        { status: 503 }
      )
    }

    // Проверяем доступность каждой операции для пользователя
    const operationAvailability = {
      solTransfer: await walletService.canSponsorTransaction(userId, SponsorOperation.SOL_TRANSFER),
      tngTransfer: await walletService.canSponsorTransaction(userId, SponsorOperation.SPL_TRANSFER),
      tokenAccountCreation: await walletService.canSponsorTransaction(userId, SponsorOperation.TOKEN_ACCOUNT_CREATION)
    }

    // Рассчитываем оставшиеся лимиты
    const dailyBudgetRemaining = Math.max(0, 
      parseFloat(process.env.MVP_DAILY_BUDGET || '0.01') - sponsorStats.dailySpent
    )
    
    const totalBudgetRemaining = Math.max(0,
      parseFloat(process.env.MVP_TOTAL_BUDGET || '0.05') - sponsorStats.totalSponsored
    )

    return NextResponse.json({
      success: true,
      data: {
        sponsorStats: {
          totalSponsored: sponsorStats.totalSponsored,
          dailySpent: sponsorStats.dailySpent,
          transactionsCount: sponsorStats.transactionsCount,
          dailyTransactions: sponsorStats.dailyTransactions,
          remainingBudget: sponsorStats.remainingBudget,
          lastReset: sponsorStats.lastReset
        },
        budget: {
          dailyBudget: parseFloat(process.env.MVP_DAILY_BUDGET || '0.01'),
          dailyBudgetRemaining,
          totalBudget: parseFloat(process.env.MVP_TOTAL_BUDGET || '0.05'),
          totalBudgetRemaining,
          userDailyLimit: parseInt(process.env.MVP_USER_DAILY_LIMIT || '20')
        },
        availability: operationAvailability,
        sponsorAddress: process.env.SPONSOR_PUBLIC_KEY,
        config: {
          enabledOperations: ['SOL_TRANSFER', 'SPL_TRANSFER', 'TOKEN_ACCOUNT_CREATION'],
          priorityFees: {
            low: '0.001 SOL',
            medium: '0.002 SOL',
            high: '0.005 SOL'
          }
        }
      },
      message: 'Статистика sponsor системы получена успешно'
    })

  } catch (error) {
    console.error(' Sponsor API error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    )
  }
})

// POST /api/onchain/sponsor - операции управления sponsor системой
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Processing sponsor operation...')

    const userId = auth.userId

    // Парсим тело запроса
    const body = await request.json()
    const { operation, ...params } = body

    console.log(' Sponsor operation:', { operation, userId })

    const walletService = new CustodialWalletService(prisma)

    switch (operation) {
      case 'check_availability':
        {
          // Проверка доступности sponsor для конкретной операции
          const { operationType } = params

          if (!operationType || !Object.values(SponsorOperation).includes(operationType)) {
            return NextResponse.json(
              { error: 'Неверный тип операции', code: 'INVALID_OPERATION_TYPE' },
              { status: 400 }
            )
          }

          const available = await walletService.canSponsorTransaction(userId, operationType)

          return NextResponse.json({
            success: true,
            data: {
              operationType,
              available,
              reason: available ? 'Available' : 'Limits exceeded or insufficient funds'
            },
            message: 'Проверка доступности sponsor выполнена'
          })
        }

      case 'get_balance':
        {
          // Получение баланса sponsor кошелька
          const sponsorStats = await walletService.getSponsorStats()

          if (!sponsorStats) {
            return NextResponse.json(
              { error: 'Sponsor система недоступна', code: 'SPONSOR_UNAVAILABLE' },
              { status: 503 }
            )
          }

          return NextResponse.json({
            success: true,
            data: {
              balance: sponsorStats.remainingBudget,
              address: process.env.SPONSOR_PUBLIC_KEY
            },
            message: 'Баланс sponsor кошелька получен'
          })
        }

      default:
        return NextResponse.json(
          { error: 'Неизвестная операция', code: 'UNKNOWN_OPERATION' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error(' Sponsor operation error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    )
  }
})

