/**
 * Transactions API - Get user transaction history
 * GET /api/transactions
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // 'send' | 'receive' | 'swap'
    const status = searchParams.get('status') // 'confirmed' | 'pending' | 'failed'
    const token_filter = searchParams.get('token') // 'SOL' | 'TNG' | 'USDC'

    // Build where clause
    const whereClause: any = {
      userId
    }

    // Filter by transaction type
    if (type) {
      switch (type) {
        case 'send':
          whereClause.direction = 'DEBIT'
          break
        case 'receive':
          whereClause.direction = 'CREDIT'
          whereClause.txType = { not: 'REWARD' } // Exclude faucet
          break
        case 'swap':
          whereClause.description = { contains: 'swap' }
          break
      }
    }

    // Filter by status
    if (status) {
      switch (status) {
        case 'confirmed':
          whereClause.status = 'POSTED'
          break
        case 'pending':
          whereClause.status = 'PENDING'
          break
        case 'failed':
          whereClause.status = 'FAILED'
          break
      }
    }

    // Filter by token
    if (token_filter) {
      whereClause.asset = {
        symbol: token_filter
      }
    }

    // Get transactions with related user info
    const [transactions, totalCount] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: whereClause,
        include: {
          asset: true,
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.ledgerEntry.count({ where: whereClause })
    ])

    // Get related user information for transfers
    const enrichedTransactions = await Promise.all(transactions.map(async (tx) => {
      let relatedUserInfo = null
      
      // For internal transfers, find the counterpart transaction
      if (tx.txType === 'TRANSFER_INTERNAL') {
        try {
          // Find the counterpart transaction (same txRef, different direction)
          const counterpartDirection = tx.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT'
          const counterpart = await prisma.ledgerEntry.findFirst({
            where: {
              txRef: tx.txRef,
              direction: counterpartDirection,
              userId: { not: tx.userId }
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          })
          
          if (counterpart?.user) {
            relatedUserInfo = counterpart.user
          }
        } catch (error) {
          console.error('Error finding counterpart transaction:', error)
        }
      }
      
      return {
        ...tx,
        relatedUser: relatedUserInfo
      }
    }))

    // Transform to frontend format
    const transformedTransactions = enrichedTransactions.map(tx => {
      const isCredit = tx.direction === 'CREDIT'
      const amount = Number(tx.amount) / Math.pow(10, tx.asset.decimals)
      
      // Determine transaction type
      let txType = 'send'
      if (isCredit) {
        if (tx.txType === 'REWARD') {
          txType = 'receive' // Faucet
        } else if (tx.txType === 'LENDING_BORROW') {
          txType = 'receive' // Заимствование
        } else if (tx.txType === 'LENDING_WITHDRAW') {
          txType = 'receive' // Вывод из lending
        } else {
          txType = 'receive'
        }
      } else {
        // DEBIT transactions
        if (tx.txType === 'LENDING_SUPPLY') {
          txType = 'send' // Предоставление ликвидности
        } else if (tx.txType === 'LENDING_REPAY') {
          txType = 'send' // Погашение долга
        }
      }
      
      if (tx.description?.includes('swap')) {
        txType = 'swap'
      }

      // Map status
      let mappedStatus = 'confirmed'
      if (tx.status === 'PENDING') mappedStatus = 'pending'
      if (tx.status === 'FAILED') mappedStatus = 'failed'

      // Calculate USD value (mock prices for now)
      const prices: Record<string, number> = {
        SOL: 200.45,
        TNG: 0.01,
        USDC: 1.0
      }
      const usdValue = amount * (prices[tx.asset.symbol] || 0)

      // Improved from/to logic based on transaction direction and related user
      let fromInfo = undefined
      let toInfo = undefined  
      let fromUsername = undefined
      let toUsername = undefined
      let isAnonymous = false
      let signature = undefined

      if (tx.txType === 'TRANSFER_INTERNAL' && tx.relatedUser) {
        // Check if transfer was anonymous (from metadata)
        const metadata = tx.metadata as any
        isAnonymous = metadata?.isAnonymous || false
        
        if (isCredit) {
          // Current user received money - show sender info
          fromInfo = isAnonymous ? 'Анонимно' : (tx.relatedUser.username ? `@${tx.relatedUser.username}` : tx.relatedUser.firstName || 'Пользователь')
          fromUsername = isAnonymous ? undefined : tx.relatedUser.username
          toInfo = undefined // Current user is recipient
          toUsername = undefined
        } else {
          // Current user sent money - show recipient info  
          fromInfo = undefined // Current user is sender
          fromUsername = undefined
          toInfo = tx.relatedUser.username ? `@${tx.relatedUser.username}` : tx.relatedUser.firstName || 'Пользователь'
          toUsername = tx.relatedUser.username
        }
        
        // Use txRef as signature for internal transfers
        signature = tx.txRef
        
      } else if (tx.txType === 'REWARD') {
        // Faucet transaction
        fromInfo = 'TNG Faucet'
        toInfo = undefined // Current user is recipient
        signature = tx.txRef
        
      } else if (tx.txType === 'DEPOSIT_ONCHAIN') {
        // On-chain deposit to app
        fromInfo = 'Блокчейн'
        toInfo = undefined // Current user is recipient
        signature = tx.txRef
        
      } else if (tx.txType === 'WITHDRAW_ONCHAIN') {
        // On-chain withdrawal from app
        fromInfo = undefined // Current user is sender
        toInfo = 'Блокчейн'
        signature = tx.txRef
        
      } else if (tx.txType === 'LENDING_SUPPLY') {
        // DeFi Lending: Supply to pool
        fromInfo = undefined // Current user is sender
        toInfo = 'DeFi Lending Pool'
        signature = tx.txRef
        
      } else if (tx.txType === 'LENDING_WITHDRAW') {
        // DeFi Lending: Withdraw from pool
        fromInfo = 'DeFi Lending Pool'
        toInfo = undefined // Current user is recipient
        signature = tx.txRef
        
      } else if (tx.txType === 'LENDING_BORROW') {
        // DeFi Lending: Borrow from pool
        fromInfo = 'DeFi Lending Pool'
        toInfo = undefined // Current user is recipient
        signature = tx.txRef
        
      } else if (tx.txType === 'LENDING_REPAY') {
        // DeFi Lending: Repay to pool
        fromInfo = undefined // Current user is sender
        toInfo = 'DeFi Lending Pool'
        signature = tx.txRef
        
      } else {
        // Other transaction types
        if (isCredit) {
          fromInfo = 'Внешний источник'
          toInfo = undefined
        } else {
          fromInfo = undefined
          toInfo = 'Внешний адрес'
        }
        signature = tx.txRef
      }

      return {
        id: tx.id,
        type: txType,
        status: mappedStatus,
        token: tx.asset.symbol,
        amount: `${isCredit ? '+' : '-'}${amount.toFixed(tx.asset.decimals)}`,
        usdAmount: `${isCredit ? '+' : '-'}$${usdValue.toFixed(2)}`,
        fee: tx.asset.symbol === 'SOL' ? '0.000005' : undefined,
        from: fromInfo,
        to: toInfo,
        fromUsername,
        toUsername,
        isAnonymous,
        signature: signature || undefined,
        timestamp: tx.createdAt,
        memo: tx.description,
        blockTime: (tx as any).updatedAt || tx.createdAt,
        explorerUrl: (tx.metadata as any)?.explorerUrl || (signature && signature.startsWith('mock_') ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : undefined)
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        transactions: transformedTransactions,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    })

  } catch (error) {
    console.error(' Transactions API error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})
