/**
 * DeFi Staking API
 * GET/POST /api/defi/staking
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { StakingService } from '@/lib/onchain/staking.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/defi/staking - Get staking pools and user positions
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const stakingService = new StakingService(connection)
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

    // Get staking pools
    const poolsResult = await stakingService.getStakingPools()
    if (!poolsResult.success) {
      return NextResponse.json(
        { 
          error: poolsResult.error?.message || 'Ошибка получения пулов стейкинга',
          code: 'STAKING_POOLS_ERROR'
        },
        { status: 500 }
      )
    }

    // Get user staking positions
    const positionsResult = await stakingService.getUserStakingPositions(userWallet.publicKey)
    if (!positionsResult.success) {
      return NextResponse.json(
        { 
          error: positionsResult.error?.message || 'Ошибка получения позиций стейкинга',
          code: 'STAKING_POSITIONS_ERROR'
        },
        { status: 500 }
      )
    }

    // Convert BigInt values to strings for JSON serialization
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
        positions: positionsResult.data?.map(pos => ({
          id: pos.id,
          poolId: pos.poolId,
          poolName: pos.poolName,
          userAddress: pos.userAddress,
          stakedAmount: typeof pos.stakedAmount === 'bigint' ? pos.stakedAmount.toString() : (pos.stakedAmount as any)?.toString() || '0',
          rewardsEarned: typeof pos.rewardsEarned === 'bigint' ? pos.rewardsEarned.toString() : (pos.rewardsEarned as any)?.toString() || '0',
          rewards: typeof pos.rewardsEarned === 'bigint' ? pos.rewardsEarned.toString() : (pos.rewardsEarned as any)?.toString() || '0',
          stakeDate: pos.stakeDate instanceof Date ? pos.stakeDate.toISOString() : pos.stakeDate,
          createdAt: pos.createdAt instanceof Date ? pos.createdAt.toISOString() : pos.createdAt,
          unlockDate: pos.unlockDate instanceof Date ? pos.unlockDate.toISOString() : pos.unlockDate,
          isActive: pos.isActive,
          apy: pos.apy,
          signature: pos.signature
        })) || [],
        totalStaked: positionsResult.data?.reduce((sum, pos) => {
          const amount = typeof pos.stakedAmount === 'bigint' ? Number(pos.stakedAmount) : Number(pos.stakedAmount || 0)
          return sum + amount / 1000000000
        }, 0) || 0,
        totalRewards: positionsResult.data?.reduce((sum, pos) => {
          const amount = typeof pos.rewardsEarned === 'bigint' ? Number(pos.rewardsEarned) : Number(pos.rewardsEarned || 0)
          return sum + amount / 1000000000
        }, 0) || 0
      }),
      message: 'Данные стейкинга получены успешно'
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

// POST /api/defi/staking - Stake or unstake tokens
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Parse request body
    const body = await request.json()
    const { operation, poolId, amount } = body


    // Validate required parameters
    if (!operation || !poolId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры (operation, poolId)', code: 'MISSING_PARAMETERS' },
        { status: 400 }
      )
    }

    if (operation === 'stake' && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: 'Некорректная сумма для стейкинга', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    // Initialize services
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const stakingService = new StakingService(connection)
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

    // Execute staking operation
    switch (operation) {
      case 'stake': {
        // Convert amount to bigint (assuming 9 decimals for tokens)
        const stakeAmount = BigInt(Math.floor(parseFloat(amount) * 1000000000))
        
        const stakeResult = await stakingService.stakeTokens(keypair, poolId, stakeAmount)
        
        if (!stakeResult.success) {
          return NextResponse.json(
            {
              error: stakeResult.error?.message || 'Ошибка стейкинга',
              code: 'STAKING_FAILED'
            },
            { status: 500 }
          )
        }

        // Create transaction record
        await prisma.onchainTx.create({
          data: {
            userId,
            signature: stakeResult.data!.signature,
            purpose: 'STAKE',
            status: 'CONFIRMED',
            metadata: {
              operation: 'stake',
              poolId,
              amount: stakeResult.data!.stakedAmount,
              estimatedRewards: stakeResult.data!.estimatedRewards,
              unlockDate: stakeResult.data!.unlockDate.toISOString(),
              explorerUrl: stakeResult.data!.explorerUrl
            }
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            operation: 'stake',
            ...stakeResult.data
          },
          message: `Успешно застейкано ${stakeResult.data!.stakedAmount} токенов в пул ${poolId}`
        })
      }

      case 'unstake': {
        const unstakeAmount = amount ? BigInt(Math.floor(parseFloat(amount) * 1000000000)) : undefined
        
        const unstakeResult = await stakingService.unstakeTokens(keypair, poolId, unstakeAmount)
        
        if (!unstakeResult.success) {
          return NextResponse.json(
            {
              error: unstakeResult.error?.message || 'Ошибка анстейкинга',
              code: 'UNSTAKING_FAILED'
            },
            { status: 500 }
          )
        }

        // Create transaction record
        await prisma.onchainTx.create({
          data: {
            userId,
            signature: unstakeResult.data!.signature,
            purpose: 'UNSTAKE',
            status: 'CONFIRMED',
            metadata: {
              operation: 'unstake',
              poolId,
              unstakedAmount: unstakeResult.data!.unstakedAmount,
              rewardsAmount: unstakeResult.data!.rewardsAmount,
              explorerUrl: unstakeResult.data!.explorerUrl
            }
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            operation: 'unstake',
            ...unstakeResult.data
          },
          message: `Успешно анстейкано ${unstakeResult.data!.unstakedAmount} токенов с наградами ${unstakeResult.data!.rewardsAmount}`
        })
      }

      default:
        return NextResponse.json(
          { error: 'Неизвестная операция стейкинга', code: 'UNKNOWN_OPERATION' },
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
