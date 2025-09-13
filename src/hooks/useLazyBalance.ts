'use client'

/**
 * Lazy Balance Hook - Ленивая загрузка балансов только при необходимости
 * Solana SuperApp - Максимальная оптимизация производительности
 */

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LazyBalanceState {
  value: number
  loading: boolean
  error: string | null
  loaded: boolean
  lastUpdated: Date | null
}

const initialState: LazyBalanceState = {
  value: 0,
  loading: false,
  error: null,
  loaded: false,
  lastUpdated: null
}

export function useLazyBalance(token: 'SOL' | 'TNG' | 'USDC') {
  const { apiCall, isAuthenticated } = useAuth()
  const [state, setState] = useState<LazyBalanceState>(initialState)
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Ленивая загрузка - вызывается только при необходимости
  const load = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      setState(initialState)
      return 0
    }

    // Предотвращаем дублирование запросов
    if (loadingRef.current && !force) {
      return state.value
    }

    // Если уже загружено и не принудительное обновление
    if (state.loaded && !force) {
      return state.value
    }

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    loadingRef.current = true

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let apiResponse: Response
      
      if (token === 'SOL') {
        apiResponse = await apiCall('/api/tokens/sol/balance', {
          signal: abortControllerRef.current.signal
        })
      } else if (token === 'TNG') {
        apiResponse = await apiCall('/api/tokens/tng/balance', {
          signal: abortControllerRef.current.signal
        })
      } else {
        apiResponse = await apiCall(`/api/ledger/balances?asset=${token}`, {
          signal: abortControllerRef.current.signal
        })
      }

      const data = await apiResponse.json()
      
      let balance = 0
      
      if (data.success) {
        if (token === 'SOL' && data.data?.balance?.sol) {
          balance = Number(data.data.balance.sol) || 0
        } else if (token === 'TNG' && data.data?.balance?.amount) {
          balance = Number(data.data.balance.amount) / 1e9 || 0
        } else if (token === 'USDC' && data.data?.balance?.total) {
          balance = Number(data.data.balance.total) || 0
        }
      }

      setState({
        value: balance,
        loading: false,
        error: null,
        loaded: true,
        lastUpdated: new Date()
      })

      return balance

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Запрос был отменен, не считается ошибкой
        return state.value
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки баланса'
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        loaded: true 
      }))
      return 0
    } finally {
      loadingRef.current = false
    }
  }, [token, apiCall, isAuthenticated, state.value, state.loaded])

  // Принудительное обновление
  const refresh = useCallback(() => {
    return load(true)
  }, [load])

  // Сброс состояния
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState(initialState)
    loadingRef.current = false
  }, [])

  // Отмена загрузки
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    loadingRef.current = false
  }, [])

  return {
    // Данные
    balance: state.value,
    loading: state.loading,
    error: state.error,
    loaded: state.loaded,
    lastUpdated: state.lastUpdated,
    
    // Действия
    load,
    refresh,
    reset,
    cancel,
    
    // Утилиты
    hasBalance: state.value > 0,
    isZero: state.value === 0,
    isStale: state.lastUpdated ? (Date.now() - state.lastUpdated.getTime()) > 60000 : true // 1 минута
  }
}

// Утилитарные хуки для конкретных токенов
export const useLazySOLBalance = () => useLazyBalance('SOL')
export const useLazyTNGBalance = () => useLazyBalance('TNG')
export const useLazyUSDCBalance = () => useLazyBalance('USDC')
