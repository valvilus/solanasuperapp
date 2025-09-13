'use client'

/**
 * Service Initializer Hook - Предотвращение дублирования инициализаций
 * Solana SuperApp - Оптимизация производительности
 */

import { useRef, useEffect } from 'react'

// Глобальный реестр инициализированных сервисов
const globalServiceRegistry = new Map<string, any>()
const initializationPromises = new Map<string, Promise<any>>()

interface UseServiceInitializerOptions<T> {
  // Уникальный ключ сервиса
  serviceKey: string
  
  // Функция инициализации (вызывается только один раз)
  initializeFn: () => T | Promise<T>
  
  // Время жизни кеша (по умолчанию бесконечно)
  ttl?: number
  
  // Зависимости для переинициализации
  dependencies?: any[]
  
  // Функция очистки при размонтировании
  cleanupFn?: (service: T) => void
  
  // Логирование (для отладки)
  enableLogging?: boolean
}

export function useServiceInitializer<T>(options: UseServiceInitializerOptions<T>): {
  service: T | null
  isInitialized: boolean
  isInitializing: boolean
  error: Error | null
  reinitialize: () => Promise<void>
} {
  const {
    serviceKey,
    initializeFn,
    ttl,
    dependencies = [],
    cleanupFn,
    enableLogging = false
  } = options

  const serviceRef = useRef<T | null>(null)
  const isInitializedRef = useRef(false)
  const isInitializingRef = useRef(false)
  const errorRef = useRef<Error | null>(null)
  const lastInitTimeRef = useRef<number>(0)

  // Проверка актуальности кеша
  const isCacheValid = () => {
    if (!ttl) return true
    return Date.now() - lastInitTimeRef.current < ttl
  }

  // Создание уникального ключа с зависимостями
  const cacheKey = `${serviceKey}_${JSON.stringify(dependencies)}`

  // Функция инициализации
  const initialize = async (): Promise<T | null> => {
    try {
      // Проверяем глобальный кеш
      if (globalServiceRegistry.has(cacheKey) && isCacheValid()) {
        const cachedService = globalServiceRegistry.get(cacheKey)
        if (enableLogging) {
          console.log(` Service "${serviceKey}" loaded from cache`)
        }
        serviceRef.current = cachedService
        isInitializedRef.current = true
        return cachedService
      }

      // Предотвращаем множественные инициализации
      if (initializationPromises.has(cacheKey)) {
        if (enableLogging) {
          console.log(` Service "${serviceKey}" initialization in progress, waiting...`)
        }
        const service = await initializationPromises.get(cacheKey)!
        serviceRef.current = service
        isInitializedRef.current = true
        return service
      }

      // Начинаем инициализацию
      isInitializingRef.current = true
      errorRef.current = null

      if (enableLogging) {
        console.log(` Initializing service "${serviceKey}"...`)
      }

      const initPromise = Promise.resolve(initializeFn())
      initializationPromises.set(cacheKey, initPromise)

      const service = await initPromise

      // Сохраняем в кеш
      globalServiceRegistry.set(cacheKey, service)
      lastInitTimeRef.current = Date.now()

      // Очищаем промис инициализации
      initializationPromises.delete(cacheKey)

      serviceRef.current = service
      isInitializedRef.current = true
      isInitializingRef.current = false

      if (enableLogging) {
        console.log(` Service "${serviceKey}" initialized successfully`)
      }

      return service

    } catch (error) {
      isInitializingRef.current = false
      errorRef.current = error instanceof Error ? error : new Error(String(error))
      
      // Очищаем неудачный промис
      initializationPromises.delete(cacheKey)

      if (enableLogging) {
        console.error(` Service "${serviceKey}" initialization failed:`, error)
      }

      return null
    }
  }

  // Принудительная переинициализация
  const reinitialize = async () => {
    // Очищаем кеш
    globalServiceRegistry.delete(cacheKey)
    initializationPromises.delete(cacheKey)
    
    // Очистка старого сервиса
    if (serviceRef.current && cleanupFn) {
      try {
        cleanupFn(serviceRef.current)
      } catch (error) {
        console.warn(`Warning: Cleanup failed for service "${serviceKey}":`, error)
      }
    }

    serviceRef.current = null
    isInitializedRef.current = false
    errorRef.current = null

    await initialize()
  }

  // Инициализация при изменении зависимостей
  useEffect(() => {
    initialize()
  }, [cacheKey]) // cacheKey включает dependencies

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (serviceRef.current && cleanupFn) {
        try {
          cleanupFn(serviceRef.current)
        } catch (error) {
          console.warn(`Warning: Cleanup failed for service "${serviceKey}":`, error)
        }
      }
    }
  }, [])

  return {
    service: serviceRef.current,
    isInitialized: isInitializedRef.current,
    isInitializing: isInitializingRef.current,
    error: errorRef.current,
    reinitialize
  }
}

// Фабричные функции для часто используемых сервисов
export function useTNGTokenService() {
  return useServiceInitializer({
    serviceKey: 'TNGTokenService',
    initializeFn: async () => {
      // Проверяем, что мы на сервере
      if (typeof window !== 'undefined') {
        // В браузере возвращаем заглушку
        return {
          isReady: () => true,
          getBalance: () => Promise.resolve(0),
          // Заглушка для клиентской стороны
        }
      }

      const { Connection } = await import('@solana/web3.js')
      const { TNGTokenService } = await import('@/lib/onchain/tng-token.service')
      
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )
      
      return new TNGTokenService(connection)
    },
    ttl: 10 * 60 * 1000, // 10 минут
    enableLogging: process.env.NODE_ENV === 'development'
  })
}

export function useCustodialWalletService() {
  return useServiceInitializer({
    serviceKey: 'CustodialWalletService',
    initializeFn: async () => {
      const { CustodialWalletService } = await import('@/lib/wallet')
      const { prisma } = await import('@/lib/prisma')
      
      return new CustodialWalletService(prisma)
    },
    ttl: 30 * 60 * 1000, // 30 минут
    enableLogging: false
  })
}

export function useSponsorService() {
  return useServiceInitializer({
    serviceKey: 'SponsorService', 
    initializeFn: async () => {
      const { SponsorService } = await import('@/lib/wallet/sponsor.service')
      
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
      return new SponsorService(connection)
    },
    ttl: 60 * 60 * 1000, // 1 час
    enableLogging: false
  })
}

// Утилиты для управления глобальным кешем
export function clearServiceCache(serviceKey?: string) {
  if (serviceKey) {
    // Очистка конкретного сервиса
    const keys = Array.from(globalServiceRegistry.keys()).filter(key => key.startsWith(serviceKey))
    keys.forEach(key => globalServiceRegistry.delete(key))
  } else {
    // Очистка всего кеша
    globalServiceRegistry.clear()
    initializationPromises.clear()
  }
}

export function getServiceCacheStats() {
  return {
    registrySize: globalServiceRegistry.size,
    activeInitializations: initializationPromises.size,
    cachedServices: Array.from(globalServiceRegistry.keys())
  }
}

// Утилита для получения статистики всех сервисов
export function getServiceStats() {
  return {
    totalServices: globalServiceRegistry.size,
    activeServices: Array.from(globalServiceRegistry.keys()),
    initializationPromises: initializationPromises.size
  }
}
