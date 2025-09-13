/**
 * History Hook - React hook for DeFi transaction history
 * Solana SuperApp
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DeFiService } from '@/features/defi/services/defi.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export interface TransactionHistory {
  id: string
  signature: string
  type: 'stake' | 'unstake' | 'swap' | 'farm_add' | 'farm_remove'
  purpose: string
  status: 'confirmed' | 'pending' | 'failed'
  timestamp: string
  explorerUrl: string
  details: {
    operation: string
    [key: string]: any
  }
  metadata: any
}

export interface HistorySummary {
  totalTransactions: number
  confirmedTransactions: number
  pendingTransactions: number
  failedTransactions: number
  successRate: number
  breakdown: {
    staking: number
    swapping: number
    farming: number
  }
  averageFrequency: number
  oldestTransaction?: string
  newestTransaction?: string
}

export interface HistoryPagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface HistoryFilters {
  type: string
  timeframe: string
  status: string
}

export interface HistoryData {
  transactions: TransactionHistory[]
  summary: HistorySummary
  pagination: HistoryPagination
  filters: HistoryFilters
}

export interface HistoryHookState {
  data: HistoryData | null
  isLoading: boolean
  error: string | null
  filters: {
    page: number
    limit: number
    type: string
    timeframe: string
    status: string
  }
}

export interface HistoryHookActions {
  refreshData: () => Promise<void>
  loadPage: (page: number) => Promise<void>
  setFilter: (key: string, value: string) => Promise<void>
  setFilters: (filters: Partial<HistoryHookState['filters']>) => Promise<void>
  exportHistory: () => Promise<void>
}

export function useHistory(
  initialFilters: Partial<HistoryHookState['filters']> = {}
): HistoryHookState & HistoryHookActions {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  
  const [state, setState] = useState<HistoryHookState>({
    data: null,
    isLoading: false,
    error: null,
    filters: {
      page: 1,
      limit: 20,
      type: 'all',
      timeframe: '30d',
      status: 'all',
      ...initialFilters
    }
  })

  /**
   * Fetch history data from API
   */
  const fetchHistory = useCallback(async (filters: HistoryHookState['filters']) => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping history fetch')
      return null
    }

    try {
      console.log(' Fetching history data...', filters)
      
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        type: filters.type,
        timeframe: filters.timeframe,
        status: filters.status
      })
      const response = await apiCall(`/api/defi/history?${queryParams}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch history data`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'History fetch operation failed')
      }
      
      const historyData = responseData.data
      
      console.log(' History data loaded successfully:', historyData)
      
      return historyData
      
    } catch (error) {
      console.error(' Error loading history data:', error)
      throw error
    }
  }, [isAuthenticated])

  /**
   * Refresh current history data
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping history refresh')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const historyData = await fetchHistory(state.filters)
      
      setState(prev => ({
        ...prev,
        data: historyData,
        isLoading: false,
        error: null
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load history data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [isAuthenticated, fetchHistory, state.filters])

  /**
   * Load specific page
   */
  const loadPage = useCallback(async (page: number) => {
    const newFilters = { ...state.filters, page }
    
    setState(prev => ({ 
      ...prev, 
      filters: newFilters,
      isLoading: true,
      error: null
    }))
    
    try {
      const historyData = await fetchHistory(newFilters)
      
      setState(prev => ({
        ...prev,
        data: historyData,
        isLoading: false,
        error: null
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load history data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [fetchHistory, state.filters])

  /**
   * Set single filter and refresh
   */
  const setFilter = useCallback(async (key: string, value: string) => {
    const newFilters = { 
      ...state.filters, 
      [key]: value,
      page: 1 // Reset to first page when filtering
    }
    
    setState(prev => ({ 
      ...prev, 
      filters: newFilters,
      isLoading: true,
      error: null
    }))
    
    try {
      const historyData = await fetchHistory(newFilters)
      
      setState(prev => ({
        ...prev,
        data: historyData,
        isLoading: false,
        error: null
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load history data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [fetchHistory, state.filters])

  /**
   * Set multiple filters and refresh
   */
  const setFilters = useCallback(async (newFilters: Partial<HistoryHookState['filters']>) => {
    const updatedFilters = { 
      ...state.filters, 
      ...newFilters,
      page: 1 // Reset to first page when filtering
    }
    
    setState(prev => ({ 
      ...prev, 
      filters: updatedFilters,
      isLoading: true,
      error: null
    }))
    
    try {
      const historyData = await fetchHistory(updatedFilters)
      
      setState(prev => ({
        ...prev,
        data: historyData,
        isLoading: false,
        error: null
      }))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load history data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [fetchHistory, state.filters])

  /**
   * Export history to CSV
   */
  const exportHistory = useCallback(async () => {
    if (!state.data?.transactions.length) {
      console.log(' No transactions to export')
      return
    }

    try {
      // Create CSV content
      const headers = ['Date', 'Type', 'Operation', 'Status', 'Details', 'Signature']
      const rows = state.data.transactions.map(tx => [
        new Date(tx.timestamp).toLocaleString(),
        tx.type,
        tx.details.operation,
        tx.status,
        JSON.stringify(tx.details),
        tx.signature
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `defi-history-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      console.log(' History exported successfully')
      
    } catch (error) {
      console.error(' Error exporting history:', error)
    }
  }, [state.data])

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
    loadPage,
    setFilter,
    setFilters,
    exportHistory
  }
}

/**
 * Hook for transaction statistics
 */
export function useTransactionStats(timeframe: string = '30d') {
  const { data, isLoading, error } = useHistory({ timeframe })
  
  const stats = data?.summary ? {
    totalTransactions: data.summary.totalTransactions,
    successRate: data.summary.successRate,
    averageFrequency: data.summary.averageFrequency,
    mostActiveType: Object.entries(data.summary.breakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
    breakdown: data.summary.breakdown
  } : null
  
  return {
    stats,
    isLoading,
    error
  }
}

/**
 * Helper function to get transaction type icon
 */
export function getTransactionIcon(type: string): string {
  switch (type) {
    case 'stake': return ''
    case 'unstake': return ''
    case 'swap': return ''
    case 'farm_add': return ''
    case 'farm_remove': return ''
    default: return ''
  }
}

/**
 * Helper function to get status color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'text-green-500'
    case 'pending': return 'text-yellow-500'
    case 'failed': return 'text-red-500'
    default: return 'text-gray-500'
  }
}

/**
 * Helper function to format transaction details
 */
export function formatTransactionDetails(transaction: TransactionHistory): string {
  const { details } = transaction
  
  switch (transaction.type) {
    case 'stake':
      return `Staked ${details.amount} tokens`
    case 'unstake':
      return `Unstaked ${details.unstakedAmount} tokens, rewards: ${details.rewardsAmount}`
    case 'swap':
      return `Swapped ${details.inputAmount} → ${details.outputAmount}`
    case 'farm_add':
      return `Added liquidity: ${details.tokenAAmount} + ${details.tokenBAmount}`
    case 'farm_remove':
      return `Removed liquidity, received rewards: ${details.rewardsReceived}`
    default:
      return details.operation || 'Unknown operation'
  }
}
