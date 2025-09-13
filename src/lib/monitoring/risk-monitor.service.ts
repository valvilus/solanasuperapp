import { prisma } from '@/lib/prisma'
import { AdvancedAnalyticsService, Position } from '@/lib/analytics/advanced-analytics.service'

export interface RiskAlert {
  id: string
  type: 'LIQUIDATION_RISK' | 'PROTOCOL_RISK' | 'PORTFOLIO_RISK' | 'MARKET_RISK'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  actionRequired: string
  affectedPositions?: string[]
  threshold?: number
  currentValue?: number
  createdAt: Date
  isActive: boolean
}

export interface ProtocolRisk {
  protocol: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number
  factors: Array<{
    factor: string
    score: number
    description: string
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  }>
  lastUpdated: Date
  tvlChange24h: number
  volumeChange24h: number
  exploitHistory: number
  auditScore: number
}

export interface LiquidationRisk {
  userId: string
  protocol: string
  position: {
    collateral: number
    debt: number
    healthFactor: number
    liquidationPrice: number
    currentPrice: number
  }
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  timeToLiquidation?: string
  recommendations: string[]
}

export class RiskMonitorService {
  private analyticsService: AdvancedAnalyticsService

  constructor() {
    this.analyticsService = new AdvancedAnalyticsService()
  }

  async monitorLiquidationRisk(userId: string): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = []
    
    try {
      // Get user's lending positions
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userLendingPositions: {
            include: {
              pool: true
            }
          }
        }
      })

      if (!user || !user.userLendingPositions.length) {
        return alerts
      }

      for (const position of user.userLendingPositions) {
        const healthFactor = position.healthFactor
        const collateralValue = position.collateralAmount
        const debtValue = position.borrowedAmount

        if (healthFactor.lessThan(1.1) && healthFactor.greaterThan(1.0)) {
          alerts.push({
            id: `liquidation_${position.id}_${Date.now()}`,
            type: 'LIQUIDATION_RISK',
            severity: 'CRITICAL',
            title: 'Критический риск ликвидации',
            description: `Ваша позиция в ${position.pool.tokenSymbol} близка к ликвидации. Health Factor: ${healthFactor.toFixed(3)}`,
            actionRequired: 'Немедленно добавьте залог или погасите часть долга',
            affectedPositions: [position.pool.tokenSymbol],
            threshold: 1.1,
            currentValue: Number(healthFactor),
            createdAt: new Date(),
            isActive: true
          })
        } else if (healthFactor.lessThan(1.3)) {
          alerts.push({
            id: `liquidation_warning_${position.id}_${Date.now()}`,
            type: 'LIQUIDATION_RISK',
            severity: 'HIGH',
            title: 'Высокий риск ликвидации',
            description: `Ваша позиция в ${position.pool.tokenSymbol} требует внимания. Health Factor: ${healthFactor.toFixed(3)}`,
            actionRequired: 'Рекомендуется добавить залог или погасить часть долга',
            affectedPositions: [position.pool.tokenSymbol],
            threshold: 1.3,
            currentValue: Number(healthFactor),
            createdAt: new Date(),
            isActive: true
          })
        } else if (healthFactor.lessThan(1.5)) {
          alerts.push({
            id: `liquidation_moderate_${position.id}_${Date.now()}`,
            type: 'LIQUIDATION_RISK',
            severity: 'MEDIUM',
            title: 'Умеренный риск ликвидации',
            description: `Следите за позицией в ${position.pool.tokenSymbol}. Health Factor: ${healthFactor.toFixed(3)}`,
            actionRequired: 'Мониторьте позицию и будьте готовы к действиям',
            affectedPositions: [position.pool.tokenSymbol],
            threshold: 1.5,
            currentValue: Number(healthFactor),
            createdAt: new Date(),
            isActive: true
          })
        }
      }

    } catch (error) {
      console.error('Error monitoring liquidation risk:', error)
    }

    return alerts
  }

  async checkProtocolRisks(): Promise<ProtocolRisk[]> {
    const protocols = ['TNG Lending', 'TNG Swap', 'TNG Farming', 'TNG Staking']
    const protocolRisks: ProtocolRisk[] = []

    for (const protocol of protocols) {
      const risk = await this.assessProtocolRisk(protocol)
      protocolRisks.push(risk)
    }

    return protocolRisks
  }

  async sendRiskAlerts(userId: string, alerts: RiskAlert[]): Promise<void> {
    if (alerts.length === 0) return

    try {
      // In a real implementation, this would send notifications via:
      // - Telegram bot messages
      // - Email notifications
      // - In-app notifications
      // - Push notifications

      console.log(`Sending ${alerts.length} risk alerts to user ${userId}`)
      
      // Store alerts in database for tracking
      for (const alert of alerts) {
        await this.storeRiskAlert(userId, alert)
      }

    } catch (error) {
      console.error('Error sending risk alerts:', error)
    }
  }

  async getPortfolioRiskAlerts(userId: string): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = []

    try {
      const positions = await this.getUserPositions(userId)
      
      if (positions.length === 0) return alerts

      const riskMetrics = await this.analyticsService.getPortfolioRiskMetrics(positions)
      const portfolioValue = riskMetrics.portfolioValue

      // Portfolio concentration risk
      const concentrationRisk = this.checkConcentrationRisk(positions)
      if (concentrationRisk.isRisky) {
        alerts.push({
          id: `concentration_${userId}_${Date.now()}`,
          type: 'PORTFOLIO_RISK',
          severity: concentrationRisk.severity,
          title: 'Риск концентрации портфеля',
          description: `${concentrationRisk.description}`,
          actionRequired: 'Рассмотрите диверсификацию портфеля',
          affectedPositions: concentrationRisk.assets,
          createdAt: new Date(),
          isActive: true
        })
      }

      // High VaR risk
      if (riskMetrics.var95 > portfolioValue * 0.2) {
        alerts.push({
          id: `var_${userId}_${Date.now()}`,
          type: 'PORTFOLIO_RISK',
          severity: 'HIGH',
          title: 'Высокий VaR портфеля',
          description: `Value at Risk (95%) составляет ${(riskMetrics.var95/portfolioValue*100).toFixed(1)}% от портфеля`,
          actionRequired: 'Рассмотрите снижение рискованных позиций',
          threshold: 20,
          currentValue: riskMetrics.var95/portfolioValue*100,
          createdAt: new Date(),
          isActive: true
        })
      }

      // Low Sharpe ratio
      if (riskMetrics.sharpeRatio < 0.5 && portfolioValue > 1000) {
        alerts.push({
          id: `sharpe_${userId}_${Date.now()}`,
          type: 'PORTFOLIO_RISK',
          severity: 'MEDIUM',
          title: 'Низкий коэффициент Шарпа',
          description: `Коэффициент Шарпа портфеля: ${riskMetrics.sharpeRatio.toFixed(2)}`,
          actionRequired: 'Оптимизируйте соотношение риск/доходность',
          threshold: 0.5,
          currentValue: riskMetrics.sharpeRatio,
          createdAt: new Date(),
          isActive: true
        })
      }

    } catch (error) {
      console.error('Error checking portfolio risk:', error)
    }

    return alerts
  }

  async getMarketRiskAlerts(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = []

    try {
      // Mock market risk indicators
      const marketIndicators = {
        volatilityIndex: 85, // VIX-like indicator
        liquidityIndex: 65,
        correlationBreakdown: 0.15,
        systemicRisk: 0.3
      }

      if (marketIndicators.volatilityIndex > 80) {
        alerts.push({
          id: `market_volatility_${Date.now()}`,
          type: 'MARKET_RISK',
          severity: 'HIGH',
          title: 'Высокая волатильность рынка',
          description: `Индекс волатильности: ${marketIndicators.volatilityIndex}`,
          actionRequired: 'Будьте осторожны с новыми позициями',
          threshold: 80,
          currentValue: marketIndicators.volatilityIndex,
          createdAt: new Date(),
          isActive: true
        })
      }

      if (marketIndicators.liquidityIndex < 70) {
        alerts.push({
          id: `market_liquidity_${Date.now()}`,
          type: 'MARKET_RISK',
          severity: 'MEDIUM',
          title: 'Снижение ликвидности рынка',
          description: `Индекс ликвидности: ${marketIndicators.liquidityIndex}`,
          actionRequired: 'Учитывайте возможные проскальзывания',
          threshold: 70,
          currentValue: marketIndicators.liquidityIndex,
          createdAt: new Date(),
          isActive: true
        })
      }

    } catch (error) {
      console.error('Error checking market risk:', error)
    }

    return alerts
  }

  private async assessProtocolRisk(protocol: string): Promise<ProtocolRisk> {
    // Mock protocol risk assessment
    const riskFactors = {
      'TNG Lending': {
        auditScore: 85,
        tvlChange24h: -5.2,
        volumeChange24h: 12.3,
        exploitHistory: 0,
        factors: [
          { factor: 'Smart Contract Security', score: 85, description: 'Audited contracts', impact: 'POSITIVE' as const },
          { factor: 'Liquidity Risk', score: 70, description: 'Moderate liquidity', impact: 'NEUTRAL' as const },
          { factor: 'Oracle Risk', score: 90, description: 'Multiple oracle sources', impact: 'POSITIVE' as const }
        ]
      },
      'TNG Swap': {
        auditScore: 80,
        tvlChange24h: 8.1,
        volumeChange24h: 25.6,
        exploitHistory: 0,
        factors: [
          { factor: 'AMM Model Risk', score: 75, description: 'Standard AMM implementation', impact: 'NEUTRAL' as const },
          { factor: 'Impermanent Loss', score: 60, description: 'High IL risk in volatile pairs', impact: 'NEGATIVE' as const },
          { factor: 'Volume Growth', score: 85, description: 'Growing trading volume', impact: 'POSITIVE' as const }
        ]
      },
      'TNG Farming': {
        auditScore: 75,
        tvlChange24h: -2.1,
        volumeChange24h: 5.4,
        exploitHistory: 0,
        factors: [
          { factor: 'Yield Sustainability', score: 65, description: 'High APY may not be sustainable', impact: 'NEGATIVE' as const },
          { factor: 'Token Emissions', score: 70, description: 'Controlled emission schedule', impact: 'NEUTRAL' as const },
          { factor: 'LP Token Risk', score: 80, description: 'Standard LP mechanisms', impact: 'POSITIVE' as const }
        ]
      },
      'TNG Staking': {
        auditScore: 90,
        tvlChange24h: 3.2,
        volumeChange24h: 1.8,
        exploitHistory: 0,
        factors: [
          { factor: 'Validator Security', score: 90, description: 'Secure validation process', impact: 'POSITIVE' as const },
          { factor: 'Slashing Risk', score: 85, description: 'Low slashing probability', impact: 'POSITIVE' as const },
          { factor: 'Network Effects', score: 80, description: 'Growing network adoption', impact: 'POSITIVE' as const }
        ]
      }
    }

    const protocolData = riskFactors[protocol as keyof typeof riskFactors] || riskFactors['TNG Lending']
    const avgScore = protocolData.factors.reduce((sum, f) => sum + f.score, 0) / protocolData.factors.length
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    if (avgScore >= 85) riskLevel = 'LOW'
    else if (avgScore >= 70) riskLevel = 'MEDIUM'
    else if (avgScore >= 50) riskLevel = 'HIGH'
    else riskLevel = 'CRITICAL'

    return {
      protocol,
      riskLevel,
      riskScore: avgScore,
      factors: protocolData.factors,
      lastUpdated: new Date(),
      tvlChange24h: protocolData.tvlChange24h,
      volumeChange24h: protocolData.volumeChange24h,
      exploitHistory: protocolData.exploitHistory,
      auditScore: protocolData.auditScore
    }
  }

  private async getUserPositions(userId: string): Promise<Position[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userLendingPositions: {
            include: {
              pool: true
            }
          },
          farmingPositions: {
            include: {
              pool: true
            }
          },
          userStakes: {
            include: {
              pool: true
            }
          }
        }
      })

      if (!user) return []

      const positions: Position[] = []

      // Add lending positions
      user.userLendingPositions.forEach(pos => {
        if (pos.collateralAmount > 0) {
          positions.push({
            symbol: pos.pool.tokenSymbol,
            amount: Number(pos.collateralAmount),
            value: Number(pos.collateralAmount) * 100, // Mock price
            entryPrice: 100,
            currentPrice: 100,
            pnl: 0,
            pnlPercent: 0
          })
        }
      })

      // Add farming positions
      user.farmingPositions.forEach(pos => {
        if (pos.lpTokenAmount > 0) {
          positions.push({
            symbol: `${pos.pool.tokenAMint.slice(-4)}-${pos.pool.tokenBMint.slice(-4)}`,
            amount: Number(pos.lpTokenAmount),
            value: Number(pos.lpTokenAmount) * 50, // Mock LP token price
            entryPrice: 50,
            currentPrice: 50,
            pnl: 0,
            pnlPercent: 0
          })
        }
      })

      return positions
    } catch (error) {
      console.error('Error getting user positions:', error)
      return []
    }
  }

  private checkConcentrationRisk(positions: Position[]): {
    isRisky: boolean
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    assets: string[]
  } {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0)
    const concentrations = positions.map(pos => ({
      symbol: pos.symbol,
      percentage: (pos.value / totalValue) * 100
    }))

    const maxConcentration = Math.max(...concentrations.map(c => c.percentage))
    const topAsset = concentrations.find(c => c.percentage === maxConcentration)

    if (maxConcentration > 70) {
      return {
        isRisky: true,
        severity: 'CRITICAL',
        description: `${topAsset?.symbol} составляет ${maxConcentration.toFixed(1)}% портфеля`,
        assets: [topAsset?.symbol || '']
      }
    } else if (maxConcentration > 50) {
      return {
        isRisky: true,
        severity: 'HIGH',
        description: `${topAsset?.symbol} составляет ${maxConcentration.toFixed(1)}% портфеля`,
        assets: [topAsset?.symbol || '']
      }
    } else if (maxConcentration > 30) {
      return {
        isRisky: true,
        severity: 'MEDIUM',
        description: `${topAsset?.symbol} составляет ${maxConcentration.toFixed(1)}% портфеля`,
        assets: [topAsset?.symbol || '']
      }
    }

    return {
      isRisky: false,
      severity: 'LOW',
      description: 'Портфель достаточно диверсифицирован',
      assets: []
    }
  }

  private async storeRiskAlert(userId: string, alert: RiskAlert): Promise<void> {
    try {
      // In a real implementation, store alerts in database
      console.log(`Stored risk alert for user ${userId}:`, alert.title)
    } catch (error) {
      console.error('Error storing risk alert:', error)
    }
  }
}
