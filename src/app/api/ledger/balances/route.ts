/**
 * Ledger Balances API - User Balance Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { BalanceService } from '@/lib/ledger'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/ledger/balances - получить балансы пользователя
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { searchParams } = new URL(request.url)
    const assetSymbol = searchParams.get('asset')
    const recalculate = searchParams.get('recalculate') === 'true'

    const balanceService = new BalanceService(prisma)

    if (assetSymbol) {
      // Получаем баланс по конкретному активу
      if (!['SOL', 'USDC', 'TNG'].includes(assetSymbol)) {
        return NextResponse.json(
          { error: 'Неверный символ актива' },
          { status: 400 }
        )
      }

      let balanceResult
      if (recalculate) {
        balanceResult = await balanceService.recalculateBalance(auth.userId, assetSymbol)
      } else {
        balanceResult = await balanceService.getUserBalance(auth.userId, assetSymbol)
      }

      if (!balanceResult.success) {
        return NextResponse.json(
          { error: 'Ошибка получения баланса' },
          { status: 500 }
        )
      }

      const balance = balanceResult.data!

      return NextResponse.json({
        success: true,
        data: {
          userId: balance.userId,
          assetSymbol: balance.assetSymbol,
          balance: {
            total: balance.amountCached.toString(),
            locked: balance.lockedAmount.toString(),
            available: balance.availableAmount.toString()
          },
          lastUpdated: balance.lastUpdated,
          syncedAt: balance.syncedAt
        }
      })

    } else {
      // Получаем все балансы пользователя
      const balancesResult = await balanceService.getUserBalances(auth.userId)

      if (!balancesResult.success) {
        return NextResponse.json(
          { error: 'Ошибка получения балансов' },
          { status: 500 }
        )
      }

      const balances = balancesResult.data!

      return NextResponse.json({
        success: true,
        data: {
          userId: auth.userId,
          balances: balances.map(balance => ({
            assetSymbol: balance.assetSymbol,
            balance: {
              total: balance.amountCached.toString(),
              locked: balance.lockedAmount.toString(),
              available: balance.availableAmount.toString()
            },
            lastUpdated: balance.lastUpdated,
            syncedAt: balance.syncedAt
          })),
          totalAssets: balances.length
        }
      })
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
})