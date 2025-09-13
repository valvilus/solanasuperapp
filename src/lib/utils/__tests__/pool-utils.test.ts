/**
 * Tests for pool utilities
 * Testing liquidity calculations, ratio validation, and slippage logic
 */

import {
  calculateExchangeRate,
  calculateExpectedTokenB,
  calculateExpectedTokenA,
  calculateLpTokensToReceive,
  calculatePoolShare,
  validateSlippage,
  calculateLiquidityOperation,
  formatPrice,
  bpsToPercent,
  percentToBps,
  getOptimalSlippage,
  calculateSlippageAmount,
  calculatePriceImpact,
  PoolReserves
} from '../pool-utils';

describe('Pool Utilities', () => {
  const mockReserves: PoolReserves = {
    tokenA: {
      mint: 'TNG_MINT',
      reserve: '1000000000000', // 1000 TNG (9 decimals)
      decimals: 9
    },
    tokenB: {
      mint: 'SOL_MINT', 
      reserve: '1000000000', // 1 SOL (9 decimals)
      decimals: 9
    },
    lpSupply: '31622776601' // sqrt(1000 * 1) * 1e9
  };

  describe('calculateExchangeRate', () => {
    it('should calculate correct exchange rates', () => {
      const { aToB, bToA } = calculateExchangeRate(
        mockReserves.tokenA.reserve,
        mockReserves.tokenB.reserve,
        mockReserves.tokenA.decimals,
        mockReserves.tokenB.decimals
      );

      expect(aToB).toBe(0.001); // 1 TNG = 0.001 SOL
      expect(bToA).toBe(1000); // 1 SOL = 1000 TNG
    });

    it('should handle zero reserves', () => {
      const { aToB, bToA } = calculateExchangeRate('0', '1000000000', 9, 9);
      expect(aToB).toBe(0);
      expect(bToA).toBe(0);
    });
  });

  describe('calculateExpectedTokenB', () => {
    it('should calculate expected token B amount', () => {
      const expectedB = calculateExpectedTokenB(
        100, // 100 TNG
        mockReserves.tokenA.reserve,
        mockReserves.tokenB.reserve,
        mockReserves.tokenA.decimals,
        mockReserves.tokenB.decimals
      );

      expect(expectedB).toBe(0.1); // 100 TNG = 0.1 SOL
    });

    it('should handle zero amount', () => {
      const expectedB = calculateExpectedTokenB(0, mockReserves.tokenA.reserve, mockReserves.tokenB.reserve);
      expect(expectedB).toBe(0);
    });
  });

  describe('calculateExpectedTokenA', () => {
    it('should calculate expected token A amount', () => {
      const expectedA = calculateExpectedTokenA(
        0.5, // 0.5 SOL
        mockReserves.tokenA.reserve,
        mockReserves.tokenB.reserve,
        mockReserves.tokenA.decimals,
        mockReserves.tokenB.decimals
      );

      expect(expectedA).toBe(500); // 0.5 SOL = 500 TNG
    });
  });

  describe('calculateLpTokensToReceive', () => {
    it('should calculate LP tokens for initial liquidity', () => {
      const initialReserves: PoolReserves = {
        ...mockReserves,
        lpSupply: '0'
      };

      const lpTokens = calculateLpTokensToReceive(100, 0.1, initialReserves);
      expect(lpTokens).toBeCloseTo(Math.sqrt(100 * 0.1), 5); // geometric mean
    });

    it('should calculate LP tokens for subsequent liquidity', () => {
      const lpTokens = calculateLpTokensToReceive(100, 0.1, mockReserves);
      
      // Should be proportional to existing supply
      const expectedFromA = (100 * parseFloat(mockReserves.lpSupply) / 1e9) / (parseFloat(mockReserves.tokenA.reserve) / 1e9);
      const expectedFromB = (0.1 * parseFloat(mockReserves.lpSupply) / 1e9) / (parseFloat(mockReserves.tokenB.reserve) / 1e9);
      const expected = Math.min(expectedFromA, expectedFromB);
      
      expect(lpTokens).toBeCloseTo(expected, 5);
    });
  });

  describe('validateSlippage', () => {
    it('should validate amounts within slippage tolerance', () => {
      const result = validateSlippage(100, 0.1, 100, 0.1, 0.5);
      expect(result.isValid).toBe(true);
      expect(result.deviationA).toBe(0);
      expect(result.deviationB).toBe(0);
    });

    it('should reject amounts outside slippage tolerance', () => {
      const result = validateSlippage(100, 0.15, 100, 0.1, 0.5); // 50% deviation on B
      expect(result.isValid).toBe(false);
      expect(result.deviationB).toBe(50);
    });

    it('should handle small deviations within tolerance', () => {
      const result = validateSlippage(100.2, 0.1002, 100, 0.1, 0.5);
      expect(result.isValid).toBe(true);
      expect(result.deviationA).toBeCloseTo(0.2, 1);
      expect(result.deviationB).toBeCloseTo(0.2, 1);
    });
  });

  describe('calculateLiquidityOperation', () => {
    it('should calculate complete liquidity operation', () => {
      const result = calculateLiquidityOperation(100, 0.1, mockReserves, 0.5);
      
      expect(result.expectedAmountB).toBe(0.1); // 100 TNG = 0.1 SOL
      expect(result.expectedAmountA).toBe(100); // 0.1 SOL = 100 TNG
      expect(result.priceAtoB).toBe(0.001);
      expect(result.priceBtoA).toBe(1000);
      expect(result.lpTokensToReceive).toBeGreaterThan(0);
      expect(result.shareOfPool).toBeGreaterThan(0);
    });
  });

  describe('formatPrice', () => {
    it('should format small prices correctly', () => {
      expect(formatPrice(0.000001)).toBe('1.00e-6');
      expect(formatPrice(0.001234)).toBe('0.001234');
      expect(formatPrice(0.123456)).toBe('0.123456');
    });

    it('should format large prices correctly', () => {
      expect(formatPrice(1234.5678)).toBe('1234.57');
      expect(formatPrice(12345.6789)).toBe('12345.68');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('0');
    });
  });

  describe('bpsToPercent and percentToBps', () => {
    it('should convert between basis points and percentages', () => {
      expect(bpsToPercent(50)).toBe(0.5);
      expect(bpsToPercent(100)).toBe(1);
      expect(bpsToPercent(1000)).toBe(10);

      expect(percentToBps(0.5)).toBe(50);
      expect(percentToBps(1)).toBe(100);
      expect(percentToBps(10)).toBe(1000);
    });
  });

  describe('getOptimalSlippage', () => {
    it('should return low slippage for small trades', () => {
      const slippage = getOptimalSlippage(mockReserves, 1, 0.001); // 0.1% of pool
      expect(slippage).toBe(0.1);
    });

    it('should return higher slippage for larger trades', () => {
      const slippage = getOptimalSlippage(mockReserves, 50, 0.05); // 5% of pool
      expect(slippage).toBe(1.0);
    });

    it('should cap slippage at maximum', () => {
      const slippage = getOptimalSlippage(mockReserves, 500, 0.5); // 50% of pool
      expect(slippage).toBeLessThanOrEqual(20);
    });
  });

  describe('calculateSlippageAmount', () => {
    it('should calculate minimum amount with slippage', () => {
      const minAmount = calculateSlippageAmount(100, 1, true); // 1% slippage, minimum
      expect(minAmount).toBe(99);
    });

    it('should calculate maximum amount with slippage', () => {
      const maxAmount = calculateSlippageAmount(100, 1, false); // 1% slippage, maximum
      expect(maxAmount).toBe(101);
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact for trades', () => {
      const impact = calculatePriceImpact(50, 0.05, mockReserves); // 5% of pool
      expect(impact).toBe(5);
    });

    it('should handle zero reserves', () => {
      const emptyReserves: PoolReserves = {
        ...mockReserves,
        tokenA: { ...mockReserves.tokenA, reserve: '0' }
      };
      
      const impact = calculatePriceImpact(100, 0.1, emptyReserves);
      expect(impact).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      const result = calculateLiquidityOperation(0.001, 0.000001, mockReserves, 0.5);
      expect(result.lpTokensToReceive).toBeGreaterThanOrEqual(0);
      expect(result.shareOfPool).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large amounts', () => {
      const result = calculateLiquidityOperation(10000, 10, mockReserves, 5);
      expect(result.lpTokensToReceive).toBeGreaterThan(0);
      expect(result.shareOfPool).toBeLessThanOrEqual(100);
    });

    it('should handle empty pool', () => {
      const emptyReserves: PoolReserves = {
        tokenA: { mint: 'A', reserve: '0', decimals: 9 },
        tokenB: { mint: 'B', reserve: '0', decimals: 9 },
        lpSupply: '0'
      };

      const result = calculateLiquidityOperation(100, 0.1, emptyReserves, 0.5);
      expect(result.expectedAmountA).toBe(0);
      expect(result.expectedAmountB).toBe(0);
      expect(result.priceAtoB).toBe(0);
      expect(result.priceBtoA).toBe(0);
    });
  });

  describe('Ratio Validation Scenarios', () => {
    it('should validate perfect ratio match', () => {
      const validation = validateSlippage(100, 0.1, 100, 0.1, 0.5);
      expect(validation.isValid).toBe(true);
    });

    it('should reject significant ratio mismatch', () => {
      const validation = validateSlippage(100, 0.2, 100, 0.1, 0.5); // 100% deviation
      expect(validation.isValid).toBe(false);
    });

    it('should handle edge case ratios', () => {
      // User provides much more of token A than expected
      const validation = validateSlippage(150, 0.1, 100, 0.1, 50); // High slippage tolerance
      expect(validation.isValid).toBe(true);
    });
  });
});
