import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { BridgeService, ChainId } from '@/lib/onchain/bridge.service'
import { TngBridgeContractService } from '@/lib/onchain/bridge-contract.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bridgeTransferSchema = z.object({
  targetChain: z.enum(['Ethereum', 'BSC', 'Polygon', 'Avalanche']),
  recipient: z.string().min(10),
  amount: z.number().positive(),
  tokenSymbol: z.string().min(1)
})

const crossChainSwapSchema = z.object({
  sourceChain: z.enum(['Solana', 'Ethereum', 'BSC', 'Polygon', 'Avalanche']),
  targetChain: z.enum(['Solana', 'Ethereum', 'BSC', 'Polygon', 'Avalanche']),
  inputToken: z.string(),
  outputToken: z.string(),
  amountIn: z.number().positive(),
  minimumAmountOut: z.number().positive(),
  recipient: z.string()
})

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const txId = searchParams.get('txId')
    
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const bridgeService = new BridgeService()
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
      case 'config':
        const config = await bridgeService.getBridgeConfig()
        return NextResponse.json({
          success: true,
          data: { config }
        })
      
      case 'chains':
        const chains = await bridgeService.getSupportedChains()
        return NextResponse.json({
          success: true,
          data: { chains }
        })
      
      case 'transactions':
        const transactions = await bridgeService.getBridgeTransactions(userWallet)
        return NextResponse.json({
          success: true,
          data: { transactions }
        })
      
      case 'status':
        if (!txId) {
          return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
        }
        const status = await bridgeService.getBridgeTransactionStatus(txId)
        return NextResponse.json({
          success: true,
          data: { status }
        })
      
      case 'swaps':
        const swaps = await bridgeService.getCrossChainSwaps(userWallet)
        return NextResponse.json({
          success: true,
          data: { swaps }
        })
      
      case 'estimate':
        const sourceChain = searchParams.get('sourceChain') as ChainId
        const targetChain = searchParams.get('targetChain') as ChainId
        if (!sourceChain || !targetChain) {
          return NextResponse.json({ error: 'Source and target chains required' }, { status: 400 })
        }
        const estimate = await bridgeService.getEstimatedBridgeTime(sourceChain, targetChain)
        return NextResponse.json({
          success: true,
          data: { estimate }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bridge API error:', error)
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
    
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const bridgeService = new BridgeService()
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
      case 'transfer':
        const validatedTransferData = bridgeTransferSchema.parse(body)
        const transferResult = await bridgeService.initiateBridgeTransfer(
          validatedTransferData.targetChain,
          validatedTransferData.recipient,
          validatedTransferData.amount,
          validatedTransferData.tokenSymbol,
          userWallet
        )
        
        if (!transferResult.success) {
          return NextResponse.json(
            { success: false, error: transferResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            txId: transferResult.txId,
            message: 'Перевод инициирован успешно'
          }
        })
      
      case 'swap':
        const validatedSwapData = crossChainSwapSchema.parse(body)
        const swapResult = await bridgeService.crossChainSwap(
          validatedSwapData.sourceChain,
          validatedSwapData.targetChain,
          validatedSwapData.inputToken,
          validatedSwapData.outputToken,
          validatedSwapData.amountIn,
          validatedSwapData.minimumAmountOut,
          validatedSwapData.recipient,
          userWallet
        )
        
        if (!swapResult.success) {
          return NextResponse.json(
            { success: false, error: swapResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            txId: swapResult.txId,
            message: 'Cross-chain swap инициирован успешно'
          }
        })
      case 'unlock': {
        // Minimal unlock MVP: expects sourceChain, txHash, recipient (pubkey), amount (number), tokenMint (pubkey), validatorSignatures (array of base64)
        const { sourceChain, txHash, recipient, amount, tokenMint, validatorSignatures } = body
        if (!sourceChain || !txHash || !recipient || !amount || !tokenMint) {
          return NextResponse.json({ error: 'Invalid unlock params' }, { status: 400 })
        }
        const sponsorStr = process.env.SPONSOR_PRIVATE_KEY
        if (!sponsorStr) {
          return NextResponse.json({ error: 'SPONSOR_PRIVATE_KEY not configured' }, { status: 400 })
        }
        try {
          const sponsorSecret = JSON.parse(sponsorStr)
          const svc = new TngBridgeContractService(new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com','confirmed'), sponsorSecret)
          const sigs = Array.isArray(validatorSignatures)
            ? (validatorSignatures as string[]).map((b64) => Uint8Array.from(Buffer.from(b64, 'base64')))
            : []
          const res = await svc.unlockTokens({
            sourceChain,
            transactionHash: txHash,
            recipient: new PublicKey(recipient),
            amount: BigInt(Math.floor(Number(amount) * 1e9)),
            tokenMint: new PublicKey(tokenMint),
            validatorSignatures: sigs,
          })
          if (!res.success) {
            return NextResponse.json({ success: false, error: res.error }, { status: 400 })
          }
          return NextResponse.json({ success: true, data: { signature: res.signature } })
        } catch (e: any) {
          return NextResponse.json({ error: e?.message || 'Unlock failed' }, { status: 400 })
        }
      }
      
      case 'get-routes':
        const routesResult = await bridgeService.getCrossChainRoutes(
          body.inputToken,
          body.outputToken,
          body.amount
        )
        
        return NextResponse.json({
          success: true,
          data: routesResult
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
    
    console.error('Bridge API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
