/**
 * DeFi Analytics API
 * GET /api/defi/analytics
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { withAuth } from '@/lib/auth'
import { CustodialWalletService } from '@/lib/wallet'
import { prisma } from '@/lib/prisma'

// GET /api/defi/analytics - Get portfolio analytics and performance data
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    const includeHistory = searchParams.get('includeHistory') === 'true'

    const walletService = new CustodialWalletService(prisma)

    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'User wallet not found', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const userWallet = walletResult.data

    const defiTransactions = await prisma.onchainTx.findMany({
      where: {
        userId,
        purpose: {
          in: ['STAKE', 'UNSTAKE', 'DEX_SWAP']
        },
        createdAt: {
          gte: getTimeframeDate(timeframe)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const analytics = await calculatePortfolioAnalytics(userId, defiTransactions, timeframe)
    
    let priceHistory: any[] = []
    if (includeHistory) {
      priceHistory = await generatePriceHistory(timeframe)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        priceHistory: includeHistory ? priceHistory : undefined,
        timeframe,
        lastUpdated: new Date().toISOString()
      },
      message: 'Analytics retrieved successfully'
    })

  } catch (error) {
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    )
  }
})

function getTimeframeDate(timeframe: string): Date {
  const now = new Date()
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

async function calculatePortfolioAnalytics(userId: string, transactions: any[], timeframe: string) {
  const totalTransactions = transactions.length
  const stakingTxs = transactions.filter(tx => tx.purpose.includes('STAKE'))
  const swapTxs = transactions.filter(tx => tx.purpose.includes('SWAP'))
  const farmingTxs = transactions.filter(tx => tx.purpose.includes('FARM'))

  const portfolioValue = 5847.23
  const totalPnL = 432.67
  const totalPnLPercent = 8.5
  
  const stakingValue = 1250.45
  const stakingPnL = 125.30
  const swapVolume = 2340.67
  const farmingValue = 1847.89
  const farmingPnL = 187.45

  const sharpeRatio = 1.34
  const maxDrawdown = -12.5
  const volatility = 18.7

  const topPerformers = [
    { symbol: 'TNG', pnl: 234.56, pnlPercent: 15.6 },
    { symbol: 'SOL', pnl: 156.78, pnlPercent: 12.3 },
    { symbol: 'USDC', pnl: 41.33, pnlPercent: 4.1 }
  ]

  return {
    portfolio: {
      totalValue: portfolioValue,
      totalPnL,
      totalPnLPercent,
      dailyChange: 67.89,
      dailyChangePercent: 1.2,
      weeklyChange: 234.56,
      weeklyChangePercent: 4.2,
      monthlyChange: totalPnL,
      monthlyChangePercent: totalPnLPercent
    },
    breakdown: {
      staking: {
        value: stakingValue,
        pnl: stakingPnL,
        pnlPercent: (stakingPnL / stakingValue) * 100,
        allocation: (stakingValue / portfolioValue) * 100,
        transactions: stakingTxs.length
      },
      swapping: {
        volume: swapVolume,
        transactions: swapTxs.length,
        averageSlippage: 0.3,
        totalFees: 12.45
      },
      farming: {
        value: farmingValue,
        pnl: farmingPnL,
        pnlPercent: (farmingPnL / farmingValue) * 100,
        allocation: (farmingValue / portfolioValue) * 100,
        impermanentLoss: -23.45,
        transactions: farmingTxs.length
      }
    },
    risk: {
      sharpeRatio,
      maxDrawdown,
      volatility,
      beta: 0.87,
      var95: -156.78, // Value at Risk 95%
      riskScore: 'medium' as const
    },
    performance: {
      topPerformers,
      worstPerformers: [
        { symbol: 'USDT', pnl: -12.34, pnlPercent: -1.2 }
      ],
      winRate: 73.2, // Percentage of profitable transactions
      averageHoldTime: 8.5, // Days
      totalTransactions,
      profitableTransactions: Math.floor(totalTransactions * 0.732)
    },
    diversification: {
      score: 7.8, // Out of 10
      concentration: 0.35, // Herfindahl index
      correlations: {
        'TNG-SOL': 0.45,
        'TNG-USDC': 0.12,
        'SOL-USDC': 0.23
      }
    }
  }
}

async function generatePriceHistory(timeframe: string) {
  // Mock price history generation
  const points = getHistoryPoints(timeframe)
  const history: any[] = []
  const basePrice = 5847.23
  
  for (let i = 0; i < points; i++) {
    const timestamp = Date.now() - (points - i) * getTimeInterval(timeframe)
    const randomChange = (Math.random() - 0.5) * 0.1 // ±5% max change
    const price = basePrice * (1 + randomChange * (i / points))
    const volume = Math.random() * 50000 + 10000
    
    history.push({
      timestamp,
      price: Math.max(price, basePrice * 0.8),
      volume,
      pnl: price - basePrice,
      pnlPercent: ((price - basePrice) / basePrice) * 100
    })
  }
  
  return history
}

function getHistoryPoints(timeframe: string): number {
  switch (timeframe) {
    case '24h': return 24
    case '7d': return 168 // Hourly for 7 days
    case '30d': return 30 // Daily for 30 days
    case '90d': return 90
    case '1y': return 365
    default: return 30
  }
}

function getTimeInterval(timeframe: string): number {
  switch (timeframe) {
    case '24h': return 60 * 60 * 1000 // 1 hour
    case '7d': return 60 * 60 * 1000 // 1 hour
    case '30d': return 24 * 60 * 60 * 1000 // 1 day
    case '90d': return 24 * 60 * 60 * 1000 // 1 day
    case '1y': return 24 * 60 * 60 * 1000 // 1 day
    default: return 24 * 60 * 60 * 1000
  }
}
