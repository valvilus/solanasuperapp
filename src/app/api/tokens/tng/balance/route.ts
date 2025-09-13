/**
 * Optimized TNG Balance API - Production Ready
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TokenBalanceCache from '@/lib/optimized/TokenBalanceCache'

// Глобальный кеш для быстрого доступа
const balanceCache = TokenBalanceCache.getInstance()

// Простой rate limiter - увеличенные лимиты для лучшего UX
const rateLimiter = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 60 // Увеличено для нормального использования (2 запроса/сек)
const RATE_WINDOW = 30 * 1000 // 30 секунд (совпадает с кеш TTL)

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Rate limiting
    const now = Date.now()
    const userLimit = rateLimiter.get(auth.userId)
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          const timeUntilReset = Math.ceil((userLimit.resetTime - now) / 1000)
          return NextResponse.json(
            { error: `Слишком много запросов. Попробуйте через ${timeUntilReset} секунд.` },
            { status: 429 }
          )
        }
        userLimit.count++
      } else {
        userLimit.count = 1
        userLimit.resetTime = now + RATE_WINDOW
      }
    } else {
      rateLimiter.set(auth.userId, { count: 1, resetTime: now + RATE_WINDOW })
    }

    // Получаем кошелек пользователя (быстрый запрос)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { walletAddress: true }
    })

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'У пользователя нет custodial кошелька' },
        { status: 400 }
      )
    }

    // Получаем баланс через оптимизированный кеш
    const balanceResult = await balanceCache.getTNGBalance(user.walletAddress)
    
    return NextResponse.json({
      success: true,
      data: {
        balance: {
          raw: balanceResult.balance,
          amount: balanceResult.balance,
          formatted: (Number(balanceResult.balance) / 1000000000).toFixed(9),
          display: (Number(balanceResult.balance) / 1000000000).toFixed(2) + ' TNG'
        },
        tokenAccount: balanceResult.tokenAccount,
        mint: 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
        timestamp: new Date().toISOString(),
        fromCache: balanceResult.fromCache
      }
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
})