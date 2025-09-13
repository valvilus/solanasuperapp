/**
 * User Repository - Data access layer for users
 * Solana SuperApp Database Optimization
 */

import { User, Prisma } from '@prisma/client'
import { BaseRepository, PaginationOptions, PaginatedResult } from './base.repository'
import { CacheKeys, CacheTags, CacheTTL } from '@/lib/cache/cache-keys'

export interface UserSearchFilters {
  query?: string
  hasWallet?: boolean
  isPremium?: boolean
}

export interface UserWithStats extends User {
  stats?: {
    totalTransactions: number
    totalNFTs: number
    totalVotes: number
    totalCoursesCompleted: number
    totalJobsCompleted: number
    reputation: number
    level: number
  }
}

export class UserRepository extends BaseRepository {
  
  /**
   * Находит пользователя по ID с кэшированием
   */
  async findById(id: string): Promise<User | null> {
    this.logOperation('findById', { id })

    try {
      const user = await this.cache.getOrSet(
        CacheKeys.USER_PROFILE(id),
        async () => {
          return await this.prisma.user.findUnique({
            where: { id }
          })
        },
        {
          ttl: CacheTTL.USER_PROFILE,
          tags: [CacheTags.USERS, CacheTags.USER(id)]
        }
      )

      this.logResult('findById', user)
      return user
    } catch (error) {
      this.handleError('findById', error)
    }
  }

  /**
   * Находит пользователя по Telegram ID
   */
  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    this.logOperation('findByTelegramId', { telegramId: telegramId.toString() })

    try {
      const user = await this.prisma.user.findUnique({
        where: { telegramId }
      })

      this.logResult('findByTelegramId', user)
      return user
    } catch (error) {
      this.handleError('findByTelegramId', error)
    }
  }

  /**
   * Находит пользователя по адресу кошелька
   */
  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    this.logOperation('findByWalletAddress', { walletAddress })

    try {
      const user = await this.prisma.user.findFirst({
        where: { walletAddress }
      })

      this.logResult('findByWalletAddress', user)
      return user
    } catch (error) {
      this.handleError('findByWalletAddress', error)
    }
  }

  /**
   * Создает нового пользователя
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    this.logOperation('create', { telegramId: data.telegramId?.toString() })

    try {
      const user = await this.prisma.user.create({
        data
      })

      // Инвалидируем кэш
      this.invalidateUserCache(user.id)
      
      this.logResult('create', user)
      return user
    } catch (error) {
      this.handleError('create', error)
    }
  }

  /**
   * Обновляет пользователя
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    this.logOperation('update', { id })

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data
      })

      // Инвалидируем кэш
      this.invalidateUserCache(id)
      
      this.logResult('update', user)
      return user
    } catch (error) {
      this.handleError('update', error)
    }
  }

  /**
   * Поиск пользователей с фильтрами и пагинацией
   */
  async search(
    filters: UserSearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<User>> {
    this.logOperation('search', { filters, options })

    try {
      const where: Prisma.UserWhereInput = {}

      // Применяем фильтры
      if (filters.query) {
        where.OR = [
          { username: { contains: filters.query, mode: 'insensitive' } },
          { firstName: { contains: filters.query, mode: 'insensitive' } },
          { lastName: { contains: filters.query, mode: 'insensitive' } }
        ]
      }

      if (filters.hasWallet !== undefined) {
        where.walletAddress = filters.hasWallet ? { not: null } : null
      }

      if (filters.isPremium !== undefined) {
        where.isPremium = filters.isPremium
      }

      const { skip, take, page, limit } = this.applyPagination(options)
      const orderBy = this.applySorting(options)

      // Выполняем запрос с подсчетом
      const result = await this.executePaginatedQuery(
        (skip, take) => this.prisma.user.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            languageCode: true,
            photoUrl: true,
            isPremium: true,
            walletAddress: true,
            encryptedPrivateKey: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true
          }
        }),
        () => this.prisma.user.count({ where }),
        options
      )

      this.logResult('search', result.data)
      return result
    } catch (error) {
      this.handleError('search', error)
    }
  }

  /**
   * Получает пользователя со статистикой
   */
  async findByIdWithStats(id: string): Promise<UserWithStats | null> {
    this.logOperation('findByIdWithStats', { id })

    try {
      const user = await this.findById(id)
      if (!user) {
        return null
      }

      // Получаем статистику параллельно
      const [
        totalTransactions,
        totalNFTs,
        totalVotes,
        totalCoursesCompleted,
        totalJobsCompleted
      ] = await Promise.all([
        this.prisma.transaction.count({ where: { userId: id } }),
        this.prisma.nFT.count({ where: { userId: id } }),
        this.prisma.dAOVote.count({ where: { userId: id } }),
        this.prisma.userCourse.count({ 
          where: { userId: id, status: 'COMPLETED' } 
        }),
        this.prisma.job.count({ 
          where: { userId: id, status: 'COMPLETED' } 
        })
      ])

      // Вычисляем репутацию и уровень
      const reputation = this.calculateReputation({
        totalTransactions,
        totalNFTs,
        totalVotes,
        totalCoursesCompleted,
        totalJobsCompleted
      })

      const level = Math.floor(reputation / 100) + 1

      const userWithStats: UserWithStats = {
        ...user,
        stats: {
          totalTransactions,
          totalNFTs,
          totalVotes,
          totalCoursesCompleted,
          totalJobsCompleted,
          reputation,
          level
        }
      }

      this.logResult('findByIdWithStats', userWithStats)
      return userWithStats
    } catch (error) {
      this.handleError('findByIdWithStats', error)
    }
  }

  /**
   * Получает всех пользователей с кошельками (для мониторинга)
   */
  async findAllWithWallets(): Promise<User[]> {
    this.logOperation('findAllWithWallets')

    try {
      const users = await this.prisma.user.findMany({
        where: {
          walletAddress: { not: null }
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          languageCode: true,
          isPremium: true,
          photoUrl: true,
          walletAddress: true,
          encryptedPrivateKey: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      })

      this.logResult('findAllWithWallets', users)
      return users
    } catch (error) {
      this.handleError('findAllWithWallets', error)
    }
  }

  /**
   * Обновляет время последнего входа
   */
  async updateLastLogin(id: string): Promise<void> {
    this.logOperation('updateLastLogin', { id })

    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() }
      })

      // Инвалидируем кэш
      this.invalidateUserCache(id)
      
      console.log(` Updated last login for user: ${id}`)
    } catch (error) {
      // Не фейлим операцию из-за ошибки обновления времени входа
      console.warn(` Failed to update last login for user ${id}:`, error)
    }
  }

  /**
   * Проверяет существование пользователя с кошельком
   */
  async existsWithWallet(walletAddress: string, excludeUserId?: string): Promise<boolean> {
    this.logOperation('existsWithWallet', { walletAddress, excludeUserId })

    try {
      const where: Prisma.UserWhereInput = {
        walletAddress
      }

      if (excludeUserId) {
        where.NOT = { id: excludeUserId }
      }

      const count = await this.prisma.user.count({ where })
      
      const exists = count > 0
      this.logResult('existsWithWallet', exists)
      return exists
    } catch (error) {
      this.handleError('existsWithWallet', error)
    }
  }

  /**
   * Инвалидирует кэш пользователя
   */
  private invalidateUserCache(userId: string): void {
    this.cache.invalidateByTag(CacheTags.USER(userId))
    console.log(` Invalidated cache for user: ${userId}`)
  }

  /**
   * Вычисляет репутацию пользователя
   */
  private calculateReputation(stats: {
    totalTransactions: number
    totalNFTs: number
    totalVotes: number
    totalCoursesCompleted: number
    totalJobsCompleted: number
  }): number {
    return (
      stats.totalTransactions * 2 +
      stats.totalNFTs * 5 +
      stats.totalVotes * 3 +
      stats.totalCoursesCompleted * 10 +
      stats.totalJobsCompleted * 15
    )
  }
}

