/**
 * Система ленивой загрузки компонентов и данных
 */

import { ComponentType, lazy, LazyExoticComponent, useState, useEffect, useCallback } from 'react'
import { globalCache } from './cache-manager'

interface LazyComponentOptions {
  fallback?: ComponentType
  retryCount?: number
  timeout?: number
}

interface LazyDataOptions {
  ttl?: number
  retries?: number
  timeout?: number
}

/**
 * Создать ленивый компонент с обработкой ошибок
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> {
  const { retryCount = 3, timeout = 10000 } = options

  return lazy(async () => {
    let lastError: Error

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout)
        })

        const result = await Promise.race([importFn(), timeoutPromise])
        return result
      } catch (error) {
        lastError = error as Error
        console.warn(`Component load attempt ${attempt + 1} failed:`, error)

        // Ждем перед повторной попыткой
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError!
  })
}

/**
 * Менеджер ленивой загрузки данных
 */
class LazyDataLoader {
  private loadingPromises = new Map<string, Promise<any>>()
  private loadedData = new Map<string, any>()

  /**
   * Загрузить данные с ленивой загрузкой
   */
  async load<T>(
    key: string,
    loadFn: () => Promise<T>,
    options: LazyDataOptions = {}
  ): Promise<T> {
    const { ttl = 5 * 60 * 1000, retries = 3, timeout = 10000 } = options

    // Проверяем кэш
    const cached = globalCache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Проверяем, не загружается ли уже
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!
    }

    // Создаем промис загрузки
    const loadPromise = this.executeLoad(key, loadFn, { ttl, retries, timeout })
    this.loadingPromises.set(key, loadPromise)

    try {
      const result = await loadPromise
      this.loadedData.set(key, result)
      globalCache.set(key, result, { ttl })
      return result
    } finally {
      this.loadingPromises.delete(key)
    }
  }

  /**
   * Выполнить загрузку с повторными попытками
   */
  private async executeLoad<T>(
    key: string,
    loadFn: () => Promise<T>,
    options: Required<LazyDataOptions>
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Data load timeout for ${key}`)), options.timeout)
        })

        const result = await Promise.race([loadFn(), timeoutPromise])
        return result
      } catch (error) {
        lastError = error as Error
        console.warn(`Data load attempt ${attempt + 1} failed for ${key}:`, error)

        // Ждем перед повторной попыткой
        if (attempt < options.retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError!
  }

  /**
   * Предварительно загрузить данные
   */
  async preload<T>(
    key: string,
    loadFn: () => Promise<T>,
    options: LazyDataOptions = {}
  ): Promise<void> {
    try {
      await this.load(key, loadFn, options)
    } catch (error) {
      console.warn(`Preload failed for ${key}:`, error)
    }
  }

  /**
   * Инвалидировать загруженные данные
   */
  invalidate(key: string): void {
    this.loadedData.delete(key)
    this.loadingPromises.delete(key)
    globalCache.delete(key)
  }

  /**
   * Инвалидировать по паттерну
   */
  invalidatePattern(pattern: RegExp): void {
    // Инвалидируем загруженные данные
    for (const key of this.loadedData.keys()) {
      if (pattern.test(key)) {
        this.loadedData.delete(key)
      }
    }

    // Инвалидируем загружающиеся данные
    for (const key of this.loadingPromises.keys()) {
      if (pattern.test(key)) {
        this.loadingPromises.delete(key)
      }
    }

    // Инвалидируем кэш
    globalCache.invalidatePattern(pattern)
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      loadedCount: this.loadedData.size,
      loadingCount: this.loadingPromises.size,
      cacheStats: globalCache.getStats()
    }
  }
}

// Глобальный загрузчик данных
export const lazyDataLoader = new LazyDataLoader()

/**
 * Хук для ленивой загрузки данных
 */
export function useLazyData<T>(
  key: string,
  loadFn: () => Promise<T>,
  options: LazyDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await lazyDataLoader.load(key, loadFn, options)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [key, loadFn, options])

  const reload = useCallback(() => {
    lazyDataLoader.invalidate(key)
    return load()
  }, [key, load])

  useEffect(() => {
    load()
  }, [load])

  return {
    data,
    loading,
    error,
    reload,
    invalidate: () => lazyDataLoader.invalidate(key)
  }
}

/**
 * Intersection Observer для ленивой загрузки элементов
 */
export class LazyElementLoader {
  private observer: IntersectionObserver
  private loadedElements = new Set<Element>()

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      }
    )
  }

  /**
   * Наблюдать за элементом
   */
  observe(element: Element, loadFn: () => void | Promise<void>): void {
    element.setAttribute('data-lazy-load', 'true')
    ;(element as any).__lazyLoadFn = loadFn
    this.observer.observe(element)
  }

  /**
   * Прекратить наблюдение за элементом
   */
  unobserve(element: Element): void {
    this.observer.unobserve(element)
    this.loadedElements.delete(element)
    element.removeAttribute('data-lazy-load')
    delete (element as any).__lazyLoadFn
  }

  /**
   * Обработчик пересечения
   */
  private async handleIntersection(entries: IntersectionObserverEntry[]): Promise<void> {
    for (const entry of entries) {
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        this.loadedElements.add(entry.target)
        
        const loadFn = (entry.target as any).__lazyLoadFn
        if (loadFn) {
          try {
            await loadFn()
          } catch (error) {
            console.error('Lazy element load failed:', error)
          }
        }

        this.observer.unobserve(entry.target)
      }
    }
  }

  /**
   * Уничтожить наблюдатель
   */
  destroy(): void {
    this.observer.disconnect()
    this.loadedElements.clear()
  }
}

// Глобальный загрузчик элементов
export const lazyElementLoader = new LazyElementLoader()

/**
 * Предварительно загруженные компоненты
 */
export const LazyComponents = {
  // DeFi страницы
  StakingPage: createLazyComponent(() => import('@/app/defi/staking/page')),
  SwapPage: createLazyComponent(() => import('@/app/defi/swap/page')),
  LendingPage: createLazyComponent(() => import('@/app/defi/lending/page')),
  FarmingPage: createLazyComponent(() => import('@/app/defi/farming/page')),
  
  // Analytics страницы
  AnalyticsPage: createLazyComponent(() => import('@/app/defi/analytics/page')),
  RiskPage: createLazyComponent(() => import('@/app/defi/risk/page')),
  
  
  // Bridge страницы
  BridgePage: createLazyComponent(() => import('@/app/defi/bridge/page')),
  
  // Insurance страницы
  InsurancePage: createLazyComponent(() => import('@/app/defi/insurance/page')),
  
  // Yield страницы
  YieldPage: createLazyComponent(() => import('@/app/defi/yield/page'))
}

// Функции для предварительной загрузки
export const preloadFunctions = {
  /**
   * Предварительно загрузить DeFi данные
   */
  async preloadDeFiData(userId: string): Promise<void> {
    const promises = [
      lazyDataLoader.preload(`staking:${userId}`, () => 
        fetch(`/api/defi/staking?userId=${userId}`).then(r => r.json())
      ),
      lazyDataLoader.preload(`farming:${userId}`, () => 
        fetch(`/api/defi/farming?userId=${userId}`).then(r => r.json())
      ),
      lazyDataLoader.preload(`lending:${userId}`, () => 
        fetch(`/api/defi/lending?userId=${userId}`).then(r => r.json())
      )
    ]

    await Promise.all(promises)
  },

  /**
   * Предварительно загрузить цены токенов
   */
  async preloadPrices(symbols: string[]): Promise<void> {
    await lazyDataLoader.preload('prices:batch', () => 
      fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      }).then(r => r.json())
    )
  },

  /**
   * Предварительно загрузить аналитику
   */
  async preloadAnalytics(userId: string): Promise<void> {
    await lazyDataLoader.preload(`analytics:${userId}`, () => 
      fetch(`/api/defi/analytics?userId=${userId}`).then(r => r.json())
    )
  }
}
