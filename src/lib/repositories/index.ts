/**
 * Repository Manager - Centralized repository management
 * Solana SuperApp Database Optimization
 */

import { PrismaClient } from '@prisma/client'
import { UserRepository } from './user.repository'
import { TransactionRepository } from './transaction.repository'
import { AssetRepository } from './asset.repository'
import { BalanceRepository } from './balance.repository'

export class RepositoryManager {
  private readonly prisma: PrismaClient
  
  // Repository instances
  private _userRepository?: UserRepository
  private _transactionRepository?: TransactionRepository
  private _assetRepository?: AssetRepository
  private _balanceRepository?: BalanceRepository

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * User Repository (lazy initialization)
   */
  get users(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository(this.prisma)
    }
    return this._userRepository
  }

  /**
   * Transaction Repository (lazy initialization)
   */
  get transactions(): TransactionRepository {
    if (!this._transactionRepository) {
      this._transactionRepository = new TransactionRepository(this.prisma)
    }
    return this._transactionRepository
  }

  /**
   * Asset Repository (lazy initialization)
   */
  get assets(): AssetRepository {
    if (!this._assetRepository) {
      this._assetRepository = new AssetRepository(this.prisma)
    }
    return this._assetRepository
  }

  /**
   * Balance Repository (lazy initialization)
   */
  get balances(): BalanceRepository {
    if (!this._balanceRepository) {
      this._balanceRepository = new BalanceRepository(this.prisma)
    }
    return this._balanceRepository
  }

  /**
   * Выполняет операцию в транзакции с доступом ко всем репозиториям
   */
  async transaction<T>(
    fn: (repos: RepositoryManager) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      const txRepos = new RepositoryManager(tx as PrismaClient)
      return await fn(txRepos)
    })
  }

  /**
   * Статистика использования репозиториев
   */
  getUsageStats() {
    return {
      usersInitialized: !!this._userRepository,
      transactionsInitialized: !!this._transactionRepository,
      assetsInitialized: !!this._assetRepository,
      balancesInitialized: !!this._balanceRepository,
    }
  }
}

// Export individual repositories for direct use if needed
export { UserRepository } from './user.repository'
export { BaseRepository } from './base.repository'
export type { PaginationOptions, PaginatedResult } from './base.repository'

// Singleton instance
let repositoryManager: RepositoryManager | null = null

/**
 * Получает глобальный экземпляр RepositoryManager
 */
export function getRepositoryManager(prisma?: PrismaClient): RepositoryManager {
  if (!repositoryManager && prisma) {
    repositoryManager = new RepositoryManager(prisma)
  }
  
  if (!repositoryManager) {
    throw new Error('RepositoryManager not initialized. Call with prisma instance first.')
  }
  
  return repositoryManager
}

