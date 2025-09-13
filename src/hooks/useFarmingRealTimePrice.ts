/**
 * Hook for getting real-time token prices for farming
 * Uses the same price API as swap to ensure consistency
 */

import { useState, useEffect, useCallback } from 'react';

export interface TokenPrices {
  [mint: string]: number;
}

export interface ExchangeRate {
  tngToSol: number;
  solToTng: number;
  tngToUsdc: number;
  usdcToTng: number;
}

interface UseFarmingRealTimePriceReturn {
  prices: TokenPrices | null;
  exchangeRates: ExchangeRate | null;
  loading: boolean;
  error: string | null;
  refreshPrices: () => Promise<void>;
  calculateTokenAmount: (fromAmount: number, fromMint: string, toMint: string) => number;
}

const SUPPORTED_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  TNG: 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
} as const;

export function useFarmingRealTimePrice(): UseFarmingRealTimePriceReturn {
  const [prices, setPrices] = useState<TokenPrices | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real-time prices using the same logic as swap
  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      
      // Get SOL price from CoinGecko (same as in SwapService)
      let solPrice = 98.45; // fallback
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        if (data.solana?.usd) {
          solPrice = data.solana.usd;
        }
      } catch (error) {
        console.log(' Failed to fetch SOL price, using fallback:', error);
      }

      // KZT to USD rate (approximately 450-470 KZT per 1 USD)
      const kztToUsd = 1 / 450; // 1 KZT ≈ $0.0022

      const currentPrices = {
        [SUPPORTED_TOKENS.SOL]: solPrice,
        [SUPPORTED_TOKENS.TNG]: kztToUsd, // 1 TNG = 1 KZT ≈ $0.0022
        [SUPPORTED_TOKENS.USDC]: 1.00
      };

      // Calculate exchange rates
      const currentExchangeRates: ExchangeRate = {
        tngToSol: kztToUsd / solPrice,      // How much SOL per 1 TNG
        solToTng: solPrice / kztToUsd,      // How much TNG per 1 SOL
        tngToUsdc: kztToUsd / 1.00,         // How much USDC per 1 TNG
        usdcToTng: 1.00 / kztToUsd          // How much TNG per 1 USDC
      };

      console.log(' Farming real-time prices:', {
        SOL: `$${solPrice}`,
        TNG: `$${kztToUsd} (1 TNG = 1 KZT)`,
        USDC: '$1.00',
        exchangeRates: {
          '1 TNG to SOL': `${currentExchangeRates.tngToSol.toFixed(6)} SOL`,
          '1 SOL to TNG': `${currentExchangeRates.solToTng.toFixed(2)} TNG`,
          '1 TNG to USDC': `${currentExchangeRates.tngToUsdc.toFixed(6)} USDC`,
          '1 USDC to TNG': `${currentExchangeRates.usdcToTng.toFixed(2)} TNG`
        }
      });

      setPrices(currentPrices);
      setExchangeRates(currentExchangeRates);
      
    } catch (err) {
      console.error(' Error fetching farming prices:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate token amount based on real-time prices
  const calculateTokenAmount = useCallback((
    fromAmount: number, 
    fromMint: string, 
    toMint: string
  ): number => {
    if (!prices || !exchangeRates || fromAmount <= 0) return 0;

    const fromPrice = prices[fromMint];
    const toPrice = prices[toMint];

    if (!fromPrice || !toPrice) return 0;

    // Calculate through USD value (same as swap logic)
    const usdValue = fromAmount * fromPrice;
    const toAmount = usdValue / toPrice;

    console.log(' Farming token calculation:', {
      from: {
        amount: fromAmount,
        mint: fromMint,
        price: `$${fromPrice}`,
        value: `$${usdValue.toFixed(4)}`
      },
      to: {
        amount: toAmount.toFixed(6),
        mint: toMint,
        price: `$${toPrice}`,
        value: `$${usdValue.toFixed(4)}`
      }
    });

    return toAmount;
  }, [prices, exchangeRates]);

  // Refresh prices function
  const refreshPrices = useCallback(async () => {
    setLoading(true);
    await fetchPrices();
  }, [fetchPrices]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchPrices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return {
    prices,
    exchangeRates,
    loading,
    error,
    refreshPrices,
    calculateTokenAmount
  };
}
