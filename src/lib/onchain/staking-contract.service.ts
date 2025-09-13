import { 
  Connection, 
  PublicKey, 
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction
} from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getOrCreateAssociatedTokenAccount
} from '@solana/spl-token'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import stakingIdl from '../idl/tng_staking.json'
import * as anchor from '@coral-xyz/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

// Simple Wallet implementation for Anchor
class SimpleWallet {
  constructor(private keypair: Keypair) {}
  
  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.sign(this.keypair)
    return tx
  }
  
  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map(tx => {
      tx.sign(this.keypair)
      return tx
    })
  }
  
  get publicKey(): PublicKey {
    return this.keypair.publicKey
  }
}

// Smart contract configuration
const PROGRAM_ID = new PublicKey("ArBvk3DQtxKES6EbdhequHQKKKYjhMFp7S8ob8Q5inHg")
const TNG_MINT = new PublicKey("FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs")
const STNG_MINT = new PublicKey("2R6DUNNim4DoaArB4qdjaz9UcsndKjv9YLmkyWGcsvsk")
// STAKING_POOL_PDA will be calculated dynamically

export interface StakeResult {
  success: boolean
  signature?: string
  error?: string
  stngAmount?: bigint
}

export interface UnstakeResult {
  success: boolean
  signature?: string
  error?: string
  tngAmount?: bigint
  rewards?: bigint
}

export interface StakingPoolInfo {
  totalStaked: bigint
  totalStngSupply: bigint
  apyBasisPoints: number
  isActive: boolean
  authority: PublicKey
}

export interface UserStakeInfo {
  stakedAmount: bigint
  stngAmount: bigint
  totalRewardsClaimed: bigint
  stakeTimestamp: number
  lastClaimTimestamp: number
}

/**
 * Service for interacting with TNG Staking Smart Contract
 * Handles real on-chain staking operations through Anchor program
 */
export class StakingContractService {
  private connection: Connection
  private program: Program | null = null
  private sponsorKeypair?: Keypair
  private initialized = false

  constructor(connection: Connection, sponsorKeypair?: Keypair) {
    this.connection = connection
    this.sponsorKeypair = sponsorKeypair

    // Only skip initialization during Next.js build process
    if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('🔧 StakingContractService: Skipping initialization during build')
      return
    }

    this.initializeService()
  }

  private initializeService() {
    try {
      // Initialize Anchor provider and program  
      const wallet = this.sponsorKeypair ? new SimpleWallet(this.sponsorKeypair) : undefined
      const provider = new AnchorProvider(
        this.connection, 
        wallet as any, 
        { commitment: 'confirmed' }
      )

      this.program = new Program(stakingIdl as any, provider)
      this.initialized = true
      console.log('✅ StakingContractService initialized successfully')
    } catch (error) {
      console.warn('⚠️ StakingContractService initialization failed:', error)
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      this.initializeService()
    }
    
    if (!this.program) {
      console.error('StakingContractService initialization failed:', {
        hasProgram: !!this.program,
        hasSponsorKeypair: !!this.sponsorKeypair,
        initialized: this.initialized
      })
      throw new Error('StakingContractService not properly initialized - check SPONSOR_PRIVATE_KEY environment variable')
    }
  }

  /**
   * Helper method to get staking pool PDA
   */
  private getStakingPoolPda(): [PublicKey, number] {
    if (!this.program) {
      throw new Error('Program not initialized - call ensureInitialized() first')
    }
    return PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool"), TNG_MINT.toBuffer()],
      this.program.programId
    )
  }

  /**
   * Initialize the staking pool (one-time setup)
   */
  async initializePool(): Promise<string> {
    try {
      await this.ensureInitialized()
      
      if (!this.sponsorKeypair) {
        throw new Error('Sponsor keypair required for pool initialization')
      }

      const [stakingPoolAddress, bump] = this.getStakingPoolPda()

      // Check if pool already exists
      try {
        const existingPool = await (this.program.account as any).stakingPool.fetch(stakingPoolAddress)
        console.log(' Staking pool already exists')
        return 'Pool already exists'
      } catch (e) {
        console.log(' Pool doesn\'t exist, creating...')
      }

      // Calculate vault ATA dynamically
      const vault = await getAssociatedTokenAddress(
        TNG_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve for PDA
      )

      console.log(' Calculated Vault ATA:', vault.toString())

      const tx = await this.program.methods
        .initialize(bump)
        .accounts({
          stakingPool: stakingPoolAddress,
          authority: this.sponsorKeypair.publicKey,
          tngMint: TNG_MINT,
          stngMint: STNG_MINT,
          vault: vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([this.sponsorKeypair])
        .rpc()

      console.log(' Staking pool initialized:', tx)
      console.log(' Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`)
      return tx
    } catch (error) {
      console.error(' Error initializing pool:', error)
      throw error
    }
  }

  /**
   * Get staking pool information
   */
  async getStakingPoolInfo(): Promise<StakingPoolInfo | null> {
    try {
      await this.ensureInitialized()
      const [stakingPoolPda] = this.getStakingPoolPda()
      
      const poolAccount = await (this.program.account as any).stakingPool.fetch(stakingPoolPda)
      
      return {
        totalStaked: BigInt(poolAccount.totalStaked.toString()),
        totalStngSupply: BigInt(poolAccount.totalStngSupply.toString()),
        apyBasisPoints: poolAccount.apyBasisPoints,
        isActive: poolAccount.isActive,
        authority: poolAccount.authority
      }
    } catch (error) {
      console.error('Error fetching staking pool info:', error)
      return null
    }
  }

  /**
   * Get user stake information
   */
  async getUserStakeInfo(userPublicKey: PublicKey): Promise<UserStakeInfo | null> {
    try {
      await this.ensureInitialized()
      const [stakingPoolPda] = this.getStakingPoolPda()
      
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_stake"),
          userPublicKey.toBuffer(),
          stakingPoolPda.toBuffer()
        ],
        this.program.programId
      )

      const stakeAccount = await (this.program.account as any).userStake.fetch(userStakePda)
      
      return {
        stakedAmount: BigInt(stakeAccount.stakedAmount.toString()),
        stngAmount: BigInt(stakeAccount.stngAmount.toString()),
        totalRewardsClaimed: BigInt(stakeAccount.totalRewardsClaimed.toString()),
        stakeTimestamp: stakeAccount.stakeTimestamp.toNumber(),
        lastClaimTimestamp: stakeAccount.lastClaimTimestamp.toNumber()
      }
    } catch (error) {
      // User has no stake position yet
      return null
    }
  }

  /**
   * Stake TNG tokens and receive sTNG tokens
   */
  async stakeTokens(
    userKeypair: Keypair, 
    amount: bigint
  ): Promise<StakeResult> {
    try {
      await this.ensureInitialized()
      
      console.log(` Staking ${amount} TNG tokens...`)
      console.log(' User:', userKeypair.publicKey.toBase58())
      
      // Get staking pool PDA
      const [stakingPoolPda] = this.getStakingPoolPda()

      // Verify that sTNG mint exists
      console.log(' Checking sTNG mint existence...')
      const stngMintInfo = await this.connection.getAccountInfo(STNG_MINT)
      if (!stngMintInfo) {
        throw new Error('sTNG mint not initialized. Contact admin to initialize sTNG token.')
      }
      console.log(' sTNG mint exists and is ready')

      // Verify that TNG mint exists
      console.log(' Checking TNG mint existence...')
      const tngMintInfo = await this.connection.getAccountInfo(TNG_MINT)
      if (!tngMintInfo) {
        throw new Error('TNG mint not found. This should not happen.')
      }
      console.log(' TNG mint exists and is ready')

      // Check sponsor SOL balance for transaction fees (sponsor pays in smart contract mode too)
      if (!this.sponsorKeypair) {
        return {
          success: false,
          error: 'Sponsor keypair not available for fee payment'
        }
      }
      
      const sponsorSolBalance = await this.connection.getBalance(this.sponsorKeypair.publicKey)
      console.log(' Sponsor SOL balance:', (sponsorSolBalance / 1e9).toFixed(4), 'SOL')
      
      if (sponsorSolBalance < 10000000) { // 0.01 SOL minimum
        return {
          success: false,
          error: `Недостаточно SOL у sponsor'а для оплаты комиссии. Доступно: ${(sponsorSolBalance / 1e9).toFixed(4)} SOL`
        }
      }

      // Get or create user TNG token account (sponsor pays for creation)
      console.log(' Creating/Getting TNG ATA:', {
        payer: this.sponsorKeypair.publicKey.toBase58(),
        mint: TNG_MINT.toBase58(),
        owner: userKeypair.publicKey.toBase58()
      })
      
      const userTngAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,      // connection
        this.sponsorKeypair,  // payer (Keypair) - sponsor pays
        TNG_MINT,            // mint (PublicKey)
        userKeypair.publicKey // owner (PublicKey) - user owns
      )
      
      console.log(' User TNG Account:', {
        address: userTngAccount.address.toBase58(),
        balance: (Number(userTngAccount.amount) / 1e9).toFixed(2) + ' TNG',
        requestedAmount: (Number(amount) / 1e9).toFixed(2) + ' TNG',
        hasEnoughBalance: userTngAccount.amount >= amount
      })

      // Check sufficient balance
      if (userTngAccount.amount < amount) {
        return {
          success: false,
          error: `Недостаточно TNG токенов. Доступно: ${(Number(userTngAccount.amount) / 1e9).toFixed(2)} TNG, требуется: ${(Number(amount) / 1e9).toFixed(2)} TNG. Получите больше TNG через faucet.`
        }
      }

      // Get or create user sTNG token account (sponsor pays for creation)
      console.log(' Creating/Getting sTNG ATA:', {
        payer: this.sponsorKeypair.publicKey.toBase58(),
        mint: STNG_MINT.toBase58(),
        owner: userKeypair.publicKey.toBase58()
      })
      
      const userStngAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,      // connection
        this.sponsorKeypair,  // payer (Keypair) - sponsor pays
        STNG_MINT,           // mint (PublicKey)
        userKeypair.publicKey // owner (PublicKey) - user owns
      )

      // Get vault account and verify it exists
      const vault = await getAssociatedTokenAddress(
        TNG_MINT,
        stakingPoolPda,
        true // allowOwnerOffCurve for PDA
      )
      console.log(' Checking vault state...')
      
      try {
        const vaultAccount = await getAccount(this.connection, vault)
        console.log(' Vault info:', {
          address: vault.toBase58(),
          balance: (Number(vaultAccount.amount) / 1e9).toFixed(2) + ' TNG',
          owner: vaultAccount.owner.toBase58(),
          mint: vaultAccount.mint.toBase58()
        })
        
        // Verify vault has TNG tokens
        if (!vaultAccount.mint.equals(TNG_MINT)) {
          throw new Error('Vault is not for TNG tokens')
        }
        
        // Verify vault has some balance for rewards
        if (vaultAccount.amount < BigInt(100 * 1e9)) { // 100 TNG minimum
          console.log(' Vault has low balance for rewards')
        }
        
      } catch (vaultError) {
        console.error(' Vault check failed:', vaultError instanceof Error ? vaultError.message : String(vaultError))
        return {
          success: false,
          error: `Vault error: ${vaultError instanceof Error ? vaultError.message : String(vaultError)}`
        }
      }

      // Verify staking pool exists and is active
      console.log(' Checking staking pool state...')
      try {
        const poolInfo = await this.getStakingPoolInfo()
        if (!poolInfo) {
          throw new Error('Staking pool not found. Pool may not be initialized.')
        }
        if (!poolInfo.isActive) {
          throw new Error('Staking pool is currently inactive.')
        }
        console.log(' Staking pool is active and ready')
      } catch (poolError) {
        console.error(' Staking pool check failed:', poolError instanceof Error ? poolError.message : String(poolError))
        return {
          success: false,
          error: `Staking pool error: ${poolError instanceof Error ? poolError.message : String(poolError)}`
        }
      }

      // Find user stake PDA
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_stake"),
          userKeypair.publicKey.toBuffer(),
          stakingPoolPda.toBuffer()
        ],
        this.program.programId
      )

      // Build stake transaction
      const stakeIx = await this.program.methods
        .stake(new BN(amount.toString()))
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          payer: this.sponsorKeypair.publicKey, // sponsor pays for PDA creation
          user: userKeypair.publicKey,          // user authorizes the stake
          userTngAccount: userTngAccount.address,
          userStngAccount: userStngAccount.address,
          vault,
          stngMint: STNG_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction()

      // Build transaction with sponsor as feePayer
      const transaction = new Transaction()
      transaction.add(stakeIx)
      
      // Set sponsor as feePayer (sponsor pays all fees in smart contract mode)
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Debug: Check all accounts before sending transaction
      console.log(' Pre-transaction account check:');
      console.log('  User Public Key (signer):', userKeypair.publicKey.toBase58());
      console.log('  Sponsor Public Key (feePayer):', this.sponsorKeypair.publicKey.toBase58());
      console.log('  User TNG Account:', userTngAccount.address.toBase58());
      console.log('  User sTNG Account:', userStngAccount.address.toBase58());
      console.log('  Vault:', vault.toBase58());
      console.log('  User Stake PDA:', userStakePda.toBase58());
      console.log('  Staking Pool PDA:', stakingPoolPda.toBase58());
      console.log('  Fee Payer:', transaction.feePayer?.toBase58());
      console.log('  Recent Blockhash:', transaction.recentBlockhash);
      
      // Try simulation first
      console.log(' Simulating transaction...');
      try {
        const simulateResult = await this.connection.simulateTransaction(transaction);
        console.log(' Simulation result:', simulateResult);
        if (simulateResult.value.err) {
          console.log(' Simulation error details:', simulateResult.value.err);
          console.log(' Simulation logs:', simulateResult.value.logs);
          throw new Error(`Simulation failed: ${JSON.stringify(simulateResult.value.err)}`)
        }
      } catch (simError) {
        console.log(' Simulation failed:', simError.message);
        throw simError;
      }

      // Sign transaction (both sponsor and user must sign)
      transaction.sign(this.sponsorKeypair, userKeypair)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { 
          skipPreflight: true // Skip preflight since we already simulated
        }
      )

      await this.connection.confirmTransaction(signature, 'confirmed')

      console.log(` Staking successful! Signature: ${signature}`)
      console.log(' Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)

      return {
        success: true,
        signature,
        stngAmount: amount // 1:1 ratio for simplicity
      }

    } catch (error) {
      console.error(' Staking error:', error)
      
      // Get detailed logs if available
      if (error.logs) {
        console.log(' Transaction logs:', error.logs);
      }
      
      // Try to get logs from signature if available
      if (error.signature) {
        try {
          const txInfo = await this.connection.getTransaction(error.signature);
          if (txInfo?.meta?.logMessages) {
            console.log(' Full transaction logs:', txInfo.meta.logMessages);
          }
        } catch (logError) {
          console.log(' Could not fetch transaction logs:', logError.message);
        }
      }
      
      // Try to get more detailed error information
      let detailedError = 'Unknown staking error'
      if (error instanceof Error) {
        detailedError = error.message
        
        // Check for specific Solana errors
        if (error.message.includes('Attempt to debit an account but found no record of a prior credit')) {
          detailedError = 'Ошибка дебетования аккаунта. Проверьте:\n' +
                         '1. Баланс TNG аккаунта пользователя\n' +
                         '2. Authority vault\'а\n' +
                         '3. Permissions на sTNG mint'
        } else if (error.message.includes('AccountNotFound')) {
          detailedError = 'Аккаунт не найден. Возможно нужна инициализация pool\'а или token аккаунтов.'
        }
      }
      
      return {
        success: false,
        error: detailedError
      }
    }
  }

  /**
   * Unstake sTNG tokens and receive TNG + rewards
   */
  async unstakeTokens(
    userKeypair: Keypair, 
    stngAmount: bigint
  ): Promise<UnstakeResult> {
    try {
      console.log(` Unstaking ${stngAmount} sTNG tokens...`)
      
      // Get staking pool PDA
      const [stakingPoolPda] = this.getStakingPoolPda()

      // Get user token accounts
      const userTngAccount = await getAssociatedTokenAddress(
        TNG_MINT,
        userKeypair.publicKey
      )

      const userStngAccount = await getAssociatedTokenAddress(
        STNG_MINT,
        userKeypair.publicKey
      )

      // Get vault account
      const vault = await getAssociatedTokenAddress(
        TNG_MINT,
        stakingPoolPda,
        true // allowOwnerOffCurve for PDA
      )
      // Find user stake PDA
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_stake"),
          userKeypair.publicKey.toBuffer(),
          stakingPoolPda.toBuffer()
        ],
        this.program.programId
      )

      // Check sponsor SOL balance for transaction fees (sponsor pays in smart contract mode)
      if (!this.sponsorKeypair) {
        return {
          success: false,
          error: 'Sponsor keypair not available for fee payment'
        }
      }
      
      const sponsorSolBalance = await this.connection.getBalance(this.sponsorKeypair.publicKey)
      console.log(' Sponsor SOL balance:', (sponsorSolBalance / 1e9).toFixed(4), 'SOL')
      if (sponsorSolBalance < 10000000) { // 0.01 SOL minimum
        return {
          success: false,
          error: `Недостаточно SOL у sponsor'а для оплаты комиссии. Доступно: ${(sponsorSolBalance / 1e9).toFixed(4)} SOL`
        }
      }

      // Build unstake transaction
      const unstakeIx = await this.program.methods
        .unstake(new BN(stngAmount.toString()))
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          payer: this.sponsorKeypair.publicKey, // sponsor pays for any ATA creation
          user: userKeypair.publicKey,          // user authorizes the unstake
          userTngAccount,
          userStngAccount,
          vault,
          stngMint: STNG_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction()

      // Build transaction with sponsor as feePayer
      const transaction = new Transaction()
      transaction.add(unstakeIx)
      
      // Set sponsor as feePayer (sponsor pays all fees in smart contract mode)
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Simulate transaction first
      try {
        console.log(' Simulating unstake transaction...')
        const simulationResult = await this.connection.simulateTransaction(transaction)
        if (simulationResult.value.err) {
          console.error(' Simulation failed:', simulationResult.value.err)
          console.error(' Simulation logs:', simulationResult.value.logs)
          throw new Error(`Simulation failed: ${JSON.stringify(simulationResult.value.err)}`)
        }
        console.log(' Transaction simulation successful')
      } catch (error) {
        console.error(' Transaction simulation error:', error)
        throw error
      }

      // Sign transaction (both sponsor and user must sign)
      transaction.sign(this.sponsorKeypair, userKeypair)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { 
          skipPreflight: true // Skip preflight since we already simulated
        }
      )

      await this.connection.confirmTransaction(signature, 'confirmed')

      console.log(` Unstaking successful! Signature: ${signature}`)

      return {
        success: true,
        signature,
        tngAmount: stngAmount, // 1:1 ratio + rewards
        rewards: BigInt(0) // TODO: Calculate actual rewards
      }

    } catch (error) {
      console.error(' Unstaking error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown unstaking error'
      }
    }
  }

  /**
   * Claim rewards without unstaking
   */
  async claimRewards(userKeypair: Keypair): Promise<StakeResult> {
    try {
      console.log(' Claiming rewards...')
      
      // Get staking pool PDA
      const [stakingPoolPda] = this.getStakingPoolPda()

      // Get user token accounts
      const userTngAccount = await getAssociatedTokenAddress(
        TNG_MINT,
        userKeypair.publicKey
      )

      // Get vault account
      const vault = await getAssociatedTokenAddress(
        TNG_MINT,
        stakingPoolPda,
        true // allowOwnerOffCurve for PDA
      )
      // Find user stake PDA
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_stake"),
          userKeypair.publicKey.toBuffer(),
          stakingPoolPda.toBuffer()
        ],
        this.program.programId
      )

      // Build claim transaction
      const claimIx = await this.program.methods
        .claimRewards()
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          user: userKeypair.publicKey,
          userTngAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()

      const transaction = new anchor.web3.Transaction().add(claimIx)

      const signature = await this.connection.sendTransaction(
        transaction,
        [userKeypair],
        { skipPreflight: false } as any
      )

      await this.connection.confirmTransaction(signature, 'confirmed')

      console.log(` Rewards claimed! Signature: ${signature}`)

      return {
        success: true,
        signature
      }

    } catch (error) {
      console.error(' Claim rewards error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown claim error'
      }
    }
  }

  /**
   * Get sTNG token balance for user
   */
  async getStngBalance(userPublicKey: PublicKey): Promise<bigint> {
    try {
      const userStngAccount = await getAssociatedTokenAddress(
        STNG_MINT,
        userPublicKey
      )

      const account = await getAccount(this.connection, userStngAccount)
      return account.amount
    } catch (error) {
      // User doesn't have sTNG account or no balance
      return BigInt(0)
    }
  }

  /**
   * Calculate potential rewards for user
   */
  async calculatePotentialRewards(userPublicKey: PublicKey): Promise<bigint> {
    try {
      const userStake = await this.getUserStakeInfo(userPublicKey)
      const poolInfo = await this.getStakingPoolInfo()

      if (!userStake || !poolInfo) return BigInt(0)

      const currentTime = Math.floor(Date.now() / 1000)
      const timeStaked = currentTime - userStake.lastClaimTimestamp
      const secondsPerYear = 365 * 24 * 60 * 60

      // Calculate rewards based on APY
      const rewards = (userStake.stakedAmount * BigInt(poolInfo.apyBasisPoints) * BigInt(timeStaked)) / 
                     (BigInt(10000) * BigInt(secondsPerYear))

      return rewards
    } catch (error) {
      console.error('Error calculating rewards:', error)
      return BigInt(0)
    }
  }
}

/**
 * Factory function to create StakingContractService
 */
export function createStakingContractService(
  connection: Connection,
  sponsorKeypair?: Keypair
): StakingContractService {
  return new StakingContractService(connection, sponsorKeypair)
}

// Export contract addresses for use in other services
export const STAKING_CONTRACT_CONFIG = {
  PROGRAM_ID,
  TNG_MINT,
  STNG_MINT,
  // STAKING_POOL_PDA removed - calculated dynamically
  BUMP: 255
} as const
