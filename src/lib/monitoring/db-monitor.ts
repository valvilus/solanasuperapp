/**
 * Database Performance Monitor
 * Solana SuperApp Database Optimization
 */

import { memoryCache } from '@/lib/cache/memory-cache.service'

export interface QueryMetrics {
  totalQueries: number
  slowQueries: number
  averageTime: number
  cacheHits: number
  cacheMisses: number
}

export interface PerformanceReport {
  timestamp: string
  queryMetrics: QueryMetrics
  cacheStats: {
    totalEntries: number
    validEntries: number
    expiredEntries: number
    hitRate: number
  }
  recommendations: string[]
}

class DatabaseMonitor {
  private queryCount = 0
  private slowQueryCount = 0
  private totalQueryTime = 0
  private cacheHits = 0
  private cacheMisses = 0
  private readonly slowQueryThreshold = 200 // ms

  /**
   * Записывает метрики выполнения запроса
   */
  recordQuery(duration: number, fromCache: boolean = false): void {
    this.queryCount++
    this.totalQueryTime += duration

    if (duration > this.slowQueryThreshold) {
      this.slowQueryCount++
    }

    if (fromCache) {
      this.cacheHits++
    } else {
      this.cacheMisses++
    }
  }

  /**
   * Получает текущие метрики
   */
  getMetrics(): QueryMetrics {
    return {
      totalQueries: this.queryCount,
      slowQueries: this.slowQueryCount,
      averageTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses
    }
  }

  /**
   * Генерирует отчет о производительности
   */
  generateReport(): PerformanceReport {
    const metrics = this.getMetrics()
    const cacheStats = memoryCache.getStats()
    const recommendations: string[] = []

    // Анализируем производительность и даем рекомендации
    if (metrics.slowQueries > 0) {
      const slowQueryPercent = (metrics.slowQueries / metrics.totalQueries) * 100
      if (slowQueryPercent > 10) {
        recommendations.push(` ${slowQueryPercent.toFixed(1)}% запросов выполняются медленно (>${this.slowQueryThreshold}ms)`)
      }
    }

    if (metrics.totalQueries > 0) {
      const cacheHitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
      if (cacheHitRate < 70) {
        recommendations.push(` Низкий hit rate кэша: ${cacheHitRate.toFixed(1)}%. Рассмотрите увеличение TTL или улучшение стратегии кэширования`)
      }
    }

    if (cacheStats.expiredEntries > cacheStats.validEntries) {
      recommendations.push(' Много истёкших записей в кэше. Рассмотрите оптимизацию TTL')
    }

    if (metrics.averageTime > 100) {
      recommendations.push(` Высокое среднее время запроса: ${metrics.averageTime.toFixed(1)}ms. Проверьте индексы и оптимизируйте запросы`)
    }

    if (recommendations.length === 0) {
      recommendations.push(' Производительность БД в норме')
    }

    return {
      timestamp: new Date().toISOString(),
      queryMetrics: metrics,
      cacheStats,
      recommendations
    }
  }

  /**
   * Сбрасывает статистику
   */
  reset(): void {
    this.queryCount = 0
    this.slowQueryCount = 0
    this.totalQueryTime = 0
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  /**
   * Логирует краткий отчет
   */
  logSummary(): void {
    const metrics = this.getMetrics()
    const cacheStats = memoryCache.getStats()
    
    console.log(' DB Performance Summary:', {
      queries: metrics.totalQueries,
      avgTime: `${metrics.averageTime.toFixed(1)}ms`,
      slowQueries: metrics.slowQueries,
      cacheHitRate: `${cacheStats.hitRate * 100}%`,
      cacheEntries: cacheStats.totalEntries
    })
  }
}

// Singleton instance
export const dbMonitor = new DatabaseMonitor()

// Периодическое логирование статистики каждые 5 минут
if (typeof global !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const metrics = dbMonitor.getMetrics()
    if (metrics.totalQueries > 0) {
      dbMonitor.logSummary()
    }
  }, 5 * 60 * 1000)
}

