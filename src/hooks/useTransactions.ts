/**
 * Transactions Hook - Fetch user transaction history
 * Solana SuperApp
 */

'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface Transaction {
  id: string
  type: 'send' | 'receive' | 'swap'
  status: 'confirmed' | 'pending' | 'failed'
  token: string
  amount: string
  usdAmount: string
  fee?: string
  from?: string
  to?: string
  fromUsername?: string
  toUsername?: string
  isAnonymous?: boolean
  signature?: string
  timestamp: Date
  memo?: string
  blockTime?: Date
}

export interface TransactionFilters {
  type?: 'send' | 'receive' | 'swap'
  status?: 'confirmed' | 'pending' | 'failed'
  token?: string
  limit?: number
  offset?: number
}

export function useTransactions() {
  const { apiCall } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTransactions = useCallback(async (filters: TransactionFilters = {}): Promise<{
    transactions: Transaction[]
    hasMore: boolean
    total: number
  }> => {
    const params = new URLSearchParams()
    
    try {
      setLoading(true)
      setError(null)
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)
      if (filters.token) params.append('token', filters.token)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await apiCall(`/api/transactions?${params.toString()}`)
      
      if (!response.ok) {
        let errorMessage = 'Ошибка загрузки транзакций'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Если не удается распарсить JSON ошибки, используем статус
          errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Проверяем структуру данных
      if (!data || !data.data || !Array.isArray(data.data.transactions)) {
        throw new Error('Некорректный формат данных от сервера')
      }

      return {
        transactions: data.data.transactions.map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
          blockTime: tx.blockTime ? new Date(tx.blockTime) : undefined
        })),
        hasMore: data.data.pagination.hasMore,
        total: data.data.pagination.total
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('Ошибка загрузки транзакций:', {
        error: errorMsg,
        url: `/api/transactions?${params.toString()}`,
        filters
      })
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const getRecentTransactions = useCallback(async (limit = 5): Promise<Transaction[]> => {
    const result = await getTransactions({ limit })
    return result.transactions
  }, [getTransactions])

  return {
    getTransactions,
    getRecentTransactions,
    loading,
    error
  }
}
