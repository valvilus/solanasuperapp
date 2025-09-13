/**
 * Farming Hook - React hook for DeFi yield farming operations
 * Solana SuperApp
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DeFiService } from '@/features/defi/services/defi.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export interface FarmingPool {
  id: string
  name: string
  tokenA: string
  tokenB: string
  tokenASymbol: string
  tokenBSymbol: string
  apy: number
  tvl: number
  volume24h: number
  fees24h: number
  fee: number
  isStable: boolean
  minimumDeposit: number
  totalLiquidity: number
  totalRewards: number
  totalValue: number
  isActive: boolean
}

export interface FarmingPosition {
  poolId: string
  lpTokens: string
  tokenAAmount: string
  tokenBAmount: string
  rewardsEarned: string
  depositDate: string
  currentValue: number
  impermanentLoss: number
  apy: number
  isActive: boolean
}

export interface FarmingSummary {
  totalLiquidity: number
  totalRewards: number
  totalValue: number
  totalLpTokens: number
  averageApy: number
  activePositions: number
}

export interface FarmingData {
  pools: FarmingPool[]
  positions: FarmingPosition[]
  summary: FarmingSummary
}

export interface FarmingHookState {
  data: FarmingData | null
  isLoading: boolean
  error: string | null
  isAddingLiquidity: boolean
  isRemovingLiquidity: boolean
}

export interface FarmingHookActions {
  refreshData: () => Promise<void>
  addLiquidity: (poolId: string, tokenAAmount: number, tokenBAmount: number) => Promise<{ success: boolean; data?: any; error?: string }>
  removeLiquidity: (poolId: string, lpTokenAmount?: number) => Promise<{ success: boolean; data?: any; error?: string }>
}

export function useFarming(): FarmingHookState & FarmingHookActions {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  
  const [state, setState] = useState<FarmingHookState>({
    data: null,
    isLoading: false,
    error: null,
    isAddingLiquidity: false,
    isRemovingLiquidity: false
  })

  /**
   * Fetch farming data from API
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping farming data fetch')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      console.log(' Fetching farming data...')
      const response = await apiCall('/api/defi/farming')
      console.log(' Farming API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(' Farming API error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch farming data`)
      }
      
      const responseData = await response.json()
      console.log(' Farming API data:', { success: responseData.success, hasData: !!responseData.data })
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'API returned unsuccessful response')
      }
      
      if (!responseData.data) {
        throw new Error('No data received from farming API')
      }
      
      const farmingData = {
        pools: responseData.data.pools || [],
        positions: responseData.data.positions || [],
        summary: responseData.data.summary || {
          totalLiquidity: 0,
          totalRewards: 0,
          totalValue: 0,
          totalLpTokens: 0,
          averageApy: 0,
          activePositions: 0
        }
      }
      
      setState(prev => ({
        ...prev,
        data: farmingData,
        isLoading: false,
        error: null
      }))
      
      console.log(' Farming data loaded successfully:', farmingData)
      
    } catch (error) {
      console.error(' Error loading farming data:', error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load farming data'
      }))
    }
  }, [isAuthenticated])

  /**
   * Add liquidity to farming pool
   */
  const addLiquidity = useCallback(async (poolId: string, tokenAAmount: number, tokenBAmount: number) => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isAddingLiquidity: true, error: null }))
    
    try {
      console.log(' Adding liquidity:', { poolId, tokenAAmount, tokenBAmount })
      
      const response = await apiCall('/api/defi/farming', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'add',
          poolId,
          tokenAAmount,
          tokenBAmount
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to add liquidity`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Add liquidity operation failed')
      }
      
      const result = { success: true, data: responseData.data }
      
      setState(prev => ({ ...prev, isAddingLiquidity: false }))
      
      // Refresh data after successful operation
      await refreshData()
      
      console.log(' Add liquidity successful:', result)
      
      return { success: true, data: result }
      
    } catch (error) {
      console.error(' Add liquidity failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Add liquidity failed'
      
      setState(prev => ({
        ...prev,
        isAddingLiquidity: false,
        error: errorMessage
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [isAuthenticated, refreshData])

  /**
   * Remove liquidity from farming pool
   */
  const removeLiquidity = useCallback(async (poolId: string, lpTokenAmount?: number) => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isRemovingLiquidity: true, error: null }))
    
    try {
      console.log(' Removing liquidity:', { poolId, lpTokenAmount })
      
      const response = await apiCall('/api/defi/farming', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'remove',
          poolId,
          lpTokenAmount
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to remove liquidity`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Remove liquidity operation failed')
      }
      
      const result = { success: true, data: responseData.data }
      
      setState(prev => ({ ...prev, isRemovingLiquidity: false }))
      
      // Refresh data after successful operation
      await refreshData()
      
      console.log(' Remove liquidity successful:', result)
      
      return { success: true, data: result }
      
    } catch (error) {
      console.error(' Remove liquidity failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Remove liquidity failed'
      
      setState(prev => ({
        ...prev,
        isRemovingLiquidity: false,
        error: errorMessage
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [isAuthenticated, refreshData])

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
    addLiquidity,
    removeLiquidity
  }
}

/**
 * Hook for getting specific farming pool data
 */
export function useFarmingPool(poolId: string) {
  const { data, isLoading, error, refreshData } = useFarming()
  
  const pool = data?.pools.find(p => p.id === poolId)
  const position = data?.positions.find(p => p.poolId === poolId)
  
  return {
    pool,
    position,
    isLoading,
    error,
    refreshData
  }
}

/**
 * Hook for farming statistics
 */
export function useFarmingStats() {
  const { data, isLoading, error } = useFarming()
  
  const stats = data?.summary ? {
    totalPools: data.pools.length,
    activePools: data.pools.filter(p => p.isActive).length,
    totalLiquidity: data.summary.totalLiquidity,
    totalRewards: data.summary.totalRewards,
    averageApy: data.summary.averageApy,
    activePositions: data.summary.activePositions,
    totalImpermanentLoss: data.positions.reduce((sum, p) => sum + p.impermanentLoss, 0)
  } : null
  
  return {
    stats,
    isLoading,
    error
  }
}

/**
 * Helper function to calculate pool ratios
 */
export function calculatePoolRatio(pool: FarmingPool, tokenAAmount: number): number {
  // Simplified ratio calculation - in production would use actual pool reserves
  // For now, assume 1:1 ratio for demonstration
  return tokenAAmount
}

/**
 * Helper function to estimate LP tokens
 */
export function estimateLPTokens(tokenAAmount: number, tokenBAmount: number): number {
  // Simplified LP token estimation
  return Math.sqrt(tokenAAmount * tokenBAmount)
}

/**
 * Helper function to calculate impermanent loss
 */
export function calculateImpermanentLoss(
  initialRatio: number,
  currentRatio: number
): number {
  if (initialRatio === 0 || currentRatio === 0) return 0
  
  const ratio = currentRatio / initialRatio
  const il = (2 * Math.sqrt(ratio)) / (1 + ratio) - 1
  
  return il * 100 // Return as percentage
}
