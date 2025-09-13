/**
 * DeFi History API
 * GET /api/defi/history
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { CustodialWalletService } from '@/lib/wallet'
import { prisma } from '@/lib/prisma'

// GET /api/defi/history - Get DeFi transaction history
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting DeFi history...')

    const userId = auth.userId

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 items
    const type = searchParams.get('type') // 'stake', 'swap', 'farm', or 'all'
    const timeframe = searchParams.get('timeframe') || '30d'
    const status = searchParams.get('status') // 'confirmed', 'pending', 'failed', or 'all'

    const offset = (page - 1) * limit

    // Build where clause
    const whereClause: any = {
      userId,
      createdAt: {
        gte: getTimeframeDate(timeframe)
      }
    }

    // Filter by type
    if (type && type !== 'all') {
      const purposeMap: Record<string, string[]> = {
        'stake': ['DEFI_STAKE', 'DEFI_UNSTAKE'],
        'swap': ['DEFI_SWAP'],
        'farm': ['DEFI_FARM_ADD', 'DEFI_FARM_REMOVE']
      }
      
      if (purposeMap[type]) {
        whereClause.purpose = { in: purposeMap[type] }
      }
    } else {
      // All DeFi transactions
      whereClause.purpose = {
        in: ['STAKE', 'UNSTAKE', 'DEX_SWAP']
      }
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase()
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.onchainTx.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.onchainTx.count({
        where: whereClause
      })
    ])

    // Format transactions for frontend
    const formattedTransactions = transactions.map(tx => {
      const metadata = tx.metadata as any
      
      return {
        id: tx.id,
        signature: tx.signature,
        type: getTransactionType(tx.purpose),
        purpose: tx.purpose,
        status: tx.status.toLowerCase(),
        timestamp: tx.createdAt.toISOString(),
        explorerUrl: `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`,
        details: formatTransactionDetails(tx.purpose, metadata),
        metadata
      }
    })

    // Calculate summary statistics
    const summary = calculateHistorySummary(transactions)

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        summary,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          type: type || 'all',
          timeframe,
          status: status || 'all'
        }
      },
      message: 'История транзакций получена успешно'
    })

  } catch (error) {
    console.error(' History GET error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
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

// Helper functions
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
    case 'all':
      return new Date(0) // Beginning of time
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

function getTransactionType(purpose: string): string {
  switch (purpose) {
    case 'STAKE':
      return 'stake'
    case 'UNSTAKE':
      return 'unstake'
    case 'DEX_SWAP':
      return 'swap'
    default:
      return 'unknown'
  }
}

function formatTransactionDetails(purpose: string, metadata: any) {
  switch (purpose) {
    case 'STAKE':
      return {
        operation: 'Стейкинг',
        poolId: metadata?.poolId,
        amount: metadata?.amount,
        estimatedRewards: metadata?.estimatedRewards,
        apy: metadata?.estimatedApy || metadata?.apy
      }
      
    case 'UNSTAKE':
      return {
        operation: 'Анстейкинг',
        poolId: metadata?.poolId,
        unstakedAmount: metadata?.unstakedAmount,
        rewardsAmount: metadata?.rewardsAmount
      }
      
    case 'DEX_SWAP':
      // Check metadata to determine if it's a swap or farming operation
      if (metadata?.operation === 'add_liquidity') {
        return {
          operation: 'Добавление ликвидности',
          poolId: metadata?.poolId,
          tokenAAmount: metadata?.tokenAAmount,
          tokenBAmount: metadata?.tokenBAmount,
          lpTokensReceived: metadata?.lpTokensReceived,
          estimatedApy: metadata?.estimatedApy
        }
      } else if (metadata?.operation === 'remove_liquidity') {
        return {
          operation: 'Удаление ликвидности',
          poolId: metadata?.poolId,
          lpTokensBurned: metadata?.lpTokensBurned,
          tokenAReceived: metadata?.tokenAReceived,
          tokenBReceived: metadata?.tokenBReceived
        }
      } else {
        return {
          operation: 'Обмен',
          inputMint: metadata?.inputMint,
          outputMint: metadata?.outputMint,
          inputAmount: metadata?.inputAmount,
          outputAmount: metadata?.outputAmount,
          actualOutputAmount: metadata?.actualOutputAmount,
          priceImpact: metadata?.priceImpact,
          fee: metadata?.fee
        }
      }
      
    default:
      return {
        operation: 'Неизвестная операция',
        ...metadata
      }
  }
}

function calculateHistorySummary(transactions: any[]) {
  const totalTransactions = transactions.length
  const confirmedTransactions = transactions.filter(tx => tx.status === 'CONFIRMED').length
  const pendingTransactions = transactions.filter(tx => tx.status === 'PENDING').length
  const failedTransactions = transactions.filter(tx => tx.status === 'FAILED').length
  
  // Count by type
  const stakeTransactions = transactions.filter(tx => 
    tx.purpose === 'STAKE' || tx.purpose === 'UNSTAKE'
  ).length
  
  const swapTransactions = transactions.filter(tx => 
    tx.purpose === 'DEX_SWAP' && (!tx.metadata?.operation || tx.metadata?.operation === 'swap')
  ).length
  
  const farmTransactions = transactions.filter(tx => 
    tx.purpose === 'DEX_SWAP' && (tx.metadata?.operation === 'add_liquidity' || tx.metadata?.operation === 'remove_liquidity')
  ).length
  
  // Calculate success rate
  const successRate = totalTransactions > 0 
    ? (confirmedTransactions / totalTransactions) * 100 
    : 0
  
  // Calculate average transaction frequency
  const oldestTransaction = transactions[transactions.length - 1]
  const newestTransaction = transactions[0]
  
  let averageFrequency = 0
  if (oldestTransaction && newestTransaction && totalTransactions > 1) {
    const timeSpan = new Date(newestTransaction.createdAt).getTime() - new Date(oldestTransaction.createdAt).getTime()
    const days = timeSpan / (1000 * 60 * 60 * 24)
    averageFrequency = days > 0 ? totalTransactions / days : 0
  }
  
  return {
    totalTransactions,
    confirmedTransactions,
    pendingTransactions,
    failedTransactions,
    successRate: Math.round(successRate * 100) / 100,
    breakdown: {
      staking: stakeTransactions,
      swapping: swapTransactions,
      farming: farmTransactions
    },
    averageFrequency: Math.round(averageFrequency * 100) / 100, // Transactions per day
    oldestTransaction: oldestTransaction?.createdAt,
    newestTransaction: newestTransaction?.createdAt
  }
}
