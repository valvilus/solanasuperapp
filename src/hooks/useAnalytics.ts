/**
 * Analytics Hook - React hook for DeFi portfolio analytics
 * Solana SuperApp
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DeFiService } from '@/features/defi/services/defi.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export interface PortfolioAnalytics {
  portfolio: {
    totalValue: number
    totalPnL: number
    totalPnLPercent: number
    dailyChange: number
    dailyChangePercent: number
    weeklyChange: number
    weeklyChangePercent: number
    monthlyChange: number
    monthlyChangePercent: number
  }
  breakdown: {
    staking: {
      value: number
      pnl: number
      pnlPercent: number
      allocation: number
      transactions: number
    }
    swapping: {
      volume: number
      transactions: number
      averageSlippage: number
      totalFees: number
    }
    farming: {
      value: number
      pnl: number
      pnlPercent: number
      allocation: number
      impermanentLoss: number
      transactions: number
    }
  }
  risk: {
    sharpeRatio: number
    maxDrawdown: number
    volatility: number
    beta: number
    var95: number
    riskScore: 'low' | 'medium' | 'high'
  }
  performance: {
    topPerformers: Array<{
      symbol: string
      pnl: number
      pnlPercent: number
    }>
    worstPerformers: Array<{
      symbol: string
      pnl: number
      pnlPercent: number
    }>
    winRate: number
    averageHoldTime: number
    totalTransactions: number
    profitableTransactions: number
  }
  diversification: {
    score: number
    concentration: number
    correlations: Record<string, number>
  }
  priceHistory?: Array<{
    timestamp: number
    price: number
    volume: number
    pnl: number
    pnlPercent: number
  }>
  timeframe: string
  lastUpdated: string
}

export interface AnalyticsHookState {
  data: PortfolioAnalytics | null
  isLoading: boolean
  error: string | null
  timeframe: string
}

export interface AnalyticsHookActions {
  refreshData: () => Promise<void>
  setTimeframe: (timeframe: string) => void
  getAnalytics: (timeframe?: string, includeHistory?: boolean) => Promise<PortfolioAnalytics | null>
}

export function useAnalytics(
  initialTimeframe: string = '30d'
): AnalyticsHookState & AnalyticsHookActions {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  
  const [state, setState] = useState<AnalyticsHookState>({
    data: null,
    isLoading: false,
    error: null,
    timeframe: initialTimeframe
  })

  /**
   * Fetch analytics data from API
   */
  const getAnalytics = useCallback(async (
    timeframe?: string, 
    includeHistory: boolean = false
  ): Promise<PortfolioAnalytics | null> => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping analytics fetch')
      return null
    }

    const targetTimeframe = timeframe || state.timeframe

    try {
      console.log(' Fetching analytics data...', { timeframe: targetTimeframe, includeHistory })
      
      const response = await apiCall(`/api/defi/analytics?timeframe=${targetTimeframe}&includeHistory=${includeHistory}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch analytics data`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Analytics fetch operation failed')
      }
      
      const analyticsData = responseData.data
      
      console.log(' Analytics data loaded successfully:', analyticsData)
      
      return analyticsData
      
    } catch (error) {
      console.error(' Error loading analytics data:', error)
      throw error
    }
  }, [isAuthenticated, state.timeframe])

  /**
   * Refresh current analytics data
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping analytics refresh')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const analyticsData = await getAnalytics(state.timeframe, true)
      
      setState(prev => ({
        ...prev,
        data: analyticsData,
        isLoading: false,
        error: null
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [isAuthenticated, getAnalytics, state.timeframe])

  /**
   * Change timeframe and refresh data
   */
  const setTimeframe = useCallback(async (newTimeframe: string) => {
    setState(prev => ({ 
      ...prev, 
      timeframe: newTimeframe,
      isLoading: true,
      error: null
    }))
    
    try {
      const analyticsData = await getAnalytics(newTimeframe, true)
      
      setState(prev => ({
        ...prev,
        data: analyticsData,
        isLoading: false,
        error: null
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [getAnalytics])

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
        error: null,
        isLoading: false
      }))
    }
  }, [isAuthenticated, refreshData])

  return {
    ...state,
    refreshData,
    setTimeframe,
    getAnalytics
  }
}

/**
 * Hook for specific analytics metrics
 */
export function useAnalyticsMetrics(metric: 'portfolio' | 'risk' | 'performance' | 'diversification') {
  const { data, isLoading, error } = useAnalytics()
  
  const metricData = data ? data[metric] : null
  
  return {
    data: metricData,
    isLoading,
    error
  }
}

/**
 * Hook for portfolio performance comparison
 */
export function usePerformanceComparison(timeframes: string[] = ['24h', '7d', '30d']) {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  const [data, setData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComparison = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(null)

    try {
      const promises = timeframes.map(async (timeframe) => {
        const response = await apiCall(`/api/defi/analytics?timeframe=${timeframe}&includeHistory=false`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch analytics data`)
        }
        
        const responseData = await response.json()
        if (!responseData.success) {
          throw new Error(responseData.error || 'Analytics fetch operation failed')
        }
        
        const analytics = responseData.data
        return { timeframe, analytics }
      })

      const results = await Promise.all(promises)
      const comparisonData: Record<string, any> = {}

      results.forEach(({ timeframe, analytics }) => {
        comparisonData[timeframe] = {
          totalValue: analytics.portfolio.totalValue,
          totalPnL: analytics.portfolio.totalPnL,
          totalPnLPercent: analytics.portfolio.totalPnLPercent
        }
      })

      setData(comparisonData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison data')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, timeframes])

  useEffect(() => {
    fetchComparison()
  }, [fetchComparison])

  return {
    data,
    isLoading,
    error,
    refresh: fetchComparison
  }
}

/**
 * Helper function to format currency values
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Helper function to format percentage values
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Helper function to get risk color
 */
export function getRiskColor(riskScore: string): string {
  switch (riskScore) {
    case 'low': return 'text-green-500'
    case 'medium': return 'text-yellow-500'
    case 'high': return 'text-red-500'
    default: return 'text-gray-500'
  }
}
