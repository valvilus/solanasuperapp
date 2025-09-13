/**
 * TNG Farming Contract Hook
 * Direct smart contract interaction for farming operations
 * Handles: Add/Remove Liquidity, Stake/Unstake LP tokens, Claim Rewards
 */

import { useState, useEffect, useCallback } from 'react';
import { useCompatibleAuth } from './useCompatibleAuth';

interface FarmingPool {
  address: string;
  authority: string;
  tngMint: string;
  otherMint: string;
  tngVault: string;
  otherVault: string;
  lpMint: string;
  rewardVault: string;
  tngReserve: string;
  otherReserve: string;
  lpSupply: string;
  totalStaked: string;
  rewardRate: string;
  lastRewardTime: string;
  accumulatedRewardPerShare: string;
  isActive: boolean;
  bump: number;
}

interface UserFarm {
  address: string;
  user: string;
  farmingPool: string;
  lpStaked: string;
  pendingRewards: string;
  rewardDebt: string;
  lastStakeTime: string;
}

interface FarmingPoolData {
  pool: FarmingPool;
  poolType: string;
  tokenA: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    decimals: number;
  };
}

interface UserFarmData {
  userFarm: UserFarm | null;
  pendingRewards: string;
  poolType: string;
}

interface FarmingContractState {
  // Pool data
  poolData: FarmingPoolData | null;
  userFarmData: UserFarmData | null;
  
  // Loading states
  loading: boolean;
  loadingAction: string | null;
  
  // Error handling
  error: string | null;
  
  // Transaction states
  lastTransaction: string | null;
}

export function useFarmingContract(poolType: 'TNG_SOL' | 'TNG_USDC' = 'TNG_SOL') {
  const { user } = useCompatibleAuth();
  
  const [state, setState] = useState<FarmingContractState>({
    poolData: null,
    userFarmData: null,
    loading: false,
    loadingAction: null,
    error: null,
    lastTransaction: null,
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<FarmingContractState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load pool data
  const loadPoolData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      
      const response = await fetch(`/api/defi/farming-contract?action=pool_data&poolType=${poolType}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load pool data');
      }
      
      updateState({ 
        poolData: result.data,
        loading: false 
      });
      
      return result.data;
    } catch (error: any) {
      console.error('Load pool data error:', error);
      updateState({ 
        error: error.message || 'Failed to load pool data',
        loading: false 
      });
      throw error;
    }
  }, [poolType, updateState]);

  // Load user farm data
  const loadUserFarmData = useCallback(async () => {
    if (!user?.walletAddress) {
      updateState({ userFarmData: null });
      return null;
    }

    try {
      const response = await fetch(
        `/api/defi/farming-contract?action=user_farm&userAddress=${user.walletAddress}&poolType=${poolType}`
      );
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load user farm data');
      }
      
      updateState({ userFarmData: result.data });
      return result.data;
    } catch (error: any) {
      console.error('Load user farm data error:', error);
      updateState({ 
        error: error.message || 'Failed to load user farm data'
      });
      return null;
    }
  }, [user?.walletAddress, poolType, updateState]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      
      await Promise.all([
        loadPoolData(),
        loadUserFarmData()
      ]);
      
      updateState({ loading: false });
    } catch (error: any) {
      console.error('Refresh data error:', error);
      updateState({ 
        error: error.message || 'Failed to refresh data',
        loading: false 
      });
    }
  }, [loadPoolData, loadUserFarmData, updateState]);

  // Add liquidity
  const addLiquidity = useCallback(async (
    tngAmount: number,
    otherAmount: number,
    minimumLpTokens: number = 0
  ) => {
    if (!user?.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      updateState({ 
        loadingAction: 'add_liquidity',
        error: null 
      });

      const response = await fetch('/api/defi/farming-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_liquidity',
          userAddress: user.walletAddress,
          poolType,
          tngAmount,
          otherAmount,
          minimumLpTokens
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add liquidity');
      }

      updateState({ 
        lastTransaction: result.data.signature,
        loadingAction: null 
      });

      // Refresh data after successful transaction
      await refreshData();

      return result.data;
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      updateState({ 
        error: error.message || 'Failed to add liquidity',
        loadingAction: null 
      });
      throw error;
    }
  }, [user?.walletAddress, poolType, updateState, refreshData]);

  // Remove liquidity
  const removeLiquidity = useCallback(async (
    lpTokens: number,
    minTngAmount: number = 0,
    minOtherAmount: number = 0
  ) => {
    if (!user?.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      updateState({ 
        loadingAction: 'remove_liquidity',
        error: null 
      });

      const response = await fetch('/api/defi/farming-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_liquidity',
          userAddress: user.walletAddress,
          poolType,
          lpTokens,
          minTngAmount,
          minOtherAmount
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove liquidity');
      }

      updateState({ 
        lastTransaction: result.data.signature,
        loadingAction: null 
      });

      // Refresh data after successful transaction
      await refreshData();

      return result.data;
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      updateState({ 
        error: error.message || 'Failed to remove liquidity',
        loadingAction: null 
      });
      throw error;
    }
  }, [user?.walletAddress, poolType, updateState, refreshData]);

  // Stake LP tokens
  const stakeLpTokens = useCallback(async (lpAmount: number) => {
    if (!user?.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      updateState({ 
        loadingAction: 'stake',
        error: null 
      });

      const response = await fetch('/api/defi/farming-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stake',
          userAddress: user.walletAddress,
          poolType,
          lpAmount
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to stake LP tokens');
      }

      updateState({ 
        lastTransaction: result.data.signature,
        loadingAction: null 
      });

      // Refresh data after successful transaction
      await refreshData();

      return result.data;
    } catch (error: any) {
      console.error('Stake LP tokens error:', error);
      updateState({ 
        error: error.message || 'Failed to stake LP tokens',
        loadingAction: null 
      });
      throw error;
    }
  }, [user?.walletAddress, poolType, updateState, refreshData]);

  // Unstake LP tokens
  const unstakeLpTokens = useCallback(async (unstakeAmount: number) => {
    if (!user?.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      updateState({ 
        loadingAction: 'unstake',
        error: null 
      });

      const response = await fetch('/api/defi/farming-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unstake',
          userAddress: user.walletAddress,
          poolType,
          unstakeAmount
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to unstake LP tokens');
      }

      updateState({ 
        lastTransaction: result.data.signature,
        loadingAction: null 
      });

      // Refresh data after successful transaction
      await refreshData();

      return result.data;
    } catch (error: any) {
      console.error('Unstake LP tokens error:', error);
      updateState({ 
        error: error.message || 'Failed to unstake LP tokens',
        loadingAction: null 
      });
      throw error;
    }
  }, [user?.walletAddress, poolType, updateState, refreshData]);

  // Claim rewards
  const claimRewards = useCallback(async () => {
    if (!user?.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      updateState({ 
        loadingAction: 'claim',
        error: null 
      });

      const response = await fetch('/api/defi/farming-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'claim',
          userAddress: user.walletAddress,
          poolType
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim rewards');
      }

      updateState({ 
        lastTransaction: result.data.signature,
        loadingAction: null 
      });

      // Refresh data after successful transaction
      await refreshData();

      return result.data;
    } catch (error: any) {
      console.error('Claim rewards error:', error);
      updateState({ 
        error: error.message || 'Failed to claim rewards',
        loadingAction: null 
      });
      throw error;
    }
  }, [user?.walletAddress, poolType, updateState, refreshData]);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh user data when user changes
  useEffect(() => {
    if (user?.walletAddress) {
      loadUserFarmData();
    }
  }, [user?.walletAddress, loadUserFarmData]);

  // Computed values
  const isLoading = state.loading || !!state.loadingAction;
  const hasUserFarm = !!state.userFarmData?.userFarm;
  const stakedAmount = state.userFarmData?.userFarm ? 
    parseFloat(state.userFarmData.userFarm.lpStaked) / 1e9 : 0;
  const pendingRewards = state.userFarmData ? 
    parseFloat(state.userFarmData.pendingRewards) / 1e9 : 0;

  return {
    // Data
    poolData: state.poolData,
    userFarmData: state.userFarmData,
    
    // Computed values
    hasUserFarm,
    stakedAmount,
    pendingRewards,
    
    // Loading states
    loading: state.loading,
    loadingAction: state.loadingAction,
    isLoading,
    
    // Error handling
    error: state.error,
    clearError,
    
    // Transaction
    lastTransaction: state.lastTransaction,
    
    // Actions
    refreshData,
    loadPoolData,
    loadUserFarmData,
    addLiquidity,
    removeLiquidity,
    stakeLpTokens,
    unstakeLpTokens,
    claimRewards,
  };
}
