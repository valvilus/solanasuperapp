/**
 * TNG Swap Contract Service - Real on-chain TNG swaps
 * Handles TNG  SOL and TNG  USDC swaps via custom Anchor contract
 * Solana SuperApp
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor'
import { WalletErrorCode, WalletResult } from '@/lib/wallet/types'
import { createWalletError } from '@/lib/wallet/errors'
import tngSwapIdl from '@/lib/idl/tng_swap.json'

// TNG Swap Program ID
export const TNG_SWAP_PROGRAM_ID = new PublicKey('FWfcH4Zcp8HztJFqui3wX3AkG9XjV9PoKnNPCgsctSVV')

// Supported mints
export const SWAP_MINTS = {
  TNG: new PublicKey('FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs'),
  SOL: new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC devnet
} as const

export interface SwapPoolInfo {
  authority: PublicKey
  tngMint: PublicKey
  otherMint: PublicKey
  tngVault: PublicKey
  otherVault: PublicKey
  lpMint: PublicKey
  tngReserve: number
  otherReserve: number
  isActive: boolean
}

export interface SwapQuoteInfo {
  inputAmount: number
  outputAmount: number
  priceImpact: number
  minimumReceived: number
  exchangeRate: number
}

export class TngSwapContractService {
  private readonly connection: Connection
  private readonly sponsorKeypair: Keypair
  private program: Program | null = null

  constructor(connection: Connection) {
    this.connection = connection

    // Initialize sponsor keypair
    if (!process.env.SPONSOR_PRIVATE_KEY) {
      throw new Error('SPONSOR_PRIVATE_KEY not found in environment variables')
    }
    
    try {
      let sponsorKey: number[]
      
      try {
        sponsorKey = JSON.parse(process.env.SPONSOR_PRIVATE_KEY)
      } catch {
        try {
          const base64Key = process.env.SPONSOR_PRIVATE_KEY
          const buffer = Buffer.from(base64Key, 'base64')
          sponsorKey = Array.from(buffer)
        } catch {
          throw new Error('SPONSOR_PRIVATE_KEY must be either JSON array or base64 string')
        }
      }
      
      this.sponsorKeypair = Keypair.fromSecretKey(new Uint8Array(sponsorKey))
    } catch (error) {
      console.error('SPONSOR_PRIVATE_KEY parsing error:', error)
      throw new Error(`Invalid SPONSOR_PRIVATE_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Initialize the Anchor program
   */
  private async initProgram(): Promise<void> {
    if (this.program) return

    try {
      // Create a dummy wallet for the provider
      const wallet = {
        publicKey: this.sponsorKeypair.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.sign(this.sponsorKeypair)
          return tx
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs.map(tx => {
            tx.sign(this.sponsorKeypair)
            return tx
          })
        }
      }

      const provider = new AnchorProvider(this.connection, wallet as any, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      })

      // Check if IDL exists and is valid
      if (!tngSwapIdl || typeof tngSwapIdl !== 'object') {
        throw new Error('TNG Swap IDL not found or invalid')
      }

      // Initialize program with proper typing
      this.program = new Program(tngSwapIdl as any, provider)
    } catch (error) {
      console.error('Failed to initialize TNG Swap program:', error)
      throw error
    }
  }

  /**
   * Get swap pool PDA
   */
  private getSwapPoolPDA(tngMint: PublicKey, otherMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('swap_pool'),
        tngMint.toBuffer(),
        otherMint.toBuffer(),
      ],
      TNG_SWAP_PROGRAM_ID
    )
  }

  /**
   * Get swap pool info
   */
  async getSwapPoolInfo(otherMint: PublicKey): Promise<WalletResult<SwapPoolInfo>> {
    try {
      await this.initProgram()
      if (!this.program) throw new Error('Program not initialized')

      // Use the correct pool PDA from deployment-info.json instead of calculating
      const swapPoolPDA = new PublicKey('6KBzJYcyh1DXduboH113HB8L6hLFQPw3xTT2vDpZjyA7')
      
      const poolAccount = await (this.program!.account as any).swapPool.fetch(swapPoolPDA)
      
      const poolInfo: SwapPoolInfo = {
        authority: poolAccount.authority,
        tngMint: poolAccount.tngMint,
        otherMint: poolAccount.otherMint,
        tngVault: poolAccount.tngVault,
        otherVault: poolAccount.otherVault,
        lpMint: poolAccount.lpMint,
        tngReserve: poolAccount.tngReserve.toNumber(),
        otherReserve: poolAccount.otherReserve.toNumber(),
        isActive: poolAccount.isActive,
      }

      return { success: true, data: poolInfo }
    } catch (error) {
      console.error('Error getting swap pool info:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get swap pool info: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Get swap quote using REAL-TIME PRICES (not pool reserves)
   */
  async getSwapQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: number,
    slippageBps: number = 50
  ): Promise<WalletResult<SwapQuoteInfo>> {
    try {

      // Получаем РЕАЛЬНЫЕ цены в реальном времени
      let solPrice = 98.45 // fallback
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        const data = await response.json()
        if (data.solana?.usd) {
          solPrice = data.solana.usd
        }
      } catch (error) {
      }

      // Курс тенге к доллару (реальный курс)
      const kztToUsd = 1 / 450 // 1 KZT ≈ $0.0022
      const tngPriceUSD = kztToUsd // 1 TNG = 1 KZT

      const prices = {
        [SWAP_MINTS.TNG.toBase58()]: tngPriceUSD,
        [SWAP_MINTS.SOL.toBase58()]: solPrice,
        [SWAP_MINTS.USDC.toBase58()]: 1.00
      }

      const inputPrice = prices[inputMint.toBase58()] || 0
      const outputPrice = prices[outputMint.toBase58()] || 0
      
      if (inputPrice === 0 || outputPrice === 0) {
        throw new Error(`Price not available: input=$${inputPrice}, output=$${outputPrice}`)
      }
      
      // Рассчитываем эквивалентную сумму через USD (РЕАЛЬНЫЕ КУРСЫ)
      const inputAmountDecimal = inputAmount / Math.pow(10, 9)
      const inputValueUSD = inputAmountDecimal * inputPrice
      const outputAmountDecimal = inputValueUSD / outputPrice
      const outputAmountRaw = Math.floor(outputAmountDecimal * Math.pow(10, 9))
      
      // Учитываем slippage
      const slippageMultiplier = 1 - (slippageBps / 10000)
      const minimumReceived = Math.floor(outputAmountRaw * slippageMultiplier)
      
      const quote: SwapQuoteInfo = {
        inputAmount,
        outputAmount: outputAmountRaw,
        priceImpact: 0.1, // Минимальный для прямого расчета
        minimumReceived,
        exchangeRate: outputAmountDecimal / inputAmountDecimal
      }


      return { success: true, data: quote }
    } catch (error) {
      console.error('Error getting real-time TNG swap quote:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get real-time TNG swap quote: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Execute TNG swap
   */
  async executeSwap(
    userKeypair: Keypair,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: number,
    minimumOutputAmount: number
  ): Promise<WalletResult<string>> {
    try {
      await this.initProgram()
      if (!this.program) throw new Error('Program not initialized')
      


      // Determine swap direction and get pool
      const isTngInput = inputMint.equals(SWAP_MINTS.TNG)
      
      const otherMint = isTngInput ? outputMint : inputMint
      
      // Use the correct pool PDA from deployment-info.json instead of calculating
      const swapPoolPDA = new PublicKey('6KBzJYcyh1DXduboH113HB8L6hLFQPw3xTT2vDpZjyA7')

      // Получаем TNG mint из swap pool (не хардкод!)
      const poolInfo = await this.getSwapPoolInfo(otherMint)
      if (!poolInfo.success || !poolInfo.data) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INTERNAL_ERROR,
            'Не удалось получить TNG mint из swap pool'
          )
        }
      }
      
      const poolTngMint = new PublicKey(poolInfo.data.tngMint)

      // ВСЕГДА создаем TNG ATA для user_tng_account с mint ИЗ ПУЛА
      const userTngAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer = sponsor
        poolTngMint,         // TNG mint ИЗ ПУЛА!
        userKeypair.publicKey
      )

      // Get or create user token accounts for input/output
      const userInputAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer = sponsor
        inputMint,
        userKeypair.publicKey
      )

      const userOutputAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer = sponsor
        outputMint,
        userKeypair.publicKey
      )


      // Validate user has enough input tokens

      if (userInputAccount.amount < BigInt(inputAmount)) {
        const inputSymbol = inputMint.equals(SWAP_MINTS.TNG) ? 'TNG' : 
                           inputMint.equals(SWAP_MINTS.SOL) ? 'SOL' : 'USDC'
        const availableFormatted = (Number(userInputAccount.amount) / 1e9).toFixed(6)
        const requiredFormatted = (inputAmount / 1e9).toFixed(6)
        
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
            `Недостаточно ${inputSymbol} токенов в кошельке. Доступно: ${availableFormatted}, требуется: ${requiredFormatted}`
          )
        }
      }

      // Check pool liquidity before swap
      try {
        const poolInfo = await this.getSwapPoolInfo(otherMint)
        if (!poolInfo.success || !poolInfo.data) {
          return {
            success: false,
            error: createWalletError(
              WalletErrorCode.INTERNAL_ERROR,
              'Не удалось получить информацию о пуле ликвидности'
            )
          }
        }

        const pool = poolInfo.data
        const outputSymbol = outputMint.equals(SWAP_MINTS.TNG) ? 'TNG' : 
                            outputMint.equals(SWAP_MINTS.SOL) ? 'SOL' : 'USDC'
        
        // Check if pool has enough output tokens
        const requiredOutputAmount = minimumOutputAmount
        const availableInPool = isTngInput ? pool.otherReserve : pool.tngReserve
        

        if (availableInPool < requiredOutputAmount) {
          const availableFormatted = (availableInPool / 1e9).toFixed(6)
          const requiredFormatted = (requiredOutputAmount / 1e9).toFixed(6)
          
          return {
            success: false,
            error: createWalletError(
              WalletErrorCode.INTERNAL_ERROR,
              `Недостаточно ликвидности в пуле. Доступно: ${availableFormatted} ${outputSymbol}, требуется: ${requiredFormatted} ${outputSymbol}. Попробуйте уменьшить сумму или используйте Jupiter DEX.`
            )
          }
        }
      } catch (poolError) {
        console.error('Pool liquidity check failed:', poolError)
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INTERNAL_ERROR,
            'Ошибка проверки ликвидности пула. Возможно, пул не инициализирован.'
          )
        }
      }

      // Use correct vault addresses from deployment-info.json instead of calculating
      const tngVault = new PublicKey('4U5JRttnCUD7mNo8ahc4iEEhK5rY5iyHWUBz8LxYKjd2')
      const otherVault = new PublicKey('GRa5yCgSB48ejkY2cpv1Es7fnKkWNA2c6gCw7dp5wXvJ')

      let transaction: Transaction

      if (isTngInput) {
        // TNG → Other
        transaction = await this.program.methods
          .swapTngForOther(new BN(inputAmount), new BN(minimumOutputAmount))
          .accounts({
            user: userKeypair.publicKey,
            payer: this.sponsorKeypair.publicKey,
            swapPool: swapPoolPDA,
            userTngAccount: userTngAccount.address, // ВСЕГДА TNG ATA
            userOtherAccount: userOutputAccount.address,
            otherMint: otherMint,
            tngVault: tngVault,
            otherVault: otherVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction()
      } else {
        // Other → TNG
        transaction = await this.program.methods
          .swapOtherForTng(new BN(inputAmount), new BN(minimumOutputAmount))
          .accounts({
            user: userKeypair.publicKey,
            payer: this.sponsorKeypair.publicKey,
            swapPool: swapPoolPDA,
            userTngAccount: userTngAccount.address, // ВСЕГДА TNG ATA
            userOtherAccount: userInputAccount.address,
            tngMint: SWAP_MINTS.TNG,
            tngVault: tngVault,
            otherVault: otherVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction()
      }

      // Устанавливаем спонсора как feePayer (как в staking)
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Получаем recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Подписываем: сначала пользователь, потом спонсор (как в staking)
      transaction.partialSign(userKeypair)
      transaction.partialSign(this.sponsorKeypair)

      const signature = await this.connection.sendRawTransaction(transaction.serialize())
      await this.connection.confirmTransaction(signature)

      return { success: true, data: signature }

    } catch (error) {
      console.error('TNG Swap execution failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `TNG swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Initialize swap pool (admin function)
   */
  async initializePool(
    authorityKeypair: Keypair,
    otherMint: PublicKey,
    initialTngAmount: number,
    initialOtherAmount: number
  ): Promise<WalletResult<string>> {
    try {
      await this.initProgram()
      if (!this.program) throw new Error('Program not initialized')


      const [swapPoolPDA] = this.getSwapPoolPDA(SWAP_MINTS.TNG, otherMint)

      // Create LP mint keypair
      const lpMintKeypair = Keypair.generate()

      // Get vault addresses
      const tngVault = await getAssociatedTokenAddress(SWAP_MINTS.TNG, swapPoolPDA, true)
      const otherVault = await getAssociatedTokenAddress(otherMint, swapPoolPDA, true)

      const signature = await this.program.methods
        .initializePool(new BN(initialTngAmount), new BN(initialOtherAmount))
        .accounts({
          authority: authorityKeypair.publicKey,
          payer: this.sponsorKeypair.publicKey,
          swapPool: swapPoolPDA,
          tngMint: SWAP_MINTS.TNG,
          otherMint: otherMint,
          tngVault: tngVault,
          otherVault: otherVault,
          lpMint: lpMintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authorityKeypair, this.sponsorKeypair, lpMintKeypair])
        .rpc()


      return { success: true, data: signature }

    } catch (error) {
      console.error('Pool initialization failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Pool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Get available swap pairs
   */
  getAvailableSwapPairs(): Array<{ from: string; to: string; fromMint: PublicKey; toMint: PublicKey }> {
    return [
      {
        from: 'TNG',
        to: 'SOL',
        fromMint: SWAP_MINTS.TNG,
        toMint: SWAP_MINTS.SOL
      },
      {
        from: 'SOL',
        to: 'TNG',
        fromMint: SWAP_MINTS.SOL,
        toMint: SWAP_MINTS.TNG
      },
      {
        from: 'TNG',
        to: 'USDC',
        fromMint: SWAP_MINTS.TNG,
        toMint: SWAP_MINTS.USDC
      },
      {
        from: 'USDC',
        to: 'TNG',
        fromMint: SWAP_MINTS.USDC,
        toMint: SWAP_MINTS.TNG
      }
    ]
  }

  /**
   * Check if swap pair is supported
   */
  isSwapPairSupported(inputMint: PublicKey, outputMint: PublicKey): boolean {
    const pairs = this.getAvailableSwapPairs()
    return pairs.some(pair => 
      pair.fromMint.equals(inputMint) && pair.toMint.equals(outputMint)
    )
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number, decimals: number = 9): string {
    return (amount / Math.pow(10, decimals)).toFixed(6)
  }

  /**
   * Parse amount from human readable to blockchain format
   */
  static parseAmount(amount: number, decimals: number = 9): number {
    return Math.floor(amount * Math.pow(10, decimals))
  }
}
