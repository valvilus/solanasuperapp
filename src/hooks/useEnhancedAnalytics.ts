/**
 * Enhanced Analytics Hook - Comprehensive DeFi portfolio analytics
 * Integrates: Staking, Farming, Lending, Swap data + Real-time calculations
 * Solana SuperApp
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStaking } from './useStaking'
import { useFarming } from './useFarming'
import { useLending } from './useLending'
import { useSwap } from './useSwap'
import { useHistory } from './useHistory'
import { useTokenBalance } from './useTokenBalance'
import { useFarmingRealTimePrice } from './useFarmingRealTimePrice'
import { useCompatibleAuth } from './useCompatibleAuth'

// Enhanced interfaces
export interface EnhancedPortfolioAnalytics {
  overview: {
    totalValue: number
    totalPnL: number
    totalPnLPercent: number
    dailyChange: number
    dailyChangePercent: number
    weeklyChange: number
    weeklyChangePercent: number
    monthlyChange: number
    monthlyChangePercent: number
    avgAPY: number
    riskScore: number
    healthFactor: number
  }
  breakdown: {
    holdings: {
      value: number
      allocation: number
      tokens: { symbol: string; amount: number; value: number; allocation: number }[]
    }
    staking: {
      value: number
      stakedAmount: number
      rewards: number
      apy: number
      allocation: number
      positions: number
    }
    farming: {
      value: number
      lpTokens: number
      rewards: number
      apy: number
      allocation: number
      impermanentLoss: number
      positions: number
    }
    lending: {
      suppliedValue: number
      borrowedValue: number
      netValue: number
      supplyAPY: number
      borrowAPY: number
      netAPY: number
      allocation: number
      healthFactor: number
      positions: number
    }
    swapping: {
      volume24h: number
      volume7d: number
      volume30d: number
      transactions: number
      totalFees: number
      averageSlippage: number
    }
  }
  performance: {
    bestAsset: { symbol: string; pnl: number; pnlPercent: number }
    worstAsset: { symbol: string; pnl: number; pnlPercent: number }
    winRate: number
    profitableStrategies: number
    totalTransactions: number
    successfulTransactions: number
  }
  risk: {
    portfolioRisk: 'low' | 'medium' | 'high'
    liquidationRisk: 'safe' | 'warning' | 'danger'
    diversificationScore: number
    concentrationRisk: number
    protocolRisk: number
    sharpeRatio: number
    maxDrawdown: number
  }
  protocols: Array<{
    name: string
    value: number
    allocation: number
    apy: number
    risk: string
    transactions: number
    status: 'active' | 'inactive'
  }>
  timeframes: {
    '24h': { pnl: number; pnlPercent: number; volume: number }
    '7d': { pnl: number; pnlPercent: number; volume: number }
    '30d': { pnl: number; pnlPercent: number; volume: number }
    '90d': { pnl: number; pnlPercent: number; volume: number }
  }
  chartData: {
    portfolioValue: Array<{ timestamp: number; value: number }>
    pnlHistory: Array<{ timestamp: number; pnl: number; pnlPercent: number }>
    apyHistory: Array<{ timestamp: number; apy: number }>
    allocationHistory: Array<{ 
      timestamp: number
      staking: number
      farming: number
      lending: number
      holdings: number
    }>
  }
  lastUpdated: number
}

export interface UseEnhancedAnalyticsReturn {
  data: EnhancedPortfolioAnalytics
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  setTimeframe: (timeframe: '24h' | '7d' | '30d' | '90d') => void
  timeframe: '24h' | '7d' | '30d' | '90d'
}

export function useEnhancedAnalytics(): UseEnhancedAnalyticsReturn {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isAuthenticated } = useCompatibleAuth()
  
  // Hooks for all data sources
  const stakingData = useStaking()
  const farmingData = useFarming()
  const lendingData = useLending()
  const swapData = useSwap()
  const historyData = useHistory({ limit: 100 })
  const priceData = useFarmingRealTimePrice()

  // Token balances
  const solBalance = useTokenBalance('SOL')
  const tngBalance = useTokenBalance('TNG')
  const usdcBalance = useTokenBalance('USDC')

  // Calculate enhanced analytics
  const calculateAnalytics = useCallback((): EnhancedPortfolioAnalytics => {
    const prices = priceData.prices || { SOL: 98.5, TNG: 0.01, USDC: 1.0 }
    
    // Debug logging removed for production cleanliness

    // Holdings calculation - защита от NaN
    const holdingsValue = Number.isFinite(
      (solBalance.balance || 0) * (prices.SOL || 0) +
      (tngBalance.balance || 0) * (prices.TNG || 0) +
      (usdcBalance.balance || 0) * (prices.USDC || 1)
    ) ? (
      (solBalance.balance || 0) * (prices.SOL || 0) +
      (tngBalance.balance || 0) * (prices.TNG || 0) +
      (usdcBalance.balance || 0) * (prices.USDC || 1)
    ) : 0

    // Staking calculation - защита от NaN
    const stakingValue = Number.isFinite(((stakingData.data as any)?.summary?.totalStaked || 0) * (prices.TNG || 0)) 
      ? ((stakingData.data as any)?.summary?.totalStaked || 0) * (prices.TNG || 0) : 0
    const stakingRewards = Number.isFinite(((stakingData.data as any)?.summary?.totalRewards || 0) * (prices.TNG || 0))
      ? ((stakingData.data as any)?.summary?.totalRewards || 0) * (prices.TNG || 0) : 0
    const stakingAPY = Number.isFinite((stakingData.data as any)?.summary?.averageApy || 0) 
      ? ((stakingData.data as any)?.summary?.averageApy || 0) : 0

    // Farming calculation - защита от NaN
    const farmingValue = Number.isFinite((farmingData.data as any)?.summary?.totalValue || 0) 
      ? ((farmingData.data as any)?.summary?.totalValue || 0) : 0
    const farmingRewards = Number.isFinite(((farmingData.data as any)?.summary?.totalRewards || 0) * (prices.TNG || 0))
      ? ((farmingData.data as any)?.summary?.totalRewards || 0) * (prices.TNG || 0) : 0
    const farmingAPY = Number.isFinite((farmingData.data as any)?.summary?.averageApy || 0)
      ? ((farmingData.data as any)?.summary?.averageApy || 0) : 0

    // Lending calculation - защита от NaN
    const lendingSupplied = Number.isFinite(lendingData.data?.summary?.totalSupplied || 0)
      ? (lendingData.data?.summary?.totalSupplied || 0) : 0
    const lendingBorrowed = Number.isFinite(lendingData.data?.summary?.totalBorrowed || 0)
      ? (lendingData.data?.summary?.totalBorrowed || 0) : 0
    const lendingNetValue = lendingSupplied - lendingBorrowed
    const lendingAPY = Number.isFinite(lendingData.data?.summary?.netAPY || 0)
      ? (lendingData.data?.summary?.netAPY || 0) : 0
    const healthFactor = Number.isFinite(lendingData.data?.summary?.healthFactor || Number.MAX_SAFE_INTEGER)
      ? (lendingData.data?.summary?.healthFactor || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER

    // Total portfolio value - защита от NaN
    const totalValue = Number.isFinite(holdingsValue + stakingValue + farmingValue + lendingNetValue)
      ? (holdingsValue + stakingValue + farmingValue + lendingNetValue) : 0

    // PnL calculations
    const totalRewards = stakingRewards + farmingRewards
    const totalPnL = totalRewards // Simplified - could include price appreciation
    const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0

    // APY calculations
    const weightedAPY = totalValue > 0 ? 
      ((stakingValue * stakingAPY + farmingValue * farmingAPY + lendingNetValue * lendingAPY) / totalValue) : 0

    // Risk calculations
    const portfolioRisk: 'low' | 'medium' | 'high' = 
      healthFactor < 1.2 ? 'high' : 
      healthFactor < 2.0 ? 'medium' : 'low'

    const liquidationRisk: 'safe' | 'warning' | 'danger' =
      healthFactor < 1.1 ? 'danger' :
      healthFactor < 1.5 ? 'warning' : 'safe'

    // Diversification score (0-10)
    const activePositions = [
      holdingsValue > 0 ? 1 : 0,
      stakingValue > 0 ? 1 : 0, 
      farmingValue > 0 ? 1 : 0,
      lendingNetValue > 0 ? 1 : 0
    ].reduce((a, b) => a + b, 0)

    const diversificationScore = Math.min(10, activePositions * 2.5)

    // Protocol data
    const protocols = [
      ...(stakingValue > 0 ? [{
        name: 'TNG Staking',
        value: stakingValue,
        allocation: totalValue > 0 ? (stakingValue / totalValue) * 100 : 0,
        apy: stakingAPY,
        risk: 'low',
        transactions: stakingData.data?.positions?.length || 0,
        status: 'active' as const
      }] : []),
      ...(farmingValue > 0 ? [{
        name: 'TNG Farming',
        value: farmingValue,
        allocation: totalValue > 0 ? (farmingValue / totalValue) * 100 : 0,
        apy: farmingAPY,
        risk: 'medium',
        transactions: farmingData.data?.positions?.length || 0,
        status: 'active' as const
      }] : []),
      ...(lendingNetValue > 0 ? [{
        name: 'TNG Lending',
        value: lendingNetValue,
        allocation: totalValue > 0 ? (lendingNetValue / totalValue) * 100 : 0,
        apy: lendingAPY,
        risk: healthFactor < 2 ? 'high' : 'medium',
        transactions: lendingData.data?.userPositions?.length || 0,
        status: 'active' as const
      }] : [])
    ]

    // Generate mock historical data (in real app, this would come from API)
    const now = Date.now()
    const generateHistoricalData = (days: number) => {
      return Array.from({ length: days }, (_, i) => {
        const timestamp = now - (days - i - 1) * 24 * 60 * 60 * 1000
        const randomVariation = 0.95 + Math.random() * 0.1 // ±5% variation
        return {
          timestamp,
          value: totalValue * randomVariation,
          pnl: totalPnL * randomVariation,
          pnlPercent: totalPnLPercent * randomVariation,
          apy: weightedAPY * (0.9 + Math.random() * 0.2) // ±10% APY variation
        }
      })
    }

    const historicalData = generateHistoricalData(30)

    return {
      overview: {
        totalValue,
        totalPnL,
        totalPnLPercent,
        dailyChange: totalPnL / 30, // Rough daily estimate
        dailyChangePercent: totalPnLPercent / 30,
        weeklyChange: totalPnL / 4, // Rough weekly estimate
        weeklyChangePercent: totalPnLPercent / 4,
        monthlyChange: totalPnL,
        monthlyChangePercent: totalPnLPercent,
        avgAPY: weightedAPY,
        riskScore: healthFactor < 1.5 ? 8 : healthFactor < 2.5 ? 5 : 2,
        healthFactor: healthFactor === Number.MAX_SAFE_INTEGER ? 999 : healthFactor
      },
      breakdown: {
        holdings: {
          value: holdingsValue,
          allocation: totalValue > 0 ? (holdingsValue / totalValue) * 100 : 0,
          tokens: [
            { symbol: 'SOL', amount: solBalance.balance || 0, value: (solBalance.balance || 0) * prices.SOL, allocation: 0 },
            { symbol: 'TNG', amount: tngBalance.balance || 0, value: (tngBalance.balance || 0) * prices.TNG, allocation: 0 },
            { symbol: 'USDC', amount: usdcBalance.balance || 0, value: (usdcBalance.balance || 0) * prices.USDC, allocation: 0 }
          ].map(token => ({
            ...token,
            allocation: totalValue > 0 ? (token.value / totalValue) * 100 : 0
          }))
        },
        staking: {
          value: stakingValue,
          stakedAmount: stakingData.data?.summary?.totalStaked || 0,
          rewards: stakingRewards,
          apy: stakingAPY,
          allocation: totalValue > 0 ? (stakingValue / totalValue) * 100 : 0,
          positions: stakingData.data?.positions?.length || 0
        },
        farming: {
          value: farmingValue,
          lpTokens: farmingData.data?.summary?.totalLpTokens || 0,
          rewards: farmingRewards,
          apy: farmingAPY,
          allocation: totalValue > 0 ? (farmingValue / totalValue) * 100 : 0,
          impermanentLoss: 0, // Would need historical price data to calculate
          positions: farmingData.data?.positions?.length || 0
        },
        lending: {
          suppliedValue: lendingSupplied,
          borrowedValue: lendingBorrowed,
          netValue: lendingNetValue,
          supplyAPY: lendingData.data?.pools?.reduce((sum, pool) => sum + pool.supplyAPY, 0) / Math.max(1, lendingData.data?.pools?.length || 1) || 0,
          borrowAPY: lendingData.data?.pools?.reduce((sum, pool) => sum + pool.borrowAPY, 0) / Math.max(1, lendingData.data?.pools?.length || 1) || 0,
          netAPY: lendingAPY,
          allocation: totalValue > 0 ? (Math.abs(lendingNetValue) / totalValue) * 100 : 0,
          healthFactor: healthFactor === Number.MAX_SAFE_INTEGER ? 999 : healthFactor,
          positions: lendingData.data?.userPositions?.length || 0
        },
        swapping: {
          volume24h: 0, // Would need to calculate from history
          volume7d: 0,
          volume30d: 0,
          transactions: historyData.data?.transactions?.filter(tx => tx.type === 'swap').length || 0,
          totalFees: 0,
          averageSlippage: 0.5 // Default estimate
        }
      },
      performance: {
        bestAsset: { symbol: 'TNG', pnl: farmingRewards, pnlPercent: farmingAPY },
        worstAsset: { symbol: 'SOL', pnl: 0, pnlPercent: 0 },
        winRate: 85, // Estimated based on sponsor system
        profitableStrategies: protocols.filter(p => p.apy > 0).length,
        totalTransactions: historyData.data?.transactions?.length || 0,
        successfulTransactions: historyData.data?.transactions?.filter(tx => tx.status === ('success' as any)).length || 0
      },
      risk: {
        portfolioRisk,
        liquidationRisk,
        diversificationScore,
        concentrationRisk: 10 - diversificationScore,
        protocolRisk: protocols.length < 2 ? 8 : protocols.length < 4 ? 5 : 2,
        sharpeRatio: weightedAPY > 0 ? weightedAPY / Math.max(5, weightedAPY * 0.3) : 0, // Simplified calculation
        maxDrawdown: -5 // Estimated based on crypto volatility
      },
      protocols,
      timeframes: {
        '24h': { pnl: totalPnL / 30, pnlPercent: totalPnLPercent / 30, volume: 0 },
        '7d': { pnl: totalPnL / 4, pnlPercent: totalPnLPercent / 4, volume: 0 },
        '30d': { pnl: totalPnL, pnlPercent: totalPnLPercent, volume: 0 },
        '90d': { pnl: totalPnL * 3, pnlPercent: totalPnLPercent * 3, volume: 0 }
      },
      chartData: {
        portfolioValue: historicalData.map(d => ({ timestamp: d.timestamp, value: d.value })),
        pnlHistory: historicalData.map(d => ({ timestamp: d.timestamp, pnl: d.pnl, pnlPercent: d.pnlPercent })),
        apyHistory: historicalData.map(d => ({ timestamp: d.timestamp, apy: d.apy })),
        allocationHistory: historicalData.map(d => ({
          timestamp: d.timestamp,
          staking: totalValue > 0 ? (stakingValue / totalValue) * 100 : 0,
          farming: totalValue > 0 ? (farmingValue / totalValue) * 100 : 0,
          lending: totalValue > 0 ? (Math.abs(lendingNetValue) / totalValue) * 100 : 0,
          holdings: totalValue > 0 ? (holdingsValue / totalValue) * 100 : 0
        }))
      },
      lastUpdated: Date.now()
    }
  }, [
    stakingData, farmingData, lendingData, swapData, historyData, priceData,
    solBalance, tngBalance, usdcBalance, timeframe
  ])

  // Calculate analytics data
  const data = calculateAnalytics()

  // Update loading state
  useEffect(() => {
    const allDataLoaded = (
      !stakingData.isLoading &&
      !farmingData.isLoading &&
      !lendingData.isLoading &&
      !swapData.isLoading &&
      !historyData.isLoading &&
      !priceData.loading
    )

    if (allDataLoaded) {
      const timer = setTimeout(() => setIsLoading(false), 500)
      return () => clearTimeout(timer)
    } else {
      setIsLoading(true)
    }
  }, [
    stakingData.isLoading,
    farmingData.isLoading,
    lendingData.isLoading,
    swapData.isLoading,
    historyData.isLoading,
    priceData.loading
  ])

  // Handle errors
  useEffect(() => {
    const errors = [
      stakingData.error,
      farmingData.error,
      lendingData.error,
      swapData.error,
      historyData.error
    ].filter(Boolean)

    if (errors.length > 0) {
      setError(errors[0] || 'Unknown error')
    } else {
      setError(null)
    }
  }, [
    stakingData.error,
    farmingData.error,
    lendingData.error,
    swapData.error,
    historyData.error
  ])

  // Refetch all data
  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        (stakingData as any).refetch?.(),
        (farmingData as any).refetch?.(),
        lendingData.refetch?.(),
        (swapData as any).refetch?.(),
        (historyData as any).refetch?.()
      ])
    } catch (err: any) {
      setError(err.message || 'Failed to refresh analytics data')
    } finally {
      setIsLoading(false)
    }
  }, [stakingData, farmingData, lendingData, swapData, historyData])

  return {
    data,
    isLoading,
    error,
    refetch,
    setTimeframe,
    timeframe
  }
}
