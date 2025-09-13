/**
 * Staking Hook - React hook for DeFi staking operations
 * Solana SuperApp
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DeFiService } from '@/features/defi/services/defi.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export interface StakingPool {
  id: string
  name: string
  tokenMint: string
  rewardMint: string
  apy: number
  minimumStake: number
  lockupPeriod: number
  totalStaked: number
  totalRewards: number
  isActive: boolean
}

export interface StakingPosition {
  poolId: string
  stakedAmount: string
  rewardsEarned: string
  stakeDate: string
  unlockDate: string
  isActive: boolean
  apy: number
}

export interface StakingData {
  pools: StakingPool[]
  positions: StakingPosition[]
  totalStaked: number
  totalRewards: number
  summary?: {
    totalStaked: number
    totalRewards: number
    activePositions: number
  }
}

export interface StakingHookState {
  data: StakingData | null
  isLoading: boolean
  error: string | null
  isStaking: boolean
  isUnstaking: boolean
}

export interface StakingHookActions {
  refreshData: () => Promise<void>
  stakeTokens: (poolId: string, amount: number) => Promise<{ success: boolean; data?: any; error?: string }>
  unstakeTokens: (poolId: string, amount?: number) => Promise<{ success: boolean; data?: any; error?: string }>
}

export function useStaking(): StakingHookState & StakingHookActions {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  
  const [state, setState] = useState<StakingHookState>({
    data: null,
    isLoading: false,
    error: null,
    isStaking: false,
    isUnstaking: false
  })

  /**
   * Fetch staking data from API
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping staking data fetch')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      console.log(' Fetching staking data...')
      const response = await apiCall('/api/defi/staking')
      console.log(' Staking API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(' Staking API error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch staking data`)
      }
      
      const responseData = await response.json()
      console.log(' Staking API data:', { success: responseData.success, hasData: !!responseData.data })
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'API returned unsuccessful response')
      }
      
      if (!responseData.data) {
        throw new Error('No data received from staking API')
      }
      
      const stakingData = {
        pools: responseData.data.pools || [],
        positions: responseData.data.positions || [],
        summary: responseData.data.summary || {
          totalStaked: responseData.data.totalStaked || 0,
          totalRewards: responseData.data.totalRewards || 0,
          activePositions: responseData.data.positions?.filter((p: any) => p.isActive).length || 0
        }
      }
      
      setState(prev => ({
        ...prev,
        data: stakingData,
        isLoading: false,
        error: null
      }) as any)
      
      console.log(' Staking data loaded successfully:', stakingData)
      
    } catch (error) {
      console.error(' Error loading staking data:', error)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load staking data'
      }))
    }
  }, [isAuthenticated])

  /**
   * Stake tokens in a pool
   */
  const stakeTokens = useCallback(async (poolId: string, amount: number) => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isStaking: true, error: null }))
    
    try {
      console.log(' Staking tokens:', { poolId, amount })
      
      const response = await apiCall('/api/defi/staking', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'stake',
          poolId,
          amount
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to stake tokens`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Staking operation failed')
      }
      
      const result = { success: true, data: responseData.data }
      
      setState(prev => ({ ...prev, isStaking: false }))
      
      // Refresh data after successful staking
      await refreshData()
      
      console.log(' Staking successful:', result)
      
      return { success: true, data: result }
      
    } catch (error) {
      console.error(' Staking failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Staking failed'
      
      setState(prev => ({
        ...prev,
        isStaking: false,
        error: errorMessage
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [isAuthenticated, refreshData])

  /**
   * Unstake tokens from a pool
   */
  const unstakeTokens = useCallback(async (poolId: string, amount?: number) => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isUnstaking: true, error: null }))
    
    try {
      console.log(' Unstaking tokens:', { poolId, amount })
      
      const response = await apiCall('/api/defi/staking', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'unstake',
          poolId,
          amount
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to unstake tokens`)
      }
      
      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.error || 'Unstaking operation failed')
      }
      
      const result = { success: true, data: responseData.data }
      
      setState(prev => ({ ...prev, isUnstaking: false }))
      
      // Refresh data after successful unstaking
      await refreshData()
      
      console.log(' Unstaking successful:', result)
      
      return { success: true, data: result }
      
    } catch (error) {
      console.error(' Unstaking failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unstaking failed'
      
      setState(prev => ({
        ...prev,
        isUnstaking: false,
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
    stakeTokens,
    unstakeTokens
  }
}

/**
 * Hook for getting specific staking pool data
 */
export function useStakingPool(poolId: string) {
  const { data, isLoading, error, refreshData } = useStaking()
  
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
 * Hook for staking statistics
 */
export function useStakingStats() {
  const { data, isLoading, error } = useStaking()
  
  const stats = data ? {
    totalPools: data.pools.length,
    activePools: data.pools.filter(p => p.isActive).length,
    totalStaked: data.totalStaked,
    totalRewards: data.totalRewards,
    activePositions: data.positions.filter(p => p.isActive).length,
    averageApy: data.positions.length > 0 
      ? data.positions.reduce((sum, p) => sum + p.apy, 0) / data.positions.length 
      : 0
  } : null
  
  return {
    stats,
    isLoading,
    error
  }
}
