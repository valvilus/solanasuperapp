import { useState, useEffect, useCallback } from 'react'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export interface SmartContractPool {
  totalStaked: string
  totalStngSupply: string
  apy: number
  isActive: boolean
  authority: string
}

export interface SmartContractUserStake {
  stakedAmount: string
  stngAmount: string
  totalRewardsClaimed: string
  stakeTimestamp: number
  lastClaimTimestamp: number
}

export interface SmartContractData {
  pool: SmartContractPool | null
  userStake: SmartContractUserStake | null
  stngBalance: string
  potentialRewards: string
}

export interface StakingContractOperationResult {
  success: boolean
  signature?: string
  stngAmount?: string
  tngAmount?: string
  rewards?: string
  explorerUrl?: string
  error?: string
}

/**
 * Hook for interacting with TNG Staking Smart Contract
 * Provides real on-chain staking operations through Anchor program
 */
export function useStakingContract() {
  const { apiCall } = useCompatibleAuth()
  const [data, setData] = useState<SmartContractData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load smart contract data (pool info, user stake, balances)
   */
  const loadData = useCallback(async () => {
    if (!apiCall) return

    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/defi/staking-contract')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Ошибка загрузки данных смарт-контракта')
      }
    } catch (err) {
      console.error('Error loading smart contract data:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  /**
   * Stake TNG tokens through smart contract
   */
  const stakeTokens = useCallback(async (amount: bigint): Promise<StakingContractOperationResult> => {
    if (!apiCall) {
      return { success: false, error: 'Нет авторизации' }
    }

    try {
      console.log(` Smart Contract Staking: ${amount} TNG`)

      const response = await apiCall('/api/defi/staking-contract', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'stake',
          amount: amount.toString()
        })
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data after successful stake
        await loadData()
        
        return {
          success: true,
          signature: result.data.signature,
          stngAmount: result.data.stngAmount,
          explorerUrl: result.data.explorerUrl
        }
      } else {
        return {
          success: false,
          error: result.error || 'Ошибка стейкинга'
        }
      }
    } catch (err) {
      console.error('Smart contract stake error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Неизвестная ошибка стейкинга'
      }
    }
  }, [apiCall, loadData])

  /**
   * Unstake sTNG tokens through smart contract
   */
  const unstakeTokens = useCallback(async (stngAmount: bigint): Promise<StakingContractOperationResult> => {
    if (!apiCall) {
      return { success: false, error: 'Нет авторизации' }
    }

    try {
      console.log(` Smart Contract Unstaking: ${stngAmount} sTNG`)

      const response = await apiCall('/api/defi/staking-contract', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'unstake',
          stngAmount: stngAmount.toString()
        })
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data after successful unstake
        await loadData()
        
        return {
          success: true,
          signature: result.data.signature,
          tngAmount: result.data.tngAmount,
          rewards: result.data.rewards,
          explorerUrl: result.data.explorerUrl
        }
      } else {
        return {
          success: false,
          error: result.error || 'Ошибка анстейкинга'
        }
      }
    } catch (err) {
      console.error('Smart contract unstake error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Неизвестная ошибка анстейкинга'
      }
    }
  }, [apiCall, loadData])

  /**
   * Claim rewards through smart contract
   */
  const claimRewards = useCallback(async (): Promise<StakingContractOperationResult> => {
    if (!apiCall) {
      return { success: false, error: 'Нет авторизации' }
    }

    try {
      console.log(' Smart Contract Claiming Rewards...')

      const response = await apiCall('/api/defi/staking-contract', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'claim'
        })
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data after successful claim
        await loadData()
        
        return {
          success: true,
          signature: result.data.signature,
          explorerUrl: result.data.explorerUrl
        }
      } else {
        return {
          success: false,
          error: result.error || 'Ошибка получения наград'
        }
      }
    } catch (err) {
      console.error('Smart contract claim error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Неизвестная ошибка получения наград'
      }
    }
  }, [apiCall, loadData])

  /**
   * Refresh smart contract data
   */
  const refreshData = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    // Data
    data,
    loading,
    error,
    
    // Operations
    stakeTokens,
    unstakeTokens,
    claimRewards,
    
    // Utils
    refreshData,
    
    // Computed values
    isPoolActive: data?.pool?.isActive ?? false,
    hasStakedTokens: data?.userStake ? BigInt(data.userStake.stakedAmount) > 0 : false,
    formattedStakedAmount: data?.userStake 
      ? (BigInt(data.userStake.stakedAmount) / BigInt(10**9)).toString()
      : '0',
    formattedStngBalance: data 
      ? (BigInt(data.stngBalance) / BigInt(10**9)).toString()
      : '0',
    formattedPotentialRewards: data 
      ? (BigInt(data.potentialRewards) / BigInt(10**9)).toString()
      : '0'
  }
}

export default useStakingContract












