/**
 * Swap Hook - React hook for DeFi token swapping
 * Solana SuperApp
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DeFiService } from '@/features/defi/services/defi.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export interface SwapToken {
  symbol: string
  mint: string
  name: string
  balance?: string
  price?: number
}

export interface SwapQuote {
  inputMint: string
  outputMint: string
  inputAmount: string
  outputAmount: string
  priceImpact: number
  fee: number
  route: SwapRoute[]
  slippage: number
  minimumReceived: string
}

export interface SwapRoute {
  ammKey: string
  label: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  feeAmount: string
  feeMint: string
}

export interface SwapData {
  tokens: SwapToken[]
  balances: Record<string, string>
  prices: Record<string, number>
}

export interface SwapHookState {
  data: SwapData | null
  currentQuote: SwapQuote | null
  isLoading: boolean
  isGettingQuote: boolean
  isSwapping: boolean
  error: string | null
  lastQuoteParams: {
    inputMint: string
    outputMint: string
    amount: string
    slippage: number
  } | null
}

export interface SwapHookActions {
  refreshData: () => Promise<void>
  getQuote: (inputMint: string, outputMint: string, amount: string, slippage?: number) => Promise<SwapQuote | null>
  executeSwap: (inputMint: string, outputMint: string, amount: string, slippage?: number) => Promise<{ success: boolean; data?: any; error?: string }>
  clearQuote: () => void
}

export function useSwap(): SwapHookState & SwapHookActions {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  
  const [state, setState] = useState<SwapHookState>({
    data: null,
    currentQuote: null,
    isLoading: false,
    isGettingQuote: false,
    isSwapping: false,
    error: null,
    lastQuoteParams: null
  })

  /**
   * Fetch swap data (tokens, balances, prices)
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping swap data fetch')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      console.log(' Fetching swap data...')
      const response = await apiCall('/api/defi/swap')
      console.log(' Swap API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(' Swap API error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch swap data`)
      }
      
      const responseData = await response.json()
      console.log(' Swap API data:', { success: responseData.success, hasData: !!responseData.data })
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'API returned unsuccessful response')
      }
      
      if (!responseData.data) {
        throw new Error('No data received from swap API')
      }
      
      const swapData = {
        tokens: responseData.data.tokens || [],
        prices: responseData.data.prices || {},
        balances: responseData.data.balances || {}
      }
      
      // Combine tokens with balances and prices
      const tokensWithData = swapData.tokens.map(token => ({
        ...token,
        balance: swapData.balances[token.mint] || '0',
        price: swapData.prices[token.mint] || 0
      }))
      
      setState(prev => ({
        ...prev,
        data: {
          tokens: tokensWithData,
          balances: swapData.balances,
          prices: swapData.prices
        },
        isLoading: false,
        error: null
      }))
      
      console.log(' Swap data loaded successfully:', {
        tokensCount: tokensWithData.length,
        balancesCount: Object.keys(swapData.balances).length
      })
      
    } catch (error) {
      console.error(' Error loading swap data:', error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load swap data'
      }))
    }
  }, [isAuthenticated])

  /**
   * Get swap quote
   */
  const getQuote = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: string,
    slippage: number = 50
  ): Promise<SwapQuote | null> => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, cannot get quote')
      return null
    }

    setState(prev => ({ ...prev, isGettingQuote: true, error: null }))
    
    try {
      console.log(' Getting swap quote:', { inputMint, outputMint, amount, slippage })
      
      const response = await apiCall(`/api/defi/swap?operation=quote&inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippage=${slippage}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to get swap quote`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Quote operation failed')
      }
      
      const quote = responseData.data
      
      setState(prev => ({
        ...prev,
        currentQuote: quote,
        isGettingQuote: false,
        lastQuoteParams: { inputMint, outputMint, amount, slippage },
        error: null
      }))
      
      if (quote) {
        console.log(' Quote received:', {
          inputAmount: quote.inputAmount,
          outputAmount: quote.outputAmount,
          priceImpact: quote.priceImpact
        })
      } else {
        console.log(' No quote available')
      }
      
      return quote
      
    } catch (error) {
      console.error(' Error getting quote:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get quote'
      
      setState(prev => ({
        ...prev,
        isGettingQuote: false,
        currentQuote: null,
        error: errorMessage
      }))
      
      return null
    }
  }, [isAuthenticated])

  /**
   * Execute swap
   */
  const executeSwap = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: string,
    slippage: number = 50
  ) => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isSwapping: true, error: null }))
    
    try {
      console.log(' Executing swap:', { inputMint, outputMint, amount, slippage })
      
      const response = await apiCall('/api/defi/swap', {
        method: 'POST',
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount,
          slippageBps: slippage
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to execute swap`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Swap operation failed')
      }
      
      const result = { success: true, data: responseData.data }
      
      setState(prev => ({ 
        ...prev, 
        isSwapping: false,
        currentQuote: null, // Clear quote after successful swap
        lastQuoteParams: null
      }))
      
      // Refresh data after successful swap
      await refreshData()
      
      console.log(' Swap successful:', result)
      
      return { success: true, data: result }
      
    } catch (error) {
      console.error(' Swap failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Swap failed'
      
      setState(prev => ({
        ...prev,
        isSwapping: false,
        error: errorMessage
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [isAuthenticated, refreshData])

  /**
   * Clear current quote
   */
  const clearQuote = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuote: null,
      lastQuoteParams: null,
      error: null
    }))
  }, [])

  /**
   * Load data on mount and when authentication changes
   */
  useEffect(() => {
    if (isAuthenticated) {
      refreshData()
    } else {
      // Clear data when not authenticated
      setState(prev => ({
        ...prev,
        data: null,
        currentQuote: null,
        lastQuoteParams: null,
        error: null,
        isLoading: false
      }))
    }
  }, [isAuthenticated, refreshData])

  return {
    ...state,
    refreshData,
    getQuote,
    executeSwap,
    clearQuote
  }
}

/**
 * Hook for getting specific token data
 */
export function useSwapToken(mint: string) {
  const { data, isLoading, error } = useSwap()
  
  const token = data?.tokens.find(t => t.mint === mint)
  
  return {
    token,
    isLoading,
    error
  }
}

/**
 * Hook for swap statistics
 */
export function useSwapStats() {
  const { data, isLoading, error } = useSwap()
  
  const stats = data ? {
    totalTokens: data.tokens.length,
    totalBalance: data.tokens.reduce((sum, token) => {
      const balance = parseFloat(token.balance || '0') / Math.pow(10, 9) // Assuming 9 decimals
      const price = token.price || 0
      return sum + (balance * price)
    }, 0),
    nonZeroBalances: data.tokens.filter(token => parseFloat(token.balance || '0') > 0).length
  } : null
  
  return {
    stats,
    isLoading,
    error
  }
}

/**
 * Helper function to format token amounts
 */
export function formatTokenAmount(amount: string, decimals: number = 9): string {
  const value = parseFloat(amount) / Math.pow(10, decimals)
  return value.toFixed(6)
}

/**
 * Helper function to parse token amounts
 */
export function parseTokenAmount(amount: number, decimals: number = 9): string {
  return Math.floor(amount * Math.pow(10, decimals)).toString()
}
