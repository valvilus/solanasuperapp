/**
 * OrderBook API
 * GET/POST /api/defi/orderbook
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { OrderBookService } from '@/lib/onchain/orderbook.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const placeOrderSchema = z.object({
  marketAddress: z.string(),
  side: z.enum(['Buy', 'Sell']),
  price: z.string(),
  quantity: z.string(),
  orderType: z.enum(['Limit', 'Market'])
})

const cancelOrderSchema = z.object({
  orderId: z.string()
})

// GET /api/defi/orderbook - Get order book data
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const marketAddress = searchParams.get('market')
    
    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const orderBookService = new OrderBookService()
    const walletService = new CustodialWalletService(prisma)

    // Get user wallet
    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'Кошелек пользователя не найден', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'markets':
        const markets = await orderBookService.getOrderBookMarkets()
        return NextResponse.json({
          success: true,
          data: { markets }
        })
      
      case 'orderbook':
        if (!marketAddress) {
          return NextResponse.json({ error: 'Market address required' }, { status: 400 })
        }
        const orderBook = await orderBookService.getOrderBook(marketAddress)
        return NextResponse.json({
          success: true,
          data: { orderBook }
        })
      
      case 'orders':
        const orders = await orderBookService.getUserOrders(userId, marketAddress || undefined)
        return NextResponse.json({
          success: true,
          data: { orders }
        })
      
      case 'trades':
        if (!marketAddress) {
          return NextResponse.json({ error: 'Market address required' }, { status: 400 })
        }
        const trades = await orderBookService.getRecentTrades(marketAddress)
        return NextResponse.json({
          success: true,
          data: { trades }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('OrderBook API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/defi/orderbook - Place or cancel orders
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const body = await request.json()
    const { action } = body
    
    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const orderBookService = new OrderBookService()
    const walletService = new CustodialWalletService(prisma)

    // Get user wallet
    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'Кошелек пользователя не найден', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const userWallet = walletResult.data
    const userPublicKey = new PublicKey(userWallet.publicKey)

    switch (action) {
      case 'place':
        const validatedOrderData = placeOrderSchema.parse(body)
        const placeResult = await orderBookService.placeOrder({
          userId,
          userWallet: userWallet.publicKey,
          marketAddress: validatedOrderData.marketAddress,
          side: validatedOrderData.side,
          price: validatedOrderData.price,
          quantity: validatedOrderData.quantity,
          orderType: validatedOrderData.orderType
        })
        
        if (!placeResult.success) {
          return NextResponse.json(
            { success: false, error: placeResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            orderId: placeResult.orderId,
            signature: placeResult.signature
          }
        })
      
      case 'cancel':
        const validatedCancelData = cancelOrderSchema.parse(body)
        const cancelResult = await orderBookService.cancelOrder(userId, validatedCancelData.orderId)
        
        if (!cancelResult.success) {
          return NextResponse.json(
            { success: false, error: cancelResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            signature: cancelResult.signature
          }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('OrderBook API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})