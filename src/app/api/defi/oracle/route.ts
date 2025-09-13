/**
 * Oracle API
 * GET/POST /api/defi/oracle
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { OracleService } from '@/lib/onchain/oracle.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePriceFeedSchema = z.object({
  assetMint: z.string(),
  price: z.number(),
  confidence: z.number().optional(),
  source: z.enum(['Pyth', 'Switchboard', 'Manual', 'ChainlinkSolana', 'Jupiter', 'Orca']).optional()
})

const initializeOracleSchema = z.object({
  updateAuthority: z.string()
})

// GET /api/defi/oracle - Get oracle data
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const assetMint = searchParams.get('assetMint')
    
    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const oracleService = new OracleService()
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
      case 'price':
        if (!assetMint) {
          return NextResponse.json({ error: 'Asset mint required' }, { status: 400 })
        }
        const priceData = await oracleService.getPriceFromOracle(assetMint)
        return NextResponse.json({
          success: true,
          data: { priceData }
        })
      
      case 'config':
        const config = await oracleService.getOracleConfig()
        return NextResponse.json({
          success: true,
          data: { config }
        })
      
      case 'assets':
        const assets = await oracleService.getSupportedAssets()
        return NextResponse.json({
          success: true,
          data: { assets }
        })
      
      case 'aggregate':
        if (!assetMint) {
          return NextResponse.json({ error: 'Asset mint required' }, { status: 400 })
        }
        const aggregateResult = await oracleService.aggregatePrices(assetMint)
        return NextResponse.json({
          success: aggregateResult.success,
          data: aggregateResult.success ? {
            aggregatedPrice: aggregateResult.aggregatedPrice,
            sources: aggregateResult.sources
          } : null,
          error: aggregateResult.error
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Oracle API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/defi/oracle - Update oracle data
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
    const oracleService = new OracleService()
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
      case 'initialize':
        const validatedInitData = initializeOracleSchema.parse(body)
        const initResult = await oracleService.initializeOracle(validatedInitData.updateAuthority)
        
        if (!initResult.success) {
          return NextResponse.json(
            { success: false, error: initResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            signature: initResult.signature
          }
        })
      
      case 'updatePrice':
        const validatedPriceData = updatePriceFeedSchema.parse(body)
        const updateResult = await oracleService.updatePriceFeed(
          validatedPriceData.assetMint,
          validatedPriceData.price,
          validatedPriceData.confidence,
          validatedPriceData.source
        )
        
        if (!updateResult.success) {
          return NextResponse.json(
            { success: false, error: updateResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            signature: updateResult.signature
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
    
    console.error('Oracle API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

