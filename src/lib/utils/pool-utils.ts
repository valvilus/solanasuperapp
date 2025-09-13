/**
 * Pool Utilities for Farming and Swap
 * Shared logic for calculating ratios, prices, and liquidity operations
 */

export interface PoolReserves {
  tokenA: {
    mint: string;
    reserve: string;
    decimals: number;
  };
  tokenB: {
    mint: string;
    reserve: string;
    decimals: number;
  };
  lpSupply: string;
}

export interface LiquidityCalculation {
  expectedAmountB: number;
  expectedAmountA: number;
  lpTokensToReceive: number;
  priceAtoB: number;
  priceBtoA: number;
  shareOfPool: number;
}

/**
 * Calculate the current exchange rate between two tokens in a pool
 */
export function calculateExchangeRate(
  reserveA: string,
  reserveB: string,
  decimalsA: number = 9,
  decimalsB: number = 9
): { aToB: number; bToA: number } {
  const reserveANum = parseFloat(reserveA) / Math.pow(10, decimalsA);
  const reserveBNum = parseFloat(reserveB) / Math.pow(10, decimalsB);

  if (reserveANum === 0 || reserveBNum === 0) {
    return { aToB: 0, bToA: 0 };
  }

  return {
    aToB: reserveBNum / reserveANum,
    bToA: reserveANum / reserveBNum
  };
}

/**
 * Calculate expected amount of token B when providing amount A
 */
export function calculateExpectedTokenB(
  amountA: number,
  reserveA: string,
  reserveB: string,
  decimalsA: number = 9,
  decimalsB: number = 9
): number {
  const reserveANum = parseFloat(reserveA) / Math.pow(10, decimalsA);
  const reserveBNum = parseFloat(reserveB) / Math.pow(10, decimalsB);

  if (reserveANum === 0 || amountA === 0) return 0;

  return (amountA * reserveBNum) / reserveANum;
}

/**
 * Calculate expected amount of token A when providing amount B
 */
export function calculateExpectedTokenA(
  amountB: number,
  reserveA: string,
  reserveB: string,
  decimalsA: number = 9,
  decimalsB: number = 9
): number {
  const reserveANum = parseFloat(reserveA) / Math.pow(10, decimalsA);
  const reserveBNum = parseFloat(reserveB) / Math.pow(10, decimalsB);

  if (reserveBNum === 0 || amountB === 0) return 0;

  return (amountB * reserveANum) / reserveBNum;
}

/**
 * Calculate LP tokens to be received for adding liquidity
 */
export function calculateLpTokensToReceive(
  amountA: number,
  amountB: number,
  reserves: PoolReserves
): number {
  const reserveANum = parseFloat(reserves.tokenA.reserve) / Math.pow(10, reserves.tokenA.decimals);
  const reserveBNum = parseFloat(reserves.tokenB.reserve) / Math.pow(10, reserves.tokenB.decimals);
  const lpSupplyNum = parseFloat(reserves.lpSupply) / Math.pow(10, 9); // LP tokens usually have 9 decimals

  if (lpSupplyNum === 0) {
    // Initial liquidity - geometric mean
    return Math.sqrt(amountA * amountB);
  }

  // Subsequent liquidity - proportional to reserves
  const lpFromA = (amountA * lpSupplyNum) / reserveANum;
  const lpFromB = (amountB * lpSupplyNum) / reserveBNum;

  // Return the minimum to prevent manipulation
  return Math.min(lpFromA, lpFromB);
}

/**
 * Calculate share of pool after adding liquidity
 */
export function calculatePoolShare(
  lpTokensToReceive: number,
  currentLpSupply: string
): number {
  const currentSupply = parseFloat(currentLpSupply) / Math.pow(10, 9);
  const newSupply = currentSupply + lpTokensToReceive;
  
  if (newSupply === 0) return 0;
  
  return (lpTokensToReceive / newSupply) * 100;
}

/**
 * Validate if amounts are within slippage tolerance
 */
export function validateSlippage(
  providedAmountA: number,
  providedAmountB: number,
  expectedAmountA: number,
  expectedAmountB: number,
  slippagePercent: number
): { isValid: boolean; deviationA: number; deviationB: number } {
  const deviationA = expectedAmountA > 0 
    ? Math.abs(providedAmountA - expectedAmountA) / expectedAmountA * 100
    : 0;
  
  const deviationB = expectedAmountB > 0
    ? Math.abs(providedAmountB - expectedAmountB) / expectedAmountB * 100
    : 0;

  const isValid = deviationA <= slippagePercent && deviationB <= slippagePercent;

  return { isValid, deviationA, deviationB };
}

/**
 * Calculate complete liquidity operation details
 */
export function calculateLiquidityOperation(
  amountA: number,
  amountB: number,
  reserves: PoolReserves,
  slippagePercent: number = 0.5
): LiquidityCalculation {
  const exchangeRates = calculateExchangeRate(
    reserves.tokenA.reserve,
    reserves.tokenB.reserve,
    reserves.tokenA.decimals,
    reserves.tokenB.decimals
  );

  const expectedAmountB = calculateExpectedTokenB(
    amountA,
    reserves.tokenA.reserve,
    reserves.tokenB.reserve,
    reserves.tokenA.decimals,
    reserves.tokenB.decimals
  );

  const expectedAmountA = calculateExpectedTokenA(
    amountB,
    reserves.tokenA.reserve,
    reserves.tokenB.reserve,
    reserves.tokenA.decimals,
    reserves.tokenB.decimals
  );

  const lpTokensToReceive = calculateLpTokensToReceive(amountA, amountB, reserves);
  const shareOfPool = calculatePoolShare(lpTokensToReceive, reserves.lpSupply);

  return {
    expectedAmountB,
    expectedAmountA,
    lpTokensToReceive,
    priceAtoB: exchangeRates.aToB,
    priceBtoA: exchangeRates.bToA,
    shareOfPool
  };
}

/**
 * Format display price with appropriate decimals
 */
export function formatPrice(price: number, maxDecimals: number = 6): string {
  if (price === 0) return '0';
  
  // For very small numbers, use scientific notation
  if (price < 0.000001) {
    return price.toExponential(2);
  }
  
  // For prices less than 1, show more decimals
  if (price < 1) {
    return price.toFixed(Math.min(6, maxDecimals));
  }
  
  // For larger prices, show fewer decimals
  if (price > 1000) {
    return price.toFixed(Math.min(2, maxDecimals));
  }
  
  return price.toFixed(Math.min(4, maxDecimals));
}

/**
 * Convert basis points to percentage
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage to basis points
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Get optimal slippage based on pool conditions (consistent with swap system)
 */
export function getOptimalSlippage(
  reserves: PoolReserves,
  amountA: number,
  amountB: number
): number {
  const reserveANum = parseFloat(reserves.tokenA.reserve) / Math.pow(10, reserves.tokenA.decimals);
  const reserveBNum = parseFloat(reserves.tokenB.reserve) / Math.pow(10, reserves.tokenB.decimals);
  
  // Calculate impact relative to pool size
  const impactA = (amountA / reserveANum) * 100;
  const impactB = (amountB / reserveBNum) * 100;
  const maxImpact = Math.max(impactA, impactB);
  
  // Use same logic as swap system
  if (maxImpact < 0.1) return 0.1;
  if (maxImpact < 1) return 0.5;
  if (maxImpact < 3) return 1.0;
  
  return Math.min(maxImpact * 1.5, 20); // Max 20% slippage
}

/**
 * Calculate slippage amount (consistent with swap system)
 */
export function calculateSlippageAmount(
  amount: number,
  slippage: number,
  isMinimum: boolean = true
): number {
  const multiplier = isMinimum ? (1 - slippage / 100) : (1 + slippage / 100);
  return amount * multiplier;
}

/**
 * Calculate price impact for liquidity operations
 */
export function calculatePriceImpact(
  amountA: number,
  amountB: number,
  reserves: PoolReserves
): number {
  const reserveANum = parseFloat(reserves.tokenA.reserve) / Math.pow(10, reserves.tokenA.decimals);
  const reserveBNum = parseFloat(reserves.tokenB.reserve) / Math.pow(10, reserves.tokenB.decimals);
  
  if (reserveANum === 0 || reserveBNum === 0) return 0;
  
  // Calculate the impact on both sides
  const impactA = (amountA / reserveANum) * 100;
  const impactB = (amountB / reserveBNum) * 100;
  
  // Return the maximum impact
  return Math.max(impactA, impactB);
}
