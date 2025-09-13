'use client'

/**
 * Cached Balance Hook - Предотвращение спама запросов балансов
 * Solana SuperApp - Оптимизация производительности
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface BalanceCache {
  [key: string]: {
    value: number
    timestamp: number
    loading: boolean
  }
}

interface UseCachedBalanceOptions {
  cacheTime?: number // Время кеша в миллисекундах (по умолчанию 30 секунд)
  autoRefresh?: boolean // Автоматическое обновление при изменении авторизации
  debounceTime?: number // Время дебаунса для предотвращения множественных запросов
}

const DEFAULT_CACHE_TIME = 30 * 1000 // 30 секунд
const DEFAULT_DEBOUNCE_TIME = 1000 // 1 секунда

// Глобальный кеш для всех компонентов
const globalBalanceCache: BalanceCache = {}
const activeRequests = new Set<string>()

export function useCachedBalance(
  token: 'SOL' | 'TNG' | 'USDC',
  options: UseCachedBalanceOptions = {}
) {
  const {
    cacheTime = DEFAULT_CACHE_TIME,
    autoRefresh = true, //  ВКЛЮЧАЕМ автообновление по умолчанию
    debounceTime = DEFAULT_DEBOUNCE_TIME
  } = options

  const { apiCall, isAuthenticated, user } = useAuth()
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cacheKey = `${user?.id || 'anonymous'}-${token}`

  // Проверка кеша
  const getCachedBalance = useCallback(() => {
    const cached = globalBalanceCache[cacheKey]
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > cacheTime
    if (isExpired) {
      delete globalBalanceCache[cacheKey]
      return null
    }

    return cached
  }, [cacheKey, cacheTime])

  // Обновление кеша
  const updateCache = useCallback((value: number, loading: boolean = false) => {
    globalBalanceCache[cacheKey] = {
      value,
      timestamp: Date.now(),
      loading
    }
  }, [cacheKey])

  // Получение баланса с API
  const fetchBalance = useCallback(async (forceRefresh: boolean = false) => {
    if (!isAuthenticated || !user) {
      setBalance(0)
      setError(null)
      return 0
    }

    // Проверяем кеш если не принудительное обновление
    if (!forceRefresh) {
      const cached = getCachedBalance()
      if (cached && !cached.loading) {
        setBalance(cached.value)
        setLoading(false)
        setError(null)
        setLastUpdated(new Date(cached.timestamp))
        return cached.value
      }
    }

    // Предотвращаем дублирование запросов
    if (activeRequests.has(cacheKey)) {
      return balance
    }

    try {
      activeRequests.add(cacheKey)
      setLoading(true)
      setError(null)
      updateCache(balance, true)

      let apiResponse: Response
      let data: any

      if (token === 'SOL') {
        // SOL баланс через оптимизированный API
        apiResponse = await apiCall('/api/tokens/sol/balance')
        data = await apiResponse.json()
        
        if (data.success && data.data?.balance?.sol) {
          const solBalance = Number(data.data.balance.sol) || 0
          setBalance(solBalance)
          updateCache(solBalance)
          setLastUpdated(new Date())
          return solBalance
        }
      } else if (token === 'TNG') {
        // TNG баланс через оптимизированный API
        apiResponse = await apiCall('/api/tokens/tng/balance')
        data = await apiResponse.json()
        
        if (data.success && data.data?.balance?.amount) {
          const tngBalance = Number(data.data.balance.amount) / 1e9 || 0
          setBalance(tngBalance)
          updateCache(tngBalance)
          setLastUpdated(new Date())
          return tngBalance
        }
      } else if (token === 'USDC') {
        // USDC баланс через ledger API (только при необходимости)
        apiResponse = await apiCall(`/api/ledger/balances?asset=${token}`)
        data = await apiResponse.json()
        
        if (data.success && data.data?.balance?.total) {
          const usdcBalance = Number(data.data.balance.total) || 0
          setBalance(usdcBalance)
          updateCache(usdcBalance)
          setLastUpdated(new Date())
          return usdcBalance
        }
      }

      // Если ничего не получили, устанавливаем 0
      setBalance(0)
      updateCache(0)
      setLastUpdated(new Date())
      return 0

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка получения баланса'
      setError(errorMessage)
      setBalance(0)
      updateCache(0)
      return 0
    } finally {
      setLoading(false)
      activeRequests.delete(cacheKey)
    }
  }, [isAuthenticated, user, token, cacheKey, balance, apiCall, getCachedBalance, updateCache])

  // Дебаунсированная функция обновления
  const debouncedFetch = useCallback((forceRefresh: boolean = false) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchBalance(forceRefresh)
    }, debounceTime)
  }, [fetchBalance, debounceTime])

  // Принудительное обновление без дебаунса
  const refreshBalance = useCallback(() => {
    return fetchBalance(true)
  }, [fetchBalance])

  // Инициализация при монтировании (только кеш, БЕЗ автозапросов)
  useEffect(() => {
    let mounted = true
    
    if (isAuthenticated && user && mounted) {
      // Проверяем только кеш, НЕ делаем новые запросы
      const cached = getCachedBalance()
      if (cached && !cached.loading) {
        setBalance(cached.value)
        setLoading(false)
        setLastUpdated(new Date(cached.timestamp))

      } else if (autoRefresh) {
        //  Автоматически загружаем баланс если включен autoRefresh
        console.log(` Auto-loading ${token} balance for user ${user?.id}`)
        debouncedFetch(false)
      } else {
        setBalance(0)
        setError(null)
        setLoading(false)
      }
    } else {
      setBalance(0)
      setError(null)
      setLoading(false)
    }

    // Очистка timeout при размонтировании
    return () => {
      mounted = false
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [isAuthenticated, user?.id, token]) // Зависим только от основных изменений

  // Очистка кеша для данного токена
  const clearCache = useCallback(() => {
    delete globalBalanceCache[cacheKey]
    // Также очищаем активные запросы
    activeRequests.delete(cacheKey)
    console.log(` Cache cleared for ${token} (${cacheKey})`)
  }, [cacheKey, token])

  // Проверка актуальности кеша
  const isCacheValid = useCallback(() => {
    const cached = getCachedBalance()
    return !!cached
  }, [getCachedBalance])

  return {
    balance,
    loading,
    error,
    lastUpdated,
    refreshBalance,
    clearCache,
    isCacheValid,
    // Утилиты для отладки
    _cacheKey: cacheKey,
    _cached: getCachedBalance()
  }
}

// Утилита для предварительной загрузки балансов
export function preloadBalances(tokens: Array<'SOL' | 'TNG' | 'USDC'>) {
  // Эта функция может быть использована для предзагрузки балансов
  // например, при входе пользователя в систему
  console.log(' Preloading balances for tokens:', tokens)
  // Здесь можно добавить логику предзагрузки
}

// Утилита для очистки всего кеша
export function clearAllBalanceCache() {
  Object.keys(globalBalanceCache).forEach(key => {
    delete globalBalanceCache[key]
  })
}

// Утилита для получения статистики кеша
export function getBalanceCacheStats() {
  const keys = Object.keys(globalBalanceCache)
  const validEntries = keys.filter(key => {
    const cached = globalBalanceCache[key]
    return cached && (Date.now() - cached.timestamp) < DEFAULT_CACHE_TIME
  })

  return {
    totalEntries: keys.length,
    validEntries: validEntries.length,
    expiredEntries: keys.length - validEntries.length,
    cacheKeys: keys
  }
}
