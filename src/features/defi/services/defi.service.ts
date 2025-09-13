'use client'

import { Token, SwapQuote, PriceHistory, JupiterQuoteResponse } from '../types'
import { JUPITER_DEX_CONFIG } from '../data'

// Factory function for creating DeFiService with auth
export function createDeFiService(apiCall: (endpoint: string, options?: RequestInit) => Promise<Response>): DeFiService {
  return new DeFiService(apiCall)
}

export class DeFiService {
  private apiCall?: (endpoint: string, options?: RequestInit) => Promise<Response>

  constructor(apiCall?: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    this.apiCall = apiCall
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (this.apiCall) {
      return await this.apiCall(endpoint, options)
    }
    throw new Error('Direct API calls deprecated. Use createDeFiService(apiCall)')
  }
  
  // ============= Swap Integration =============
  
  async getSwapData() {
    try {
      console.log(' Fetching swap data from API...')
      
      const response = await this.makeRequest('/api/defi/swap', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch swap data')
      }

      return {
        tokens: result.data.tokens,
        balances: result.data.balances,
        prices: result.data.prices
      }
    } catch (error) {
      console.error('Error fetching swap data:', error)
      
      // Fallback to mock data
      return {
        tokens: [
          { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', name: 'Solana' },
          { symbol: 'TNG', mint: process.env.NEXT_PUBLIC_TNG_MINT_ADDRESS || '', name: 'Tenge Token' }
        ],
        balances: {},
        prices: {}
      }
    }
  }

  async getSwapQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps: number = 50
  ): Promise<SwapQuote | null> {
    try {
      console.log(' Getting swap quote:', { inputMint, outputMint, amount, slippageBps })
      
      const params = new URLSearchParams({
        operation: 'quote',
        inputMint,
        outputMint,
        amount,
        slippage: slippageBps.toString()
      })

      const response = await this.makeRequest(`/api/defi/swap?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get swap quote')
      }

      return result.data.quote
    } catch (error) {
      console.error('Error getting swap quote:', error)
      return null
    }
  }

  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps: number = 50
  ) {
    try {
      console.log(' Executing swap:', { inputMint, outputMint, amount, slippageBps })
      
      const response = await this.makeRequest('/api/defi/swap', {
        method: 'POST',
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount,
          slippageBps
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Swap failed')
      }

      return result.data
    } catch (error) {
      console.error('Error executing swap:', error)
      throw error
    }
  }

  // ============= Price Data =============
  
  async getTokenPrice(tokenIds: string[]): Promise<Record<string, number>> {
    try {
      // Get real exchange rate for TNG calculation
      const usdToKztResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const usdToKztData = await usdToKztResponse.json()
      const usdToKzt = usdToKztData.rates?.KZT || 450
      const tngToUsd = 1 / usdToKzt // 1 TNG = 1 KZT
      
      // Real prices where possible
      const prices: Record<string, number> = {
        'solana': 98.45, // Would get from CoinGecko in full implementation
        'usd-coin': 1.00,
        'tenge-token': tngToUsd, // Real calculated price: 1 TNG = 1 KZT
        'raydium': 2.34,
        'orca': 3.67,
        'mango-markets': 0.0234
      }
      
      console.log(` DeFi Service - TNG price: $${tngToUsd.toFixed(6)} (1 TNG = 1 KZT, USD/KZT=${usdToKzt})`)
      
      return prices
    } catch (error) {
      console.error('Error fetching token prices:', error)
      // Fallback to default TNG price if API fails
      return {
        'solana': 98.45,
        'usd-coin': 1.00,
        'tenge-token': 1/450, // Fallback: assume USD/KZT = 450
        'raydium': 2.34,
        'orca': 3.67,
        'mango-markets': 0.0234
      }
    }
  }

  async getTokenPriceHistory(
    tokenId: string,
    timeframe: string = '24h',
    points: number = 50
  ): Promise<PriceHistory[]> {
    try {
      // Mock implementation 
      const basePrice = await DeFiService.getTokenPrice(tokenId)
      const history: PriceHistory[] = []
      
      for (let i = points; i >= 0; i--) {
        const timestamp = Date.now() - (i * DeFiService.getTimeframeInterval(timeframe))
        const randomChange = (Math.random() - 0.5) * 0.1 // ±5% max change
        const price = basePrice * (1 + randomChange * (i / points))
        const volume = Math.random() * 1000000 + 100000
        
        history.push({
          timestamp,
          price: Math.max(price, basePrice * 0.8),
          volume
        })
      }
      
      return history
    } catch (error) {
      console.error('Error fetching price history:', error)
      return []
    }
  }

  private static async getTokenPrice(tokenId: string): Promise<number> {
    // Простая заглушка для получения цены токена
    const mockPrices: Record<string, number> = {
      'solana': 100,
      'tng': 0.001857,
      'usdc': 1
    }
    return mockPrices[tokenId] || 0
  }

  private static getTimeframeInterval(timeframe: string): number {
    const intervals: Record<string, number> = {
      '1H': 60000, // 1 minute
      '24H': 3600000, // 1 hour
      '7D': 86400000, // 1 day
      '30D': 86400000 * 7, // 1 week
      '1Y': 86400000 * 30 // 1 month
    }
    return intervals[timeframe] || intervals['24H']
  }

  // ============= Portfolio Analytics =============
  
  async getPortfolioAnalytics(timeframe: string = '30d', includeHistory: boolean = false) {
    try {
      console.log(' Fetching portfolio analytics from API...')
      
      const params = new URLSearchParams({
        timeframe,
        includeHistory: includeHistory.toString()
      })

      const response = await this.makeRequest(`/api/defi/analytics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',

        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching portfolio analytics:', error)
      
      // Fallback to mock data
      return {
        portfolio: {
          totalValue: 5847.23,
          totalPnL: 432.67,
          totalPnLPercent: 8.5,
          dailyChange: 67.89,
          dailyChangePercent: 1.2
        },
        breakdown: {
          staking: { value: 1250.45, pnl: 125.30, allocation: 21.4 },
          swapping: { volume: 2340.67, transactions: 15 },
          farming: { value: 1847.89, pnl: 187.45, allocation: 31.6 }
        },
        risk: {
          sharpeRatio: 1.34,
          maxDrawdown: -12.5,
          riskScore: 'medium'
        }
      }
    }
  }

  async getTransactionHistory(options: {
    page?: number
    limit?: number
    type?: string
    timeframe?: string
    status?: string
  } = {}) {
    try {
      console.log(' Fetching transaction history from API...')
      
      const params = new URLSearchParams({
        page: (options.page || 1).toString(),
        limit: (options.limit || 20).toString(),
        type: options.type || 'all',
        timeframe: options.timeframe || '30d',
        status: options.status || 'all'
      })

      const response = await this.makeRequest(`/api/defi/history?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',

        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch history')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching transaction history:', error)
      
      // Fallback to mock data
      return {
        transactions: [],
        summary: {
          totalTransactions: 0,
          confirmedTransactions: 0,
          successRate: 0,
          breakdown: { staking: 0, swapping: 0, farming: 0 }
        },
        pagination: {
          page: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      }
    }
  }

  // ============= Staking Data =============
  
  async getStakingData() {
    try {
      console.log(' Fetching real staking data from API...')
      
      const response = await this.makeRequest('/api/defi/staking', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',

        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch staking data')
      }

      return {
        pools: result.data.pools,
        positions: result.data.positions,
        totalStaked: result.data.totalStaked,
        totalRewards: result.data.totalRewards
      }
    } catch (error) {
      console.error('Error fetching staking data:', error)
      
      // Fallback to mock data
      return {
        pools: [
          {
            id: 'tng-basic-pool',
            name: 'TNG Basic Staking',
            apy: 8.5,
            minimumStake: 100,
            lockupPeriod: 0
          }
        ],
        positions: [],
        totalStaked: 0,
        totalRewards: 0
      }
    }
  }

  async stakeTokens(poolId: string, amount: number) {
    try {
      console.log(' Staking tokens:', { poolId, amount })
      
      const response = await this.makeRequest('/api/defi/staking', {
        method: 'POST',

        body: JSON.stringify({
          operation: 'stake',
          poolId,
          amount
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Staking failed')
      }

      return result.data
    } catch (error) {
      console.error('Error staking tokens:', error)
      throw error
    }
  }

  async unstakeTokens(poolId: string, amount?: number) {
    try {
      console.log(' Unstaking tokens:', { poolId, amount })
      
      const response = await this.makeRequest('/api/defi/staking', {
        method: 'POST',

        body: JSON.stringify({
          operation: 'unstake',
          poolId,
          amount
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Unstaking failed')
      }

      return result.data
    } catch (error) {
      console.error('Error unstaking tokens:', error)
      throw error
    }
  }

  // ============= Yield Farming =============
  
  async getFarmingData() {
    try {
      console.log(' Fetching farming data from API...')
      
      const response = await this.makeRequest('/api/defi/farming', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',

        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farming data')
      }

      return {
        pools: result.data.pools,
        positions: result.data.positions,
        summary: result.data.summary
      }
    } catch (error) {
      console.error('Error fetching farming data:', error)
      
      // Fallback to mock data
      return {
        pools: [
          {
            id: 'sol-tng-pool',
            name: 'SOL-TNG LP',
            apy: 45.7,
            tvl: 125000
          }
        ],
        positions: [],
        summary: {
          totalLiquidity: 0,
          totalRewards: 0,
          averageApy: 0,
          activePositions: 0
        }
      }
    }
  }

  async addLiquidity(poolId: string, tokenAAmount: number, tokenBAmount: number) {
    try {
      console.log(' Adding liquidity:', { poolId, tokenAAmount, tokenBAmount })
      
      const response = await this.makeRequest('/api/defi/farming', {
        method: 'POST',

        body: JSON.stringify({
          operation: 'add',
          poolId,
          tokenAAmount,
          tokenBAmount
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Add liquidity failed')
      }

      return result.data
    } catch (error) {
      console.error('Error adding liquidity:', error)
      throw error
    }
  }

  async removeLiquidity(poolId: string, lpTokenAmount?: number) {
    try {
      console.log(' Removing liquidity:', { poolId, lpTokenAmount })
      
      const response = await this.makeRequest('/api/defi/farming', {
        method: 'POST',

        body: JSON.stringify({
          operation: 'remove',
          poolId,
          lpTokenAmount
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Remove liquidity failed')
      }

      return result.data
    } catch (error) {
      console.error('Error removing liquidity:', error)
      throw error
    }
  }

  // ============= Transaction Simulation =============
  
  async simulateSwap(
    fromMint: string,
    toMint: string,
    amount: number
  ) {
    try {
      // Simulate transaction cost estimation
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return {
        estimatedGas: 0.000125, // SOL
        priceImpact: 0.12,
        minimumReceived: amount * 0.995, // 0.5% slippage
        route: ['Raydium', 'Orca'],
        success: true
      }
    } catch (error) {
      console.error('Error simulating swap:', error)
      return null
    }
  }

  // ============= Market Data =============
  
  async getMarketOverview() {
    try {
      await new Promise(resolve => setTimeout(resolve, 400))
      
      return {
        totalMarketCap: 2.1e12, // $2.1T
        total24hVolume: 89.4e9, // $89.4B
        defiTvl: 245.7e9, // $245.7B
        btcDominance: 52.3,
        fearGreedIndex: 67,
        topGainers: 5,
        topLosers: 3
      }
    } catch (error) {
      console.error('Error fetching market overview:', error)
      return null
    }
  }

  // ============= News & Updates =============
  
  async getDeFiNews(limit: number = 10) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Mock news data
      return [
        {
          id: 'news-001',
          title: 'Jupiter DEX обновил алгоритм свапов',
          summary: 'Новый алгоритм снижает проскальзывание на 15%',
          url: 'https://jup.ag/news/001',
          timestamp: Date.now() - 1800000,
          category: 'DEX'
        },
        {
          id: 'news-002',
          title: 'Solana достигла нового максимума TPS',
          summary: 'Сеть обработала рекордные 65,000 транзакций в секунду',
          url: 'https://solana.com/news/002',
          timestamp: Date.now() - 3600000,
          category: 'Network'
        },
        {
          id: 'news-003',
          title: 'Новые пулы ликвидности на Raydium',
          summary: 'Добавлено 12 новых торговых пар с высокой доходностью',
          url: 'https://raydium.io/news/003',
          timestamp: Date.now() - 7200000,
          category: 'Farming'
        }
      ]
    } catch (error) {
      console.error('Error fetching DeFi news:', error)
      return []
    }
  }
}












