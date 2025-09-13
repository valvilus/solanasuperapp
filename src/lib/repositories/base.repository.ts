/**
 * Base Repository - Abstract base class for all repositories
 * Solana SuperApp Database Optimization
 */

import { PrismaClient } from '@prisma/client'
import { memoryCache } from '@/lib/cache/memory-cache.service'

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export abstract class BaseRepository {
  protected readonly prisma: PrismaClient
  protected readonly cache = memoryCache

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Применяет пагинацию к запросу
   */
  protected applyPagination(options: PaginationOptions = {}) {
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(100, Math.max(1, options.limit || 20))
    const skip = (page - 1) * limit
    
    return {
      skip,
      take: limit,
      page,
      limit
    }
  }

  /**
   * Применяет сортировку к запросу
   */
  protected applySorting(options: PaginationOptions = {}) {
    const sortBy = options.sortBy || 'createdAt'
    const sortOrder = options.sortOrder || 'desc'
    
    return {
      [sortBy]: sortOrder
    }
  }

  /**
   * Создает пагинированный результат
   */
  protected createPaginatedResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions
  ): PaginatedResult<T> {
    const { page, limit } = this.applyPagination(options)
    
    return {
      data,
      total,
      page,
      limit,
      hasMore: total > page * limit
    }
  }

  /**
   * Выполняет запрос с автоматическим подсчетом общего количества
   */
  protected async executePaginatedQuery<T>(
    queryFn: (skip: number, take: number) => Promise<T[]>,
    countFn: () => Promise<number>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = this.applyPagination(options)
    
    const [data, total] = await Promise.all([
      queryFn(skip, take),
      countFn()
    ])
    
    return {
      data,
      total,
      page,
      limit,
      hasMore: total > page * limit
    }
  }

  /**
   * Логирует выполнение операции
   */
  protected logOperation(operation: string, details?: any): void {
    console.log(` Repository: ${operation}`, details || '')
  }

  /**
   * Логирует результат операции
   */
  protected logResult(operation: string, result: any): void {
    if (Array.isArray(result)) {
      console.log(` Repository: ${operation} completed - ${result.length} items`)
    } else if (result) {
      console.log(` Repository: ${operation} completed - 1 item`)
    } else {
      console.log(` Repository: ${operation} - no result`)
    }
  }

  /**
   * Обработка ошибок репозитория
   */
  protected handleError(operation: string, error: any): never {
    console.error(` Repository error in ${operation}:`, error)
    throw new Error(`Repository ${operation} failed: ${error.message || error}`)
  }
}

