'use client'

// ============= DeFi Constants =============

export const INITIAL_CHART_POINTS = 50
export const PRICE_UPDATE_INTERVAL = 30000 // 30 seconds
export const PORTFOLIO_REFRESH_INTERVAL = 60000 // 1 minute

export const DEFAULT_SLIPPAGE = 0.5 // 0.5%
export const MAX_SLIPPAGE = 20 // 20%
export const MIN_SLIPPAGE = 0.1 // 0.1%

export const CHART_COLORS = {
  primary: '#9945FF',
  secondary: '#14F195', 
  accent: '#00D4FF',
  success: '#4ECDC4',
  error: '#FF6B6B',
  warning: '#FFE66D',
  neutral: '#B8BCC8'
}

export const ANIMATION_DURATIONS = {
  fast: 200,
  normal: 300,
  slow: 500,
  chart: 800
}

export const JUPITER_DEX_CONFIG = {
  baseUrl: 'https://quote-api.jup.ag/v6',
  version: 'v6',
  feeBps: 50 // 0.5% fee
}

export const STAKING_POOLS_REFRESH = 300000 // 5 minutes
export const FARMING_POOLS_REFRESH = 180000 // 3 minutes

export const CHART_TIMEFRAMES = [
  { key: '1H', label: '1Ч', interval: 3600 },
  { key: '24H', label: '24Ч', interval: 86400 },
  { key: '7D', label: '7Д', interval: 604800 },
  { key: '30D', label: '30Д', interval: 2592000 },
  { key: '1Y', label: '1Г', interval: 31536000 }
] as const

export const HAPTIC_PATTERNS = {
  light: 'light',
  medium: 'medium', 
  heavy: 'heavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
  selection: 'selection'
} as const



















































