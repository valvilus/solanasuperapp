/**
 * Staking Service - On-Chain Staking Operations
 * Handles TNG token staking with rewards on Solana devnet
 * Solana SuperApp
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount,
  createTransferInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token'
import { WalletErrorCode, WalletResult } from '@/lib/wallet/types'
import { createWalletError } from '@/lib/wallet/errors'

// Staking pool configuration
export interface StakingPool {
  id: string
  name: string
  tokenMint: string
  rewardMint: string
  apy: number
  minimumStake: bigint
  lockupPeriod: number // days
  totalStaked: bigint
  totalRewards: bigint
  isActive: boolean
}

export interface StakeResult {
  signature: string
  poolId: string
  stakedAmount: string
  estimatedRewards: string
  unlockDate: Date
  explorerUrl: string
}

export interface UnstakeResult {
  signature: string
  poolId: string
  unstakedAmount: string
  rewardsAmount: string
  explorerUrl: string
}

export interface StakingPosition {
  id: string
  poolId: string
  poolName: string
  userAddress: string
  stakedAmount: bigint
  rewardsEarned: bigint
  rewards: bigint // Alias for UI compatibility
  stakeDate: Date
  createdAt: Date // For UI sorting
  unlockDate: Date
  isActive: boolean
  apy: number
  signature: string | null // Blockchain transaction signature
}

export class StakingService {
  private readonly connection: Connection
  private readonly sponsorKeypair: Keypair
  private readonly tngMint: PublicKey
  
  // Pre-configured staking pools
  private readonly stakingPools: Map<string, StakingPool> = new Map([
    ['tng-basic-pool', {
      id: 'tng-basic-pool',
      name: 'TNG Basic Staking',
      tokenMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      rewardMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      apy: 8.5, // 8.5% APY
      minimumStake: BigInt(100 * 1000000000), // 100 TNG minimum
      lockupPeriod: 0, // No lockup
      totalStaked: BigInt(0),
      totalRewards: BigInt(0),
      isActive: true
    }],
    ['tng-premium-pool', {
      id: 'tng-premium-pool',
      name: 'TNG Premium Staking',
      tokenMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      rewardMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      apy: 15.2, // 15.2% APY
      minimumStake: BigInt(1000 * 1000000000), // 1000 TNG minimum
      lockupPeriod: 30, // 30 days lockup
      totalStaked: BigInt(0),
      totalRewards: BigInt(0),
      isActive: true
    }],
    ['sol-staking-pool', {
      id: 'sol-staking-pool',
      name: 'SOL Liquid Staking',
      tokenMint: 'So11111111111111111111111111111111111111112', // SOL mint
      rewardMint: 'So11111111111111111111111111111111111111112',
      apy: 6.8, // 6.8% APY
      minimumStake: BigInt(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL minimum
      lockupPeriod: 0, // No lockup
      totalStaked: BigInt(0),
      totalRewards: BigInt(0),
      isActive: true
    }]
  ])

  constructor(connection: Connection) {
    this.connection = connection

    // Initialize sponsor keypair
    if (!process.env.SPONSOR_PRIVATE_KEY) {
      throw new Error('SPONSOR_PRIVATE_KEY not found in environment variables')
    }
    
    try {
      let sponsorKey: number[]
      
      // Try to parse as JSON array first
      try {
        sponsorKey = JSON.parse(process.env.SPONSOR_PRIVATE_KEY)
      } catch {
        // If JSON parse fails, try as base64
        try {
          const base64Key = process.env.SPONSOR_PRIVATE_KEY
          const buffer = Buffer.from(base64Key, 'base64')
          sponsorKey = Array.from(buffer)
        } catch {
          throw new Error('SPONSOR_PRIVATE_KEY must be either JSON array or base64 string')
        }
      }
      
      this.sponsorKeypair = Keypair.fromSecretKey(new Uint8Array(sponsorKey))
      console.log(' Staking Service initialized with sponsor:', this.sponsorKeypair.publicKey.toBase58())
    } catch (error) {
      console.error('SPONSOR_PRIVATE_KEY parsing error:', error)
      throw new Error(`Invalid SPONSOR_PRIVATE_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Initialize TNG mint
    // Use fallback TNG mint if environment variable is not set
    const tngMintAddress = process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs'
    this.tngMint = new PublicKey(tngMintAddress)
    console.log(' TNG Mint Address:', this.tngMint.toBase58())
  }

  /**
   * Get all available staking pools from database
   */
  async getStakingPools(): Promise<WalletResult<StakingPool[]>> {
    try {
      // Import prisma inside the method to avoid import issues
      const { prisma } = await import('@/lib/prisma')
      
      const dbPools = await prisma.stakingPool.findMany({
        where: { isActive: true },
        orderBy: [
          { isRecommended: 'desc' },
          { apy: 'desc' }
        ]
      })

      // Convert database models to service interface
      const pools = dbPools.map(pool => ({
        id: pool.id,
        name: pool.name,
        tokenMint: pool.tokenMint,
        rewardMint: pool.rewardMint,
        apy: Number(pool.apy),
        minimumStake: pool.minimumStake,
        lockupPeriod: pool.lockupPeriod,
        totalStaked: pool.totalStaked,
        totalRewards: pool.totalRewards,
        isActive: pool.isActive
      }))

      console.log(` Loaded ${pools.length} staking pools from database`)
      return { success: true, data: pools }
      
    } catch (error) {
      console.error(' Error getting staking pools from database:', error)
      
      // Fallback to hardcoded pools if database fails
      console.log(' Falling back to hardcoded pools...')
      const pools = Array.from(this.stakingPools.values()).filter(pool => pool.isActive)
      return { success: true, data: pools }
    }
  }

  /**
   * Get specific staking pool by ID
   */
  async getStakingPool(poolId: string): Promise<WalletResult<StakingPool>> {
    try {
      const pool = this.stakingPools.get(poolId)
      if (!pool) {
        return {
          success: false,
          error: createWalletError(WalletErrorCode.INVALID_ADDRESS, `Staking pool ${poolId} not found`)
        }
      }

      return { success: true, data: pool }
    } catch (error) {
      console.error(' Error getting staking pool:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get staking pool: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Stake tokens in a pool
   */
  async stakeTokens(
    userKeypair: Keypair,
    poolId: string,
    amount: bigint
  ): Promise<WalletResult<StakeResult>> {
    try {
      console.log(' Staking tokens:', {
        user: userKeypair.publicKey.toBase58(),
        poolId,
        amount: (Number(amount) / 1000000000).toFixed(2) + ' tokens'
      })

      // Get pool configuration FIRST
      const pool = this.stakingPools.get(poolId)
      if (!pool || !pool.isActive) {
        return {
          success: false,
          error: createWalletError(WalletErrorCode.INVALID_ADDRESS, `Staking pool ${poolId} not found or inactive`)
        }
      }

      // КРИТИЧНО: Проверяем реальный TNG баланс пользователя перед стейкингом
      if (pool.tokenMint !== 'So11111111111111111111111111111111111111112') {
        try {
          const mint = new PublicKey(pool.tokenMint)
          const userTokenAddress = await getAssociatedTokenAddress(mint, userKeypair.publicKey)
          
          let userTokenAccount
          try {
            userTokenAccount = await getAccount(this.connection, userTokenAddress)
          } catch (accountError) {
            if (accountError instanceof Error && accountError.name === 'TokenAccountNotFoundError') {
              console.log(' User has no TNG token account - needs to get TNG from faucet first')
              return {
                success: false,
                error: createWalletError(
                  WalletErrorCode.INVALID_ADDRESS,
                  'У вас нет TNG токенов. Получите TNG через faucet сначала.'
                )
              }
            }
            throw accountError
          }
          
          console.log(' User TNG balance check:', {
            tokenAccount: userTokenAddress.toBase58(),
            currentBalance: (Number(userTokenAccount.amount) / 1e9).toFixed(2) + ' TNG',
            requestedAmount: (Number(amount) / 1e9).toFixed(2) + ' TNG',
            hasEnoughBalance: userTokenAccount.amount >= amount
          })
          
          if (userTokenAccount.amount < amount) {
            return {
              success: false,
              error: createWalletError(
                WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
                `Недостаточно TNG токенов. Доступно: ${(Number(userTokenAccount.amount) / 1e9).toFixed(2)} TNG, требуется: ${(Number(amount) / 1e9).toFixed(2)} TNG. Получите больше TNG через faucet.`
              )
            }
          }
        } catch (tokenError) {
          console.error(' Error checking user TNG balance:', tokenError)
          return {
            success: false,
            error: createWalletError(
              WalletErrorCode.INTERNAL_ERROR,
              `Ошибка проверки баланса TNG: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`
            )
          }
        }
      }



      // Validate minimum stake
      if (amount < pool.minimumStake) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
            `Minimum stake is ${Number(pool.minimumStake) / 1000000000} tokens`
          )
        }
      }

      // For this MVP, we'll simulate staking by transferring tokens to a pool address
      // In production, this would interact with a proper staking smart contract
      
      const poolPublicKey = this.generatePoolAddress(poolId)
      
      if (pool.tokenMint === 'So11111111111111111111111111111111111111112') {
        // SOL staking
        const signature = await this.stakeSOL(userKeypair, poolPublicKey, amount)
        
        const unlockDate = new Date()
        unlockDate.setDate(unlockDate.getDate() + pool.lockupPeriod)
        
        const estimatedRewards = this.calculateRewards(amount, pool.apy, pool.lockupPeriod || 365)
        
        const result: StakeResult = {
          signature,
          poolId,
          stakedAmount: (Number(amount) / LAMPORTS_PER_SOL).toString(),
          estimatedRewards: (Number(estimatedRewards) / LAMPORTS_PER_SOL).toString(),
          unlockDate,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        }

        return { success: true, data: result }
        
      } else {
        // SPL Token staking (TNG)
        const signature = await this.stakeSPLToken(userKeypair, poolPublicKey, amount, new PublicKey(pool.tokenMint))
        
        const unlockDate = new Date()
        unlockDate.setDate(unlockDate.getDate() + pool.lockupPeriod)
        
        const estimatedRewards = this.calculateRewards(amount, pool.apy, pool.lockupPeriod || 365)
        
        // Save staking position to database
        try {
          const { prisma } = await import('@/lib/prisma')
          
          // Find user by wallet address
          const user = await prisma.user.findUnique({
            where: { walletAddress: userKeypair.publicKey.toBase58() }
          })
          
          if (user) {
            // Create or update staking position
            await prisma.stakingPosition.upsert({
              where: {
                userId_poolId: {
                  userId: user.id,
                  poolId
                }
              },
              create: {
                userId: user.id,
                poolId,
                stakedAmount: amount,
                rewardsEarned: BigInt(0),
                stakeDate: new Date(),
                unlockDate: pool.lockupPeriod > 0 ? unlockDate : null,
                isActive: true,
                signature, // Blockchain transaction signature
                metadata: {
                  apyAtStake: pool.apy,
                  estimatedRewards: estimatedRewards.toString()
                }
              },
              update: {
                stakedAmount: {
                  increment: amount
                },
                signature, // Update with latest transaction signature
                metadata: {
                  lastStakeSignature: signature,
                  lastStakeDate: new Date().toISOString()
                }
              }
            })
            
            console.log(` Staking position saved to database for user ${user.id}`)
          }
        } catch (dbError) {
          console.error(' Failed to save staking position to database:', dbError)
          // Continue without failing the whole operation
        }

        const result: StakeResult = {
          signature,
          poolId,
          stakedAmount: (Number(amount) / 1000000000).toString(),
          estimatedRewards: (Number(estimatedRewards) / 1000000000).toString(),
          unlockDate,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        }

        return { success: true, data: result }
      }

    } catch (error) {
      console.error(' Staking failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Unstake tokens from a pool
   */
  async unstakeTokens(
    userKeypair: Keypair,
    poolId: string,
    amount?: bigint // If not provided, unstake all
  ): Promise<WalletResult<UnstakeResult>> {
    try {
      console.log(' Unstaking tokens:', {
        user: userKeypair.publicKey.toBase58(),
        poolId,
        amount: amount ? (Number(amount) / 1000000000).toFixed(2) + ' tokens' : 'all'
      })

      // Get pool configuration
      const pool = this.stakingPools.get(poolId)
      if (!pool) {
        return {
          success: false,
          error: createWalletError(WalletErrorCode.INVALID_ADDRESS, `Staking pool ${poolId} not found`)
        }
      }

      // For MVP, simulate unstaking by transferring from pool back to user
      // In production, this would interact with staking smart contract
      
      const poolPublicKey = this.generatePoolAddress(poolId)
      const unstakeAmount = amount || BigInt(1000 * 1000000000) // Default unstake amount for demo
      
      // Calculate rewards (simplified calculation)
      const rewardsAmount = this.calculateRewards(unstakeAmount, pool.apy, 30) // 30 days example
      
      let signature: string
      
      if (pool.tokenMint === 'So11111111111111111111111111111111111111112') {
        // SOL unstaking - for demo, we'll just send SOL from sponsor
        signature = await this.unstakeSOL(userKeypair.publicKey, unstakeAmount + rewardsAmount)
      } else {
        // SPL Token unstaking - for demo, we'll mint rewards
        signature = await this.unstakeSPLToken(userKeypair.publicKey, unstakeAmount, rewardsAmount, new PublicKey(pool.tokenMint))
      }
      
      const result: UnstakeResult = {
        signature,
        poolId,
        unstakedAmount: pool.tokenMint === 'So11111111111111111111111111111111111111112' 
          ? (Number(unstakeAmount) / LAMPORTS_PER_SOL).toString()
          : (Number(unstakeAmount) / 1000000000).toString(),
        rewardsAmount: pool.tokenMint === 'So11111111111111111111111111111111111111112'
          ? (Number(rewardsAmount) / LAMPORTS_PER_SOL).toString() 
          : (Number(rewardsAmount) / 1000000000).toString(),
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }

      return { success: true, data: result }

    } catch (error) {
      console.error(' Unstaking failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Unstaking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Get user's staking positions from database
   */
  async getUserStakingPositions(userAddress: string): Promise<WalletResult<StakingPosition[]>> {
    try {
      // Import prisma inside the method
      const { prisma } = await import('@/lib/prisma')
      
      // Find user by wallet address
      const user = await prisma.user.findUnique({
        where: { walletAddress: userAddress }
      })
      
      if (!user) {
        console.log(` User not found for address: ${userAddress}`)
        return { success: true, data: [] }
      }
      
      // Get user's staking positions from database
      const dbPositions = await prisma.stakingPosition.findMany({
        where: { 
          userId: user.id,
          isActive: true 
        },
        include: {
          pool: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Convert database models to service interface
      const positions: StakingPosition[] = dbPositions.map(pos => ({
        id: pos.id,
        poolId: pos.poolId,
        poolName: pos.pool.name,
        userAddress,
        stakedAmount: pos.stakedAmount,
        rewardsEarned: pos.rewardsEarned,
        rewards: pos.rewardsEarned, // Alias for UI compatibility
        stakeDate: pos.stakeDate,
        createdAt: pos.createdAt, // For UI sorting
        unlockDate: pos.unlockDate,
        isActive: pos.isActive,
        apy: Number(pos.pool.apy),
        signature: pos.signature || null // Blockchain transaction signature
      }))

      console.log(` Loaded ${positions.length} staking positions for user ${userAddress}`)
      return { success: true, data: positions }

    } catch (error) {
      console.error(' Error getting staking positions from database:', error)
      
      // Fallback to empty positions if database fails
      console.log(' Falling back to empty positions...')
      return { success: true, data: [] }
    }
  }

  /**
   * Private helper methods
   */

  private generatePoolAddress(poolId: string): PublicKey {
    // Generate deterministic pool address from poolId
    // For MVP, we use a simple derived address from poolId
    // In production, these would be actual smart contract addresses
    
    try {
      // Create a deterministic but valid address for the pool
      const seed = Buffer.from(`pool_${poolId}`, 'utf8')
      
      // Use System Program ID for PDA generation (more stable)
      const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')
      
      const [poolAddress] = PublicKey.findProgramAddressSync(
        [seed],
        SYSTEM_PROGRAM_ID
      )
      
      console.log(' Generated pool address:', {
        poolId,
        poolAddress: poolAddress.toBase58(),
        seed: seed.toString('hex')
      })
      
      return poolAddress
    } catch (error) {
      console.error(' Error generating pool address:', error)
      // Fallback to sponsor address for demo purposes
      return this.sponsorKeypair.publicKey
    }
  }

  private calculateRewards(amount: bigint, apy: number, days: number): bigint {
    const annualReward = Number(amount) * (apy / 100)
    const dailyReward = annualReward / 365
    const totalReward = dailyReward * days
    return BigInt(Math.floor(totalReward))
  }

  private async stakeSOL(userKeypair: Keypair, poolAddress: PublicKey, amount: bigint): Promise<string> {
    const transaction = new Transaction()
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userKeypair.publicKey,
        toPubkey: poolAddress,
        lamports: Number(amount)
      })
    )

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [userKeypair, this.sponsorKeypair], // Sponsor pays fees
      { commitment: 'confirmed' }
    )

    return signature
  }

  private async stakeSPLToken(
    userKeypair: Keypair,
    poolAddress: PublicKey,
    amount: bigint,
    mint: PublicKey
  ): Promise<string> {
    
    // Get or create user token account
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair, // Sponsor pays fees
      mint,
      userKeypair.publicKey
    )

    // Get or create pool token account (sponsor acts as pool for MVP)
    const poolTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair, // Sponsor pays fees
      mint,
      this.sponsorKeypair.publicKey // Use sponsor as pool owner for MVP
    )

    // Transfer tokens to pool
    const signature = await transfer(
      this.connection,
      this.sponsorKeypair, // Sponsor pays fees
      userTokenAccount.address,
      poolTokenAccount.address,
      userKeypair, // User signs
      amount
    )

    return signature
  }

  private async unstakeSOL(userAddress: PublicKey, amount: bigint): Promise<string> {
    // For demo, sponsor sends SOL to user (simulating unstaking + rewards)
    const transaction = new Transaction()
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: this.sponsorKeypair.publicKey,
        toPubkey: userAddress,
        lamports: Number(amount)
      })
    )

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.sponsorKeypair],
      { commitment: 'confirmed' }
    )

    return signature
  }

  private async unstakeSPLToken(
    userAddress: PublicKey,
    principal: bigint,
    rewards: bigint,
    mint: PublicKey
  ): Promise<string> {
    
    // Get or create user token account
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair,
      mint,
      userAddress
    )

    // Get sponsor token account (source of rewards)
    const sponsorTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair,
      mint,
      this.sponsorKeypair.publicKey
    )

    // Transfer principal + rewards to user
    const signature = await transfer(
      this.connection,
      this.sponsorKeypair,
      sponsorTokenAccount.address,
      userTokenAccount.address,
      this.sponsorKeypair,
      principal + rewards
    )

    return signature
  }

  private async confirmTransaction(signature: string): Promise<void> {
    const confirmation = await this.connection.confirmTransaction(signature, 'confirmed')
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`)
    }
  }
}
