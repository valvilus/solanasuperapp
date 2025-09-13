/**
 * Onchain Operations Hook - Integration with Backend Services
 * Solana SuperApp - Block 4: Integration
 */

'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// =============================================================================
// TYPES
// =============================================================================

export interface DepositInfo {
  id: string
  signature: string
  amount: string
  token: string
  status: string
  createdAt: string
  confirmedAt?: string
}

export interface WithdrawalRequest {
  toAddress: string
  amount: string
  token?: string
  memo?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface WithdrawalInfo {
  id: string
  signature?: string
  amount: string
  token: string
  toAddress: string
  status: string
  createdAt: string
  submittedAt?: string
  confirmedAt?: string
}

export interface IndexerStatus {
  isRunning: boolean
  lastProcessedSlot: number
  addressCount: number
  timestamp: string
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useOnchainOperations() {
  const { apiCall: contextApiCall } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =============================================================================
  // UTILITIES
  // =============================================================================

  const apiCall = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    // Use the enhanced apiCall from AuthContext for automatic token refresh
    return contextApiCall(endpoint, options)
  }, [contextApiCall])

  const clearError = useCallback(() => setError(null), [])

  // =============================================================================
  // DEPOSIT OPERATIONS
  // =============================================================================

  const getDeposits = useCallback(async (limit = 20): Promise<DepositInfo[]> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/onchain/deposits?limit=${limit}`)
      const data = await response.json();
      
      if (data.success) {
        return data.data.deposits
      }
      
      throw new Error(data.error || 'Ошибка получения депозитов')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const monitorDeposits = useCallback(async (): Promise<DepositInfo[]> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/onchain/deposits', {
        method: 'POST'
      })
      const data = await response.json();
      
      if (data.success) {
        return data.data.newDeposits
      }
      
      throw new Error(data.error || 'Ошибка мониторинга депозитов')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // =============================================================================
  // WITHDRAWAL OPERATIONS
  // =============================================================================

  const getWithdrawals = useCallback(async (limit = 20): Promise<WithdrawalInfo[]> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/onchain/withdrawals?limit=${limit}`)
      const data = await response.json();
      
      if (data.success) {
        return data.data.withdrawals
      }
      
      throw new Error(data.error || 'Ошибка получения выводов')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const createWithdrawal = useCallback(async (request: WithdrawalRequest): Promise<WithdrawalInfo> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/onchain/withdrawals', {
        method: 'POST',
        body: JSON.stringify(request)
      })
      const data = await response.json();
      
      if (data.success) {
        return data.data.withdrawal
      }
      
      throw new Error(data.error || 'Ошибка создания вывода')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // =============================================================================
  // INDEXER OPERATIONS
  // =============================================================================

  const getIndexerStatus = useCallback(async (includeStats = false): Promise<IndexerStatus> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/onchain/indexer?stats=${includeStats}`)
      const data = await response.json();
      
      if (data.success) {
        return data.data.indexer || {
          isRunning: false,
          lastProcessedSlot: 0,
          addressCount: 0,
          timestamp: new Date().toISOString()
        }
      }
      
      throw new Error(data.error || 'Ошибка получения статуса индексера')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const startIndexer = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/onchain/indexer', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' })
      })
      
      const data = await response.json()
      return data.success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const stopIndexer = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/onchain/indexer', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' })
      })
      
      const data = await response.json()
      return data.success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const forceProcessIndexer = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/onchain/indexer', {
        method: 'POST',
        body: JSON.stringify({ action: 'force_process' })
      })
      
      const data = await response.json()
      return data.success
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      return false
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // =============================================================================
  // TNG TOKEN OPERATIONS
  // =============================================================================

  const getTNGFaucet = useCallback(async (amount?: string): Promise<{ success: boolean; error?: string; nextAvailable?: Date }> => {
    try {
      setLoading(true)
      setError(null)

      const body = amount ? JSON.stringify({ amount }) : undefined

      const response = await contextApiCall('/api/tokens/tng/faucet', {
        method: 'POST',
        body
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        return { success: true }
      }
      
      // Handle rate limit specifically
      if (response.status === 429) {
        const errorMsg = data.error || 'Faucet можно использовать только раз в час'
        setError(errorMsg)
        return { 
          success: false, 
          error: errorMsg,
          nextAvailable: data.nextAvailable ? new Date(data.nextAvailable) : undefined
        }
      }
      
      const errorMsg = data.error || 'Ошибка получения TNG токенов'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [contextApiCall])

  const getTNGFaucetInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/tokens/tng/faucet')
      const data = await response.json();
      
      if (data.success) {
        return data.data
      }
      
      throw new Error(data.error || 'Ошибка получения информации о faucet')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // =============================================================================
  // ON-CHAIN TRANSFER OPERATIONS
  // =============================================================================

  // On-chain SOL transfer with sponsor support
  const transferSOLOnchain = async (
    toAddress: string,
    amount: number,
    memo?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      console.log(' Initiating on-chain SOL transfer:', { toAddress, amount, memo, priority })

      const response = await contextApiCall('/api/onchain/transfers', {
        method: 'POST',
        body: JSON.stringify({
          toAddress,
          asset: 'SOL',
          amount: (amount * 1e9).toString(), // Convert to lamports
          memo,
          priority,
          idempotencyKey: `sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка on-chain SOL перевода')
      }

      const data = await response.json()
      
      if (data.success) {
        console.log(' On-chain SOL transfer successful:', data.data.transaction)
        return {
          success: true,
          signature: data.data.transaction.signature,
          explorerUrl: data.data.transaction.explorerUrl,
          fee: data.data.transaction.fee,
          status: data.data.transaction.status
        }
      } else {
        throw new Error(data.error || 'Неизвестная ошибка')
      }
    } catch (error) {
      console.error(' On-chain SOL transfer failed:', error)
      setError(error instanceof Error ? error.message : 'Ошибка SOL перевода')
      throw error
    }
  }

  // On-chain TNG transfer with sponsor support
  const transferTNGOnchain = async (
    toAddress: string,
    amount: number,
    memo?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      console.log(' Initiating on-chain TNG transfer:', { toAddress, amount, memo, priority })

      const response = await contextApiCall('/api/onchain/transfers', {
        method: 'POST',
        body: JSON.stringify({
          toAddress,
          asset: 'TNG',
          amount: (amount * 1e9).toString(), // Convert to base units (9 decimals)
          memo,
          priority,
          idempotencyKey: `tng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка on-chain TNG перевода')
      }

      const data = await response.json()
      
      if (data.success) {
        console.log(' On-chain TNG transfer successful:', data.data.transaction)
        return {
          success: true,
          signature: data.data.transaction.signature,
          explorerUrl: data.data.transaction.explorerUrl,
          fee: data.data.transaction.fee,
          status: data.data.transaction.status
        }
      } else {
        throw new Error(data.error || 'Неизвестная ошибка')
      }
    } catch (error) {
      console.error(' On-chain TNG transfer failed:', error)
      setError(error instanceof Error ? error.message : 'Ошибка TNG перевода')
      throw error
    }
  }

  // Get on-chain SOL balance  
  const getSOLBalance = async (forceRefresh = false) => {
    try {
      console.log(' Getting on-chain SOL balance...')
      const response = await apiCall('/api/wallet')
      const data = await response.json()
      
      if (data.success && data.data && data.data.balance && data.data.balance.sol) {
        const solBalance = Number(data.data.balance.sol.sol)
        console.log(' On-chain SOL balance retrieved:', {
          sol: data.data.balance.sol.sol,
          lamports: data.data.balance.sol.lamports,
          numericBalance: solBalance
        })
        return isNaN(solBalance) ? 0 : solBalance
      } else {
        console.warn(' No SOL balance found in response:', data)
        return 0
      }
    } catch (error) {
      console.error(' Failed to get SOL balance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка получения SOL баланса'
      setError(errorMessage)
      return 0
    }
  }

  // Get on-chain TNG balance
  const getTNGBalance = async (forceRefresh = false) => {
    try {
      const params = new URLSearchParams()
      if (forceRefresh) params.append('_t', Date.now().toString())

      const response = await contextApiCall(`/api/tokens/tng/balance?${params.toString()}`)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Ошибка получения TNG баланса`
        let retryAfter = null
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          retryAfter = errorData.retryAfter
          
          // Для rate limiting ошибок, делаем сообщение более дружелюбным
          if (response.status === 429 && retryAfter) {
            errorMessage = `Подождите ${retryAfter} секунд перед следующим запросом`
            console.log(` Rate limited, retry after ${retryAfter} seconds`)
          }
        } catch (jsonError) {
          console.warn('Failed to parse error response as JSON:', jsonError)
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.success && data.data && data.data.balance) {
        // Convert from base units (9 decimals) to TNG
        const balance = data.data.balance.amount || '0'
        const numericBalance = Number(balance)
        
        if (isNaN(numericBalance)) {
          console.warn(' Invalid TNG balance received:', balance)
          return 0
        }
        
        console.log(' On-chain TNG balance parsed successfully:', {
          rawAmount: balance,
          numericBalance,
          tngBalance: numericBalance / 1000000000
        })
        
        return numericBalance / 1000000000
      } else {
        throw new Error(data.error || 'Неизвестная ошибка')
      }
    } catch (error) {
      console.error(' Failed to get TNG balance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка получения TNG баланса'
      setError(errorMessage)
      
      // Return 0 instead of throwing to avoid breaking UI
      return 0
    }
  }

  // Get on-chain transfer history
  const getOnchainTransferHistory = async (asset?: 'SOL' | 'TNG', limit: number = 20) => {
    try {
      const params = new URLSearchParams()
      if (asset) params.append('asset', asset)
      params.append('limit', limit.toString())

      const response = await contextApiCall(`/api/onchain/transfers?${params.toString()}`)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Ошибка получения истории переводов`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          console.warn('Failed to parse error response as JSON:', jsonError)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.success) {
        return data.data.transfers
      } else {
        throw new Error(data.error || 'Неизвестная ошибка')
      }
    } catch (error) {
      console.error(' Failed to get onchain transfer history:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка получения истории'
      setError(errorMessage)
      
      // Возвращаем пустой массив вместо throw, чтобы не ломать UI
      return []
    }
  }

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // State
    loading,
    error,
    clearError,

    // Deposit operations
    getDeposits,
    monitorDeposits,

    // Withdrawal operations
    getWithdrawals,
    createWithdrawal,

    // Indexer operations
    getIndexerStatus,
    startIndexer,
    stopIndexer,
    forceProcessIndexer,

    // Token operations
    getTNGFaucet,
    getTNGFaucetInfo,
    getSOLBalance,
    getTNGBalance,

    // On-chain transfer operations
    transferSOLOnchain,
    transferTNGOnchain,
    getOnchainTransferHistory
  }
}
