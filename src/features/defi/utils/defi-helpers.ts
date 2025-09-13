'use client'

import { Token, TokenBalance } from '../types'

// ============= Number Formatting =============

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B ${currency}`
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M ${currency}`
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K ${currency}`
  }
  return `${value.toFixed(2)} ${currency}`
}

export const formatTokenAmount = (
  amount: number, 
  decimals: number = 6, 
  symbol?: string
): string => {
  if (amount === 0) return `0${symbol ? ` ${symbol}` : ''}`
  
  let formatted: string
  
  if (amount >= 1e6) {
    formatted = `${(amount / 1e6).toFixed(2)}M`
  } else if (amount >= 1e3) {
    formatted = `${(amount / 1e3).toFixed(2)}K`
  } else if (amount >= 1) {
    formatted = amount.toFixed(Math.min(decimals, 4))
  } else {
    formatted = amount.toFixed(Math.min(decimals, 8))
  }
  
  // Remove trailing zeros
  formatted = formatted.replace(/\.?0+$/, '')
  
  return `${formatted}${symbol ? ` ${symbol}` : ''}`
}

export const formatPercentage = (value: number, decimals: number = 2): string => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export const formatPriceChange = (change: number): { 
  formatted: string
  color: string
  isPositive: boolean 
} => {
  const isPositive = change >= 0
  return {
    formatted: formatPercentage(change),
    color: isPositive ? 'text-green-400' : 'text-red-400',
    isPositive
  }
}

// ============= Token Utilities =============

export const getTokenDisplayName = (token: Token): string => {
  return `${token.name} (${token.symbol})`
}

export const getTokenPair = (tokenA: Token, tokenB: Token): string => {
  return `${tokenA.symbol}/${tokenB.symbol}`
}

export const calculateTokenValue = (
  amount: number,
  price: number,
  decimals: number = 6
): number => {
  return (amount * price) / Math.pow(10, decimals)
}

export const getTokenAllocation = (
  balance: TokenBalance,
  totalValue: number
): number => {
  if (totalValue === 0) return 0
  return (balance.usdValue / totalValue) * 100
}

// ============= Price Calculations =============

export const calculatePriceImpact = (
  inputAmount: number,
  outputAmount: number,
  marketPrice: number
): number => {
  if (inputAmount === 0 || marketPrice === 0) return 0
  
  const expectedOutput = inputAmount * marketPrice
  const impact = ((expectedOutput - outputAmount) / expectedOutput) * 100
  
  return Math.max(0, impact)
}

export const calculateSlippageAmount = (
  amount: number,
  slippage: number,
  isMinimum: boolean = true
): number => {
  const multiplier = isMinimum ? (1 - slippage / 100) : (1 + slippage / 100)
  return amount * multiplier
}

export const getOptimalSlippage = (priceImpact: number): number => {
  if (priceImpact < 0.1) return 0.1
  if (priceImpact < 1) return 0.5
  if (priceImpact < 3) return 1.0
  return Math.min(priceImpact * 1.5, 20)
}

// ============= Portfolio Analytics =============

export const calculatePortfolioMetrics = (balances: TokenBalance[]) => {
  const totalValue = balances.reduce((sum, balance) => sum + balance.usdValue, 0)
  const dailyPnL = balances.reduce((sum, balance) => sum + balance.change24h, 0)
  const dailyPnLPercent = totalValue > 0 ? (dailyPnL / (totalValue - dailyPnL)) * 100 : 0
  
  const allocations = balances.map(balance => ({
    token: balance.token,
    allocation: getTokenAllocation(balance, totalValue),
    value: balance.usdValue
  }))
  
  const topPerformer = balances.reduce((best, current) => 
    current.change24h > best.change24h ? current : best
  , balances[0])
  
  const worstPerformer = balances.reduce((worst, current) => 
    current.change24h < worst.change24h ? current : worst
  , balances[0])
  
  return {
    totalValue,
    dailyPnL,
    dailyPnLPercent,
    allocations,
    topPerformer: topPerformer?.token,
    worstPerformer: worstPerformer?.token,
    diversificationScore: calculateDiversificationScore(allocations)
  }
}

export const calculateDiversificationScore = (
  allocations: Array<{ allocation: number }>
): number => {
  // Shannon diversity index adapted for portfolio
  const totalAllocation = allocations.reduce((sum, item) => sum + item.allocation, 0)
  
  if (totalAllocation === 0) return 0
  
  const diversity = allocations.reduce((score, item) => {
    if (item.allocation === 0) return score
    const proportion = item.allocation / totalAllocation
    return score - (proportion * Math.log(proportion))
  }, 0)
  
  // Normalize to 0-10 scale
  return Math.min(diversity / Math.log(allocations.length) * 10, 10)
}

// ============= APY Calculations =============

export const calculateCompoundAPY = (
  principal: number,
  rate: number,
  compoundsPerYear: number = 365,
  timeInYears: number = 1
): number => {
  return principal * Math.pow(1 + rate / (100 * compoundsPerYear), compoundsPerYear * timeInYears) - principal
}

export const calculateDailyRewards = (
  stakedAmount: number,
  apy: number
): number => {
  return (stakedAmount * apy / 100) / 365
}

export const calculateImpermanentLoss = (
  priceRatio: number // new price / initial price
): number => {
  if (priceRatio <= 0) return 0
  
  const holdValue = (1 + priceRatio) / 2
  const lpValue = Math.sqrt(priceRatio)
  
  return (lpValue / holdValue - 1) * 100
}

// ============= Risk Metrics =============

export const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0
  
  const returns = prices.slice(1).map((price, i) => 
    Math.log(price / prices[i])
  )
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  
  return Math.sqrt(variance) * Math.sqrt(365) * 100 // Annualized volatility in %
}

export const getRiskLevel = (volatility: number): {
  level: 'low' | 'medium' | 'high' | 'extreme'
  color: string
  description: string
} => {
  if (volatility < 20) {
    return { level: 'low', color: 'text-green-400', description: 'Низкий риск' }
  } else if (volatility < 50) {
    return { level: 'medium', color: 'text-yellow-400', description: 'Средний риск' }
  } else if (volatility < 100) {
    return { level: 'high', color: 'text-orange-400', description: 'Высокий риск' }
  } else {
    return { level: 'extreme', color: 'text-red-400', description: 'Экстремальный риск' }
  }
}

// ============= Time Utilities =============

export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (days > 0) return `${days}д назад`
  if (hours > 0) return `${hours}ч назад`
  if (minutes > 0) return `${minutes}м назад`
  return 'Только что'
}

export const getTimeframeDuration = (timeframe: string): number => {
  const durations: Record<string, number> = {
    '1H': 3600000,
    '24H': 86400000,
    '7D': 604800000,
    '30D': 2592000000,
    '1Y': 31536000000
  }
  return durations[timeframe] || durations['24H']
}

// ============= Validation =============

export const isValidAddress = (address: string): boolean => {
  // Basic Solana address validation (44 characters, base58)
  return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address)
}

export const isValidAmount = (
  amount: number,
  balance: number,
  decimals: number = 6
): { isValid: boolean; error?: string } => {
  if (amount <= 0) {
    return { isValid: false, error: 'Сумма должна быть больше 0' }
  }
  
  if (amount > balance) {
    return { isValid: false, error: 'Недостаточно средств' }
  }
  
  const minAmount = 1 / Math.pow(10, decimals)
  if (amount < minAmount) {
    return { isValid: false, error: `Минимальная сумма: ${minAmount}` }
  }
  
  return { isValid: true }
}

export const isValidSlippage = (slippage: number): boolean => {
  return slippage >= 0.1 && slippage <= 50
}



















































