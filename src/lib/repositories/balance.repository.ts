/**
 * Balance Repository - Data access layer for user balances
 * Solana SuperApp Database Optimization
 */

import { Balance, Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { CacheKeys, CacheTags, CacheTTL } from '@/lib/cache/cache-keys'

export interface BalanceWithAsset extends Balance {
  asset: {
    id: string
    symbol: string
    name: string
    decimals: number
    logoUrl?: string | null
  }
}

export interface UserBalanceSummary {
  userId: string
  totalBalances: number
  totalValueUSD?: number
  balances: BalanceWithAsset[]
}

export class BalanceRepository extends BaseRepository {

  /**
   * Находит баланс пользователя по активу
   */
  async findByUserAndAsset(userId: string, assetId: string): Promise<Balance | null> {
    this.logOperation('findByUserAndAsset', { userId, assetId })

    try {
      const balance = await this.prisma.balance.findUnique({
        where: {
          userId_assetId: {
            userId,
            assetId
          }
        }
      })

      this.logResult('findByUserAndAsset', balance)
      return balance
    } catch (error) {
      this.handleError('findByUserAndAsset', error)
    }
  }

  /**
   * Находит баланс пользователя по символу актива с кэшированием
   */
  async findByUserAndAssetSymbol(userId: string, assetSymbol: string): Promise<BalanceWithAsset | null> {
    this.logOperation('findByUserAndAssetSymbol', { userId, assetSymbol })

    try {
      const balance = await this.cache.getOrSet(
        CacheKeys.USER_BALANCE(userId, assetSymbol),
        async () => {
          return await this.prisma.balance.findFirst({
            where: {
              userId,
              asset: {
                symbol: assetSymbol
              }
            },
            include: {
              asset: {
                select: {
                  id: true,
                  symbol: true,
                  name: true,
                  decimals: true,
                  logoUrl: true
                }
              }
            }
          })
        },
        {
          ttl: CacheTTL.BALANCES,
          tags: [CacheTags.BALANCES, CacheTags.USER_BALANCE(userId)]
        }
      )

      this.logResult('findByUserAndAssetSymbol', balance)
      return balance
    } catch (error) {
      this.handleError('findByUserAndAssetSymbol', error)
    }
  }

  /**
   * Получает все балансы пользователя с кэшированием
   */
  async findAllByUser(userId: string): Promise<BalanceWithAsset[]> {
    this.logOperation('findAllByUser', { userId })

    try {
      const balances = await this.cache.getOrSet(
        CacheKeys.USER_BALANCES(userId),
        async () => {
          return await this.prisma.balance.findMany({
            where: { userId },
            include: {
              asset: {
                select: {
                  id: true,
                  symbol: true,
                  name: true,
                  decimals: true,
                  logoUrl: true
                }
              }
            },
            orderBy: { asset: { symbol: 'asc' } }
          })
        },
        {
          ttl: CacheTTL.BALANCES,
          tags: [CacheTags.BALANCES, CacheTags.USER_BALANCE(userId)]
        }
      )

      this.logResult('findAllByUser', balances)
      return balances
    } catch (error) {
      this.handleError('findAllByUser', error)
    }
  }

  /**
   * Создает новый баланс
   */
  async create(data: Prisma.BalanceCreateInput): Promise<Balance> {
    this.logOperation('create', {
      userId: data.user?.connect?.id,
      assetId: data.asset?.connect?.id
    })

    try {
      const balance = await this.prisma.balance.create({
        data,
        include: { asset: true }
      })

      // Инвалидируем кэш балансов пользователя
      if (data.user?.connect?.id) {
        this.invalidateUserBalanceCache(data.user.connect.id)
      }
      
      this.logResult('create', balance)
      return balance
    } catch (error) {
      this.handleError('create', error)
    }
  }

  /**
   * Обновляет баланс
   */
  async update(id: string, data: Prisma.BalanceUpdateInput): Promise<Balance> {
    this.logOperation('update', { id })

    try {
      const balance = await this.prisma.balance.update({
        where: { id },
        data,
        include: { asset: true }
      })

      // Инвалидируем кэш балансов пользователя
      this.invalidateUserBalanceCache(balance.userId)
      
      this.logResult('update', balance)
      return balance
    } catch (error) {
      this.handleError('update', error)
    }
  }

  /**
   * Создает или обновляет баланс (upsert)
   */
  async upsert(
    userId: string,
    assetId: string,
    data: {
      amountCached?: bigint
      lockedAmount?: bigint
      availableAmount?: bigint
    }
  ): Promise<Balance> {
    this.logOperation('upsert', { userId, assetId })

    try {
      const balance = await this.prisma.balance.upsert({
        where: {
          userId_assetId: {
            userId,
            assetId
          }
        },
        create: {
          userId,
          assetId,
          amountCached: data.amountCached || 0n,
          lockedAmount: data.lockedAmount || 0n,
          availableAmount: data.availableAmount || data.amountCached || 0n,
          lastUpdated: new Date()
        },
        update: {
          ...data,
          lastUpdated: new Date()
        },
        include: { asset: true }
      })

      // Инвалидируем кэш балансов пользователя
      this.invalidateUserBalanceCache(userId)
      
      this.logResult('upsert', balance)
      return balance
    } catch (error) {
      this.handleError('upsert', error)
    }
  }

  /**
   * Обновляет баланс на определенную сумму (delta update)
   */
  async updateByDelta(
    userId: string,
    assetId: string,
    deltaAmount: bigint
  ): Promise<Balance> {
    this.logOperation('updateByDelta', { userId, assetId, deltaAmount: deltaAmount.toString() })

    try {
      // Получаем текущий баланс
      let balance = await this.findByUserAndAsset(userId, assetId)

      if (!balance) {
        // Создаем новый баланс если его нет
        balance = await this.create({
          user: { connect: { id: userId } },
          asset: { connect: { id: assetId } },
          amountCached: 0n,
          lockedAmount: 0n,
          availableAmount: 0n
        })
      }

      // Вычисляем новые значения
      const newAmountCached = balance.amountCached + deltaAmount
      const newAvailableAmount = newAmountCached - balance.lockedAmount

      // Проверяем что баланс не становится отрицательным
      if (newAmountCached < 0n) {
        throw new Error(`Balance would become negative: ${newAmountCached}`)
      }

      // Обновляем баланс
      const updatedBalance = await this.update(balance.id, {
        amountCached: newAmountCached,
        availableAmount: newAvailableAmount,
        lastUpdated: new Date()
      })

      this.logResult('updateByDelta', updatedBalance)
      return updatedBalance
    } catch (error) {
      this.handleError('updateByDelta', error)
    }
  }

  /**
   * Блокирует средства (увеличивает lockedAmount)
   */
  async lockAmount(
    userId: string,
    assetId: string,
    amount: bigint
  ): Promise<Balance> {
    this.logOperation('lockAmount', { userId, assetId, amount: amount.toString() })

    try {
      const balance = await this.findByUserAndAsset(userId, assetId)
      
      if (!balance) {
        throw new Error('Balance not found')
      }

      const newLockedAmount = balance.lockedAmount + amount
      const newAvailableAmount = balance.amountCached - newLockedAmount

      if (newAvailableAmount < 0n) {
        throw new Error('Insufficient available balance to lock')
      }

      const updatedBalance = await this.update(balance.id, {
        lockedAmount: newLockedAmount,
        availableAmount: newAvailableAmount,
        lastUpdated: new Date()
      })

      this.logResult('lockAmount', updatedBalance)
      return updatedBalance
    } catch (error) {
      this.handleError('lockAmount', error)
    }
  }

  /**
   * Разблокирует средства (уменьшает lockedAmount)
   */
  async unlockAmount(
    userId: string,
    assetId: string,
    amount: bigint
  ): Promise<Balance> {
    this.logOperation('unlockAmount', { userId, assetId, amount: amount.toString() })

    try {
      const balance = await this.findByUserAndAsset(userId, assetId)
      
      if (!balance) {
        throw new Error('Balance not found')
      }

      const newLockedAmount = balance.lockedAmount - amount
      const newAvailableAmount = balance.amountCached - newLockedAmount

      if (newLockedAmount < 0n) {
        throw new Error('Cannot unlock more than locked amount')
      }

      const updatedBalance = await this.update(balance.id, {
        lockedAmount: newLockedAmount,
        availableAmount: newAvailableAmount,
        lastUpdated: new Date()
      })

      this.logResult('unlockAmount', updatedBalance)
      return updatedBalance
    } catch (error) {
      this.handleError('unlockAmount', error)
    }
  }

  /**
   * Получает сводку балансов пользователя
   */
  async getUserBalanceSummary(userId: string): Promise<UserBalanceSummary> {
    this.logOperation('getUserBalanceSummary', { userId })

    try {
      const balances = await this.findAllByUser(userId)
      
      const summary: UserBalanceSummary = {
        userId,
        totalBalances: balances.length,
        balances
      }

      this.logResult('getUserBalanceSummary', summary)
      return summary
    } catch (error) {
      this.handleError('getUserBalanceSummary', error)
    }
  }

  /**
   * Получает пользователей с ненулевыми балансами для актива
   */
  async findUsersWithBalance(assetId: string): Promise<Balance[]> {
    this.logOperation('findUsersWithBalance', { assetId })

    try {
      const balances = await this.prisma.balance.findMany({
        where: {
          assetId,
          amountCached: { gt: 0 }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true
            }
          },
          asset: {
            select: {
              symbol: true,
              name: true,
              decimals: true
            }
          }
        },
        orderBy: { amountCached: 'desc' }
      })

      this.logResult('findUsersWithBalance', balances)
      return balances
    } catch (error) {
      this.handleError('findUsersWithBalance', error)
    }
  }

  /**
   * Инвалидирует кэш балансов пользователя
   */
  private invalidateUserBalanceCache(userId: string): void {
    this.cache.invalidateByTag(CacheTags.USER_BALANCE(userId))
    console.log(` Invalidated balance cache for user: ${userId}`)
  }
}

