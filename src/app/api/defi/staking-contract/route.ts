import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { Connection, clusterApiUrl, PublicKey, Keypair } from '@solana/web3.js'
import { createStakingContractService } from '@/lib/onchain/staking-contract.service'
import { CustodialWalletService } from '@/lib/wallet/custodial.service'
import { WalletGeneratorService } from '@/lib/wallet/generator.service'
import { prisma } from '@/lib/prisma'
import fs from 'fs'

// Load sponsor keypair for contract operations
const sponsorKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync('./keys/mvp-sponsor-keypair.json', 'utf-8')))
)

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
    const stakingService = createStakingContractService(connection, sponsorKeypair)
    const custodialService = new CustodialWalletService(prisma, { solanaRpcUrl: clusterApiUrl('devnet') })
    const generatorService = new WalletGeneratorService(prisma)

    // Get user wallet
    const userWallet = await custodialService.getOrCreateUserWallet(auth.userId)
    if (!userWallet.success || !userWallet.data) {
      return NextResponse.json({ error: 'Failed to get user wallet' }, { status: 500 })
    }
    const userPublicKey = new PublicKey(userWallet.data.publicKey)

    // Try to initialize pool if it doesn't exist
    try {
      await stakingService.initializePool()
    } catch (error) {
      console.log('Pool initialization skipped:', error instanceof Error ? error.message : String(error))
    }

    // Get staking pool info
    const poolInfo = await stakingService.getStakingPoolInfo()
    
    // Get user stake info
    const userStake = await stakingService.getUserStakeInfo(userPublicKey)
    
    // Get sTNG balance
    const stngBalance = await stakingService.getStngBalance(userPublicKey)
    
    // Calculate potential rewards
    const potentialRewards = await stakingService.calculatePotentialRewards(userPublicKey)

    return NextResponse.json({
      success: true,
      data: {
        pool: poolInfo ? {
          totalStaked: poolInfo.totalStaked.toString(),
          totalStngSupply: poolInfo.totalStngSupply.toString(),
          apy: poolInfo.apyBasisPoints / 100, // Convert basis points to percentage
          isActive: poolInfo.isActive,
          authority: poolInfo.authority.toString()
        } : null,
        userStake: userStake ? {
          stakedAmount: userStake.stakedAmount.toString(),
          stngAmount: userStake.stngAmount.toString(),
          totalRewardsClaimed: userStake.totalRewardsClaimed.toString(),
          stakeTimestamp: userStake.stakeTimestamp,
          lastClaimTimestamp: userStake.lastClaimTimestamp
        } : null,
        stngBalance: stngBalance.toString(),
        potentialRewards: potentialRewards.toString()
      }
    })

  } catch (error) {
    console.error('Smart contract staking API error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения данных смарт-контракта' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { operation, amount, stngAmount } = await request.json()

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
    const stakingService = createStakingContractService(connection, sponsorKeypair)
    const custodialService = new CustodialWalletService(prisma, { solanaRpcUrl: clusterApiUrl('devnet') })
    const generatorService = new WalletGeneratorService(prisma)

    // Get user wallet keypair (properly decrypted)
    const userWallet = await custodialService.getOrCreateUserWallet(auth.userId)
    if (!userWallet.success || !userWallet.data) {
      return NextResponse.json({ error: 'Failed to get user wallet' }, { status: 500 })
    }
    
    // Get decrypted keypair through generator service
    const keypairResult = await generatorService.getUserKeypair(auth.userId)
    if (!keypairResult.success || !keypairResult.data) {
      return NextResponse.json({ error: 'Failed to get user keypair' }, { status: 500 })
    }
    
    const userKeypair = keypairResult.data

    let result

    switch (operation) {
      case 'initialize':
        const initResult = await stakingService.initializePool()
        result = {
          success: true,
          signature: initResult,
          message: 'Pool initialized'
        }
        break

      case 'stake':
        if (!amount || BigInt(amount) <= 0) {
          return NextResponse.json(
            { error: 'Некорректная сумма для стейкинга' },
            { status: 400 }
          )
        }
        result = await stakingService.stakeTokens(userKeypair, BigInt(amount))
        break

      case 'unstake':
        if (!stngAmount || BigInt(stngAmount) <= 0) {
          return NextResponse.json(
            { error: 'Некорректная сумма sTNG для анстейкинга' },
            { status: 400 }
          )
        }
        result = await stakingService.unstakeTokens(userKeypair, BigInt(stngAmount))
        break

      case 'claim':
        result = await stakingService.claimRewards(userKeypair)
        break

      default:
        return NextResponse.json(
          { error: 'Неподдерживаемая операция' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          signature: result.signature,
          stngAmount: result.stngAmount?.toString(),
          tngAmount: (result as any).tngAmount?.toString(),
          rewards: (result as any).rewards?.toString(),
          explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
        }
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Ошибка выполнения операции' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Smart contract staking operation error:', error)
    return NextResponse.json(
      { error: 'Ошибка выполнения операции смарт-контракта' },
      { status: 500 }
    )
  }
})
