/**
 * DeFi Integration Service - Интеграция DeFi операций с custodial wallet системой
 * Solana SuperApp - Связывает DeFi сервисы с пользователями и их кошельками
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { StakingService, StakingPool, StakeResult, UnstakeResult, StakingPosition } from '@/lib/onchain/staking.service'
import { WalletGeneratorService } from './generator.service'
import { WalletResult, WalletErrorCode } from './types'
import { PrismaClient } from '@prisma/client'

export interface UserStakeRequest {
  userId: string
  poolId: string
  amount: number // In human-readable format (e.g., 100.5 for 100.5 TNG)
}

export interface UserUnstakeRequest {
  userId: string
  poolId: string
  amount?: number // Optional - if not provided, unstake all
}

export interface UserStakingData {
  pools: StakingPool[]
  positions: UserStakingPosition[]
  summary: {
    totalStaked: number
    totalRewards: number
    averageApy: number
    activePositions: number
  }
}

export interface UserStakingPosition {
  poolId: string
  poolName: string
  tokenSymbol: string
  stakedAmount: number
  rewardsEarned: number
  apy: number
  stakeDate: Date
  unlockDate: Date
  isActive: boolean
  canUnstake: boolean
}

export class DeFiIntegrationService {
  private readonly stakingService: StakingService
  private readonly walletGenerator: WalletGeneratorService
  private readonly prisma: PrismaClient

  constructor(connection: Connection, prisma: PrismaClient) {
    this.stakingService = new StakingService(connection)
    this.walletGenerator = new WalletGeneratorService(prisma)
    this.prisma = prisma
  }

  /**
   * Get complete staking data for user
   */
  async getUserStakingData(userId: string): Promise<WalletResult<UserStakingData>> {
    try {
      console.log(' Getting user staking data for:', userId)

      // Get user wallet
      const walletResult = await this.walletGenerator.getUserCustodialWallet(userId)
      if (!walletResult.success || !walletResult.data) {
        return { success: false, error: walletResult.error }
      }

      const userWallet = walletResult.data

      // Get available staking pools
      const poolsResult = await this.stakingService.getStakingPools()
      if (!poolsResult.success || !poolsResult.data) {
        return { success: false, error: poolsResult.error }
      }

      // Get user staking positions
      const positionsResult = await this.stakingService.getUserStakingPositions(userWallet.publicKey)
      if (!positionsResult.success || !positionsResult.data) {
        return { success: false, error: positionsResult.error }
      }

      // Convert positions to user-friendly format
      const userPositions = positionsResult.data.map(position => {
        const pool = poolsResult.data!.find(p => p.id === position.poolId)
        
        return {
          poolId: position.poolId,
          poolName: pool?.name || 'Unknown Pool',
          tokenSymbol: this.getTokenSymbol(pool?.tokenMint || ''),
          stakedAmount: this.formatTokenAmount(position.stakedAmount, pool?.tokenMint),
          rewardsEarned: this.formatTokenAmount(position.rewardsEarned, pool?.rewardMint),
          apy: position.apy,
          stakeDate: position.stakeDate,
          unlockDate: position.unlockDate,
          isActive: position.isActive,
          canUnstake: position.unlockDate <= new Date()
        }
      })

      // Calculate summary
      const totalStaked = userPositions.reduce((sum, pos) => sum + pos.stakedAmount, 0)
      const totalRewards = userPositions.reduce((sum, pos) => sum + pos.rewardsEarned, 0)
      const activePositions = userPositions.filter(pos => pos.isActive).length
      const averageApy = activePositions > 0 
        ? userPositions.filter(pos => pos.isActive).reduce((sum, pos) => sum + pos.apy, 0) / activePositions
        : 0

      const stakingData: UserStakingData = {
        pools: poolsResult.data,
        positions: userPositions,
        summary: {
          totalStaked,
          totalRewards,
          averageApy,
          activePositions
        }
      }

      console.log(' User staking data retrieved:', {
        userId,
        poolsCount: poolsResult.data.length,
        positionsCount: userPositions.length,
        totalStaked,
        totalRewards
      })

      return { success: true, data: stakingData }

    } catch (error) {
      console.error(' Error getting user staking data:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.INTERNAL_ERROR,
          message: `Failed to get staking data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Stake tokens for user
   */
  async stakeTokensForUser(request: UserStakeRequest): Promise<WalletResult<StakeResult>> {
    try {
      console.log(' Staking tokens for user:', {
        userId: request.userId,
        poolId: request.poolId,
        amount: request.amount
      })

      // Get user keypair
      const keypairResult = await this.walletGenerator.getUserKeypair(request.userId)
      if (!keypairResult.success || !keypairResult.data) {
        return { success: false, error: keypairResult.error }
      }

      const userKeypair = keypairResult.data

      // Get pool info to determine token decimals
      const poolResult = await this.stakingService.getStakingPool(request.poolId)
      if (!poolResult.success || !poolResult.data) {
        return { success: false, error: poolResult.error }
      }

      const pool = poolResult.data

      // Convert amount to bigint with proper decimals
      const decimals = this.getTokenDecimals(pool.tokenMint)
      const stakeAmount = BigInt(Math.floor(request.amount * Math.pow(10, decimals)))

      // Execute staking
      const stakeResult = await this.stakingService.stakeTokens(userKeypair, request.poolId, stakeAmount)
      
      if (!stakeResult.success) {
        return { success: false, error: stakeResult.error }
      }

      // Record transaction in database
      await this.recordStakingTransaction(
        request.userId,
        'STAKE',
        stakeResult.data!.signature,
        {
          poolId: request.poolId,
          amount: request.amount,
          estimatedRewards: parseFloat(stakeResult.data!.estimatedRewards),
          unlockDate: stakeResult.data!.unlockDate
        }
      )

      console.log(' Staking successful:', {
        userId: request.userId,
        signature: stakeResult.data!.signature,
        amount: stakeResult.data!.stakedAmount
      })

      return stakeResult

    } catch (error) {
      console.error(' Error staking tokens:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.INTERNAL_ERROR,
          message: `Staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Unstake tokens for user
   */
  async unstakeTokensForUser(request: UserUnstakeRequest): Promise<WalletResult<UnstakeResult>> {
    try {
      console.log(' Unstaking tokens for user:', {
        userId: request.userId,
        poolId: request.poolId,
        amount: request.amount
      })

      // Get user keypair
      const keypairResult = await this.walletGenerator.getUserKeypair(request.userId)
      if (!keypairResult.success || !keypairResult.data) {
        return { success: false, error: keypairResult.error }
      }

      const userKeypair = keypairResult.data

      // Convert amount to bigint if provided
      let unstakeAmount: bigint | undefined
      if (request.amount) {
        const poolResult = await this.stakingService.getStakingPool(request.poolId)
        if (poolResult.success && poolResult.data) {
          const decimals = this.getTokenDecimals(poolResult.data.tokenMint)
          unstakeAmount = BigInt(Math.floor(request.amount * Math.pow(10, decimals)))
        }
      }

      // Execute unstaking
      const unstakeResult = await this.stakingService.unstakeTokens(userKeypair, request.poolId, unstakeAmount)
      
      if (!unstakeResult.success) {
        return { success: false, error: unstakeResult.error }
      }

      // Record transaction in database
      await this.recordStakingTransaction(
        request.userId,
        'UNSTAKE',
        unstakeResult.data!.signature,
        {
          poolId: request.poolId,
          unstakedAmount: parseFloat(unstakeResult.data!.unstakedAmount),
          rewardsAmount: parseFloat(unstakeResult.data!.rewardsAmount)
        }
      )

      console.log(' Unstaking successful:', {
        userId: request.userId,
        signature: unstakeResult.data!.signature,
        amount: unstakeResult.data!.unstakedAmount,
        rewards: unstakeResult.data!.rewardsAmount
      })

      return unstakeResult

    } catch (error) {
      console.error(' Error unstaking tokens:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.INTERNAL_ERROR,
          message: `Unstaking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Get staking pool details
   */
  async getStakingPool(poolId: string): Promise<WalletResult<StakingPool>> {
    return await this.stakingService.getStakingPool(poolId)
  }

  /**
   * Get all available staking pools
   */
  async getStakingPools(): Promise<WalletResult<StakingPool[]>> {
    return await this.stakingService.getStakingPools()
  }

  /**
   * Private helper methods
   */

  private getTokenSymbol(mint: string): string {
    switch (mint) {
      case 'So11111111111111111111111111111111111111112':
        return 'SOL'
      case process.env.TNG_MINT_ADDRESS:
        return 'TNG'
      default:
        return 'UNKNOWN'
    }
  }

  private getTokenDecimals(mint: string): number {
    switch (mint) {
      case 'So11111111111111111111111111111111111111112':
        return 9 // SOL has 9 decimals
      case process.env.TNG_MINT_ADDRESS:
        return 9 // TNG has 9 decimals
      default:
        return 9 // Default to 9 decimals
    }
  }

  private formatTokenAmount(amount: bigint, mint?: string): number {
    const decimals = this.getTokenDecimals(mint || '')
    return Number(amount) / Math.pow(10, decimals)
  }

  private async recordStakingTransaction(
    userId: string,
    operation: 'STAKE' | 'UNSTAKE',
    signature: string,
    metadata: any
  ): Promise<void> {
    try {
      await this.prisma.onchainTx.create({
        data: {
          userId,
          signature,
          purpose: operation === 'STAKE' ? 'STAKE' : 'UNSTAKE',
          status: 'CONFIRMED',
          metadata: {
            operation: operation.toLowerCase(),
            ...metadata,
            timestamp: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      console.error(' Error recording staking transaction:', error)
      // Don't throw - transaction was successful even if recording failed
    }
  }
}
