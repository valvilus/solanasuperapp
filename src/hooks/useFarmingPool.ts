/**
 * Hook for managing farming pool data and operations
 * Integrates with TNG Farming contract and provides real-time pool information
 */

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { 
  PoolReserves, 
  calculateLiquidityOperation, 
  LiquidityCalculation,
  getOptimalSlippage,
  calculatePriceImpact
} from '@/lib/utils/pool-utils';

interface FarmingPoolData {
  address: string;
  tngMint: string;
  otherMint: string;
  tngReserve: string;
  otherReserve: string;
  lpSupply: string;
  totalStaked: string;
  rewardRate: string;
  isActive: boolean;
  tvl?: number;
  exchangeRate?: {
    tngToOther: number;
    otherToTng: number;
  };
}

interface UserFarmData {
  lpStaked: string;
  pendingRewards: string;
  lastStakeTime: string;
  lpStakedFormatted?: number;
  pendingRewardsFormatted?: number;
}

interface UseFarmingPoolReturn {
  poolData: FarmingPoolData | null;
  userFarmData: UserFarmData | null;
  reserves: PoolReserves | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  calculateLiquidity: (amountA: number, amountB: number, slippage?: number) => LiquidityCalculation | null;
  getCurrentPrice: () => { aToB: number; bToA: number } | null;
  getPriceImpact: (amountA: number, amountB: number) => number;
  getOptimalSlippageForAmount: (amountA: number, amountB: number) => number;
  addLiquidity: (amountA: number, amountB: number, slippage?: number) => Promise<{ signature: string }>;
  removeLiquidity: (lpTokens: number, minAmountA?: number, minAmountB?: number) => Promise<{ signature: string }>;
}

export function useFarmingPool(
  tokenAMint: string,
  tokenBMint: string,
  userPublicKey?: string
): UseFarmingPoolReturn {
  const [poolData, setPoolData] = useState<FarmingPoolData | null>(null);
  const [userFarmData, setUserFarmData] = useState<UserFarmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert pool data to reserves format
  const reserves: PoolReserves | null = poolData ? {
    tokenA: {
      mint: poolData.tngMint,
      reserve: poolData.tngReserve,
      decimals: 9
    },
    tokenB: {
      mint: poolData.otherMint,
      reserve: poolData.otherReserve,
      decimals: tokenBMint.includes('So11111111111111111111111111111111111111112') ? 9 : 6 // SOL = 9, USDC = 6
    },
    lpSupply: poolData.lpSupply
  } : null;

  // Fetch pool data from API
  const fetchPoolData = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch(`/api/defi/farming/pool?tokenA=${tokenAMint}&tokenB=${tokenBMint}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch pool data');
      }
      
      setPoolData(result.data.pool);
      
      // Fetch user farm data if user is provided
      if (userPublicKey && result.data.pool?.isActive) {
        const userResponse = await fetch(`/api/defi/farming/user?tokenA=${tokenAMint}&tokenB=${tokenBMint}&user=${userPublicKey}`);
        const userResult = await userResponse.json();
        
        if (userResult.success && userResult.data.userFarm) {
          setUserFarmData(userResult.data.userFarm);
        }
      }
      
    } catch (err) {
      console.error('Error fetching farming pool data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tokenAMint, tokenBMint, userPublicKey]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setLoading(true);
    await fetchPoolData();
  }, [fetchPoolData]);

  // Calculate liquidity operation details
  const calculateLiquidity = useCallback((
    amountA: number,
    amountB: number,
    slippage: number = 0.5
  ): LiquidityCalculation | null => {
    if (!reserves) return null;
    
    return calculateLiquidityOperation(amountA, amountB, reserves, slippage);
  }, [reserves]);

  // Get current price
  const getCurrentPrice = useCallback(() => {
    if (!reserves) return null;
    
    const calc = calculateLiquidityOperation(1, 0, reserves, 0);
    return {
      aToB: calc.priceAtoB,
      bToA: calc.priceBtoA
    };
  }, [reserves]);

  // Get price impact for amounts
  const getPriceImpact = useCallback((amountA: number, amountB: number): number => {
    if (!reserves) return 0;
    return calculatePriceImpact(amountA, amountB, reserves);
  }, [reserves]);

  // Get optimal slippage for amounts
  const getOptimalSlippageForAmount = useCallback((amountA: number, amountB: number): number => {
    if (!reserves) return 0.5;
    return getOptimalSlippage(reserves, amountA, amountB);
  }, [reserves]);

  // Add liquidity
  const addLiquidity = useCallback(async (
    amountA: number,
    amountB: number,
    slippage: number = 0.5
  ) => {
    if (!userPublicKey) {
      throw new Error('User wallet not connected');
    }

    const response = await fetch('/api/defi/farming/add-liquidity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPublicKey,
        tokenAMint,
        tokenBMint,
        amountA: Math.floor(amountA * Math.pow(10, 9)), // Convert to lamports
        amountB: Math.floor(amountB * Math.pow(10, reserves?.tokenB.decimals || 9)),
        slippageBps: Math.round(slippage * 100) // Convert to basis points
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to add liquidity');
    }

    // Refresh data after successful transaction
    await refreshData();
    
    return { signature: result.data.signature };
  }, [userPublicKey, tokenAMint, tokenBMint, reserves, refreshData]);

  // Remove liquidity
  const removeLiquidity = useCallback(async (
    lpTokens: number,
    minAmountA: number = 0,
    minAmountB: number = 0
  ) => {
    if (!userPublicKey) {
      throw new Error('User wallet not connected');
    }

    const response = await fetch('/api/defi/farming/remove-liquidity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPublicKey,
        tokenAMint,
        tokenBMint,
        lpTokens: Math.floor(lpTokens * Math.pow(10, 9)),
        minAmountA: Math.floor(minAmountA * Math.pow(10, 9)),
        minAmountB: Math.floor(minAmountB * Math.pow(10, reserves?.tokenB.decimals || 9))
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove liquidity');
    }

    // Refresh data after successful transaction
    await refreshData();
    
    return { signature: result.data.signature };
  }, [userPublicKey, tokenAMint, tokenBMint, reserves, refreshData]);

  // Initial data fetch
  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    poolData,
    userFarmData,
    reserves,
    loading,
    error,
    refreshData,
    calculateLiquidity,
    getCurrentPrice,
    getPriceImpact,
    getOptimalSlippageForAmount,
    addLiquidity,
    removeLiquidity
  };
}
