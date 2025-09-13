/**
 * Оптимизированные хуки для работы с данными
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { globalCache, priceCache, balanceCache, CacheKeys } from '@/lib/performance/cache-manager'
import { priceBatcher, balanceBatcher, debounce } from '@/lib/performance/request-batching'
import { useCompatibleAuth } from './useCompatibleAuth'

interface UseOptimizedDataOptions {
  enabled?: boolean
  refetchInterval?: number
  cacheTime?: number
  staleTime?: number
  retryCount?: number
}

/**
 * Оптимизированный хук для получения цен токенов
 */
export function useOptimizedPrices(
  symbols: string[],
  options: UseOptimizedDataOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30000, // 30 секунд
    cacheTime = 5 * 60 * 1000, // 5 минут
    staleTime = 10000, // 10 секунд
    retryCount = 3
  } = options

  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const symbolsKey = useMemo(() => symbols.sort().join(','), [symbols])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPrices = useCallback(async () => {
    if (!enabled || symbols.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const pricePromises = symbols.map(symbol => 
        priceBatcher.request(symbol, symbol)
      )

      const priceValues = await Promise.all(pricePromises)
      const priceMap = symbols.reduce((acc, symbol, index) => {
        acc[symbol] = priceValues[index]
        return acc
      }, {} as Record<string, number>)

      setPrices(priceMap)
      setLastUpdate(new Date())

      // Кэшируем результаты
      symbols.forEach(symbol => {
        priceCache.set(CacheKeys.price(symbol), priceMap[symbol], { ttl: cacheTime })
      })
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [enabled, symbolsKey, cacheTime])

  // Проверяем кэш при изменении символов
  useEffect(() => {
    if (!enabled) return

    // Проверяем кэш для всех символов
    const cachedPrices: Record<string, number> = {}
    let hasAllCached = true

    symbols.forEach(symbol => {
      const cached = priceCache.get<number>(CacheKeys.price(symbol))
      if (cached !== null) {
        cachedPrices[symbol] = cached
      } else {
        hasAllCached = false
      }
    })

    if (hasAllCached && Object.keys(cachedPrices).length > 0) {
      setPrices(cachedPrices)
      setLastUpdate(new Date())
    } else {
      fetchPrices()
    }
  }, [symbolsKey, enabled, fetchPrices])

  // Настраиваем автообновление
  useEffect(() => {
    if (!enabled || !refetchInterval) return

    intervalRef.current = setInterval(fetchPrices, refetchInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, refetchInterval, fetchPrices])

  const refetch = useCallback(() => {
    // Очищаем кэш перед повторным запросом
    symbols.forEach(symbol => {
      priceCache.delete(CacheKeys.price(symbol))
    })
    return fetchPrices()
  }, [symbols, fetchPrices])

  return {
    prices,
    loading,
    error,
    lastUpdate,
    refetch,
    isStale: lastUpdate ? Date.now() - lastUpdate.getTime() > staleTime : true
  }
}

/**
 * Оптимизированный хук для получения балансов
 */
export function useOptimizedBalances(
  tokens: string[],
  options: UseOptimizedDataOptions = {}
) {
  const { apiCall } = useCompatibleAuth()
  const {
    enabled = true,
    refetchInterval = 15000, // 15 секунд
    cacheTime = 2 * 60 * 1000, // 2 минуты
    staleTime = 5000 // 5 секунд
  } = options

  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const tokensKey = useMemo(() => tokens.sort().join(','), [tokens])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchBalances = useCallback(async () => {
    if (!enabled || tokens.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const balancePromises = tokens.map(async token => {
        const response = await apiCall(`/api/tokens/${token.toLowerCase()}/balance`)
        if (response.ok) {
          const data = await response.json()
          return data.balance || 0
        }
        return 0
      })

      const balanceValues = await Promise.all(balancePromises)
      const balanceMap = tokens.reduce((acc, token, index) => {
        acc[token] = balanceValues[index]
        return acc
      }, {} as Record<string, number>)

      setBalances(balanceMap)
      setLastUpdate(new Date())

      // Кэшируем результаты
      tokens.forEach(token => {
        balanceCache.set(CacheKeys.balance('current-user', token), balanceMap[token], { ttl: cacheTime })
      })
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [enabled, tokensKey, cacheTime, apiCall])

  // Дебаунсированная версия для частых обновлений
  const debouncedFetch = useMemo(
    () => debounce(fetchBalances, 1000),
    [fetchBalances]
  )

  // Проверяем кэш при изменении токенов
  useEffect(() => {
    if (!enabled) return

    const cachedBalances: Record<string, number> = {}
    let hasAllCached = true

    tokens.forEach(token => {
      const cached = balanceCache.get<number>(CacheKeys.balance('current-user', token))
      if (cached !== null) {
        cachedBalances[token] = cached
      } else {
        hasAllCached = false
      }
    })

    if (hasAllCached && Object.keys(cachedBalances).length > 0) {
      setBalances(cachedBalances)
      setLastUpdate(new Date())
    } else {
      fetchBalances()
    }
  }, [tokensKey, enabled, fetchBalances])

  // Настраиваем автообновление
  useEffect(() => {
    if (!enabled || !refetchInterval) return

    intervalRef.current = setInterval(fetchBalances, refetchInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, refetchInterval, fetchBalances])

  const refetch = useCallback(() => {
    tokens.forEach(token => {
      balanceCache.delete(CacheKeys.balance('current-user', token))
    })
    return fetchBalances()
  }, [tokens, fetchBalances])

  return {
    balances,
    loading,
    error,
    lastUpdate,
    refetch,
    debouncedRefetch: debouncedFetch,
    isStale: lastUpdate ? Date.now() - lastUpdate.getTime() > staleTime : true
  }
}

/**
 * Оптимизированный хук для аналитических данных
 */
export function useOptimizedAnalytics(
  userId: string,
  dataType: string,
  options: UseOptimizedDataOptions = {}
) {
  const { apiCall } = useCompatibleAuth()
  const {
    enabled = true,
    refetchInterval = 60000, // 1 минута
    cacheTime = 10 * 60 * 1000, // 10 минут
    staleTime = 30000 // 30 секунд
  } = options

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const cacheKey = CacheKeys.analytics(userId, dataType)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled || !userId) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiCall(`/api/defi/analytics?type=${dataType}&userId=${userId}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
        setLastUpdate(new Date())

        // Кэшируем результат
        globalCache.set(cacheKey, result.data, { ttl: cacheTime })
      } else {
        throw new Error('Failed to fetch analytics data')
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [enabled, userId, dataType, cacheKey, cacheTime, apiCall])

  // Проверяем кэш
  useEffect(() => {
    if (!enabled || !userId) return

    const cached = globalCache.get(cacheKey)
    if (cached !== null) {
      setData(cached)
      setLastUpdate(new Date())
    } else {
      fetchData()
    }
  }, [enabled, userId, dataType, cacheKey, fetchData])

  // Настраиваем автообновление
  useEffect(() => {
    if (!enabled || !refetchInterval) return

    intervalRef.current = setInterval(fetchData, refetchInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, refetchInterval, fetchData])

  const refetch = useCallback(() => {
    globalCache.delete(cacheKey)
    return fetchData()
  }, [cacheKey, fetchData])

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch,
    isStale: lastUpdate ? Date.now() - lastUpdate.getTime() > staleTime : true
  }
}

/**
 * Хук для оптимизированного получения позиций пользователя
 */
export function useOptimizedPositions(
  userId: string,
  options: UseOptimizedDataOptions = {}
) {
  return useOptimizedAnalytics(userId, 'positions', {
    refetchInterval: 30000, // 30 секунд
    cacheTime: 5 * 60 * 1000, // 5 минут
    staleTime: 15000, // 15 секунд
    ...options
  })
}

/**
 * Хук для оптимизированного получения рисков портфеля
 */
export function useOptimizedRiskMetrics(
  userId: string,
  options: UseOptimizedDataOptions = {}
) {
  return useOptimizedAnalytics(userId, 'risk', {
    refetchInterval: 45000, // 45 секунд
    cacheTime: 8 * 60 * 1000, // 8 минут
    staleTime: 20000, // 20 секунд
    ...options
  })
}

/**
 * Хук для предварительной загрузки данных
 */
export function useDataPreloader() {
  const preloadPrices = useCallback(async (symbols: string[]) => {
    const promises = symbols.map(symbol => 
      priceBatcher.request(symbol, symbol).catch(() => 0)
    )
    await Promise.all(promises)
  }, [])

  const preloadUserData = useCallback(async (userId: string) => {
    const { apiCall } = useCompatibleAuth()
    
    try {
      const promises = [
        apiCall(`/api/defi/staking?userId=${userId}`),
        apiCall(`/api/defi/farming?userId=${userId}`),
        apiCall(`/api/defi/lending?userId=${userId}`)
      ]

      await Promise.all(promises)
    } catch (error) {
      console.warn('Failed to preload user data:', error)
    }
  }, [])

  return {
    preloadPrices,
    preloadUserData
  }
}
