/**
 * Custodial Wallet Service - Main Wallet Management Service
 * Solana SuperApp
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js'
import { PrismaClient } from '@prisma/client'
import {
  CustodialWallet,
  WalletBalanceInfo,
  TokenBalance,
  TransactionRequest,
  PreparedTransaction,
  SolanaTransactionInfo,
  WalletResult,
  WalletError,
  WalletErrorCode,
  WalletServiceConfig,
  TransactionPriority
} from './types'
import {
  createWalletError,
  createWalletNotFoundError,
  createInvalidAddressError,
  createInsufficientBalanceError,
  createRPCConnectionError,
  validateSolanaAddress,
  validateAmount
} from './errors'

import { WalletGeneratorService } from './generator.service'
import { SponsorService, SponsorOperation } from './sponsor.service'

export class CustodialWalletService {
  private readonly prisma: PrismaClient
  private readonly connection: Connection

  private readonly generatorService: WalletGeneratorService
  private readonly sponsorService: SponsorService
  private readonly config: WalletServiceConfig

  constructor(prisma: PrismaClient, config?: Partial<WalletServiceConfig>) {
    this.prisma = prisma
    
    // Конфигурация по умолчанию
    this.config = {
      solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      kmsProvider: 'database_encrypted',
      derivationPathPrefix: "m/44'/501'",
      defaultPriority: TransactionPriority.MEDIUM,
      maxRetries: 3,
      timeoutMs: 30000,
      ...config
    }

    // Инициализируем соединение с Solana
    this.connection = new Connection(this.config.solanaRpcUrl, 'confirmed')
    
    // Инициализируем сервисы с реальным шифрованием
    this.generatorService = new WalletGeneratorService(prisma)
    this.sponsorService = new SponsorService(this.connection)

    // CustodialWalletService initialized - silent for production
  }

  /**
   * Создает или получает custodial кошелек для пользователя
   */
  async getOrCreateUserWallet(userId: string): Promise<WalletResult<CustodialWallet>> {
    try {
      console.log(' Getting or creating wallet for user:', userId)

      // Сначала проверяем существующий кошелек
      const existingResult = await this.generatorService.getUserCustodialWallet(userId)
      if (!existingResult.success) {
        return { success: false, error: existingResult.error }
      }

      if (existingResult.data) {
        console.log(' Found existing custodial wallet:', existingResult.data.publicKey)
        return { success: true, data: existingResult.data }
      }

      // Создаем новый кошелек
      console.log(' Creating new custodial wallet...')
      const generationResult = await this.generatorService.generateCustodialWallet({ userId })
      
      if (!generationResult.success || !generationResult.data) {
        return { success: false, error: generationResult.error }
      }

      return { success: true, data: generationResult.data.wallet }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          'Ошибка получения/создания кошелька',
          { userId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает баланс кошелька
   */
  async getWalletBalance(publicKey: string): Promise<WalletResult<WalletBalanceInfo>> {
    try {
      console.log(' Getting wallet balance:', publicKey)

      // Валидация адреса
      const addressError = validateSolanaAddress(publicKey)
      if (addressError) {
        return { success: false, error: addressError }
      }

      const publicKeyObj = new PublicKey(publicKey)

      // Получаем SOL баланс
      const solBalance = await this.connection.getBalance(publicKeyObj)
      
      // TODO: Получаем токен балансы через getTokenAccountsByOwner
      // Пока возвращаем пустой массив токенов
      const tokens: TokenBalance[] = []

      const balanceInfo: WalletBalanceInfo = {
        publicKey,
        solBalance: BigInt(solBalance),
        tokens,
        lastSynced: new Date()
      }

      console.log(' Balance retrieved:', {
        publicKey,
        solBalance: `${solBalance / LAMPORTS_PER_SOL} SOL`,
        tokenCount: tokens.length
      })

      return {
        success: true,
        data: balanceInfo
      }

    } catch (error) {
      console.error(' Failed to get wallet balance:', error)
      
      return {
        success: false,
        error: createRPCConnectionError(
          this.config.solanaRpcUrl,
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  }

  /**
   * Подготавливает транзакцию для отправки
   */
  async prepareTransaction(request: TransactionRequest): Promise<WalletResult<PreparedTransaction>> {
    try {
      console.log(' Preparing transaction:', {
        fromWalletId: request.fromWalletId,
        toAddress: request.toAddress,
        amount: request.amount.toString(),
        token: request.token
      })

      // Валидация получателя
      const toAddressError = validateSolanaAddress(request.toAddress)
      if (toAddressError) {
        return { success: false, error: toAddressError }
      }

      // Валидация суммы
      const amountError = validateAmount(request.amount)
      if (amountError) {
        return { success: false, error: amountError }
      }

      // Получаем кошелек отправителя
      const walletResult = await this.getWalletFromId(request.fromWalletId)
      if (!walletResult.success || !walletResult.data) {
        return { success: false, error: walletResult.error }
      }

      const wallet = walletResult.data
      const fromPublicKey = new PublicKey(wallet.publicKey)
      const toPublicKey = new PublicKey(request.toAddress)

      // Получаем recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')

      let transaction: Transaction

      if (!request.token) {
        // SOL перевод
        transaction = new Transaction({
          feePayer: fromPublicKey,
          recentBlockhash: blockhash
        })

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: toPublicKey,
            lamports: Number(request.amount) // TODO: проверить BigInt conversion
          })
        )
      } else {
        // SPL Token перевод - TODO: реализовать
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INTERNAL_ERROR,
            'SPL Token переводы пока не поддерживаются'
          )
        }
      }

      // Добавляем memo если указан
      if (request.memo) {
        // TODO: добавить memo instruction
      }

      // Оцениваем комиссию
      const feeEstimate = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      )

      const estimatedFee = BigInt(feeEstimate.value || 5000) // fallback 5000 lamports

      // Проверяем баланс
      const balanceResult = await this.getWalletBalance(wallet.publicKey)
      if (!balanceResult.success || !balanceResult.data) {
        return { success: false, error: balanceResult.error }
      }

      const balance = balanceResult.data
      const totalRequired = request.amount + estimatedFee

      if (balance.solBalance < totalRequired) {
        return {
          success: false,
          error: createInsufficientBalanceError(
            wallet.publicKey,
            totalRequired,
            balance.solBalance
          )
        }
      }

      const preparedTx: PreparedTransaction = {
        transaction,
        signers: [`mock_key_for_${wallet.userId}`], // TODO: получить реальный keyId из KMS
        estimatedFee,
        blockhash
      }

      console.log(' Transaction prepared successfully:', {
        estimatedFee: estimatedFee.toString(),
        blockhash: blockhash.substring(0, 8) + '...'
      })

      return {
        success: true,
        data: preparedTx
      }

    } catch (error) {
      console.error(' Failed to prepare transaction:', error)
      
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SIMULATION_FAILED,
          'Ошибка подготовки транзакции',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Отправляет подготовленную транзакцию
   */
  async sendTransaction(preparedTx: PreparedTransaction): Promise<WalletResult<SolanaTransactionInfo>> {
    try {
      console.log(' Sending transaction...')

      // TODO: Подписать транзакцию через KMS
      // Пока используем mock подпись
      
      // Отправляем транзакцию
      const signature = await this.connection.sendTransaction(
        preparedTx.transaction,
        [],
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      )

      console.log(' Transaction sent:', signature)

      // Ждем подтверждения
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: preparedTx.blockhash,
          lastValidBlockHeight: await this.connection.getBlockHeight('finalized') + 150
        },
        'confirmed'
      )

      const txInfo: SolanaTransactionInfo = {
        signature,
        slot: confirmation.context.slot,
        blockTime: new Date(),
        fee: preparedTx.estimatedFee,
        status: confirmation.value.err ? 'failed' : 'confirmed',
        confirmations: 1,
        error: confirmation.value.err?.toString()
      }

      console.log(' Transaction confirmed:', {
        signature,
        slot: confirmation.context.slot,
        status: txInfo.status
      })

      return {
        success: true,
        data: txInfo
      }

    } catch (error) {
      console.error(' Transaction failed:', error)
      
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка отправки транзакции',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Выполняет полный цикл перевода TNG токенов напрямую в blockchain
   */
  async transferTNG(
    fromUserId: string,
    toAddress: string,
    amount: bigint,
    memo?: string,
    priority: TransactionPriority = TransactionPriority.MEDIUM
  ): Promise<WalletResult<SolanaTransactionInfo>> {
    try {
      console.log(' Starting on-chain TNG transfer:', {
        fromUserId,
        toAddress,
        amount: amount.toString(),
        amountTNG: (Number(amount) / 1e9).toFixed(2),
        memo,
        priority
      })

      // Получаем кошелек пользователя
      const walletResult = await this.getOrCreateUserWallet(fromUserId)
      if (!walletResult.success || !walletResult.data) {
        return { success: false, error: walletResult.error }
      }

      // Получаем keypair пользователя из KMS
      const keypairResult = await this.getUserKeypair(fromUserId)
      if (!keypairResult.success || !keypairResult.data) {
        return { success: false, error: keypairResult.error }
      }

      const userKeypair = keypairResult.data
      const toPublicKey = new PublicKey(toAddress)

      // Инициализируем TNG Token Service
      const { TNGTokenService } = require('@/lib/onchain/tng-token.service')
      const tngService = new TNGTokenService(this.connection)

      // Выполняем on-chain перевод TNG токенов
      const transferResult = await tngService.transferTNGTokens(
        userKeypair,
        toPublicKey,
        amount
      )

      if (!transferResult.success || !transferResult.data) {
        return { 
          success: false, 
          error: transferResult.error 
        }
      }

      const transferData = transferResult.data

      // Формируем результат в формате SolanaTransactionInfo
      const txInfo: SolanaTransactionInfo = {
        signature: transferData.signature,
        slot: undefined, // Получим из подтверждения
        blockTime: new Date(),
        fee: BigInt(5000), // Примерная комиссия для SPL transfer
        status: 'confirmed',
        confirmations: 1,
        error: undefined
      }

      console.log(' On-chain TNG transfer completed:', {
        fromUserId,
        toAddress,
        amount: (Number(amount) / 1e9).toFixed(2) + ' TNG',
        signature: txInfo.signature,
        explorerUrl: transferData.explorerUrl,
        fromTokenAccount: transferData.fromTokenAccount,
        toTokenAccount: transferData.toTokenAccount,
        senderNewBalance: (Number(transferData.senderNewBalance) / 1e9).toFixed(2) + ' TNG',
        receiverNewBalance: (Number(transferData.receiverNewBalance) / 1e9).toFixed(2) + ' TNG'
      })

      return {
        success: true,
        data: txInfo
      }

    } catch (error) {
      console.error(' On-chain TNG transfer failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка on-chain перевода TNG токенов',
          { 
            error: error instanceof Error ? error.message : String(error),
            fromUserId,
            toAddress
          }
        )
      }
    }
  }

  /**
   * Выполняет полный цикл перевода SOL с sponsor fee
   */
  async transferSOL(
    fromUserId: string,
    toAddress: string,
    amount: bigint,
    memo?: string,
    priority: TransactionPriority = TransactionPriority.MEDIUM
  ): Promise<WalletResult<SolanaTransactionInfo>> {
    try {
      console.log(' Starting SOL transfer:', {
        fromUserId,
        toAddress,
        amount: amount.toString(),
        memo
      })

      // Получаем кошелек пользователя
      const walletResult = await this.getOrCreateUserWallet(fromUserId)
      if (!walletResult.success || !walletResult.data) {
        return { success: false, error: walletResult.error }
      }

      const wallet = walletResult.data

      // Получаем keypair пользователя из KMS
      const keypairResult = await this.getUserKeypair(fromUserId)
      if (!keypairResult.success || !keypairResult.data) {
        return { success: false, error: keypairResult.error }
      }

      const userKeypair = keypairResult.data

      // Спонсируем SOL перевод
      const sponsorResult = await this.sponsorService.sponsorSOLTransfer(
        userKeypair,
        toAddress,
        amount,
        priority,
        memo
      )

      if (!sponsorResult.success || !sponsorResult.data) {
        return { success: false, error: sponsorResult.error }
      }

      const sponsoredTx = sponsorResult.data

      // Формируем результат в формате SolanaTransactionInfo
      const txInfo: SolanaTransactionInfo = {
        signature: sponsoredTx.signature,
        slot: undefined,
        blockTime: new Date(),
        fee: BigInt(sponsoredTx.fee),
        status: 'confirmed',
        confirmations: 1,
        error: undefined
      }

      console.log(' SOL transfer completed:', {
        signature: sponsoredTx.signature,
        fee: sponsoredTx.fee + ' lamports',
        sponsor: sponsoredTx.sponsorAddress
      })

      return {
        success: true,
        data: txInfo
      }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          'Ошибка выполнения перевода SOL',
          { fromUserId, toAddress, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает баланс TNG токенов для кошелька (on-chain)
   */
  async getTNGBalance(publicKey: string): Promise<WalletResult<bigint>> {
    try {
      console.log(' Getting on-chain TNG balance for:', publicKey)

      // Инициализируем TNG Token Service
      const { TNGTokenService } = require('@/lib/onchain/tng-token.service')
      const tngService = new TNGTokenService(this.connection)

      const userPublicKey = new PublicKey(publicKey)
      const balanceResult = await tngService.getTNGBalance(userPublicKey)

      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: balanceResult.error
        }
      }

      const balance = BigInt(balanceResult.data.balance)

      console.log(' On-chain TNG balance retrieved:', {
        publicKey,
        balance: balance.toString(),
        balanceTNG: (Number(balance) / 1e9).toFixed(2),
        tokenAccount: balanceResult.data.tokenAccount
      })

      return {
        success: true,
        data: balance
      }
      
    } catch (error) {
      console.error(' Error getting on-chain TNG balance:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.RPC_CONNECTION_FAILED,
          'Ошибка получения on-chain TNG баланса',
          { publicKey, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает статистику sponsor системы
   */
  async getSponsorStats() {
    try {
      return await this.sponsorService.getStats()
    } catch (error) {
      console.error('Error getting sponsor stats:', error)
      return null
    }
  }

  /**
   * Проверяет доступность спонсирования для пользователя
   */
  async canSponsorTransaction(userId: string, operation: SponsorOperation): Promise<boolean> {
    try {
      const walletResult = await this.getOrCreateUserWallet(userId)
      if (!walletResult.success || !walletResult.data) {
        return false
      }

      return await this.sponsorService.canSponsor(
        walletResult.data.publicKey,
        operation
      )
    } catch (error) {
      console.error('Error checking sponsor availability:', error)
      return false
    }
  }

  /**
   * Получает информацию о статусе соединения
   */
  async getConnectionStatus() {
    try {
      const version = await this.connection.getVersion()
      const slot = await this.connection.getSlot()
      const blockHeight = await this.connection.getBlockHeight()

      return {
        connected: true,
        cluster: this.config.solanaRpcUrl,
        version: version['solana-core'],
        slot,
        blockHeight,
        network: this.config.solanaRpcUrl.includes('devnet') ? 'devnet' : 
                  this.config.solanaRpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
      }
    } catch (error) {
      return {
        connected: false,
        cluster: this.config.solanaRpcUrl,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // === PRIVATE METHODS ===

  private async getWalletFromId(walletId: string): Promise<WalletResult<CustodialWallet>> {
    try {
      // walletId format: "wallet_{userId}"
      const userId = walletId.replace('wallet_', '')
      return await this.generatorService.getUserCustodialWallet(userId)
    } catch (error) {
      return {
        success: false,
        error: createWalletNotFoundError(walletId)
      }
    }
  }

  /**
   * Получает Keypair пользователя из KMS
   */
  async getUserKeypair(userId: string): Promise<WalletResult<Keypair>> {
    try {
      // Getting existing custodial keypair - silent for production

      // Используем тот же процесс что и для получения custodial кошелька
      const walletResult = await this.generatorService.getUserCustodialWallet(userId)
      if (!walletResult.success || !walletResult.data) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.KMS_KEY_NOT_FOUND,
            'Custodial кошелек пользователя не найден. Сначала создайте кошелек.'
          )
        }
      }

      const wallet = walletResult.data
      // Found custodial wallet - silent for production

      // Получаем keypair через generator service (который имеет доступ к приватным ключам)
      const keypairResult = await this.generatorService.getUserKeypair(userId)
      if (!keypairResult.success || !keypairResult.data) {
        return {
          success: false,
          error: keypairResult.error || createWalletError(
            WalletErrorCode.KMS_ACCESS_DENIED,
            'Не удалось получить приватный ключ пользователя'
          )
        }
      }

      return {
        success: true,
        data: keypairResult.data
      }
      
    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.KMS_ACCESS_DENIED,
          'Ошибка получения keypair пользователя',
          { userId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Извлекает Keypair из Mock KMS
   */
  private async extractKeypairFromKMS(keyId: string): Promise<Keypair> {
    // Извлекаем userId из keyId формата encrypted_<userId>
    const userId = keyId.replace(/^encrypted_/, '')

    // Читаем зашифрованный ключ из БД и расшифровываем
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { encryptedPrivateKey: true }
    })

    if (!user?.encryptedPrivateKey) {
      throw new Error(`Encrypted key not found for user: ${userId}`)
    }

    const encryptionService = new (require('./encryption.service').KeyEncryptionService)()
    const encrypted = encryptionService.deserializeEncryptedKey(user.encryptedPrivateKey)
    const secretKey = encryptionService.decryptPrivateKey(encrypted, userId)

    return Keypair.fromSecretKey(secretKey)
  }

  /**
   * Получает индекс пользователя для derivation path
   */
  private async getUserIndex(userId: string): Promise<number> {
    try {
      // Простая реализация: используем hash от userId
      let hash = 0
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return Math.abs(hash) % 1000000 // ограничиваем диапазон
    } catch (error) {
      // Fallback на случайное число
      return Math.floor(Math.random() * 1000000)
    }
  }
}
