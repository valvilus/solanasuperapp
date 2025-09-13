/**
 * Farming Service - Yield Farming Operations
 * Handles liquidity provision and yield farming on Solana devnet
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

// Farming pool configuration
export interface FarmingPool {
  id: string
  name: string
  tokenA: string
  tokenB: string
  tokenASymbol: string
  tokenBSymbol: string
  apy: number
  tvl: number
  volume24h: number
  fees24h: number
  fee: number
  isStable: boolean
  minimumDeposit: bigint
  totalLiquidity: bigint
  totalRewards: bigint
  isActive: boolean
}

export interface FarmResult {
  signature: string
  poolId: string
  tokenAAmount: string
  tokenBAmount: string
  lpTokensReceived: string
  estimatedApy: number
  explorerUrl: string
}

export interface UnfarmResult {
  signature: string
  poolId: string
  lpTokensBurned: string
  tokenAReceived: string
  tokenBReceived: string
  rewardsReceived: string
  explorerUrl: string
}

export interface FarmingPosition {
  poolId: string
  userAddress: string
  lpTokens: bigint
  tokenAAmount: bigint
  tokenBAmount: bigint
  rewardsEarned: bigint
  depositDate: Date
  currentValue: number
  impermanentLoss: number
  apy: number
  isActive: boolean
}

export class FarmingService {
  private readonly connection: Connection
  private readonly sponsorKeypair: Keypair
  private readonly tngMint: PublicKey
  
  // Pre-configured farming pools
  private readonly farmingPools: Map<string, FarmingPool> = new Map([
    ['sol-tng-pool', {
      id: 'sol-tng-pool',
      name: 'SOL-TNG LP',
      tokenA: 'So11111111111111111111111111111111111111112', // SOL
      tokenB: process.env.TNG_MINT_ADDRESS || '',
      tokenASymbol: 'SOL',
      tokenBSymbol: 'TNG',
      apy: 45.7, // High APY for TNG pair
      tvl: 125000, // $125k TVL
      volume24h: 25000,
      fees24h: 125,
      fee: 0.25, // 0.25% fee
      isStable: false,
      minimumDeposit: BigInt(0.1 * LAMPORTS_PER_SOL), // 0.1 SOL minimum
      totalLiquidity: BigInt(0),
      totalRewards: BigInt(0),
      isActive: true
    }],
    ['tng-usdc-pool', {
      id: 'tng-usdc-pool',
      name: 'TNG-USDC LP',
      tokenA: process.env.TNG_MINT_ADDRESS || '',
      tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      tokenASymbol: 'TNG',
      tokenBSymbol: 'USDC',
      apy: 32.4, // Moderate APY for stable pair
      tvl: 85000, // $85k TVL
      volume24h: 15000,
      fees24h: 75,
      fee: 0.25,
      isStable: true, // More stable pair
      minimumDeposit: BigInt(100 * 1000000000), // 100 TNG minimum
      totalLiquidity: BigInt(0),
      totalRewards: BigInt(0),
      isActive: true
    }],
    ['sol-usdc-pool', {
      id: 'sol-usdc-pool',
      name: 'SOL-USDC LP',
      tokenA: 'So11111111111111111111111111111111111111112', // SOL
      tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      tokenASymbol: 'SOL',
      tokenBSymbol: 'USDC',
      apy: 18.9, // Standard APY for major pair
      tvl: 450000, // $450k TVL
      volume24h: 120000,
      fees24h: 600,
      fee: 0.25,
      isStable: false,
      minimumDeposit: BigInt(0.05 * LAMPORTS_PER_SOL), // 0.05 SOL minimum
      totalLiquidity: BigInt(0),
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
      console.log(' Farming Service initialized with sponsor:', this.sponsorKeypair.publicKey.toBase58())
    } catch (error) {
      console.error('SPONSOR_PRIVATE_KEY parsing error:', error)
      throw new Error(`Invalid SPONSOR_PRIVATE_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Initialize TNG mint
    if (!process.env.TNG_MINT_ADDRESS) {
      throw new Error('TNG_MINT_ADDRESS not found in environment variables')
    }
    
    this.tngMint = new PublicKey(process.env.TNG_MINT_ADDRESS)
    console.log(' TNG Mint Address:', this.tngMint.toBase58())
  }

  /**
   * Get all available farming pools
   */
  async getFarmingPools(): Promise<WalletResult<FarmingPool[]>> {
    try {
      const pools = Array.from(this.farmingPools.values()).filter(pool => pool.isActive)
      return { success: true, data: pools }
    } catch (error) {
      console.error(' Error getting farming pools:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get farming pools: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Get specific farming pool by ID
   */
  async getFarmingPool(poolId: string): Promise<WalletResult<FarmingPool>> {
    try {
      const pool = this.farmingPools.get(poolId)
      if (!pool) {
        return {
          success: false,
          error: createWalletError(WalletErrorCode.INVALID_ADDRESS, `Farming pool ${poolId} not found`)
        }
      }

      return { success: true, data: pool }
    } catch (error) {
      console.error(' Error getting farming pool:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get farming pool: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Add liquidity to farming pool
   */
  async addLiquidity(
    userKeypair: Keypair,
    poolId: string,
    tokenAAmount: bigint,
    tokenBAmount: bigint
  ): Promise<WalletResult<FarmResult>> {
    try {
      console.log(' Adding liquidity:', {
        user: userKeypair.publicKey.toBase58(),
        poolId,
        tokenAAmount: tokenAAmount.toString(),
        tokenBAmount: tokenBAmount.toString()
      })

      // Get pool configuration
      const pool = this.farmingPools.get(poolId)
      if (!pool || !pool.isActive) {
        return {
          success: false,
          error: createWalletError(WalletErrorCode.INVALID_ADDRESS, `Farming pool ${poolId} not found or inactive`)
        }
      }

      // For MVP, simulate adding liquidity by transferring tokens to pool address
      // In production, this would interact with a proper AMM like Raydium or Orca
      
      const poolPublicKey = this.generatePoolAddress(poolId)
      
      // Execute liquidity provision (simplified)
      const signature = await this.provideLiquidity(
        userKeypair,
        poolPublicKey,
        new PublicKey(pool.tokenA),
        new PublicKey(pool.tokenB),
        tokenAAmount,
        tokenBAmount
      )
      
      // Calculate LP tokens received (simplified calculation)
      const lpTokensReceived = this.calculateLPTokens(tokenAAmount, tokenBAmount, pool)
      
      const result: FarmResult = {
        signature,
        poolId,
        tokenAAmount: this.formatTokenAmount(tokenAAmount, pool.tokenA).toString(),
        tokenBAmount: this.formatTokenAmount(tokenBAmount, pool.tokenB).toString(),
        lpTokensReceived: lpTokensReceived.toString(),
        estimatedApy: pool.apy,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }

      return { success: true, data: result }

    } catch (error) {
      console.error(' Add liquidity failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Add liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Remove liquidity from farming pool
   */
  async removeLiquidity(
    userKeypair: Keypair,
    poolId: string,
    lpTokenAmount?: bigint
  ): Promise<WalletResult<UnfarmResult>> {
    try {
      console.log(' Removing liquidity:', {
        user: userKeypair.publicKey.toBase58(),
        poolId,
        lpTokenAmount: lpTokenAmount?.toString() || 'all'
      })

      // Get pool configuration
      const pool = this.farmingPools.get(poolId)
      if (!pool) {
        return {
          success: false,
          error: createWalletError(WalletErrorCode.INVALID_ADDRESS, `Farming pool ${poolId} not found`)
        }
      }

      // For MVP, simulate removing liquidity
      const poolPublicKey = this.generatePoolAddress(poolId)
      const removeLpAmount = lpTokenAmount || BigInt(1000000000) // Default amount for demo
      
      // Calculate tokens to receive back (simplified)
      const { tokenAReceived, tokenBReceived, rewardsReceived } = this.calculateWithdrawal(removeLpAmount, pool)
      
      // Execute liquidity removal
      const signature = await this.withdrawLiquidity(
        userKeypair.publicKey,
        poolPublicKey,
        new PublicKey(pool.tokenA),
        new PublicKey(pool.tokenB),
        tokenAReceived,
        tokenBReceived,
        rewardsReceived
      )
      
      const result: UnfarmResult = {
        signature,
        poolId,
        lpTokensBurned: removeLpAmount.toString(),
        tokenAReceived: this.formatTokenAmount(tokenAReceived, pool.tokenA).toString(),
        tokenBReceived: this.formatTokenAmount(tokenBReceived, pool.tokenB).toString(),
        rewardsReceived: this.formatTokenAmount(rewardsReceived, pool.tokenA).toString(), // Rewards in tokenA
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }

      return { success: true, data: result }

    } catch (error) {
      console.error(' Remove liquidity failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Remove liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Get user's farming positions
   */
  async getUserFarmingPositions(userAddress: string): Promise<WalletResult<FarmingPosition[]>> {
    try {
      // For MVP, return mock data based on user address
      // In production, this would query the blockchain for actual LP positions
      const mockPositions: FarmingPosition[] = [
        {
          poolId: 'sol-tng-pool',
          userAddress,
          lpTokens: BigInt(2.5 * 1000000000), // 2.5 LP tokens
          tokenAAmount: BigInt(1.25 * LAMPORTS_PER_SOL), // 1.25 SOL
          tokenBAmount: BigInt(567 * 1000000000), // 567 TNG
          rewardsEarned: BigInt(45.3 * 1000000000), // 45.3 TNG rewards
          depositDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
          currentValue: 1247.89,
          impermanentLoss: -2.3, // -2.3% IL
          apy: 45.7,
          isActive: true
        },
        {
          poolId: 'tng-usdc-pool',
          userAddress,
          lpTokens: BigInt(1.8 * 1000000000), // 1.8 LP tokens
          tokenAAmount: BigInt(800 * 1000000000), // 800 TNG
          tokenBAmount: BigInt(1.78 * 1000000), // 1.78 USDC
          rewardsEarned: BigInt(23.7 * 1000000000), // 23.7 TNG rewards
          depositDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
          currentValue: 567.45,
          impermanentLoss: -0.8, // -0.8% IL (stable pair)
          apy: 32.4,
          isActive: true
        }
      ]

      return { success: true, data: mockPositions }

    } catch (error) {
      console.error(' Error getting farming positions:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get farming positions: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Private helper methods
   */

  private generatePoolAddress(poolId: string): PublicKey {
    // Generate deterministic pool address from poolId
    const seed = Buffer.from(`farming_pool_${poolId}`, 'utf8')
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [seed],
      this.sponsorKeypair.publicKey
    )
    return poolAddress
  }

  private calculateLPTokens(tokenAAmount: bigint, tokenBAmount: bigint, pool: FarmingPool): bigint {
    // Simplified LP token calculation
    // In production, this would use proper AMM math (geometric mean, etc.)
    const totalValue = Number(tokenAAmount) + Number(tokenBAmount) * 0.5 // Simplified valuation
    return BigInt(Math.floor(totalValue / 1000000)) // LP tokens with 6 decimals
  }

  private calculateWithdrawal(lpTokenAmount: bigint, pool: FarmingPool) {
    // Simplified withdrawal calculation
    const lpValue = Number(lpTokenAmount) * 1000000 // Convert back to value
    
    const tokenAReceived = BigInt(Math.floor(lpValue * 0.6)) // 60% in tokenA
    const tokenBReceived = BigInt(Math.floor(lpValue * 0.4)) // 40% in tokenB
    const rewardsReceived = BigInt(Math.floor(lpValue * (pool.apy / 100) * 0.1)) // 10% of annual rewards
    
    return { tokenAReceived, tokenBReceived, rewardsReceived }
  }

  private formatTokenAmount(amount: bigint, mint: string): number {
    const decimals = this.getTokenDecimals(mint)
    return Number(amount) / Math.pow(10, decimals)
  }

  private getTokenDecimals(mint: string): number {
    switch (mint) {
      case 'So11111111111111111111111111111111111111112':
        return 9 // SOL has 9 decimals
      case process.env.TNG_MINT_ADDRESS:
        return 9 // TNG has 9 decimals
      case 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
        return 6 // USDC has 6 decimals
      default:
        return 9 // Default to 9 decimals
    }
  }

  private async provideLiquidity(
    userKeypair: Keypair,
    poolAddress: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tokenAAmount: bigint,
    tokenBAmount: bigint
  ): Promise<string> {
    
    // For SOL transfers
    if (tokenAMint.toBase58() === 'So11111111111111111111111111111111111111112') {
      const transaction = new Transaction()
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: userKeypair.publicKey,
          toPubkey: poolAddress,
          lamports: Number(tokenAAmount)
        })
      )

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userKeypair, this.sponsorKeypair],
        { commitment: 'confirmed' }
      )

      return signature
    }
    
    // For SPL tokens
    const userTokenAccountA = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair,
      tokenAMint,
      userKeypair.publicKey
    )

    const poolTokenAccountA = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair,
      tokenAMint,
      poolAddress
    )

    const signature = await transfer(
      this.connection,
      this.sponsorKeypair,
      userTokenAccountA.address,
      poolTokenAccountA.address,
      userKeypair,
      tokenAAmount
    )

    return signature
  }

  private async withdrawLiquidity(
    userAddress: PublicKey,
    poolAddress: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tokenAAmount: bigint,
    tokenBAmount: bigint,
    rewardsAmount: bigint
  ): Promise<string> {
    
    // For demo, sponsor sends tokens back to user (simulating pool withdrawal)
    if (tokenAMint.toBase58() === 'So11111111111111111111111111111111111111112') {
      const transaction = new Transaction()
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.sponsorKeypair.publicKey,
          toPubkey: userAddress,
          lamports: Number(tokenAAmount + rewardsAmount)
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
    
    // For SPL tokens
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair,
      tokenAMint,
      userAddress
    )

    const sponsorTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.sponsorKeypair,
      tokenAMint,
      this.sponsorKeypair.publicKey
    )

    const signature = await transfer(
      this.connection,
      this.sponsorKeypair,
      sponsorTokenAccount.address,
      userTokenAccount.address,
      this.sponsorKeypair,
      tokenAAmount + rewardsAmount
    )

    return signature
  }
}
