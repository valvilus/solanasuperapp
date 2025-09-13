/**
 * Balance Service - User Balance Management for Ledger System
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'
import { UserBalance, LedgerResult } from './types'
import { createLedgerError, LedgerErrorCode } from './errors'
import { AssetService } from './asset.service'
import { memoryCache } from '@/lib/cache/memory-cache.service'
import { CacheKeys, CacheTags, CacheTTL } from '@/lib/cache/cache-keys'

export class BalanceService {
  private readonly prisma: PrismaClient
  private readonly assetService: AssetService

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.assetService = new AssetService(prisma)
  }

  /**
   * Получает баланс пользователя по конкретному активу
   */
  async getUserBalance(userId: string, assetSymbol: string): Promise<LedgerResult<UserBalance>> {
    try {
      // Получаем информацию об активе
      const assetResult = await this.assetService.getAssetBySymbol(assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      // Ищем существующий баланс
      let balance = await this.prisma.balance.findUnique({
        where: {
          userId_assetId: {
            userId,
            assetId: asset.id
          }
        }
      })

      // Если баланса нет, создаем нулевой
      if (!balance) {
        balance = await this.prisma.balance.create({
          data: {
            userId,
            assetId: asset.id,
            amountCached: 0n,
            lockedAmount: 0n,
            availableAmount: 0n
          }
        })
      }

      const userBalance: UserBalance = {
        userId: balance.userId,
        assetSymbol,
        amountCached: balance.amountCached,
        lockedAmount: balance.lockedAmount,
        availableAmount: balance.availableAmount,
        lastUpdated: balance.lastUpdated,
        syncedAt: balance.syncedAt
      }

      return {
        success: true,
        data: userBalance
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка получения баланса пользователя',
          { userId, assetSymbol, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает все балансы пользователя
   */
  async getUserBalances(userId: string): Promise<LedgerResult<UserBalance[]>> {
    try {
      const balances = await this.prisma.balance.findMany({
        where: { userId },
        include: { asset: true }
      })

      const userBalances = balances.map(balance => ({
        userId: balance.userId,
        assetSymbol: balance.asset.symbol,
        amountCached: balance.amountCached,
        lockedAmount: balance.lockedAmount,
        availableAmount: balance.availableAmount,
        lastUpdated: balance.lastUpdated,
        syncedAt: balance.syncedAt
      }))

      return {
        success: true,
        data: userBalances
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка получения балансов пользователя',
          { userId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Обновляет баланс пользователя (используется внутри транзакций)
   */
  async updateBalanceInTransaction(
    transaction: any,
    userId: string,
    assetId: string,
    deltaAmount: bigint
  ): Promise<void> {
    console.log(' Updating balance in transaction:', {
      userId,
      assetId,
      deltaAmount: deltaAmount.toString()
    })

    // Получаем текущий баланс
    let balance = await transaction.balance.findUnique({
      where: {
        userId_assetId: {
          userId,
          assetId
        }
      }
    })

    console.log(' Current balance found:', balance ? {
      id: balance.id,
      cached: balance.amountCached.toString(),
      available: balance.availableAmount.toString(),
      locked: balance.lockedAmount.toString()
    } : 'NOT_FOUND')

    // Если баланса нет, создаем
    if (!balance) {
      balance = await transaction.balance.create({
        data: {
          userId,
          assetId,
          amountCached: 0n,
          lockedAmount: 0n,
          availableAmount: 0n
        }
      })
    }

    // Вычисляем новый баланс
    const newAmountCached = balance.amountCached + deltaAmount
    const newAvailableAmount = newAmountCached - balance.lockedAmount

    // Проверяем что баланс не становится отрицательным
    if (newAmountCached < 0n) {
      throw new Error(`Balance would become negative: ${newAmountCached}`)
    }

    // Обновляем баланс
    const updatedBalance = await transaction.balance.update({
      where: { id: balance.id },
      data: {
        amountCached: newAmountCached,
        availableAmount: newAvailableAmount,
        lastUpdated: new Date()
      }
    })

    console.log(' Balance updated:', {
      id: updatedBalance.id,
      oldCached: balance.amountCached.toString(),
      newCached: updatedBalance.amountCached.toString(),
      oldAvailable: balance.availableAmount.toString(),
      newAvailable: updatedBalance.availableAmount.toString(),
      delta: deltaAmount.toString()
    })

    // Инвалидируем кэш балансов для пользователя
    this.invalidateUserBalanceCache(userId)
  }

  /**
   * Инвалидирует кэш балансов пользователя
   */
  private invalidateUserBalanceCache(userId: string): void {
    // Инвалидируем все балансы пользователя
    memoryCache.invalidateByTag(CacheTags.USER_BALANCE(userId))
    console.log(` Invalidated balance cache for user: ${userId}`)
  }

  /**
   * Блокирует средства (увеличивает lockedAmount)
   */
  async lockBalance(
    userId: string,
    assetSymbol: string,
    amount: bigint
  ): Promise<LedgerResult<UserBalance>> {
    try {
      const assetResult = await this.assetService.getAssetBySymbol(assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      const result = await this.prisma.$transaction(async (tx) => {
        let balance = await tx.balance.findUnique({
          where: {
            userId_assetId: {
              userId,
              assetId: asset.id
            }
          }
        })

        if (!balance) {
          balance = await tx.balance.create({
            data: {
              userId,
              assetId: asset.id,
              amountCached: 0n,
              lockedAmount: 0n,
              availableAmount: 0n
            }
          })
        }

        // Проверяем что достаточно доступных средств
        if (balance.availableAmount < amount) {
          throw new Error('Insufficient available balance')
        }

        // Увеличиваем заблокированную сумму
        const newLockedAmount = balance.lockedAmount + amount
        const newAvailableAmount = balance.amountCached - newLockedAmount

        return await tx.balance.update({
          where: { id: balance.id },
          data: {
            lockedAmount: newLockedAmount,
            availableAmount: newAvailableAmount,
            lastUpdated: new Date()
          }
        })
      })

      const userBalance: UserBalance = {
        userId: result.userId,
        assetSymbol,
        amountCached: result.amountCached,
        lockedAmount: result.lockedAmount,
        availableAmount: result.availableAmount,
        lastUpdated: result.lastUpdated,
        syncedAt: result.syncedAt
      }

      return {
        success: true,
        data: userBalance
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INSUFFICIENT_AVAILABLE_BALANCE,
          'Недостаточно доступных средств для блокировки',
          { userId, assetSymbol, amount: amount.toString(), error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Разблокирует средства (уменьшает lockedAmount)
   */
  async unlockBalance(
    userId: string,
    assetSymbol: string,
    amount: bigint
  ): Promise<LedgerResult<UserBalance>> {
    try {
      const assetResult = await this.assetService.getAssetBySymbol(assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      const result = await this.prisma.$transaction(async (tx) => {
        const balance = await tx.balance.findUnique({
          where: {
            userId_assetId: {
              userId,
              assetId: asset.id
            }
          }
        })

        if (!balance) {
          throw new Error('Balance not found')
        }

        // Проверяем что есть заблокированные средства
        if (balance.lockedAmount < amount) {
          throw new Error('Insufficient locked balance')
        }

        // Уменьшаем заблокированную сумму
        const newLockedAmount = balance.lockedAmount - amount
        const newAvailableAmount = balance.amountCached - newLockedAmount

        return await tx.balance.update({
          where: { id: balance.id },
          data: {
            lockedAmount: newLockedAmount,
            availableAmount: newAvailableAmount,
            lastUpdated: new Date()
          }
        })
      })

      const userBalance: UserBalance = {
        userId: result.userId,
        assetSymbol,
        amountCached: result.amountCached,
        lockedAmount: result.lockedAmount,
        availableAmount: result.availableAmount,
        lastUpdated: result.lastUpdated,
        syncedAt: result.syncedAt
      }

      return {
        success: true,
        data: userBalance
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка разблокировки средств',
          { userId, assetSymbol, amount: amount.toString(), error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Пересчитывает баланс пользователя на основе записей в леджере
   */
  async recalculateBalance(userId: string, assetSymbol: string): Promise<LedgerResult<UserBalance>> {
    try {
      const assetResult = await this.assetService.getAssetBySymbol(assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      // Считаем баланс из записей леджера
      const ledgerEntries = await this.prisma.ledgerEntry.findMany({
        where: {
          userId,
          assetId: asset.id,
          status: 'POSTED'
        }
      })

      let calculatedBalance = 0n
      for (const entry of ledgerEntries) {
        if (entry.direction === 'CREDIT') {
          calculatedBalance += entry.amount
        } else {
          calculatedBalance -= entry.amount
        }
      }

      // Получаем текущие holds
      const holds = await this.prisma.hold.findMany({
        where: {
          userId,
          assetId: asset.id,
          status: 'ACTIVE'
        }
      })

      const totalLocked = holds.reduce((sum, hold) => sum + hold.amount, 0n)
      const availableAmount = calculatedBalance - totalLocked

      // Обновляем баланс
      const updatedBalance = await this.prisma.balance.upsert({
        where: {
          userId_assetId: {
            userId,
            assetId: asset.id
          }
        },
        update: {
          amountCached: calculatedBalance,
          lockedAmount: totalLocked,
          availableAmount: availableAmount,
          lastUpdated: new Date(),
          syncedAt: new Date()
        },
        create: {
          userId,
          assetId: asset.id,
          amountCached: calculatedBalance,
          lockedAmount: totalLocked,
          availableAmount: availableAmount,
          syncedAt: new Date()
        }
      })

      const userBalance: UserBalance = {
        userId: updatedBalance.userId,
        assetSymbol,
        amountCached: updatedBalance.amountCached,
        lockedAmount: updatedBalance.lockedAmount,
        availableAmount: updatedBalance.availableAmount,
        lastUpdated: updatedBalance.lastUpdated,
        syncedAt: updatedBalance.syncedAt
      }

      return {
        success: true,
        data: userBalance
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка пересчета баланса',
          { userId, assetSymbol, error: error instanceof Error ? error.message : String(error) }
        ) as any
      }
    }
  }
}

