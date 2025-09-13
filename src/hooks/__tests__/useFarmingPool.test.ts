/**
 * Tests for useFarmingPool hook
 * Testing farming pool data fetching, calculations, and operations
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFarmingPool } from '../useFarmingPool';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useFarmingPool', () => {
  const TNG_MINT = 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs';
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const USER_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

  const mockPoolData = {
    address: 'POOL_ADDRESS',
    tngMint: TNG_MINT,
    otherMint: SOL_MINT,
    tngReserve: '1000000000000', // 1000 TNG
    otherReserve: '1000000000',   // 1 SOL
    lpSupply: '31622776601',      // ~31.6 LP tokens
    totalStaked: '0',
    rewardRate: '1000000',
    isActive: true,
    tvl: 200000, // $200k TVL
    exchangeRate: {
      tngToOther: 0.001,
      otherToTng: 1000
    }
  };

  const mockUserFarmData = {
    address: 'USER_FARM_ADDRESS',
    user: USER_ADDRESS,
    farmingPool: 'POOL_ADDRESS',
    lpStaked: '10000000000', // 10 LP tokens
    pendingRewards: '5000000000', // 5 TNG rewards
    lastStakeTime: '1640995200',
    lpStakedFormatted: 10,
    pendingRewardsFormatted: 5
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Pool Data Fetching', () => {
    it('should fetch pool data successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { pool: mockPoolData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { userFarm: mockUserFarmData }
          })
        } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT, USER_ADDRESS)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.poolData).toEqual(mockPoolData);
      expect(result.current.userFarmData).toEqual(mockUserFarmData);
      expect(result.current.error).toBeNull();
    });

    it('should handle pool data fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Pool not found'
        })
      } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT, USER_ADDRESS)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Pool not found');
      expect(result.current.poolData).toBeNull();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT, USER_ADDRESS)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Pool Calculations', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { pool: mockPoolData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { userFarm: null }
          })
        } as Response);
    });

    it('should calculate liquidity correctly', async () => {
      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const calculation = result.current.calculateLiquidity(100, 0.1, 0.5);
      
      expect(calculation).toBeTruthy();
      expect(calculation!.expectedAmountB).toBeCloseTo(0.1, 3);
      expect(calculation!.expectedAmountA).toBeCloseTo(100, 3);
      expect(calculation!.priceAtoB).toBe(0.001);
      expect(calculation!.priceBtoA).toBe(1000);
    });

    it('should get current price', async () => {
      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const price = result.current.getCurrentPrice();
      
      expect(price).toBeTruthy();
      expect(price!.aToB).toBe(0.001);
      expect(price!.bToA).toBe(1000);
    });

    it('should calculate price impact', async () => {
      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const impact = result.current.getPriceImpact(50, 0.05); // 5% of pool
      expect(impact).toBe(5);
    });

    it('should get optimal slippage', async () => {
      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const slippage = result.current.getOptimalSlippageForAmount(10, 0.01); // Small trade
      expect(slippage).toBe(0.5);

      const highSlippage = result.current.getOptimalSlippageForAmount(100, 0.1); // Larger trade  
      expect(highSlippage).toBeGreaterThan(0.5);
    });
  });

  describe('Liquidity Operations', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { pool: mockPoolData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { userFarm: mockUserFarmData }
          })
        } as Response);
    });

    it('should add liquidity successfully', async () => {
      // Mock successful add liquidity
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { signature: 'TRANSACTION_SIGNATURE' }
        })
      } as Response);

      // Mock refresh data
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { pool: mockPoolData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { userFarm: mockUserFarmData }
          })
        } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT, USER_ADDRESS)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const addResult = await result.current.addLiquidity(100, 0.1, 0.5);
      
      expect(addResult.signature).toBe('TRANSACTION_SIGNATURE');
      expect(mockFetch).toHaveBeenCalledWith('/api/defi/farming/add-liquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPublicKey: USER_ADDRESS,
          tokenAMint: TNG_MINT,
          tokenBMint: SOL_MINT,
          amountA: 100000000000, // 100 TNG in lamports
          amountB: 100000000,    // 0.1 SOL in lamports
          slippageBps: 50        // 0.5% in basis points
        })
      });
    });

    it('should handle add liquidity error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Insufficient balance'
        })
      } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT, USER_ADDRESS)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.addLiquidity(100, 0.1, 0.5))
        .rejects.toThrow('Insufficient balance');
    });

    it('should remove liquidity successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { signature: 'REMOVE_SIGNATURE' }
        })
      } as Response);

      // Mock refresh data
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { pool: mockPoolData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { userFarm: mockUserFarmData }
          })
        } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT, USER_ADDRESS)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const removeResult = await result.current.removeLiquidity(5, 0, 0);
      
      expect(removeResult.signature).toBe('REMOVE_SIGNATURE');
      expect(mockFetch).toHaveBeenCalledWith('/api/defi/farming/remove-liquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPublicKey: USER_ADDRESS,
          tokenAMint: TNG_MINT,
          tokenBMint: SOL_MINT,
          lpTokens: 5000000000, // 5 LP tokens in lamports
          minAmountA: 0,
          minAmountB: 0
        })
      });
    });

    it('should throw error when user wallet not connected', async () => {
      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT) // No user address
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.addLiquidity(100, 0.1, 0.5))
        .rejects.toThrow('User wallet not connected');
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data manually', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { 
              pool: { ...mockPoolData, tvl: callCount === 1 ? 200000 : 250000 } 
            }
          })
        }) as any;
      });

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.poolData?.tvl).toBe(200000);

      await result.current.refreshData();

      expect(result.current.poolData?.tvl).toBe(250000);
      expect(callCount).toBeGreaterThan(2); // Initial + refresh calls
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing reserves', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { pool: null }
        })
      } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, SOL_MINT)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reserves).toBeNull();
      expect(result.current.calculateLiquidity(100, 0.1)).toBeNull();
      expect(result.current.getCurrentPrice()).toBeNull();
      expect(result.current.getPriceImpact(100, 0.1)).toBe(0);
      expect(result.current.getOptimalSlippageForAmount(100, 0.1)).toBe(0.5);
    });

    it('should handle different token decimals', async () => {
      const usdcPoolData = {
        ...mockPoolData,
        otherMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        otherReserve: '1000000' // 1 USDC (6 decimals)
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { pool: usdcPoolData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { userFarm: null }
          })
        } as Response);

      const { result } = renderHook(() => 
        useFarmingPool(TNG_MINT, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reserves?.tokenB.decimals).toBe(6);
      
      const calculation = result.current.calculateLiquidity(1000, 1, 0.5);
      expect(calculation).toBeTruthy();
    });
  });
});
