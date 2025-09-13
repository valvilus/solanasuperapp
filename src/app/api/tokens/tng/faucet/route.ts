/**
 * TNG Faucet API - Mint real on-chain TNG tokens
 * POST /api/tokens/tng/faucet
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { PublicKey, Connection } from '@solana/web3.js'
import { TNGTokenService } from '@/lib/onchain/tng-token.service'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TokenBalanceCache from '@/lib/optimized/TokenBalanceCache'

// POST /api/tokens/tng/faucet - получить реальные on-chain TNG токены
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Получаем кошелек пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    })

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'У пользователя нет custodial кошелька', code: 'NO_WALLET' },
        { status: 400 }
      )
    }

    // Парсим параметры (опционально)
    let body = {}
    try {
      const contentType = request.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        body = await request.json()
      }
    } catch (error) {
      // Если нет тела запроса или некорректный JSON - используем значения по умолчанию
      console.log(' No JSON body provided, using defaults')
    }
    const { amount } = body as { amount?: string }

    // Валидация суммы (по умолчанию 1000 TNG)
    let faucetAmount = BigInt(1000) * BigInt(1000000000) // 1000 TNG в мин. единицах (9 decimals)
    
    if (amount) {
      try {
        const requestedAmount = BigInt(amount)
        // Ограничиваем максимальную сумму из faucet (10,000 TNG)
        const maxAmount = BigInt(10000) * BigInt(1000000000)
        faucetAmount = requestedAmount > maxAmount ? maxAmount : requestedAmount
      } catch (error) {
        return NextResponse.json(
          { error: 'Неверный формат суммы', code: 'INVALID_AMOUNT' },
          { status: 400 }
        )
      }
    }

    console.log(' On-chain faucet request:', {
      userId,
      walletAddress: user.walletAddress,
      amount: faucetAmount.toString(),
      amountTNG: (Number(faucetAmount) / 1e9).toFixed(2)
    })

    // Проверяем лимит faucet (один раз в 10 минут на пользователя для devnet)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentFaucet = await prisma.onchainTx.findFirst({
      where: {
        userId,
        purpose: 'FAUCET',
        createdAt: { gte: tenMinutesAgo }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (recentFaucet) {
      const nextAvailable = new Date(recentFaucet.createdAt.getTime() + 10 * 60 * 1000)
      console.log(' Faucet rate limited:', {
        userId,
        lastUsed: recentFaucet.createdAt,
        nextAvailable,
        now: new Date()
      })
      
      return NextResponse.json(
        { 
          error: 'Faucet можно использовать только раз в 10 минут', 
          code: 'FAUCET_RATE_LIMIT',
          nextAvailable
        },
        { status: 429 }
      )
    }

    // Инициализируем TNG Token Service
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const tngService = new TNGTokenService(connection)

    // Минтим реальные TNG токены в blockchain
    const userPublicKey = new PublicKey(user.walletAddress)
    const mintResult = await tngService.mintTNGTokens(userPublicKey, faucetAmount)

    if (!mintResult.success || !mintResult.data) {
      return NextResponse.json(
        {
          error: mintResult.error?.message || 'Ошибка минтинга TNG токенов',
          code: mintResult.error?.code || 'MINT_FAILED',
          details: mintResult.error?.details,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    const mintData = mintResult.data

    // Сохраняем транзакцию в БД для отслеживания
    try {
      await prisma.onchainTx.create({
        data: {
          userId,
          signature: mintData.signature,
          amount: faucetAmount,
          toAddress: user.walletAddress,
          purpose: 'FAUCET',
          status: 'CONFIRMED',
          metadata: {
            tokenAccount: mintData.tokenAccount,
            mint: tngService.getMintInfo().mintAddress,
            faucetType: 'onchain',
            amountTNG: (Number(faucetAmount) / 1e9).toFixed(2)
          }
        }
      })
    } catch (dbError) {
      console.error(' Failed to save faucet transaction to DB:', dbError)
      // Не фейлим запрос, так как blockchain транзакция прошла
    }

    // КРИТИЧЕСКИ ВАЖНО: Очищаем кеш баланса TNG после faucet
    try {
      const balanceCache = TokenBalanceCache.getInstance()
      balanceCache.clearCache(user.walletAddress, 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs')
      console.log(' TNG balance cache cleared after faucet')
    } catch (cacheError) {
      console.error(' Failed to clear TNG balance cache:', cacheError)
    }

    console.log(' On-chain TNG faucet completed:', {
      userId,
      signature: mintData.signature,
      tokenAccount: mintData.tokenAccount,
      amount: (Number(faucetAmount) / 1e9).toFixed(2) + ' TNG',
      userBalance: (Number(mintData.userBalance) / 1e9).toFixed(2) + ' TNG',
      explorerUrl: mintData.explorerUrl
    })

    return NextResponse.json({
      success: true,
      data: {
        amount: faucetAmount.toString(),
        amountTNG: (Number(faucetAmount) / 1e9).toFixed(2),
        symbol: 'TNG',
        mintAddress: tngService.getMintInfo().mintAddress,
        transaction: {
          signature: mintData.signature,
          tokenAccount: mintData.tokenAccount,
          explorerUrl: mintData.explorerUrl,
          status: 'confirmed'
        },
        balance: {
          current: mintData.userBalance,
          currentTNG: (Number(mintData.userBalance) / 1e9).toFixed(2)
        }
      },
      message: `Получено ${(Number(faucetAmount) / 1e9).toFixed(2)} TNG токенов в blockchain`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' On-chain TNG faucet error:', error)
    
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

// GET /api/tokens/tng/faucet - информация о on-chain faucet
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId

    // Проверяем когда последний раз пользователь использовал on-chain faucet
    const lastFaucet = await prisma.onchainTx.findFirst({
      where: {
        userId,
        purpose: 'FAUCET'
      },
      orderBy: { createdAt: 'desc' }
    })

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const canUseFaucet = !lastFaucet || lastFaucet.createdAt < tenMinutesAgo

    // Инициализируем TNG service для получения информации
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const tngService = new TNGTokenService(connection)
    const mintInfo = tngService.getMintInfo()

    return NextResponse.json({
      success: true,
      data: {
        token: mintInfo,
        faucet: {
          defaultAmount: '1000000000000', // 1000 TNG в мин. единицах
          maxAmount: '10000000000000', // 10,000 TNG в мин. единицах
          cooldownMinutes: 10,
          canUse: canUseFaucet,
          lastUsed: lastFaucet?.createdAt || null,
          nextAvailable: lastFaucet ? new Date(lastFaucet.createdAt.getTime() + 10 * 60 * 1000) : null,
          type: 'onchain',
          description: 'Реальные TNG токены в Solana devnet'
        }
      },
      message: 'Информация о on-chain TNG faucet получена успешно'
    })

  } catch (error) {
    console.error(' On-chain TNG faucet info error:', error)
    
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