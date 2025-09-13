/**
 * Ledger Operations Hook - Off-chain Operations Integration
 * Solana SuperApp - Block 4: Integration
 */

'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// =============================================================================
// TYPES
// =============================================================================

export interface TransferRequest {
  toUserId: string
  assetSymbol: string
  amount: string
  description?: string
  memo?: string
  metadata?: any
  idempotencyKey?: string
}

export interface UserBalance {
  assetSymbol: string
  available: string
  holds: string
  pending: string
  total: string
}

export interface TransferInfo {
  id: string
  fromUserId: string
  toUserId: string
  assetSymbol: string
  amount: string
  status: string
  description: string
  createdAt: string
  metadata?: any
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useLedgerOperations() {
  const { isAuthenticated, isLoading: authLoading, apiCall: contextApiCall } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =============================================================================
  // UTILITIES
  // =============================================================================

  const apiCall = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    // Wait for auth to be ready if it's still loading
    if (authLoading) {
      console.log(' Waiting for auth to be ready...')
      // Wait up to 10 seconds for auth to load
      const maxWaitTime = 10000
      const startTime = Date.now()
      
      while (authLoading && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // If still loading after timeout, log warning
      if (authLoading) {
        console.warn(' Auth still loading after 10s timeout')
      }
    }

    // Authentication is handled automatically by contextApiCall

    // Use the enhanced apiCall from AuthContext for automatic token refresh
    return contextApiCall(endpoint, options)
  }, [authLoading, contextApiCall])

  const clearError = useCallback(() => setError(null), [])

  // Debug helper for auth issues
  const debugAuthState = useCallback(() => {
    console.log({
      timestamp: new Date().toISOString()
    })

    // Check localStorage
    try {
      const stored = localStorage.getItem('solana_superapp_auth')
      if (stored) {
        const authData = JSON.parse(stored)
        const tokenPreview = authData.accessToken 
          ? `${authData.accessToken.substring(0, 20)}...` 
          : null
        
        let tokenStatus = 'unknown'
        if (authData.accessToken) {
          try {
            const payload = JSON.parse(atob(authData.accessToken.split('.')[1]))
            const now = Math.floor(Date.now() / 1000)
            tokenStatus = payload.exp > now ? 'valid' : 'expired'
          } catch {
            tokenStatus = 'invalid'
          }
        }

        console.log(' Storage Auth Data:', {
          hasUser: !!authData.user,
          userInfo: authData.user ? {
            id: authData.user.id,
            username: authData.user.username,
            telegramId: authData.user.telegramId
          } : null,
          hasAccessToken: !!authData.accessToken,
          tokenPreview,
          tokenStatus,
          hasRefreshToken: !!authData.refreshToken,
          refreshTokenType: authData.refreshToken === 'session_token' ? 'session' : 'refresh'
        })
      } else {
        console.log(' No auth data in storage')
      }
    } catch (error) {
      console.error(' Error reading storage:', error)
    }
  }, [isAuthenticated, authLoading])

  // =============================================================================
  // BALANCE OPERATIONS
  // =============================================================================

  const getBalances = useCallback(async (): Promise<UserBalance[]> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/ledger/balances')
      const data = await response.json()
      
      if (data.success && data.data && data.data.balances && Array.isArray(data.data.balances)) {
        return data.data.balances
      }
      
      throw new Error(data.error || 'Ошибка получения балансов')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const getBalanceByAsset = useCallback(async (assetSymbol: string): Promise<UserBalance> => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/ledger/balances?asset=${assetSymbol}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        // Handle single asset response structure: data.data.balance
        if (data.data.balance) {
          return {
            assetSymbol: data.data.assetSymbol,
            available: data.data.balance.available,
            holds: data.data.balance.locked,
            pending: '0', // Not available in this format
            total: data.data.balance.total
          }
        }
        // Handle multi asset response structure: data.data.balances[]
        else if (data.data.balances && Array.isArray(data.data.balances) && data.data.balances.length > 0) {
          return data.data.balances[0]
        }
      }
      
      throw new Error('Баланс не найден')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // =============================================================================
  // TRANSFER OPERATIONS
  // =============================================================================

  const createTransfer = useCallback(async (request: TransferRequest): Promise<TransferInfo> => {
    try {
      setLoading(true)
      setError(null)

      // Generate idempotency key if not provided
      const transferRequest = {
        ...request,
        idempotencyKey: request.idempotencyKey || `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      const response = await apiCall('/api/ledger/transfer', {
        method: 'POST',
        body: JSON.stringify(transferRequest)
      })
      const data = await response.json()
      
      if (data.success) {
        // API возвращает ledgerEntries (массив), берем первый элемент
        if (data.ledgerEntries && data.ledgerEntries.length > 0) {
          const entry = data.ledgerEntries[0]
          return {
            id: entry.id,
            fromUserId: request.toUserId, // Временно, нужно получить из контекста
            toUserId: request.toUserId,
            assetSymbol: request.assetSymbol,
            amount: entry.amount,
            status: entry.status,
            description: request.description || '',
            createdAt: entry.createdAt
          }
        }
        
        // Fallback если нет ledgerEntries
        return {
          id: data.transferId || `transfer_${Date.now()}`,
          fromUserId: request.toUserId, // Временно
          toUserId: request.toUserId,
          assetSymbol: request.assetSymbol,
          amount: request.amount,
          status: 'completed',
          description: request.description || '',
          createdAt: new Date().toISOString()
        }
      }
      
      throw new Error(data.error || 'Ошибка создания перевода')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // =============================================================================
  // CONVENIENCE METHODS
  // =============================================================================

  const transferSOL = useCallback(async (
    toUserId: string, 
    amount: number, 
    description?: string,
    isAnonymous?: boolean
  ): Promise<TransferInfo> => {
    return createTransfer({
      toUserId,
      assetSymbol: 'SOL',
      amount: (amount * 1e9).toString(), // Convert to lamports
      description: description || 'SOL перевод',
      metadata: { isAnonymous: isAnonymous || false }
    })
  }, [createTransfer])

  const transferTNG = useCallback(async (
    toUserId: string, 
    amount: number, 
    description?: string,
    isAnonymous?: boolean
  ): Promise<TransferInfo> => {
    return createTransfer({
      toUserId,
      assetSymbol: 'TNG',
      amount: (amount * 1e9).toString(), // Convert to smallest units
      description: description || 'TNG перевод',
      metadata: { isAnonymous: isAnonymous || false }
    })
  }, [createTransfer])

  const transferUSDC = useCallback(async (
    toUserId: string, 
    amount: number, 
    description?: string
  ): Promise<TransferInfo> => {
    return createTransfer({
      toUserId,
      assetSymbol: 'USDC',
      amount: (amount * 1e6).toString(), // USDC has 6 decimals
      description: description || 'USDC перевод'
    })
  }, [createTransfer])

  // =============================================================================
  // BALANCE HELPERS
  // =============================================================================

  const getSOLBalance = useCallback(async (forceRefresh = false): Promise<number> => {
    try {
      const url = forceRefresh 
        ? `/api/ledger/balances?asset=SOL&_t=${Date.now()}`
        : `/api/ledger/balances?asset=SOL`
      
      const response = await apiCall(url)
      const data = await response.json()
      
      if (data.success && data.data) {
        // Handle single asset response structure: data.data.balance
        if (data.data.balance) {
          const balance = data.data.balance
          console.log(' SOL balance retrieved (single):', {
            available: balance.available,
            total: balance.total,
            locked: balance.locked
          })
          return Number(balance.available) / 1e9
        }
        // Handle multi asset response structure: data.data.balances[]
        else if (data.data.balances && Array.isArray(data.data.balances) && data.data.balances.length > 0) {
          const balance = data.data.balances[0]
          console.log(' SOL balance retrieved (multi):', {
            available: balance.available,
            total: balance.total,
            holds: balance.holds,
            pending: balance.pending
          })
          return Number(balance.available) / 1e9
        }
      }
      
      return 0
    } catch (err) {
      return 0
    }
  }, [apiCall])

  const getTNGBalance = useCallback(async (forceRefresh = false): Promise<number> => {
    try {
      console.log(' Getting on-chain TNG balance, forceRefresh:', forceRefresh)
      
      // Используем новый on-chain TNG balance API
      const url = forceRefresh 
        ? `/api/tokens/tng/balance?_t=${Date.now()}`
        : `/api/tokens/tng/balance`
      
      const response = await apiCall(url)
      const data = await response.json()
      
      if (data.success && data.data && data.data.balance) {
        // Новый on-chain API возвращает balance в wei, конвертируем в TNG
        const balanceWei = data.data.balance.amount || '0'
        const balanceTNG = parseFloat(balanceWei) / 1e9 // Convert from wei to TNG
        
        console.log(' On-chain TNG balance fetched:', {
          wei: balanceWei,
          tng: balanceTNG,
          tokenAccount: data.data.tokenAccount,
          explorerUrl: data.data.explorerUrl
        })
        
        return balanceTNG
      }
      
      console.log(' No on-chain TNG balance found in response, trying fallback...')
      
      // Fallback: try wallet API for TNG balance
      try {
        const walletResponse = await apiCall('/api/wallet')
        const walletData = await walletResponse.json()
        
        if (walletData.success && walletData.data.balance.tng) {
          const tngBalance = parseFloat(walletData.data.balance.tng.formatted || '0')
          console.log(' TNG balance from wallet API fallback:', tngBalance)
          return tngBalance
        }
      } catch (fallbackErr) {
        console.warn(' Fallback wallet API also failed:', fallbackErr)
      }
      
      return 0
    } catch (err) {
      console.error(' Error getting TNG balance:', err)
      return 0
    }
  }, [apiCall])

  const getUSDCBalance = useCallback(async (): Promise<number> => {
    try {
      const balance = await getBalanceByAsset('USDC')
      return Number(balance.available) / 1e6 // USDC has 6 decimals
    } catch (err) {
      return 0
    }
  }, [getBalanceByAsset])

  // =============================================================================
  // VALIDATION HELPERS
  // =============================================================================

  const validateSufficientBalance = useCallback(async (
    assetSymbol: string,
    requiredAmount: string
  ): Promise<boolean> => {
    try {
      const balance = await getBalanceByAsset(assetSymbol)
      return BigInt(balance.available) >= BigInt(requiredAmount)
    } catch (err) {
      return false
    }
  }, [getBalanceByAsset])

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // State
    loading,
    error,
    clearError,

    // Balance operations
    getBalances,
    getBalanceByAsset,
    getSOLBalance,
    getTNGBalance,
    getUSDCBalance,

    // Transfer operations
    createTransfer,
    transferSOL,
    transferTNG,
    transferUSDC,

    // Validation
    validateSufficientBalance,

    // Debug utilities
    debugAuthState
  }
}
