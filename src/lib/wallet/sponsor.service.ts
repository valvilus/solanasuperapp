/**
 * Sponsor Service - Fee Sponsorship System
 * Solana SuperApp - Автоматическая оплата комиссий пользователей
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token'
import {
  WalletResult,
  WalletError,
  WalletErrorCode,
  TransactionPriority
} from './types'
import { createWalletError } from './errors'
// Условные импорты для серверной среды
let fs: any
let path: any

if (typeof window === 'undefined') {
  // Только на сервере
  fs = require('fs')
  path = require('path')
}

export interface SponsorConfig {
  maxDailyBudget: number // в SOL
  maxUserDailyLimit: number // количество транзакций на пользователя в день
  maxTotalBudget: number // общий лимит в SOL
  priorityFeeMultiplier: Record<TransactionPriority, number>
  enabledOperations: SponsorOperation[]
}

export enum SponsorOperation {
  SOL_TRANSFER = 'sol_transfer',
  SPL_TRANSFER = 'spl_transfer',
  TOKEN_ACCOUNT_CREATION = 'token_account_creation',
  NFT_OPERATIONS = 'nft_operations'
}

export interface SponsorStats {
  totalSponsored: number // всего потрачено SOL
  dailySpent: number // потрачено сегодня
  transactionsCount: number // общее количество транзакций
  dailyTransactions: number // транзакций сегодня
  remainingBudget: number // остаток бюджета
  lastReset: Date // последний сброс дневного лимита
}

export interface SponsoredTransactionResult {
  signature: string
  fee: number // в lamports
  priorityFee: number // в lamports
  sponsorAddress: string
  userAddress: string
  operation: SponsorOperation
}

export class SponsorService {
  private readonly connection: Connection
  private readonly sponsorKeypair: Keypair
  private readonly config: SponsorConfig
  private readonly stats: SponsorStats
  private readonly userDailyLimits = new Map<string, number>()
  private lastStatsUpdate: Date

  constructor(connection: Connection, config?: Partial<SponsorConfig>) {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      throw new Error('SponsorService can only be used on the server side')
    }

    this.connection = connection
    
    // Загружаем sponsor keypair
    this.sponsorKeypair = this.loadSponsorKeypair()
    
    // Конфигурация по умолчанию
    this.config = {
      maxDailyBudget: parseFloat(process.env.MVP_DAILY_BUDGET || '0.01'), // 0.01 SOL
      maxUserDailyLimit: parseInt(process.env.MVP_USER_DAILY_LIMIT || '20'), // 20 транзакций
      maxTotalBudget: parseFloat(process.env.MVP_TOTAL_BUDGET || '0.05'), // 0.05 SOL
      priorityFeeMultiplier: {
        [TransactionPriority.LOW]: 1,
        [TransactionPriority.MEDIUM]: 2,
        [TransactionPriority.HIGH]: 5
      },
      enabledOperations: [
        SponsorOperation.SOL_TRANSFER,
        SponsorOperation.SPL_TRANSFER,
        SponsorOperation.TOKEN_ACCOUNT_CREATION
      ],
      ...config
    }

    // Инициализируем статистику
    this.stats = {
      totalSponsored: 0,
      dailySpent: 0,
      transactionsCount: 0,
      dailyTransactions: 0,
      remainingBudget: this.config.maxTotalBudget,
      lastReset: new Date()
    }

    this.lastStatsUpdate = new Date()

    // SponsorService initialized - silent for production
  }

  /**
   * Спонсирует SOL перевод
   */
  async sponsorSOLTransfer(
    fromKeypair: Keypair,
    toAddress: string,
    amount: bigint,
    priority: TransactionPriority = TransactionPriority.MEDIUM,
    memo?: string
  ): Promise<WalletResult<SponsoredTransactionResult>> {
    try {
      console.log(' Sponsoring SOL transfer:', {
        from: fromKeypair.publicKey.toBase58(),
        to: toAddress,
        amount: Number(amount) / LAMPORTS_PER_SOL + ' SOL',
        priority
      })

      // Проверяем лимиты
      const limitCheck = await this.checkLimits(
        fromKeypair.publicKey.toBase58(),
        SponsorOperation.SOL_TRANSFER
      )
      if (!limitCheck.success) {
        return { success: false, error: limitCheck.error }
      }

      // Создаем транзакцию
      const transaction = new Transaction()
      
      // Добавляем priority fee
      const priorityFee = this.calculatePriorityFee(priority)
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee
          })
        )
      }

      // Основной перевод
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: new PublicKey(toAddress),
          lamports: Number(amount)
        })
      )

      // Добавляем memo если есть
      if (memo) {
        // TODO: добавить memo instruction
      }

      // Спонсируем и отправляем
      const result = await this.sponsorAndSendTransaction(
        transaction,
        [fromKeypair],
        SponsorOperation.SOL_TRANSFER,
        fromKeypair.publicKey.toBase58()
      )

      return result

    } catch (error) {
      console.error(' SOL transfer sponsoring failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка спонсирования SOL перевода',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Спонсирует SPL токен перевод (включая TNG)
   */
  async sponsorSPLTransfer(
    fromKeypair: Keypair,
    toAddress: string,
    mintAddress: string,
    amount: bigint,
    decimals: number = 9,
    priority: TransactionPriority = TransactionPriority.MEDIUM
  ): Promise<WalletResult<SponsoredTransactionResult>> {
    try {
      console.log(' Sponsoring SPL transfer:', {
        from: fromKeypair.publicKey.toBase58(),
        to: toAddress,
        mint: mintAddress,
        amount: Number(amount) / Math.pow(10, decimals),
        priority
      })

      // Проверяем лимиты
      const limitCheck = await this.checkLimits(
        fromKeypair.publicKey.toBase58(),
        SponsorOperation.SPL_TRANSFER
      )
      if (!limitCheck.success) {
        return { success: false, error: limitCheck.error }
      }

      const mint = new PublicKey(mintAddress)
      const fromPublicKey = fromKeypair.publicKey
      const toPublicKey = new PublicKey(toAddress)

      // Получаем token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(mint, fromPublicKey)
      const toTokenAccount = await getAssociatedTokenAddress(mint, toPublicKey)

      console.log(' Token accounts:', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58(),
        mint: mint.toBase58()
      })

      // Проверяем существование source token account
      try {
        const sourceAccount = await getAccount(this.connection, fromTokenAccount)
        console.log(' Source token account balance:', sourceAccount.amount.toString())
        
        if (sourceAccount.amount < amount) {
          return {
            success: false,
            error: createWalletError(
              WalletErrorCode.INSUFFICIENT_BALANCE,
              `Insufficient token balance. Required: ${Number(amount) / 1e9} tokens, Available: ${Number(sourceAccount.amount) / 1e9} tokens`
            )
          }
        }
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError || error.name === 'TokenAccountNotFoundError') {
          console.error(' Source token account not found - user has no tokens of this type')
          return {
            success: false,
            error: createWalletError(
              WalletErrorCode.INVALID_TOKEN_ACCOUNT,
              `You don't have any ${mintAddress === '4uqUe3mXrLsxm25Cjhgb6TcWswGxpagn3wrejaMG8HAH' ? 'TNG' : 'SPL'} tokens to send. Get some tokens first.`
            )
          }
        } else {
          console.error(' Error checking source token account:', error)
          return {
            success: false,
            error: createWalletError(
              WalletErrorCode.INVALID_TOKEN_ACCOUNT,
              'Error checking token account'
            )
          }
        }
      }

      const transaction = new Transaction()

      // Добавляем priority fee
      const priorityFee = this.calculatePriorityFee(priority)
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee
          })
        )
      }

      // Проверяем существование destination token account
      try {
        await getAccount(this.connection, toTokenAccount)
        console.log(' Destination token account exists:', toTokenAccount.toBase58())
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError || error.name === 'TokenAccountNotFoundError') {
          console.log(' Creating destination token account:', toTokenAccount.toBase58())
          
          // Используем createAssociatedTokenAccountIdempotentInstruction для безопасности
          transaction.add(
            createAssociatedTokenAccountIdempotentInstruction(
              this.sponsorKeypair.publicKey, // payer (sponsor)
              toTokenAccount,
              toPublicKey, // owner
              mint // mint
            )
          )
        } else {
          console.error(' Error checking token account:', error)
          throw error
        }
      }

      // Добавляем transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          Number(amount),
          [],
          TOKEN_PROGRAM_ID
        )
      )

      // Спонсируем и отправляем
      const result = await this.sponsorAndSendTransaction(
        transaction,
        [fromKeypair],
        SponsorOperation.SPL_TRANSFER,
        fromKeypair.publicKey.toBase58()
      )

      return result

    } catch (error) {
      console.error(' SPL transfer sponsoring failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка спонсирования SPL перевода',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает баланс sponsor кошелька
   */
  async getSponsorBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.sponsorKeypair.publicKey)
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      console.error('Error getting sponsor balance:', error)
      return 0
    }
  }

  /**
   * Получает статистику sponsor системы
   */
  async getStats(): Promise<SponsorStats> {
    await this.updateDailyStats()
    
    const currentBalance = await this.getSponsorBalance()
    this.stats.remainingBudget = Math.min(currentBalance, this.config.maxTotalBudget)
    
    return { ...this.stats }
  }

  /**
   * Проверяет доступность спонсирования для пользователя
   */
  async canSponsor(userAddress: string, operation: SponsorOperation): Promise<boolean> {
    const result = await this.checkLimits(userAddress, operation)
    return result.success
  }

  /**
   * Сбрасывает дневные лимиты (вызывается автоматически)
   */
  async resetDailyLimits(): Promise<void> {
    console.log(' Resetting daily sponsor limits')
    
    this.stats.dailySpent = 0
    this.stats.dailyTransactions = 0
    this.stats.lastReset = new Date()
    this.userDailyLimits.clear()
    
    console.log(' Daily limits reset successfully')
  }

  // === PRIVATE METHODS ===

  private loadSponsorKeypair(): Keypair {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      throw new Error('SponsorService can only be used on the server side')
    }

    if (!fs || !path) {
      throw new Error('File system modules not available')
    }

    try {
      const keypairPath = path.join(process.cwd(), 'keys', 'mvp-sponsor-keypair.json')
      
      if (!fs.existsSync(keypairPath)) {
        throw new Error(`Sponsor keypair not found at: ${keypairPath}`)
      }

      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData))
      
      // Sponsor keypair loaded - silent for production
      return keypair

    } catch (error) {
      console.error(' Failed to load sponsor keypair:', error)
      throw new Error('Sponsor keypair loading failed')
    }
  }

  private calculatePriorityFee(priority: TransactionPriority): number {
    const baseFee = 1000 // 0.001 SOL в microlamports
    return baseFee * this.config.priorityFeeMultiplier[priority]
  }

  private async checkLimits(
    userAddress: string,
    operation: SponsorOperation
  ): Promise<WalletResult<boolean>> {
    await this.updateDailyStats()

    // Проверяем что операция разрешена
    if (!this.config.enabledOperations.includes(operation)) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.KMS_ACCESS_DENIED,
          `Операция ${operation} не поддерживается`
        )
      }
    }

    // Проверяем дневной бюджет
    if (this.stats.dailySpent >= this.config.maxDailyBudget) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
          'Превышен дневной бюджет sponsor системы'
        )
      }
    }

    // Проверяем общий бюджет
    if (this.stats.totalSponsored >= this.config.maxTotalBudget) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
          'Превышен общий бюджет sponsor системы'
        )
      }
    }

    // Проверяем лимит пользователя
    const userLimit = this.userDailyLimits.get(userAddress) || 0
    if (userLimit >= this.config.maxUserDailyLimit) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.KMS_ACCESS_DENIED,
          'Превышен дневной лимит транзакций для пользователя'
        )
      }
    }

    // Проверяем баланс sponsor кошелька
    const sponsorBalance = await this.getSponsorBalance()
    if (sponsorBalance < 0.001) { // минимум 0.001 SOL
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
          'Недостаточно средств в sponsor кошельке'
        )
      }
    }

    return { success: true, data: true }
  }

  private async sponsorAndSendTransaction(
    transaction: Transaction,
    signers: Keypair[],
    operation: SponsorOperation,
    userAddress: string
  ): Promise<WalletResult<SponsoredTransactionResult>> {
    try {
      // Устанавливаем sponsor как fee payer
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Получаем recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash

      // Оцениваем комиссию
      const feeEstimate = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      )
      
      const fee = feeEstimate.value || 5000 // fallback

      // Подписываем транзакцию
      transaction.sign(...[this.sponsorKeypair, ...signers])

      // Отправляем транзакцию
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      )

      console.log(' Sponsored transaction sent:', signature)

      // Ждем подтверждения
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight: await this.connection.getBlockHeight() + 150
        },
        'confirmed'
      )

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`)
      }

      // Обновляем статистику
      await this.updateStats(fee, operation, userAddress)

      const result: SponsoredTransactionResult = {
        signature,
        fee,
        priorityFee: this.calculatePriorityFee(TransactionPriority.MEDIUM),
        sponsorAddress: this.sponsorKeypair.publicKey.toBase58(),
        userAddress,
        operation
      }

      console.log(' Transaction sponsored successfully:', {
        signature,
        fee: fee / LAMPORTS_PER_SOL + ' SOL',
        operation
      })

      return {
        success: true,
        data: result
      }

    } catch (error) {
      console.error(' Sponsored transaction failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка отправки спонсируемой транзакции',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  private async updateStats(fee: number, operation: SponsorOperation, userAddress: string): Promise<void> {
    const feeInSOL = fee / LAMPORTS_PER_SOL
    
    this.stats.totalSponsored += feeInSOL
    this.stats.dailySpent += feeInSOL
    this.stats.transactionsCount += 1
    this.stats.dailyTransactions += 1

    // Обновляем лимит пользователя
    const currentLimit = this.userDailyLimits.get(userAddress) || 0
    this.userDailyLimits.set(userAddress, currentLimit + 1)

    console.log(' Stats updated:', {
      totalSponsored: this.stats.totalSponsored.toFixed(6) + ' SOL',
      dailySpent: this.stats.dailySpent.toFixed(6) + ' SOL',
      dailyTransactions: this.stats.dailyTransactions,
      userTransactions: this.userDailyLimits.get(userAddress)
    })
  }

  private async updateDailyStats(): Promise<void> {
    const now = new Date()
    const hoursSinceReset = (now.getTime() - this.stats.lastReset.getTime()) / (1000 * 60 * 60)
    
    // Сбрасываем дневные статистики каждые 24 часа
    if (hoursSinceReset >= 24) {
      await this.resetDailyLimits()
    }
  }
}

