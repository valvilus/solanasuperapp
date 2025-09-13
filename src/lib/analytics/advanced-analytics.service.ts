import { prisma } from '@/lib/prisma'

export interface Position {
  symbol: string
  amount: number
  value: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

export interface OptimalAllocation {
  allocations: Array<{
    symbol: string
    weight: number
    expectedReturn: number
    risk: number
  }>
  expectedReturn: number
  expectedRisk: number
  sharpeRatio: number
}

export interface YieldForecast {
  protocol: string
  currentAPY: number
  predictedAPY: number
  confidence: number
  timeframe: string
  factors: Array<{
    factor: string
    impact: number
    description: string
  }>
}

export interface RiskMetrics {
  portfolioValue: number
  var95: number
  var99: number
  expectedShortfall: number
  maxDrawdown: number
  volatility: number
  beta: number
  sharpeRatio: number
  informationRatio: number
}

export class AdvancedAnalyticsService {
  
  async calculateVaR(positions: Position[], confidence: number = 0.95): Promise<number> {
    if (positions.length === 0) return 0
    
    const portfolioValue = positions.reduce((sum, pos) => sum + pos.value, 0)
    
    // Historical simulation method for VaR calculation
    const returns = this.generateHistoricalReturns(positions)
    const sortedReturns = returns.sort((a, b) => a - b)
    
    const confidenceIndex = Math.floor((1 - confidence) * sortedReturns.length)
    const varReturn = sortedReturns[confidenceIndex]
    
    return Math.abs(varReturn * portfolioValue)
  }

  async getCorrelationMatrix(assets: string[]): Promise<number[][]> {
    // Simplified correlation calculation using historical price data
    const correlationMatrix: number[][] = []
    
    for (let i = 0; i < assets.length; i++) {
      correlationMatrix[i] = []
      for (let j = 0; j < assets.length; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1.0
        } else {
          // Mock correlation data based on asset pairs
          correlationMatrix[i][j] = this.getMockCorrelation(assets[i], assets[j])
        }
      }
    }
    
    return correlationMatrix
  }

  async getPortfolioOptimization(
    assets: string[],
    expectedReturns: number[],
    riskTolerance: number
  ): Promise<OptimalAllocation> {
    // Simplified Modern Portfolio Theory optimization
    const correlationMatrix = await this.getCorrelationMatrix(assets)
    const numAssets = assets.length
    
    // Equal weight as baseline, then adjust based on risk-return profile
    let weights = new Array(numAssets).fill(1 / numAssets)
    
    // Adjust weights based on Sharpe ratio and risk tolerance
    const sharpeRatios = expectedReturns.map((ret, i) => {
      const risk = this.calculateAssetRisk(assets[i])
      return ret / risk
    })
    
    // Normalize weights based on risk-adjusted returns
    const totalSharpe = sharpeRatios.reduce((sum, sharpe) => sum + Math.max(sharpe, 0), 0)
    
    if (totalSharpe > 0) {
      weights = sharpeRatios.map(sharpe => Math.max(sharpe, 0) / totalSharpe)
    }
    
    // Apply risk tolerance adjustment
    weights = this.adjustForRiskTolerance(weights, riskTolerance)
    
    const portfolioReturn = weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0)
    const portfolioRisk = this.calculatePortfolioRisk(weights, correlationMatrix, assets)
    const sharpeRatio = portfolioRisk > 0 ? portfolioReturn / portfolioRisk : 0
    
    return {
      allocations: assets.map((asset, i) => ({
        symbol: asset,
        weight: weights[i],
        expectedReturn: expectedReturns[i],
        risk: this.calculateAssetRisk(asset)
      })),
      expectedReturn: portfolioReturn,
      expectedRisk: portfolioRisk,
      sharpeRatio
    }
  }

  async getYieldPrediction(
    protocol: string,
    timeframe: string
  ): Promise<YieldForecast> {
    // Mock ML-based yield prediction
    const currentAPY = await this.getCurrentAPY(protocol)
    
    // Factors affecting yield prediction
    const factors = [
      {
        factor: 'Liquidity Trends',
        impact: 0.15,
        description: 'Increasing liquidity tends to reduce yields'
      },
      {
        factor: 'Market Volatility',
        impact: -0.08,
        description: 'Higher volatility typically increases yields'
      },
      {
        factor: 'Protocol Adoption',
        impact: 0.12,
        description: 'Growing adoption can impact yield sustainability'
      },
      {
        factor: 'Competitive Landscape',
        impact: -0.05,
        description: 'New competitors may affect yield rates'
      }
    ]
    
    const totalImpact = factors.reduce((sum, factor) => sum + factor.impact, 0)
    const predictedAPY = currentAPY * (1 + totalImpact)
    
    return {
      protocol,
      currentAPY,
      predictedAPY,
      confidence: 0.75, // 75% confidence
      timeframe,
      factors
    }
  }

  async getPortfolioRiskMetrics(positions: Position[]): Promise<RiskMetrics> {
    if (positions.length === 0) {
      return {
        portfolioValue: 0,
        var95: 0,
        var99: 0,
        expectedShortfall: 0,
        maxDrawdown: 0,
        volatility: 0,
        beta: 0,
        sharpeRatio: 0,
        informationRatio: 0
      }
    }

    const portfolioValue = positions.reduce((sum, pos) => sum + pos.value, 0)
    const var95 = await this.calculateVaR(positions, 0.95)
    const var99 = await this.calculateVaR(positions, 0.99)
    
    const returns = this.generateHistoricalReturns(positions)
    const volatility = this.calculateVolatility(returns)
    const maxDrawdown = this.calculateMaxDrawdown(returns)
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const sharpeRatio = volatility > 0 ? (avgReturn - 0.02) / volatility : 0 // Assuming 2% risk-free rate
    
    const beta = this.calculateBeta(positions)
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95)
    const informationRatio = this.calculateInformationRatio(returns)

    return {
      portfolioValue,
      var95,
      var99,
      expectedShortfall,
      maxDrawdown,
      volatility,
      beta,
      sharpeRatio,
      informationRatio
    }
  }

  async getStressTesting(positions: Position[]): Promise<{
    scenarios: Array<{
      name: string
      description: string
      portfolioImpact: number
      impactPercent: number
      probability: number
    }>
  }> {
    const portfolioValue = positions.reduce((sum, pos) => sum + pos.value, 0)
    
    const scenarios = [
      {
        name: 'Crypto Market Crash',
        description: 'Major cryptocurrency market decline (-50%)',
        portfolioImpact: -portfolioValue * 0.4,
        impactPercent: -40,
        probability: 0.05
      },
      {
        name: 'DeFi Protocol Exploit',
        description: 'Major DeFi protocol security breach',
        portfolioImpact: -portfolioValue * 0.15,
        impactPercent: -15,
        probability: 0.08
      },
      {
        name: 'Regulatory Crackdown',
        description: 'Strict cryptocurrency regulations',
        portfolioImpact: -portfolioValue * 0.25,
        impactPercent: -25,
        probability: 0.12
      },
      {
        name: 'Liquidity Crisis',
        description: 'Major liquidity shortage in DeFi',
        portfolioImpact: -portfolioValue * 0.20,
        impactPercent: -20,
        probability: 0.06
      },
      {
        name: 'Interest Rate Spike',
        description: 'Sudden increase in traditional interest rates',
        portfolioImpact: -portfolioValue * 0.10,
        impactPercent: -10,
        probability: 0.15
      }
    ]

    return { scenarios }
  }

  private generateHistoricalReturns(positions: Position[]): number[] {
    // Mock historical returns based on position volatilities
    const returns: number[] = []
    const numDays = 252 // Trading days in a year
    
    for (let i = 0; i < numDays; i++) {
      let portfolioReturn = 0
      const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0)
      
      positions.forEach(pos => {
        const weight = pos.value / totalValue
        const volatility = this.getAssetVolatility(pos.symbol)
        const dailyReturn = (Math.random() - 0.5) * volatility * 2
        portfolioReturn += weight * dailyReturn
      })
      
      returns.push(portfolioReturn)
    }
    
    return returns
  }

  private getMockCorrelation(asset1: string, asset2: string): number {
    // Mock correlation data
    const correlations: { [key: string]: number } = {
      'SOL-BTC': 0.65,
      'SOL-ETH': 0.72,
      'SOL-USDC': 0.05,
      'BTC-ETH': 0.78,
      'BTC-USDC': 0.02,
      'ETH-USDC': 0.03,
      'TNG-SOL': 0.45,
      'TNG-BTC': 0.35,
      'TNG-ETH': 0.40,
      'TNG-USDC': 0.08
    }
    
    const key1 = `${asset1}-${asset2}`
    const key2 = `${asset2}-${asset1}`
    
    return correlations[key1] || correlations[key2] || 0.3 // Default correlation
  }

  private calculateAssetRisk(asset: string): number {
    const risks: { [key: string]: number } = {
      'SOL': 0.85,
      'BTC': 0.65,
      'ETH': 0.70,
      'USDC': 0.05,
      'TNG': 1.20
    }
    
    return risks[asset] || 0.80
  }

  private adjustForRiskTolerance(weights: number[], riskTolerance: number): number[] {
    // Adjust weights based on risk tolerance (0-1, where 1 is high risk tolerance)
    const adjustment = riskTolerance * 0.5 + 0.5 // Scale to 0.5-1
    
    return weights.map(weight => weight * adjustment)
  }

  private calculatePortfolioRisk(weights: number[], correlationMatrix: number[][], assets: string[]): number {
    let portfolioVariance = 0
    
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const risk_i = this.calculateAssetRisk(assets[i])
        const risk_j = this.calculateAssetRisk(assets[j])
        portfolioVariance += weights[i] * weights[j] * risk_i * risk_j * correlationMatrix[i][j]
      }
    }
    
    return Math.sqrt(portfolioVariance)
  }

  private async getCurrentAPY(protocol: string): Promise<number> {
    // Mock current APY data
    const apys: { [key: string]: number } = {
      'TNG Lending': 12.5,
      'TNG Farming': 28.3,
      'TNG Staking': 8.7,
      'TNG Yield': 15.2
    }
    
    return apys[protocol] || 10.0
  }

  private getAssetVolatility(symbol: string): number {
    const volatilities: { [key: string]: number } = {
      'SOL': 0.08,
      'BTC': 0.06,
      'ETH': 0.07,
      'USDC': 0.001,
      'TNG': 0.12
    }
    
    return volatilities[symbol] || 0.08
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance)
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0
    let peak = 0
    let cumReturn = 0
    
    for (const ret of returns) {
      cumReturn += ret
      peak = Math.max(peak, cumReturn)
      const drawdown = (peak - cumReturn) / peak
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
    
    return maxDrawdown
  }

  private calculateBeta(positions: Position[]): number {
    // Simplified beta calculation against market (SOL)
    const marketVolatility = 0.08
    let portfolioBeta = 0
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0)
    
    positions.forEach(pos => {
      const weight = pos.value / totalValue
      const assetBeta = this.getAssetBeta(pos.symbol)
      portfolioBeta += weight * assetBeta
    })
    
    return portfolioBeta
  }

  private getAssetBeta(symbol: string): number {
    const betas: { [key: string]: number } = {
      'SOL': 1.0,
      'BTC': 0.8,
      'ETH': 0.9,
      'USDC': 0.1,
      'TNG': 1.5
    }
    
    return betas[symbol] || 1.0
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b)
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length)
    const tailReturns = sortedReturns.slice(0, cutoffIndex)
    
    return tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length
  }

  private calculateInformationRatio(returns: number[]): number {
    // Simplified information ratio calculation
    const excessReturns = returns.map(ret => ret - 0.02/252) // Daily risk-free rate
    const avgExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length
    const trackingError = this.calculateVolatility(excessReturns)
    
    return trackingError > 0 ? avgExcessReturn / trackingError : 0
  }
}
