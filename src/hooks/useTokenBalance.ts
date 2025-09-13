'use client'

/**
 * Universal Token Balance Hook - Единый интерфейс для всех токенов
 * Solana SuperApp - Упрощение работы с балансами
 */

import { useState, useEffect, useCallback } from 'react'
import { useCachedBalance } from './useCachedBalance'
import { usePrices } from './usePrices'
import { formatTokenBalance, formatUSDValue } from '@/lib/formatters'

interface TokenBalanceResult {
  // Основные данные
  balance: number
  formattedBalance: string
  usdValue: number
  formattedUSDValue: string
  
  // Состояние
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  
  // Действия
  refresh: () => Promise<number>
  clearCache: () => void
  
  // Утилиты
  isZero: boolean
  hasBalance: boolean
  isCacheValid: boolean
}

interface UseTokenBalanceOptions {
  // Опции кеширования
  cacheTime?: number
  autoRefresh?: boolean
  debounceTime?: number
  
  // Опции форматирования
  formatType?: 'full' | 'short' | 'visual'
  showUSD?: boolean
  
  // Цены для расчета USD (если не указано, используются моковые)
  customPrices?: {
    SOL?: number
    TNG?: number
    USDC?: number
  }
}

// Fallback цены если API недоступен
const FALLBACK_PRICES = {
  SOL: 200.45,
  TNG: 0.002,
  USDC: 1.0
} as const

export function useTokenBalance(
  token: 'SOL' | 'TNG' | 'USDC',
  options: UseTokenBalanceOptions = {},
  externalPrice?: number // Передаем цену извне чтобы избежать дублирования запросов
): TokenBalanceResult {
  const {
    cacheTime = 30 * 1000,
    autoRefresh = true,
    debounceTime = 1000,
    formatType = 'visual',
    showUSD = true,
    customPrices = {}
  } = options

  // Используем кешированный хук для получения баланса
  const {
    balance,
    loading,
    error,
    lastUpdated,
    refreshBalance,
    clearCache,
    isCacheValid
  } = useCachedBalance(token, {
    cacheTime,
    autoRefresh,
    debounceTime
  })

  // Получаем цену токена (внешняя, кастомная или fallback)
  const tokenPrice = externalPrice ?? customPrices[token] ?? FALLBACK_PRICES[token]

  // Рассчитываем USD стоимость
  const usdValue = balance * tokenPrice

  // Форматируем баланс
  const formattedBalance = formatTokenBalance(balance, token, formatType as any)

  // Форматируем USD стоимость
  const formattedUSDValue = showUSD ? formatUSDValue(usdValue) : '$0.00'

  // Утилиты
  const isZero = balance === 0
  const hasBalance = balance > 0

  return {
    // Основные данные
    balance,
    formattedBalance,
    usdValue,
    formattedUSDValue,
    
    // Состояние
    loading,
    error,
    lastUpdated,
    
    // Действия
    refresh: refreshBalance,
    clearCache,
    
    // Утилиты
    isZero,
    hasBalance,
    isCacheValid: isCacheValid()
  }
}

// Хук для получения портфеля (всех балансов сразу)
export function usePortfolioBalances(options: UseTokenBalanceOptions = {}) {
  // Получаем цены ОДИН РАЗ для всех токенов
  const { getPrices, loading: pricesLoading } = usePrices()
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [pricesLoaded, setPricesLoaded] = useState(false)

  // Мемоизируем функцию загрузки цен с лучшей стабилизацией
  const loadPricesOnce = useCallback(async () => {
    if (!pricesLoaded && !pricesLoading) {
      try {
        const priceData = await getPrices(['SOL', 'TNG', 'USDC'], true, false)
        setPrices(priceData)
        setPricesLoaded(true)

      } catch (error) {
        console.warn(' Failed to load prices, using fallback:', error)
        // Используем fallback цены
        setPrices({
          SOL: { price: FALLBACK_PRICES.SOL },
          TNG: { price: FALLBACK_PRICES.TNG },
          USDC: { price: FALLBACK_PRICES.USDC }
        })
        setPricesLoaded(true)
      }
    }
  }, [pricesLoaded, pricesLoading, getPrices])

  // Загружаем цены только один раз при инициализации
  useEffect(() => {
    let mounted = true
    
    const initPrices = async () => {
      if (mounted) {
        await loadPricesOnce()
      }
    }
    
    initPrices()
    
    return () => {
      mounted = false
    }
  }, []) // Убираем loadPricesOnce из зависимостей для стабильности

  // Используем балансы с переданными ценами (без дублирования запросов)
  const solBalance = useTokenBalance('SOL', options, prices.SOL?.price)
  const tngBalance = useTokenBalance('TNG', options, prices.TNG?.price)
  const usdcBalance = useTokenBalance('USDC', options, prices.USDC?.price)

  // Общая USD стоимость портфеля
  const totalUSDValue = solBalance.usdValue + tngBalance.usdValue + usdcBalance.usdValue
  const formattedTotalUSD = formatUSDValue(totalUSDValue)

  // Состояние загрузки (если хотя бы один токен загружается)
  const loading = solBalance.loading || tngBalance.loading || usdcBalance.loading

  // Ошибки (собираем все ошибки)
  const errors = [solBalance.error, tngBalance.error, usdcBalance.error].filter(Boolean)
  const hasErrors = errors.length > 0

  // Последовательная загрузка: TNG → SOL → USDC (БЕЗ автоповторов)
  const loadSequentially = useCallback(async () => {
    try {
      // 1. Сначала TNG (основной токен проекта)
      await tngBalance.refresh()
      
      // 2. Затем SOL (базовая валюта)
      await solBalance.refresh()
      
      // 3. Наконец USDC (если нужен для расчетов)
      if (options.showUSD !== false) {
        await usdcBalance.refresh()
      }
    } catch (error) {
      throw error
    }
  }, [tngBalance.refresh, solBalance.refresh, usdcBalance.refresh, options.showUSD])

  // Обновление всех балансов (параллельно для скорости)
  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        tngBalance.refresh(), // TNG первым
        solBalance.refresh(), // SOL вторым
        usdcBalance.refresh() // USDC последним
      ])
    } catch (error) {
      // Silent error handling for production
    }
  }, [tngBalance, solBalance, usdcBalance])

  // Очистка всех кешей
  const clearAllCache = () => {
    solBalance.clearCache()
    tngBalance.clearCache()
    usdcBalance.clearCache()
  }

  return {
    // Балансы по токенам
    SOL: solBalance,
    TNG: tngBalance,
    USDC: usdcBalance,
    
    // Общая информация о портфеле
    totalUSDValue,
    formattedTotalUSD,
    
    // Состояние
    loading,
    hasErrors,
    errors,
    
    // Действия
    loadSequentially, // TNG → SOL порядок
    refreshAll,
    clearAllCache,
    
    // Утилиты
    hasAnyBalance: solBalance.hasBalance || tngBalance.hasBalance || usdcBalance.hasBalance,
    isEmpty: solBalance.isZero && tngBalance.isZero && usdcBalance.isZero
  }
}

// Хук для конкретного токена с дополнительной бизнес-логикой
export function useSOLBalance(options?: UseTokenBalanceOptions) {
  return useTokenBalance('SOL', {
    ...options,
    formatType: 'visual'
  })
}

export function useTNGBalance(options?: UseTokenBalanceOptions) {
  return useTokenBalance('TNG', {
    ...options,
    formatType: 'visual'
  })
}

export function useUSDCBalance(options?: UseTokenBalanceOptions) {
  return useTokenBalance('USDC', {
    ...options,
    formatType: 'full'
  })
}

// Утилита для сравнения балансов
export function compareBalances(
  balance1: ReturnType<typeof useTokenBalance>,
  balance2: ReturnType<typeof useTokenBalance>
) {
  return {
    isBalance1Higher: balance1.usdValue > balance2.usdValue,
    isBalance2Higher: balance2.usdValue > balance1.usdValue,
    isEqual: Math.abs(balance1.usdValue - balance2.usdValue) < 0.01,
    difference: Math.abs(balance1.usdValue - balance2.usdValue),
    formattedDifference: formatUSDValue(Math.abs(balance1.usdValue - balance2.usdValue))
  }
}
