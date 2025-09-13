/**
 * Withdrawal Service - Process outgoing on-chain withdrawals
 * Solana SuperApp
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram
} from '@solana/web3.js'
import { PrismaClient, LedgerDirection, LedgerTxType, OnchainTxStatus, OnchainPurpose } from '@prisma/client'
import {
  WithdrawalRequest,
  WithdrawalInfo,
  WithdrawalStatus,
  TransactionPriority,
  OnchainResult,
  OnchainError,
  OnchainErrorCode,
  DEFAULT_PRIORITY_FEES,
  SUPPORTED_TOKENS
} from './types'
import {
  createOnchainError,
  createInsufficientFundsError,
  createWithdrawalPreparationError,
  createWithdrawalSigningError,
  validateSolanaAddress,
  validateAmount,
  validateTokenMint
} from './errors'
import { CustodialWalletService } from '@/lib/wallet'
import { LedgerService } from '@/lib/ledger'
import { MockKMSService } from '@/lib/wallet/mock-kms.service'

export class WithdrawalService {
  private readonly connection: Connection
  private readonly prisma: PrismaClient
  private readonly walletService: CustodialWalletService
  private readonly ledgerService: LedgerService
  private readonly kmsService: MockKMSService

  constructor(
    connection: Connection,
    prisma: PrismaClient,
    walletService: CustodialWalletService
  ) {
    this.connection = connection
    this.prisma = prisma
    this.walletService = walletService
    this.ledgerService = new LedgerService(prisma)
    this.kmsService = new MockKMSService()

    console.log(' WithdrawalService initialized:', {
      endpoint: connection.rpcEndpoint
    })
  }

  /**
   * Выполняет полный цикл вывода средств
   */
  async processWithdrawal(request: WithdrawalRequest): Promise<OnchainResult<WithdrawalInfo>> {
    try {
      console.log(' Starting withdrawal process:', {
        fromUserId: request.fromUserId,
        toAddress: request.toAddress,
        amount: request.amount.toString(),
        token: request.token || 'SOL'
      })

      // Валидация запроса
      const validationError = await this.validateWithdrawalRequest(request)
      if (validationError) {
        return { success: false, error: validationError }
      }

      // Создаем запись о выводе
      const withdrawalInfo = await this.createWithdrawalRecord(request)

      try {
        // 1. Подготавливаем транзакцию
        const prepareResult = await this.prepareWithdrawalTransaction(withdrawalInfo)
        if (!prepareResult.success || !prepareResult.data) {
          await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.FAILED, prepareResult.error?.message)
          return { success: false, error: prepareResult.error }
        }

        const { transaction, keyId } = prepareResult.data

        // 2. Подписываем транзакцию
        const signResult = await this.signTransaction(transaction, keyId)
        if (!signResult.success || !signResult.data) {
          await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.FAILED, signResult.error?.message)
          return { success: false, error: signResult.error }
        }

        const signedTransaction = signResult.data
        await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.SIGNED)

        // 3. Отправляем транзакцию
        const submitResult = await this.submitTransaction(signedTransaction)
        if (!submitResult.success || !submitResult.data) {
          await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.FAILED, submitResult.error?.message)
          return { success: false, error: submitResult.error }
        }

        const signature = submitResult.data
        await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.SUBMITTED, undefined, signature)

        // 4. Создаем записи в леджере и on-chain таблице
        await this.finalizeWithdrawal(withdrawalInfo, signature, transaction)

        // 5. Ждем подтверждения
        const confirmResult = await this.waitForConfirmation(signature)
        if (confirmResult.success) {
          await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.CONFIRMED)
        }

        withdrawalInfo.signature = signature
        withdrawalInfo.status = WithdrawalStatus.CONFIRMED
        withdrawalInfo.confirmedAt = new Date()

        console.log(' Withdrawal completed successfully:', {
          signature,
          userId: request.fromUserId,
          amount: request.amount.toString()
        })

        return {
          success: true,
          data: withdrawalInfo
        }

      } catch (error) {
        await this.updateWithdrawalStatus(withdrawalInfo.id, WithdrawalStatus.FAILED, error instanceof Error ? error.message : String(error))
        throw error
      }

    } catch (error) {
      console.error(' Withdrawal failed:', error)
      
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.WITHDRAWAL_PREPARATION_FAILED,
          'Ошибка обработки вывода',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Валидирует запрос на вывод
   */
  private async validateWithdrawalRequest(request: WithdrawalRequest): Promise<OnchainError | null> {
    // Валидация адреса получателя
    const addressError = validateSolanaAddress(request.toAddress)
    if (addressError) return addressError

    // Валидация суммы
    const amountError = validateAmount(request.amount)
    if (amountError) return amountError

    // Валидация токена
    if (request.token) {
      const tokenError = validateTokenMint(request.token)
      if (tokenError) return tokenError
    }

    // Проверка баланса (если запрошено)
    if (request.validateBalance !== false) {
      const balanceCheck = await this.validateUserBalance(request)
      if (balanceCheck) return balanceCheck
    }

    return null
  }

  /**
   * Проверяет баланс пользователя
   */
  private async validateUserBalance(request: WithdrawalRequest): Promise<OnchainError | null> {
    try {
      const assetSymbol = request.token ? 
                         (request.token === SUPPORTED_TOKENS.TNG ? 'TNG' : 
                          request.token === SUPPORTED_TOKENS.USDC ? 'USDC' : 'UNKNOWN') : 'SOL'

      if (assetSymbol === 'UNKNOWN') {
        return createOnchainError(
          OnchainErrorCode.INVALID_TOKEN_MINT,
          'Неподдерживаемый токен',
          { token: request.token }
        )
      }

      // Получаем баланс через ledger service
      const balanceResult = await this.ledgerService.getUserTransactionHistory(
        request.fromUserId,
        assetSymbol,
        { page: 1, limit: 1 }
      )

      // TODO: Более точная проверка баланса через BalanceService
      // Пока пропускаем проверку для упрощения

      return null

    } catch (error) {
      return createOnchainError(
        OnchainErrorCode.INTERNAL_ERROR,
        'Ошибка проверки баланса',
        { error: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  /**
   * Создает запись о выводе в БД
   */
  private async createWithdrawalRecord(request: WithdrawalRequest): Promise<WithdrawalInfo> {
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      // Пока создаем минимальную запись
      // TODO: Добавить отдельную таблицу withdrawals
      return {
        id: `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.fromUserId,
        amount: request.amount,
        token: request.token || 'SOL',
        toAddress: request.toAddress,
        status: WithdrawalStatus.PENDING,
        createdAt: new Date()
      } as WithdrawalInfo
    })

    return withdrawal
  }

  /**
   * Подготавливает транзакцию для вывода
   */
  private async prepareWithdrawalTransaction(
    withdrawal: WithdrawalInfo
  ): Promise<OnchainResult<{ transaction: Transaction, keyId: string }>> {
    try {
      // Получаем кошелек пользователя
      const walletResult = await this.walletService.getOrCreateUserWallet(withdrawal.userId)
      if (!walletResult.success || !walletResult.data) {
        return {
          success: false,
          error: createWithdrawalPreparationError('Кошелек пользователя не найден')
        }
      }

      const wallet = walletResult.data
      const fromPublicKey = new PublicKey(wallet.publicKey)
      const toPublicKey = new PublicKey(withdrawal.toAddress)

      // Получаем recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')

      // Создаем транзакцию
      const transaction = new Transaction({
        feePayer: fromPublicKey,
        recentBlockhash: blockhash
      })

      if (withdrawal.token === 'SOL' || !withdrawal.token) {
        // SOL перевод
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: toPublicKey,
            lamports: Number(withdrawal.amount)
          })
        )
      } else {
        // SPL Token перевод - TODO: реализовать
        return {
          success: false,
          error: createWithdrawalPreparationError('SPL Token выводы пока не поддерживаются')
        }
      }

      // Добавляем priority fee
      const priorityFee = DEFAULT_PRIORITY_FEES[TransactionPriority.MEDIUM]
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee
        })
      )

      // TODO: Получить реальный keyId из KMS для пользователя
      const keyId = `mock_key_for_${withdrawal.userId}`

      return {
        success: true,
        data: { transaction, keyId }
      }

    } catch (error) {
      return {
        success: false,
        error: createWithdrawalPreparationError(
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  }

  /**
   * Подписывает транзакцию через KMS
   */
  private async signTransaction(
    transaction: Transaction,
    keyId: string
  ): Promise<OnchainResult<Transaction>> {
    try {
      // Сериализуем транзакцию для подписи
      const message = transaction.compileMessage()
      const messageBytes = message.serialize()

      // Подписываем через Mock KMS
      const signResult = await this.kmsService.sign({
        keyId,
        message: messageBytes
      })

      if (!signResult.success || !signResult.data) {
        return {
          success: false,
          error: createWithdrawalSigningError(keyId, signResult.error?.message || 'Подпись не удалась')
        }
      }

      // TODO: Правильно применить подпись к транзакции
      // Пока возвращаем неподписанную транзакцию
      console.warn(' Mock signing - transaction not actually signed!')

      return {
        success: true,
        data: transaction
      }

    } catch (error) {
      return {
        success: false,
        error: createWithdrawalSigningError(
          keyId,
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  }

  /**
   * Отправляет подписанную транзакцию
   */
  private async submitTransaction(transaction: Transaction): Promise<OnchainResult<string>> {
    try {
      const signature = await this.connection.sendTransaction(
        transaction,
        [],
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      )

      return {
        success: true,
        data: signature
      }

    } catch (error) {
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.WITHDRAWAL_SUBMISSION_FAILED,
          'Ошибка отправки транзакции',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Ждет подтверждения транзакции
   */
  private async waitForConfirmation(signature: string): Promise<OnchainResult<boolean>> {
    try {
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed')
      
      return {
        success: !confirmation.value.err,
        data: !confirmation.value.err
      }

    } catch (error) {
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.TRANSACTION_TIMEOUT,
          'Таймаут ожидания подтверждения',
          { signature, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Финализирует вывод - создает записи в леджере и БД
   */
  private async finalizeWithdrawal(
    withdrawal: WithdrawalInfo,
    signature: string,
    transaction: Transaction
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Создаем on-chain запись
      const assetId = await this.getAssetIdBySymbol(withdrawal.token)
      
      await tx.onchainTx.create({
        data: {
          userId: withdrawal.userId,
          signature,
          status: OnchainTxStatus.PENDING,
          purpose: OnchainPurpose.WITHDRAW,
          amount: withdrawal.amount,
          assetId,
          toAddress: withdrawal.toAddress,
          rawTx: transaction as any
        }
      })

      // 2. Создаем запись в леджере (списание)
      const assetSymbol = withdrawal.token === 'SOL' ? 'SOL' :
                         withdrawal.token === SUPPORTED_TOKENS.TNG ? 'TNG' :
                         withdrawal.token === SUPPORTED_TOKENS.USDC ? 'USDC' : 'SOL'

      await this.ledgerService.createLedgerEntry({
        userId: withdrawal.userId,
        assetSymbol,
        direction: LedgerDirection.DEBIT,
        amount: withdrawal.amount,
        txType: LedgerTxType.WITHDRAW_ONCHAIN,
        txRef: signature,
        description: `Вывод ${assetSymbol} в блокчейн`,
        metadata: {
          toAddress: withdrawal.toAddress,
          withdrawalId: withdrawal.id
        },
        idempotencyKey: `withdrawal_${signature}`
      })
    })
  }

  /**
   * Обновляет статус вывода
   */
  private async updateWithdrawalStatus(
    withdrawalId: string,
    status: WithdrawalStatus,
    error?: string,
    signature?: string
  ): Promise<void> {
    try {
      // TODO: Обновить в отдельной таблице withdrawals
      console.log(` Withdrawal ${withdrawalId} status updated to: ${status}`, { error, signature })
    } catch (error) {
      console.error('Failed to update withdrawal status:', error)
    }
  }

  /**
   * Получает asset ID по символу
   */
  private async getAssetIdBySymbol(tokenSymbol: string): Promise<string> {
    const symbol = tokenSymbol === 'SOL' ? 'SOL' :
                   tokenSymbol === SUPPORTED_TOKENS.TNG ? 'TNG' :
                   tokenSymbol === SUPPORTED_TOKENS.USDC ? 'USDC' : 'SOL'

    const asset = await this.prisma.asset.findUnique({
      where: { symbol }
    })

    return asset?.id || 'unknown'
  }

  /**
   * Получает статистику выводов
   */
  async getWithdrawalStats(timeframeHours = 24) {
    try {
      const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

      const stats = await this.prisma.onchainTx.groupBy({
        by: ['purpose'],
        where: {
          purpose: OnchainPurpose.WITHDRAW,
          createdAt: { gte: since }
        },
        _count: true,
        _sum: { amount: true }
      })

      return {
        timeframeHours,
        totalWithdrawals: stats[0]?._count || 0,
        totalAmount: stats[0]?._sum.amount?.toString() || '0',
        timestamp: new Date()
      }

    } catch (error) {
      return {
        error: 'Failed to get withdrawal stats',
        timestamp: new Date()
      }
    }
  }
}
