/**
 * DeFi Farming API
 * GET/POST /api/defi/farming
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { FarmingService } from '@/lib/onchain/farming.service'
import { TngFarmingContractService } from '@/lib/onchain/tng-farming-contract.service'

// Создаем глобальный экземпляр для переиспользования
let globalTngFarmingService: TngFarmingContractService | null = null

function getTngFarmingService(): TngFarmingContractService {
  if (!globalTngFarmingService) {
    globalTngFarmingService = new TngFarmingContractService()
  }
  return globalTngFarmingService
}
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/defi/farming - Get farming pools and user positions
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const farmingService = new FarmingService(connection)
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

    const poolsResult = await farmingService.getFarmingPools()
    if (!poolsResult.success) {
      return NextResponse.json(
        { 
          error: poolsResult.error?.message || 'Ошибка получения пулов фарминга',
          code: 'FARMING_POOLS_ERROR'
        },
        { status: 500 }
      )
    }

    const positionsResult = await farmingService.getUserFarmingPositions(userWallet.publicKey)
    if (!positionsResult.success) {
      return NextResponse.json(
        { 
          error: positionsResult.error?.message || 'Ошибка получения позиций фарминга',
          code: 'FARMING_POSITIONS_ERROR'
        },
        { status: 500 }
      )
    }

    const totalLiquidity = positionsResult.data?.reduce((sum, pos) => sum + pos.currentValue, 0) || 0
    const totalRewards = positionsResult.data?.reduce((sum, pos) => sum + Number(pos.rewardsEarned) / 1000000000, 0) || 0
    const averageApy = positionsResult.data && positionsResult.data.length > 0
      ? positionsResult.data.reduce((sum, pos) => sum + pos.apy, 0) / positionsResult.data.length
      : 0

    const serializeBigIntFields = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (Array.isArray(obj)) return obj.map(serializeBigIntFields)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = serializeBigIntFields(value)
        }
        return result
      }
      return obj
    }

    return NextResponse.json({
      success: true,
      data: serializeBigIntFields({
        pools: poolsResult.data || [],
        positions: (positionsResult.data || []).map(pos => ({
          poolId: pos.poolId,
          lpTokens: typeof pos.lpTokens === 'bigint' ? pos.lpTokens.toString() : (pos.lpTokens as any)?.toString() || '0',
          tokenAAmount: typeof pos.tokenAAmount === 'bigint' ? (Number(pos.tokenAAmount) / Math.pow(10, 9)).toString() : (Number(pos.tokenAAmount || 0) / Math.pow(10, 9)).toString(),
          tokenBAmount: typeof pos.tokenBAmount === 'bigint' ? (Number(pos.tokenBAmount) / Math.pow(10, 9)).toString() : (Number(pos.tokenBAmount || 0) / Math.pow(10, 9)).toString(),
          rewardsEarned: typeof pos.rewardsEarned === 'bigint' ? (Number(pos.rewardsEarned) / Math.pow(10, 9)).toString() : (Number(pos.rewardsEarned || 0) / Math.pow(10, 9)).toString(),
          depositDate: pos.depositDate instanceof Date ? pos.depositDate.toISOString() : pos.depositDate,
          currentValue: pos.currentValue,
          impermanentLoss: pos.impermanentLoss,
          apy: pos.apy,
          isActive: pos.isActive
        })) || [],
        summary: {
          totalLiquidity,
          totalRewards,
          averageApy,
          activePositions: positionsResult.data?.filter(pos => pos.isActive).length || 0
        }
      }),
      message: 'Данные фарминга получены успешно'
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

// POST /api/defi/farming - Add or remove liquidity
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Parse request body
    const body = await request.json()
    const { operation, poolId, tokenAAmount, tokenBAmount, lpTokenAmount, slippage } = body


    if (!operation || !poolId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры (operation, poolId)', code: 'MISSING_PARAMETERS' },
        { status: 400 }
      )
    }

    if (operation === 'add' && (!tokenAAmount || !tokenBAmount || tokenAAmount <= 0 || tokenBAmount <= 0)) {
      return NextResponse.json(
        { error: 'Некорректные суммы для добавления ликвидности', code: 'INVALID_AMOUNTS' },
        { status: 400 }
      )
    }

    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const farmingService = new FarmingService(connection)
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

    // Execute farming operation
    switch (operation) {
      case 'add': {
        const TNG_MINT = 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs'
        const SOL_MINT = 'So11111111111111111111111111111111111111112'
        const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        
        console.log('🎯 Processing farming operation:', {
          poolId,
          tokenAAmount,
          tokenBAmount,
          operation
        });
        
        const [tokenAMint, tokenBMint] = poolId === 'tng-usdc-lp' ? 
          [TNG_MINT, USDC_MINT] : [TNG_MINT, SOL_MINT]
        
        const tngAmount = Math.floor(parseFloat(tokenAAmount) * Math.pow(10, 9))
        const otherAmount = Math.floor(parseFloat(tokenBAmount) * Math.pow(10, poolId === 'tng-usdc-lp' ? 6 : 9))
        
        console.log('🔄 Token mapping result:', {
          poolId,
          detectedPool: poolId === 'tng-usdc-lp' ? 'TNG-USDC' : 'TNG-SOL',
          tokenAMint,
          tokenBMint,
          tngAmount,
          otherAmount
        });
        
        
        let farmResult;
        try {
          // Конвертируем процентный slippage в basis points (5% = 500 bps)
          const slippageBps = slippage ? Math.floor(slippage * 100) : 500 // По умолчанию 5%
          
          farmResult = await getTngFarmingService().addLiquidity(
            keypair,
            new PublicKey(tokenAMint),
            new PublicKey(tokenBMint),
            tngAmount,
            otherAmount,
            0, // minimumLpTokens
            slippageBps
          )
        } catch (contractError) {
          console.error('🔴 Farming contract error:', contractError)
          
          // Проверяем тип ошибки для более понятного сообщения
          let errorMessage = contractError instanceof Error ? contractError.message : String(contractError)
          
          if (errorMessage.includes('not properly initialized')) {
            errorMessage = 'Сервис фарминга не инициализирован. Проверьте конфигурацию сервера.'
          } else if (errorMessage.includes('null') && errorMessage.includes('methods')) {
            errorMessage = 'Ошибка инициализации smart-contract программы. Попробуйте позже.'
          }
          
          return NextResponse.json(
            {
              error: `Ошибка фарминг контракта: ${errorMessage}`,
              code: 'CONTRACT_ERROR',
              details: process.env.NODE_ENV === 'development' ? contractError : undefined
            },
            { status: 500 }
          )
        }
        

        // Create transaction record
        await prisma.onchainTx.create({
          data: {
            userId,
            signature: farmResult.signature,
            purpose: 'DEX_SWAP',
            status: 'CONFIRMED',
            metadata: {
              operation: 'add_liquidity',
              poolId,
              tokenAAmount: tngAmount.toString(),
              tokenBAmount: otherAmount.toString(),
              slippage: slippage || 5.0,
              explorerUrl: `https://explorer.solana.com/tx/${farmResult.signature}?cluster=devnet`
            }
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            operation: 'add',
            signature: farmResult.signature,
            poolId,
            tokenAAmount: tngAmount.toString(),
            tokenBAmount: otherAmount.toString(),
            explorerUrl: `https://explorer.solana.com/tx/${farmResult.signature}?cluster=devnet`
          },
          message: `Успешно добавлена ликвидность в пул ${poolId}`
        })
      }

      case 'remove': {
        const lpTokenAmountBig = lpTokenAmount ? BigInt(Math.floor(parseFloat(lpTokenAmount) * Math.pow(10, 9))) : undefined
        
        const unfarmResult = await farmingService.removeLiquidity(keypair, poolId, lpTokenAmountBig)
        
        if (!unfarmResult.success) {
          return NextResponse.json(
            {
              error: unfarmResult.error?.message || 'Ошибка удаления ликвидности',
              code: 'REMOVE_LIQUIDITY_FAILED'
            },
            { status: 500 }
          )
        }

        // Create transaction record
        await prisma.onchainTx.create({
          data: {
            userId,
            signature: unfarmResult.data!.signature,
            purpose: 'DEX_SWAP',
            status: 'CONFIRMED',
            metadata: {
              operation: 'remove_liquidity',
              poolId,
              lpTokensBurned: unfarmResult.data!.lpTokensBurned,
              tokenAReceived: unfarmResult.data!.tokenAReceived,
              tokenBReceived: unfarmResult.data!.tokenBReceived,
              rewardsReceived: unfarmResult.data!.rewardsReceived,
              explorerUrl: unfarmResult.data!.explorerUrl
            }
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            operation: 'remove',
            ...unfarmResult.data
          },
          message: `Успешно удалена ликвидность из пула ${poolId}`
        })
      }

      default:
        return NextResponse.json(
          { error: 'Неизвестная операция фарминга', code: 'UNKNOWN_OPERATION' },
          { status: 400 }
        )
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
