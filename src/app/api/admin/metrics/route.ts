import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    // Получаем метрики системы
    const [
      totalUsers,
      activeTransactions,
      totalStaked,
      totalLent,
      totalBridged,
      recentTransactions
    ] = await Promise.all([
      // Общее количество пользователей
      prisma.user.count(),
      
      // Активные транзакции (за последние 24 часа)
      prisma.transaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          status: 'PENDING'
        }
      }),
      
      // Общая сумма в стейкинге
      prisma.userStake.aggregate({
        _sum: {
          amount: true
        }
      }),
      
      // Общая сумма в lending
      prisma.userLendingPosition.aggregate({
        _sum: {
          suppliedAmount: true
        }
      }),
      
      // Общая сумма в bridge (если есть таблица)
      prisma.bridgeTransaction.count().catch(() => 0),
      
      // Последние транзакции для расчета среднего времени
      prisma.transaction.findMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: {
            not: null
          }
        },
        take: 100,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true,
          confirmedAt: true
        }
      })
    ])

    // Рассчитываем TVL (Total Value Locked)
    const stakedValue = Number(totalStaked._sum.amount || 0) * 0.5 // TNG price mock
    const lentValue = Number(totalLent._sum.suppliedAmount || 0) * 1 // USDC price
    const totalTVL = stakedValue + lentValue

    // Рассчитываем среднее время отклика
    const avgResponseTime = recentTransactions.length > 0
      ? recentTransactions.reduce((acc, tx) => {
          if (tx.confirmedAt) {
            const diff = tx.confirmedAt.getTime() - tx.createdAt.getTime()
            return acc + diff
          }
          return acc
        }, 0) / recentTransactions.length
      : 0

    // Время работы системы (mock - можно заменить на реальные данные)
    const systemUptime = '99.9%'

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalTVL: Math.round(totalTVL),
        activeTransactions,
        systemUptime,
        avgResponseTime: Math.round(avgResponseTime),
        breakdown: {
          staking: {
            totalStaked: Number(totalStaked._sum.amount || 0),
            totalValue: stakedValue
          },
          lending: {
            totalSupplied: Number(totalLent._sum.suppliedAmount || 0),
            totalValue: lentValue
          },
          bridge: {
            totalTransactions: totalBridged
          }
        }
      }
    })
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения метрик системы'
    }, { status: 500 })
  }
})
