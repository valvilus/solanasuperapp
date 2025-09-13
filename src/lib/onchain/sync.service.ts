/**
 * OnchainSyncService - Balance reconciliation and health monitoring
 * Solana SuperApp
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { PrismaClient } from '@prisma/client'
import {
  BalanceSync,
  SyncReport,
  OnchainResult,
  OnchainError,
  OnchainErrorCode,
  SUPPORTED_TOKENS
} from './types'
import {
  createOnchainError,
  createRPCConnectionError
} from './errors'
import { BalanceService } from '@/lib/ledger'

export class OnchainSyncService {
  private readonly connection: Connection
  private readonly prisma: PrismaClient
  private readonly balanceService: BalanceService

  constructor(connection: Connection, prisma: PrismaClient) {
    this.connection = connection
    this.prisma = prisma
    this.balanceService = new BalanceService(prisma)

  }

  /**
   * Выполняет полную сверку балансов для всех пользователей
   */
  async syncAllBalances(): Promise<OnchainResult<SyncReport>> {
    try {

      const report: SyncReport = {
        totalAccounts: 0,
        syncedAccounts: 0,
        discrepancies: [],
        errors: [],
        timestamp: new Date()
      }

      // Получаем всех пользователей с custodial кошельками
      const users = await this.prisma.user.findMany({
        where: {
          walletAddress: { not: null }
        },
        select: {
          id: true,
          walletAddress: true
        }
      })

      report.totalAccounts = users.length
      console.log(` Found ${users.length} users with custodial wallets`)

      // Синхронизируем каждого пользователя
      for (const user of users) {
        if (!user.walletAddress) continue

        try {
          const userSyncResult = await this.syncUserBalances(user.id, user.walletAddress)
          
          if (userSyncResult.success && userSyncResult.data) {
            report.syncedAccounts++
            
            // Добавляем расхождения в отчет
            report.discrepancies.push(...userSyncResult.data.filter(sync => sync.needsReconciliation))
          } else {
            report.errors.push(`User ${user.id}: ${userSyncResult.error?.message}`)
          }

        } catch (error) {
          const errorMsg = `User ${user.id}: ${error instanceof Error ? error.message : String(error)}`
          report.errors.push(errorMsg)
          console.error(' User sync error:', errorMsg)
        }
      }

      console.log(' Balance sync completed:', {
        totalAccounts: report.totalAccounts,
        syncedAccounts: report.syncedAccounts,
        discrepancies: report.discrepancies.length,
        errors: report.errors.length
      })

      return {
        success: true,
        data: report
      }

    } catch (error) {
      console.error(' Full balance sync failed:', error)
      
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.SYNC_ERROR,
          'Ошибка синхронизации балансов',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Синхронизирует балансы конкретного пользователя
   */
  async syncUserBalances(userId: string, walletAddress: string): Promise<OnchainResult<BalanceSync[]>> {
    try {

      const publicKey = new PublicKey(walletAddress)
      const balanceSyncs = []

      // Синхронизируем SOL
      const solSync = await this.syncSOLBalance(userId, publicKey)
      if (solSync) balanceSyncs.push(solSync)

      // Синхронизируем TNG (пока только TNG из SPL токенов)
      const tngSync = await this.syncSPLBalance(userId, publicKey, 'TNG', SUPPORTED_TOKENS.TNG)
      if (tngSync) balanceSyncs.push(tngSync)

      // TODO: Добавить USDC когда будет поддержка

      console.log(` User ${userId} sync completed:`, {
        balances: balanceSyncs.length,
        discrepancies: balanceSyncs.filter(sync => sync.needsReconciliation).length
      })

      return {
        success: true,
        data: balanceSyncs
      }

    } catch (error) {
      console.error(` User ${userId} sync failed:`, error)
      
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.SYNC_ERROR,
          `Ошибка синхронизации пользователя: ${error instanceof Error ? error.message : String(error)}`,
          { userId, walletAddress }
        )
      }
    }
  }

  /**
   * Синхронизирует SOL баланс
   */
  private async syncSOLBalance(userId: string, publicKey: PublicKey): Promise<BalanceSync | null> {
    try {
      // Получаем on-chain баланс
      const onchainBalance = BigInt(await this.connection.getBalance(publicKey))

      // Получаем off-chain баланс
      const balanceResult = await this.balanceService.getUserBalance(userId, 'SOL')
      const offchainBalance = balanceResult.success && balanceResult.data 
        ? (balanceResult.data as any).available 
        : 0n

      const difference = onchainBalance - offchainBalance
      const needsReconciliation = difference !== 0n

      if (needsReconciliation) {
        console.warn(` SOL balance discrepancy for user ${userId}:`, {
          onchain: onchainBalance.toString(),
          offchain: offchainBalance.toString(),
          difference: difference.toString()
        })
      }

      return {
        address: publicKey.toString(),
        onchainBalance,
        offchainBalance,
        difference,
        token: 'SOL',
        lastSynced: new Date(),
        needsReconciliation
      }

    } catch (error) {
      console.error(` SOL balance sync error for user ${userId}:`, error)
      return null
    }
  }

  /**
   * Синхронизирует SPL токен баланс
   */
  private async syncSPLBalance(
    userId: string, 
    publicKey: PublicKey, 
    tokenSymbol: string,
    mintAddress: string
  ): Promise<BalanceSync | null> {
    try {
      // TODO: Реализовать получение SPL token баланса
      // Пока возвращаем пустую синхронизацию

      // Получаем off-chain баланс
      const balanceResult = await this.balanceService.getUserBalance(userId, tokenSymbol)
      const offchainBalance = balanceResult.success && balanceResult.data 
        ? (balanceResult.data as any).available 
        : 0n

      // Пока считаем on-chain баланс = 0 (нужна реализация SPL token account lookup)
      const onchainBalance = 0n
      const difference = onchainBalance - offchainBalance
      const needsReconciliation = false // Пока отключаем для SPL токенов

      return {
        address: publicKey.toString(),
        onchainBalance,
        offchainBalance,
        difference,
        token: tokenSymbol,
        lastSynced: new Date(),
        needsReconciliation
      }

    } catch (error) {
      console.error(` ${tokenSymbol} balance sync error for user ${userId}:`, error)
      return null
    }
  }

  /**
   * Получает общий отчет о состоянии системы
   */
  async getSystemHealthReport(): Promise<OnchainResult<any>> {
    try {
      console.log(' Generating system health report...')

      // Проверяем подключение к RPC
      const rpcHealthy = await this.checkRPCHealth()

      // Статистика транзакций за последние 24 часа
      const txStats = await this.getTransactionStats(24)

      // Статистика балансов
      const balanceStats = await this.getBalanceStats()

      // Последние ошибки
      const recentErrors = await this.getRecentErrors(24)

      const report = {
        timestamp: new Date(),
        rpc: rpcHealthy,
        transactions: txStats,
        balances: balanceStats,
        errors: recentErrors,
        status: rpcHealthy.healthy ? 'healthy' : 'degraded'
      }

      return {
        success: true,
        data: report
      }

    } catch (error) {
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.SYNC_ERROR,
          'Ошибка генерации отчета о состоянии системы',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Проверяет здоровье RPC соединения
   */
  private async checkRPCHealth() {
    try {
      const start = Date.now()
      const slot = await this.connection.getSlot()
      const latency = Date.now() - start

      return {
        healthy: true,
        endpoint: this.connection.rpcEndpoint,
        currentSlot: slot,
        latencyMs: latency,
        timestamp: new Date()
      }

    } catch (error) {
      return {
        healthy: false,
        endpoint: this.connection.rpcEndpoint,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      }
    }
  }

  /**
   * Получает статистику транзакций
   */
  private async getTransactionStats(hours: number) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000)

      const stats = await this.prisma.onchainTx.groupBy({
        by: ['purpose', 'status'],
        where: {
          createdAt: { gte: since }
        },
        _count: true,
        _sum: { amount: true }
      })

      return {
        timeframeHours: hours,
        byPurpose: stats.reduce((acc, stat) => {
          if (!acc[stat.purpose]) {
            acc[stat.purpose] = { count: 0, totalAmount: '0' }
          }
          acc[stat.purpose].count += stat._count
          acc[stat.purpose].totalAmount = (
            BigInt(acc[stat.purpose].totalAmount) + (stat._sum.amount || 0n)
          ).toString()
          return acc
        }, {} as Record<string, any>),
        total: stats.reduce((sum, stat) => sum + stat._count, 0)
      }

    } catch (error) {
      return {
        error: 'Failed to get transaction stats',
        timeframeHours: hours
      }
    }
  }

  /**
   * Получает статистику балансов
   */
  private async getBalanceStats() {
    try {
      const balances = await this.prisma.balance.groupBy({
        by: ['assetId'],
        _sum: { availableAmount: true, lockedAmount: true },
        _count: { _all: true }
      })

      const totalUsers = await this.prisma.user.count({
        where: { walletAddress: { not: null } }
      })

      return {
        totalUsers,
        assetBalances: balances.map(balance => ({
          assetId: balance.assetId,
          userCount: (balance._count as any)?._all ?? balance._count,
          totalAvailable: (balance._sum as any).availableAmount?.toString() || '0',
          totalHolds: (balance._sum as any).lockedAmount?.toString() || '0'
        }))
      }

    } catch (error) {
      return {
        error: 'Failed to get balance stats'
      }
    }
  }

  /**
   * Получает последние ошибки
   */
  private async getRecentErrors(hours: number) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000)

      // TODO: Реализовать таблицу для логирования ошибок
      // Пока возвращаем пустой массив
      
      return {
        timeframeHours: hours,
        errors: [],
        totalCount: 0
      }

    } catch (error) {
      return {
        error: 'Failed to get recent errors',
        timeframeHours: hours
      }
    }
  }

  /**
   * Исправляет расхождения в балансах (полуавтоматически)
   */
  async reconcileDiscrepancy(
    userId: string,
    tokenSymbol: string,
    action: 'adjust_offchain' | 'manual_review'
  ): Promise<OnchainResult<boolean>> {
    try {

      if (action === 'manual_review') {
        // TODO: Создать запись для ручной проверки
        return { success: true, data: true }
      }

      if (action === 'adjust_offchain') {
        // TODO: Реализовать корректировку off-chain баланса
        return { success: true, data: true }
      }

      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.SYNC_ERROR,
          `Неизвестное действие для сверки: ${action}`
        )
      }

    } catch (error) {
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.SYNC_ERROR,
          `Ошибка сверки: ${error instanceof Error ? error.message : String(error)}`,
          { userId, tokenSymbol, action }
        )
      }
    }
  }
}
