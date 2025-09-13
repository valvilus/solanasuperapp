/**
 * Менеджер кэширования для оптимизации производительности
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheOptions {
  ttl?: number // время жизни в миллисекундах
  maxSize?: number // максимальный размер кэша
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 минут
  private readonly maxSize = 1000

  /**
   * Получить данные из кэша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Проверяем срок действия
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Сохранить данные в кэш
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL
    const maxSize = options.maxSize || this.maxSize

    // Проверяем размер кэша
    if (this.cache.size >= maxSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Удалить данные из кэша
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Получить или установить данные с функцией получения
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const data = await fetchFn()
    this.set(key, data, options)
    return data
  }

  /**
   * Очистка устаревших записей
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key)
      }
    }

    // Удаляем устаревшие записи
    toDelete.forEach(key => this.cache.delete(key))

    // Если кэш все еще переполнен, удаляем самые старые записи
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2)) // Удаляем 20% самых старых
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats() {
    const now = Date.now()
    let activeEntries = 0
    let expiredEntries = 0

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++
      } else {
        activeEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Примерная оценка использования памяти
   */
  private estimateMemoryUsage(): number {
    let size = 0
    
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2 // строки в UTF-16
      size += JSON.stringify(entry.data).length * 2
      size += 16 // timestamp + ttl
    }

    return size
  }

  /**
   * Инвалидация кэша по паттерну
   */
  invalidatePattern(pattern: RegExp): number {
    let deletedCount = 0
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * Предварительная загрузка данных в кэш
   */
  async preload<T>(
    keys: Array<{ key: string; fetchFn: () => Promise<T>; options?: CacheOptions }>
  ): Promise<void> {
    const promises = keys.map(async ({ key, fetchFn, options }) => {
      try {
        const data = await fetchFn()
        this.set(key, data, options)
      } catch (error) {
        console.error(`Preload failed for key ${key}:`, error)
      }
    })

    await Promise.all(promises)
  }
}

// Создаем различные кэши для разных типов данных
export const priceCache = new CacheManager()
export const balanceCache = new CacheManager()
export const analyticsCache = new CacheManager()
export const userCache = new CacheManager()

// Глобальный кэш для общих данных
export const globalCache = new CacheManager()

// Утилиты для генерации ключей кэша
export const CacheKeys = {
  price: (symbol: string) => `price:${symbol}`,
  balance: (userId: string, token: string) => `balance:${userId}:${token}`,
  userPositions: (userId: string) => `positions:${userId}`,
  analytics: (userId: string, type: string) => `analytics:${userId}:${type}`,
  stakingData: (userId: string) => `staking:${userId}`,
  farmingData: (userId: string) => `farming:${userId}`,
  lendingData: (userId: string) => `lending:${userId}`,
  swapQuote: (from: string, to: string, amount: string) => `swap:${from}:${to}:${amount}`,
  bridgeRoutes: (fromChain: string, toChain: string) => `bridge:${fromChain}:${toChain}`,
  insurancePools: () => 'insurance:pools',
  oraclePrice: (asset: string) => `oracle:${asset}`,
  riskMetrics: (userId: string) => `risk:${userId}`
}

// Автоматическая очистка кэша каждые 10 минут
setInterval(() => {
  [priceCache, balanceCache, analyticsCache, userCache, globalCache].forEach(cache => {
    cache['cleanup']()
  })
}, 10 * 60 * 1000)
