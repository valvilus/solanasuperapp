import { NextRequest, NextResponse } from 'next/server'
import { AdvancedAnalyticsService, Position } from '@/lib/analytics/advanced-analytics.service'
import { RiskMonitorService } from '@/lib/monitoring/risk-monitor.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const analyticsService = new AdvancedAnalyticsService()
    const riskMonitorService = new RiskMonitorService()
    const walletService = new CustodialWalletService(prisma)

    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'Кошелек пользователя не найден', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const userWallet = walletResult.data.publicKey

    switch (action) {
      case 'metrics':
        // Get user positions and calculate risk metrics
        const positions = await getUserPositions(userId)
        const riskMetrics = await analyticsService.getPortfolioRiskMetrics(positions)
        
        return NextResponse.json({
          success: true,
          data: { riskMetrics }
        })
      
      case 'alerts':
        // Get all risk alerts for user
        const [liquidationAlerts, portfolioAlerts, marketAlerts] = await Promise.all([
          riskMonitorService.monitorLiquidationRisk(userId),
          riskMonitorService.getPortfolioRiskAlerts(userId),
          riskMonitorService.getMarketRiskAlerts()
        ])
        
        const allAlerts = [...liquidationAlerts, ...portfolioAlerts, ...marketAlerts]
        
        return NextResponse.json({
          success: true,
          data: { alerts: allAlerts }
        })
      
      case 'stress-test':
        // Get stress testing scenarios
        const userPositions = await getUserPositions(userId)
        const stressResults = await analyticsService.getStressTesting(userPositions)
        
        return NextResponse.json({
          success: true,
          data: stressResults
        })
      
      case 'protocol-risks':
        // Get protocol risk assessment
        const protocolRisks = await riskMonitorService.checkProtocolRisks()
        
        return NextResponse.json({
          success: true,
          data: { protocols: protocolRisks }
        })
      
      case 'var-calculation':
        const confidence = parseFloat(searchParams.get('confidence') || '0.95')
        const varPositions = await getUserPositions(userId)
        const var95 = await analyticsService.calculateVaR(varPositions, confidence)
        
        return NextResponse.json({
          success: true,
          data: { var: var95, confidence }
        })
      
      case 'correlation-matrix':
        const assets = searchParams.get('assets')?.split(',') || ['SOL', 'BTC', 'ETH', 'USDC']
        const correlationMatrix = await analyticsService.getCorrelationMatrix(assets)
        
        return NextResponse.json({
          success: true,
          data: { correlationMatrix, assets }
        })
      
      case 'yield-prediction':
        const protocol = searchParams.get('protocol') || 'TNG Lending'
        const timeframe = searchParams.get('timeframe') || '30d'
        const yieldForecast = await analyticsService.getYieldPrediction(protocol, timeframe)
        
        return NextResponse.json({
          success: true,
          data: { forecast: yieldForecast }
        })
      
      case 'portfolio-optimization':
        const riskTolerance = parseFloat(searchParams.get('riskTolerance') || '0.5')
        const targetAssets = searchParams.get('assets')?.split(',') || ['SOL', 'TNG', 'USDC']
        const expectedReturns = targetAssets.map(() => Math.random() * 0.2 + 0.05) // Mock returns
        
        const optimization = await analyticsService.getPortfolioOptimization(
          targetAssets,
          expectedReturns,
          riskTolerance
        )
        
        return NextResponse.json({
          success: true,
          data: { optimization }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Risk API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const body = await request.json()
    const { action } = body
    
    const riskMonitorService = new RiskMonitorService()

    switch (action) {
      case 'send-alerts':
        const { alerts } = body
        await riskMonitorService.sendRiskAlerts(userId, alerts)
        
        return NextResponse.json({
          success: true,
          data: { message: 'Алерты отправлены успешно' }
        })
      
      case 'dismiss-alert':
        const { alertId } = body
        // In a real implementation, mark alert as dismissed in database
        console.log(`Alert ${alertId} dismissed for user ${userId}`)
        
        return NextResponse.json({
          success: true,
          data: { message: 'Алерт отклонен' }
        })
      
      case 'update-risk-settings':
        const { settings } = body
        // In a real implementation, update user risk preferences
        console.log(`Risk settings updated for user ${userId}:`, settings)
        
        return NextResponse.json({
          success: true,
          data: { message: 'Настройки риска обновлены' }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Risk API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

async function getUserPositions(userId: string): Promise<Position[]> {
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

    // Mock prices for calculation
    const prices: { [key: string]: number } = {
      'SOL': 100,
      'TNG': 0.5,
      'USDC': 1,
      'BTC': 45000,
      'ETH': 3000
    }

    // Add lending positions
    user.userLendingPositions.forEach(pos => {
      if (pos.collateralAmount > 0) {
        const price = prices[pos.pool.tokenSymbol] || 1
        const amount = Number(pos.collateralAmount)
        positions.push({
          symbol: pos.pool.tokenSymbol,
          amount: amount,
          value: amount * price,
          entryPrice: price * 0.95, // Mock entry price
          currentPrice: price,
          pnl: amount * price * 0.05,
          pnlPercent: 5
        })
      }
    })

    // Add farming positions
    user.farmingPositions.forEach(pos => {
      if (pos.lpTokenAmount > 0) {
        const price = 50 // Mock LP token price
        const amount = Number(pos.lpTokenAmount)
        positions.push({
          symbol: `${pos.pool.tokenAMint.slice(-4)}-${pos.pool.tokenBMint.slice(-4)}`,
          amount: amount,
          value: amount * price,
          entryPrice: price * 0.9,
          currentPrice: price,
          pnl: amount * price * 0.1,
          pnlPercent: 10
        })
      }
    })

    // Add staking positions
    user.userStakes.forEach(stake => {
      if (stake.amount > 0) {
        const tokenSymbol = stake.pool.tokenMint.slice(-4) // Use last 4 chars as symbol
        const price = prices[tokenSymbol] || 0.5
        const amount = Number(stake.amount)
        positions.push({
          symbol: tokenSymbol,
          amount: amount,
          value: amount * price,
          entryPrice: price * 0.8,
          currentPrice: price,
          pnl: amount * price * 0.2,
          pnlPercent: 20
        })
      }
    })

    return positions
  } catch (error) {
    console.error('Error getting user positions:', error)
    return []
  }
}
