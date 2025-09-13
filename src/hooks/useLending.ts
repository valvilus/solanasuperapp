import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompatibleAuth } from './useCompatibleAuth';
import { useTokenBalance } from './useTokenBalance';

interface LendingPool {
  id: string;
  asset: string;
  icon: string;
  assetMint: string;
  totalSupply: number;
  totalBorrow: number;
  supplyAPY: number;
  borrowAPY: number;
  utilizationRate: number;
  collateralFactor: number;
  userSupplied: number;
  userBorrowed: number;
  canBeCollateral: boolean;
  protocol: string;
  liquidationThreshold: number;
  liquidationBonus: number;
}

interface UserPosition {
  poolId?: string;
  poolAddress?: string;
  assetMint?: string;
  symbol?: string;
  suppliedAmount: number;
  borrowedAmount: number;
  liquidityTokens?: number;
  supplyAPY?: number;
  borrowAPY?: number;
  healthFactor: number;
  lastSupplyTimestamp?: number;
  lastBorrowTimestamp?: number;
}

interface LendingSummary {
  totalSupplied: number;
  totalBorrowed: number;
  netAPY: number;
  healthFactor: number;
  totalCollateral: number;
  borrowLimit: number;
  liquidationRisk: 'low' | 'medium' | 'high';
}

interface LendingOperationResult {
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  error?: string;
}

interface UseLendingReturn {
  data: {
    pools: LendingPool[];
    userPositions: UserPosition[];
    summary: LendingSummary;
  };
  isLoading: boolean;
  error: string | null;
  supply: (token: string, amount: number) => Promise<LendingOperationResult>;
  withdraw: (token: string, liquidityAmount: number) => Promise<LendingOperationResult>;
  borrow: (token: string, amount: number) => Promise<LendingOperationResult>;
  repay: (token: string, amount: number) => Promise<LendingOperationResult>;
  initializePool: (token: string, params?: any) => Promise<LendingOperationResult>;
  refetch: () => Promise<void>;
}

// Icon mapping for different tokens
const TOKEN_ICONS: { [key: string]: string } = {
  SOL: '',
  TNG: '',
  USDC: '',
  USDT: '',
  RAY: ''
};

export function useLending(): UseLendingReturn {
  const [pools, setPools] = useState<LendingPool[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { apiCall, isAuthenticated, user } = useCompatibleAuth();
  // Используем те же hooks что и другие страницы для консистентности
  const solBalance = useTokenBalance('SOL', { cacheTime: 30000, autoRefresh: true });
  const tngBalance = useTokenBalance('TNG', { cacheTime: 30000, autoRefresh: true });
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 30000, autoRefresh: true });

  // Fetch lending pools
  const fetchPools = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔧 User not authenticated, skipping pools fetch');
      return;
    }
    
    try {
      const response = await apiCall('/api/defi/lending?action=get_pools');
      const result = await response.json();

      if (result.success) {
        const poolsData = result.data.pools || result.data;
        const formattedPools = poolsData.map((pool: any) => ({
          id: pool.id || pool.address,
          asset: pool.symbol || pool.asset,
          icon: TOKEN_ICONS[pool.symbol || pool.asset] || '',
          assetMint: pool.tokenMint || pool.assetMint,
          totalSupply: pool.totalSupply || 0,
          totalBorrow: pool.totalBorrows || 0,
          supplyAPY: pool.supplyAPY || 0,
          borrowAPY: pool.borrowAPY || 0,
          utilizationRate: pool.utilization || pool.utilizationRate || 0,
          collateralFactor: pool.liquidationThreshold || 85,
          userSupplied: pool.userSupplied || 0,
          userBorrowed: pool.userBorrowed || 0,
          canBeCollateral: pool.canBeCollateral !== false,
          protocol: pool.protocol || 'TNG Lending',
          liquidationThreshold: pool.liquidationThreshold || 85,
          liquidationBonus: pool.liquidationBonus || 5
        }));

        setPools(formattedPools);
      } else {
        throw new Error(result.error || 'Failed to fetch pools');
      }
    } catch (err: any) {
      console.error('Error fetching pools:', err);
      setError(err.message);
    }
  }, [apiCall]);

  // Fetch user positions
  const fetchUserPositions = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔧 User not authenticated, skipping user positions fetch');
      return;
    }

    try {
      const response = await apiCall(`/api/defi/lending?action=get_user_positions`);
      const result = await response.json();

      if (result.success) {
        const userPositionsData = result.data.userPositions || result.data;
        setUserPositions(userPositionsData);

        // Update pools with user data
        setPools(prevPools => prevPools.map(pool => {
          const userPosition = userPositionsData.find((pos: UserPosition) => pos.poolId === pool.assetMint || pos.symbol === pool.asset);
          return {
            ...pool,
            userSupplied: userPosition?.suppliedAmount || 0,
            userBorrowed: userPosition?.borrowedAmount || 0
          };
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch user positions');
      }
    } catch (err: any) {
      console.error('Error fetching user positions:', err);
      console.log('⚠️ Using empty user positions due to error');
      setUserPositions([]);
      // Don't set error for user positions as it's not critical
    }
  }, [isAuthenticated, apiCall]);

  // Calculate summary
  const calculateSummary = useCallback((): LendingSummary => {
    const totalSupplied = userPositions.reduce((sum, pos) => sum + pos.suppliedAmount, 0);
    const totalBorrowed = userPositions.reduce((sum, pos) => sum + pos.borrowedAmount, 0);
    
    // Calculate weighted average APY
    const totalSupplyValue = userPositions.reduce((sum, pos) => {
      const pool = pools.find(p => p.assetMint === pos.assetMint);
      return sum + (pos.suppliedAmount * (pool?.supplyAPY || 0));
    }, 0);
    
    const totalBorrowValue = userPositions.reduce((sum, pos) => {
      const pool = pools.find(p => p.assetMint === pos.assetMint);
      return sum + (pos.borrowedAmount * (pool?.borrowAPY || 0));
    }, 0);

    const netAPY = totalSupplied > 0 
      ? (totalSupplyValue - totalBorrowValue) / totalSupplied 
      : 0;

    // Calculate overall health factor (minimum across all positions)
    const healthFactor = userPositions.length > 0
      ? Math.min(...userPositions.map(pos => pos.healthFactor))
      : Number.MAX_SAFE_INTEGER;

    // Calculate total collateral value (simplified)
    const totalCollateral = totalSupplied * 0.85; // Assuming 85% collateral factor

    // Calculate borrow limit
    const borrowLimit = totalCollateral - totalBorrowed;

    // Determine liquidation risk
    let liquidationRisk: 'low' | 'medium' | 'high' = 'low';
    if (healthFactor < 1.2) liquidationRisk = 'high';
    else if (healthFactor < 1.5) liquidationRisk = 'medium';

    return {
      totalSupplied,
      totalBorrowed,
      netAPY,
      healthFactor,
      totalCollateral,
      borrowLimit,
      liquidationRisk
    };
  }, [userPositions, pools]);

  // Supply operation
  const supply = useCallback(async (token: string, amount: number): Promise<LendingOperationResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      setIsLoading(true);
      
      const response = await apiCall('/api/defi/lending', {
        method: 'POST',
        body: JSON.stringify({
          action: 'supply',
          token,
          amount
        })
      });

      const result = await response.json();

      if (result.success) {
        await refetch(); // Refresh data
        return {
          success: true,
          signature: result.signature,
          explorerUrl: result.explorerUrl
        };
      } else {
        return {
          success: false,
          error: result.error || 'Supply failed'
        };
      }
    } catch (err: any) {
      console.error('Supply error:', err);
      return {
        success: false,
        error: err.message || 'Supply failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Withdraw operation
  const withdraw = useCallback(async (token: string, liquidityAmount: number): Promise<LendingOperationResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      setIsLoading(true);
      
      const response = await apiCall('/api/defi/lending', {
        method: 'POST',
        body: JSON.stringify({
          action: 'withdraw',
          token,
          liquidityAmount
        })
      });

      const result = await response.json();

      if (result.success) {
        await refetch();
        return {
          success: true,
          signature: result.signature,
          explorerUrl: result.explorerUrl
        };
      } else {
        return {
          success: false,
          error: result.error || 'Withdraw failed'
        };
      }
    } catch (err: any) {
      console.error('Withdraw error:', err);
      return {
        success: false,
        error: err.message || 'Withdraw failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Borrow operation
  const borrow = useCallback(async (token: string, amount: number): Promise<LendingOperationResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      setIsLoading(true);
      
      const response = await apiCall('/api/defi/lending', {
        method: 'POST',
        body: JSON.stringify({
          action: 'borrow',
          token,
          amount
        })
      });

      const result = await response.json();

      if (result.success) {
        await refetch();
        return {
          success: true,
          signature: result.signature,
          explorerUrl: result.explorerUrl
        };
      } else {
        return {
          success: false,
          error: result.error || 'Borrow failed'
        };
      }
    } catch (err: any) {
      console.error('Borrow error:', err);
      return {
        success: false,
        error: err.message || 'Borrow failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Repay operation
  const repay = useCallback(async (token: string, amount: number): Promise<LendingOperationResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      setIsLoading(true);
      
      const response = await apiCall('/api/defi/lending', {
        method: 'POST',
        body: JSON.stringify({
          action: 'repay',
          token,
          amount
        })
      });

      const result = await response.json();

      if (result.success) {
        await refetch();
        return {
          success: true,
          signature: result.signature,
          explorerUrl: result.explorerUrl
        };
      } else {
        return {
          success: false,
          error: result.error || 'Repay failed'
        };
      }
    } catch (err: any) {
      console.error('Repay error:', err);
      return {
        success: false,
        error: err.message || 'Repay failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Initialize pool operation (admin function)
  const initializePool = useCallback(async (token: string, params?: any): Promise<LendingOperationResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      setIsLoading(true);
      
      const result = await apiCall('/api/defi/lending', {
        method: 'POST',
        body: JSON.stringify({
          action: 'initialize_pool',
          token,
          ...params
        })
      });

      const resultData = await result.json();
      
      if (resultData.success) {
        await refetch();
        return {
          success: true,
          signature: resultData.signature,
          explorerUrl: resultData.explorerUrl
        };
      } else {
        return {
          success: false,
          error: resultData.error || 'Pool initialization failed'
        };
      }
    } catch (err: any) {
      console.error('Initialize pool error:', err);
      return {
        success: false,
        error: err.message || 'Pool initialization failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Create refs for current functions to avoid stale closures
  const fetchPoolsRef = useRef(fetchPools);
  const fetchUserPositionsRef = useRef(fetchUserPositions);
  fetchPoolsRef.current = fetchPools;
  fetchUserPositionsRef.current = fetchUserPositions;

  // Refetch all data
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchPoolsRef.current(),
        fetchUserPositionsRef.current(),
        solBalance.refresh(),
        tngBalance.refresh(),
        usdcBalance.refresh()
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [solBalance, tngBalance, usdcBalance]);  // Only depend on stable token balance objects

  // Initial data fetch - only run once on mount
  useEffect(() => {
    refetch();
  }, []); // Empty dependency array to run only once

  // Calculate summary whenever data changes
  const summary = calculateSummary();

  return {
    data: {
      pools,
      userPositions,
      summary
    } as any,
    isLoading,
    error,
    supply,
    withdraw,
    borrow,
    repay,
    initializePool,
    refetch
  };
}
