/**
 * Memory Cache Service - In-Memory Caching System
 * Solana SuperApp Database Optimization
 */

export interface CacheEntry<T> {
  value: T
  expiry: number
  tags: string[]
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  tags?: string[] // Cache tags for invalidation
}

export class MemoryCacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes by default

  /**
   * Получает значение из кэша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Проверяем истечение TTL
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * Сохраняет значение в кэш
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL
    const tags = options.tags || []
    
    const entry: CacheEntry<T> = {
      value,
      expiry: Date.now() + ttl,
      tags
    }

    this.cache.set(key, entry)
  }

  /**
   * Удаляет значение из кэша
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Инвалидирует кэш по тегам
   */
  invalidateByTag(tag: string): number {
    let deletedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        deletedCount++
      }
    }
    
    return deletedCount
  }

  /**
   * Очищает весь кэш
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Удаляет истёкшие записи
   */
  cleanup(): number {
    let deletedCount = 0
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        deletedCount++
      }
    }
    
    return deletedCount
  }

  /**
   * Получает или устанавливает значение (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, options)
    
    return value
  }

  /**
   * Возвращает статистику кэша
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiry) {
        expiredEntries++
      } else {
        validEntries++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / Math.max(1, this.cache.size)
    }
  }
}

// Singleton instance
export const memoryCache = new MemoryCacheService()

// Периодическая очистка истёкших записей каждые 10 минут
if (typeof global !== 'undefined') {
  setInterval(() => {
    const deleted = memoryCache.cleanup()
    if (deleted > 0) {
      console.log(` Cleaned up ${deleted} expired cache entries`)
    }
  }, 10 * 60 * 1000)
}

