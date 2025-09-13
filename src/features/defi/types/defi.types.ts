'use client'

// ============= DeFi Core Types =============

export type TokenSymbol = 'SOL' | 'USDC' | 'TNG' | 'USDT' | 'RAY' | 'ORCA' | 'MNGO' | 'SRM' | 'FTT' | 'STEP'

export interface Token {
  symbol: TokenSymbol
  name: string
  mint: string
  decimals: number
  logoUri: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
}

export interface TokenBalance {
  token: Token
  balance: number
  usdValue: number
  change24h: number
}

// ============= Portfolio Types =============

export interface PortfolioStats {
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  tokens: TokenBalance[]
  allTimeHigh: number
  allTimeLow: number
}

export interface PortfolioPosition {
  token: Token
  amount: number
  avgPrice: number
  currentValue: number
  pnl: number
  pnlPercent: number
  allocation: number
}

// ============= Swap Types =============

export interface SwapQuote {
  inputMint: string
  outputMint: string
  inputAmount: number
  outputAmount: number
  priceImpact: number
  fee: number
  route: SwapRoute[]
  slippage: number
}

export interface SwapRoute {
  ammKey: string
  label: string
  inputMint: string
  outputMint: string
  inAmount: number
  outAmount: number
  feeAmount: number
  feeMint: string
}

export interface SwapTransaction {
  id: string
  timestamp: Date
  fromToken: Token
  toToken: Token
  fromAmount: number
  toAmount: number
  rate: number
  fee: number
  status: 'pending' | 'confirmed' | 'failed'
  signature?: string
}

// ============= Staking Types =============

export interface StakingPool {
  id: string
  name: string
  token: Token
  apy: number
  tvl: number
  minimumStake: number
  lockupPeriod: number // in days
  isActive: boolean
  rewards: Token[]
  description: string
}

export interface StakingPosition {
  pool: StakingPool
  stakedAmount: number
  rewards: number
  startDate: Date
  unlockDate: Date
  isActive: boolean
}

// ============= Yield Farming Types =============

export interface LiquidityPool {
  id: string
  name: string
  tokenA: Token
  tokenB: Token
  apy: number
  tvl: number
  volume24h: number
  fees24h: number
  fee: number
  isStable: boolean
}

export interface LiquidityPosition {
  pool: LiquidityPool
  liquidityAmount: number
  tokenAAmount: number
  tokenBAmount: number
  value: number
  rewards: number
  impermanentLoss: number
  startDate: Date
}

// ============= Analytics Types =============

export interface PriceHistory {
  timestamp: number
  price: number
  volume: number
}

export interface MarketData {
  token: Token
  priceHistory: PriceHistory[]
  indicators: {
    rsi: number
    macd: number
    support: number
    resistance: number
  }
}

// ============= Page State Types =============

export type DeFiTabType = 'portfolio' | 'staking' | 'farming' | 'lending' | 'swap' | 'history' | 'analytics' | 'yield'
export type TimeframeType = '1H' | '24H' | '7D' | '30D' | '1Y'
export type ChartType = 'line' | 'candlestick' | 'area'

export interface DeFiPageState {
  activeTab: DeFiTabType
  selectedToken: Token | null
  selectedTimeframe: TimeframeType
  chartType: ChartType
  showPortfolioDetails: boolean
  swapSettings: {
    slippage: number
    autoRefresh: boolean
    soundEnabled: boolean
  }
  isLoading: boolean
  notification: NotificationState | null
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

// ============= Jupiter DEX Integration =============

export interface JupiterToken {
  address: string
  chainId: number
  decimals: number
  name: string
  symbol: string
  logoURI: string
  tags: string[]
}

export interface JupiterQuoteResponse {
  data: {
    inAmount: string
    outAmount: string
    priceImpactPct: number
    marketInfos: Array<{
      id: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }>
  }[]
  timeTaken: number
}

// ============= API Response Types =============

export interface DeFiApiResponse<T> {
  success: boolean
  data: T
  error?: string
  timestamp: number
}

export interface PriceApiResponse {
  prices: Record<string, {
    usd: number
    usd_24h_change: number
    usd_24h_vol: number
    usd_market_cap: number
  }>
}

