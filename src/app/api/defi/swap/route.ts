/**
 * DeFi Swap API
 * GET/POST /api/defi/swap
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { SwapService } from '@/lib/onchain/swap.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TokenBalanceCache from '@/lib/optimized/TokenBalanceCache'

// GET /api/defi/swap - Get swap data (quotes, supported tokens, balances)
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')
    const inputMint = searchParams.get('inputMint')
    const outputMint = searchParams.get('outputMint')
    const amount = searchParams.get('amount')
    const slippage = searchParams.get('slippage')

    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const swapService = new SwapService(connection)
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

    switch (operation) {
      case 'quote': {
        if (!inputMint || !outputMint || !amount) {
          return NextResponse.json(
            { error: 'Отсутствуют параметры для получения котировки', code: 'MISSING_QUOTE_PARAMS' },
            { status: 400 }
          )
        }

        const slippageBps = slippage ? parseInt(slippage) : 50
        const quoteResult = await swapService.getSwapQuote(inputMint, outputMint, amount, slippageBps)

        if (!quoteResult.success) {
          return NextResponse.json(
            {
              error: quoteResult.error?.message || 'Ошибка получения котировки',
              code: 'QUOTE_ERROR'
            },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            operation: 'quote',
            quote: quoteResult.data
          },
          message: 'Котировка получена успешно'
        })
      }

      case 'tokens': {
        const tokensResult = await swapService.getSupportedTokens()

        if (!tokensResult.success) {
          return NextResponse.json(
            {
              error: tokensResult.error?.message || 'Ошибка получения токенов',
              code: 'TOKENS_ERROR'
            },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            operation: 'tokens',
            tokens: tokensResult.data
          },
          message: 'Поддерживаемые токены получены успешно'
        })
      }

      case 'balances': {
        const tokensResult = await swapService.getSupportedTokens()
        if (!tokensResult.success || !tokensResult.data) {
          return NextResponse.json(
            { error: 'Ошибка получения токенов', code: 'TOKENS_ERROR' },
            { status: 500 }
          )
        }

        const balances: Record<string, string> = {}
        
        for (const token of tokensResult.data) {
          const balanceResult = await swapService.getTokenBalance(userPublicKey, token.mint)
          if (balanceResult.success && balanceResult.data) {
            balances[token.mint] = balanceResult.data
          } else {
            balances[token.mint] = '0'
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            operation: 'balances',
            balances
          },
          message: 'Балансы токенов получены успешно'
        })
      }

      case 'prices': {
        const pricesResult = await swapService.getTokenPrices()

        if (!pricesResult.success) {
          return NextResponse.json(
            {
              error: pricesResult.error?.message || 'Ошибка получения цен',
              code: 'PRICES_ERROR'
            },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            operation: 'prices',
            prices: pricesResult.data
          },
          message: 'Цены токенов получены успешно'
        })
      }

      default: {
        const [tokensResult, pricesResult] = await Promise.all([
          swapService.getSupportedTokens(),
          swapService.getTokenPrices()
        ])

        const data: any = {
          tokens: tokensResult.success ? tokensResult.data : [],
          prices: pricesResult.success ? pricesResult.data : {}
        }

        if (tokensResult.success && tokensResult.data) {
          const balances: Record<string, string> = {}
          
          for (const token of tokensResult.data) {
            const balanceResult = await swapService.getTokenBalance(userPublicKey, token.mint)
            if (balanceResult.success && balanceResult.data) {
              balances[token.mint] = balanceResult.data
            } else {
              balances[token.mint] = '0'
            }
          }
          
          data.balances = balances
        }

        return NextResponse.json({
          success: true,
          data,
          message: 'Данные для обмена получены успешно'
        })
      }
    }

  } catch (error) {
    
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

// POST /api/defi/swap - Execute token swap
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Parse request body
    const body = await request.json()
    const { inputMint, outputMint, amount, slippageBps } = body


    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры (inputMint, outputMint, amount)', code: 'MISSING_PARAMETERS' },
        { status: 400 }
      )
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Некорректная сумма для обмена', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const swapService = new SwapService(connection)
    const walletService = new CustodialWalletService(prisma)

    // Get user wallet and keypair
    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'Кошелек пользователя не найден', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const userWallet = walletResult.data
    const userKeypair = await walletService.getUserKeypair(userId)
    if (!userKeypair.success || !userKeypair.data) {
      return NextResponse.json(
        { error: 'Ключи пользователя не найдены', code: 'KEYPAIR_NOT_FOUND' },
        { status: 404 }
      )
    }

    const keypair = userKeypair.data

    // ИСПРАВЛЕНО: Получаем актуальный баланс через несколько попыток
    let balanceResult = await swapService.getTokenBalance(new PublicKey(userWallet.publicKey), inputMint)
    
    // Если баланс не получен, пробуем еще раз через секунду (blockchain latency)
    if (!balanceResult.success || !balanceResult.data) {
      console.log('⚠️ First balance check failed, retrying in 1s...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      balanceResult = await swapService.getTokenBalance(new PublicKey(userWallet.publicKey), inputMint)
    }
    
    if (!balanceResult.success || !balanceResult.data) {
      return NextResponse.json(
        { error: 'Не удалось получить актуальный баланс токена', code: 'BALANCE_CHECK_FAILED' },
        { status: 500 }
      )
    }

    const userBalance = BigInt(balanceResult.data)
    const requiredAmount = BigInt(amount)

    console.log(`💰 Balance check: available=${userBalance.toString()}, required=${requiredAmount.toString()}`)

    if (userBalance < requiredAmount) {
      const inputSymbol = inputMint === 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' ? 'TNG' : 
                          inputMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC'
      const availableFormatted = (Number(userBalance) / 1e9).toFixed(6)
      const requiredFormatted = (Number(requiredAmount) / 1e9).toFixed(6)
      
      console.log(`❌ Insufficient balance: ${inputSymbol} - available=${availableFormatted}, required=${requiredFormatted}`)
      
      return NextResponse.json(
        { 
          error: `Недостаточно ${inputSymbol} токенов. Доступно: ${availableFormatted}, требуется: ${requiredFormatted}. Попробуйте обновить страницу и проверить баланс.`, 
          code: 'INSUFFICIENT_BALANCE',
          data: {
            available: userBalance.toString(),
            required: requiredAmount.toString(),
            symbol: inputSymbol
          }
        },
        { status: 400 }
      )
    }

    const swapResult = await swapService.executeSwap(
      keypair,
      inputMint,
      outputMint,
      amount,
      slippageBps || 50
    )

    if (!swapResult.success) {
      return NextResponse.json(
        {
          error: swapResult.error?.message || 'Ошибка выполнения обмена',
          code: 'SWAP_FAILED'
        },
        { status: 500 }
      )
    }

    const balanceCache = TokenBalanceCache.getInstance()
    try {
      balanceCache.clearCache(userWallet.publicKey, inputMint)
      balanceCache.clearCache(userWallet.publicKey, outputMint)
      balanceCache.clearCache(userWallet.publicKey, 'SOL')
    } catch (cacheError) {
    }

    await prisma.onchainTx.create({
      data: {
        userId,
        signature: swapResult.data!.signature,
        purpose: 'DEX_SWAP',
        status: 'CONFIRMED',
        metadata: {
          operation: 'swap',
          inputMint,
          outputMint,
          inputAmount: swapResult.data!.inputAmount,
          outputAmount: swapResult.data!.outputAmount,
          actualOutputAmount: swapResult.data!.actualOutputAmount,
          priceImpact: swapResult.data!.priceImpact,
          fee: swapResult.data!.fee,
          explorerUrl: swapResult.data!.explorerUrl
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        operation: 'swap',
        ...swapResult.data
      },
      message: `Успешно обменяно ${SwapService.formatTokenAmount(swapResult.data!.inputAmount)} на ${SwapService.formatTokenAmount(swapResult.data!.outputAmount)}`
    })

  } catch (error) {
    
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
