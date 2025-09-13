/**
 * Deposit Service - Monitor and process incoming on-chain deposits
 * Solana SuperApp
 */

import { Connection, PublicKey, ParsedTransactionWithMeta, ParsedInstruction } from '@solana/web3.js'
import { PrismaClient, LedgerDirection, LedgerTxType, OnchainTxStatus, OnchainPurpose } from '@prisma/client'
import {
  DepositRequest,
  DepositInfo,
  DepositMonitorConfig,
  OnchainResult,
  OnchainError,
  OnchainErrorCode,
  SUPPORTED_TOKENS
} from './types'
import {
  createOnchainError,
  createRPCConnectionError,
  createDepositNotFoundError,
  createDepositAlreadyProcessedError,
  validateSolanaAddress,
  validateAmount
} from './errors'
import { LedgerService } from '@/lib/ledger'

export class DepositService {
  private readonly connection: Connection
  private readonly prisma: PrismaClient
  private readonly ledgerService: LedgerService
  private readonly config: DepositMonitorConfig

  constructor(
    connection: Connection,
    prisma: PrismaClient,
    config?: Partial<DepositMonitorConfig>
  ) {
    this.connection = connection
    this.prisma = prisma
    this.ledgerService = new LedgerService(prisma)
    
    this.config = {
      pollIntervalMs: 5000,
      maxRetries: 3,
      confirmationThreshold: 1,
      timeoutMs: 300000, // 5 минут
      ...config
    }

    console.log(' DepositService initialized:', {
      endpoint: connection.rpcEndpoint,
      pollInterval: this.config.pollIntervalMs,
      confirmationThreshold: this.config.confirmationThreshold
    })
  }

  /**
   * Мониторит депозиты для конкретного пользователя/адреса
   */
  async monitorDeposits(custodialAddress: string): Promise<OnchainResult<DepositInfo[]>> {
    try {
      console.log(' Starting deposit monitoring for:', custodialAddress)

      // Валидация адреса
      const addressError = validateSolanaAddress(custodialAddress)
      if (addressError) {
        return { success: false, error: addressError }
      }

      const publicKey = new PublicKey(custodialAddress)

      // Получаем последние транзакции для адреса
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        {
          limit: 10 // получаем последние 10 транзакций
        }
      )

      console.log(` Found ${signatures.length} recent transactions`)

      const deposits: DepositInfo[] = []

      for (const sigInfo of signatures) {
        // Пропускаем уже обработанные транзакции
        const existingTx = await this.prisma.onchainTx.findFirst({
          where: { signature: sigInfo.signature }
        })

        if (existingTx) {
          console.log(` Skipping already processed transaction: ${sigInfo.signature}`)
          continue
        }

        // Обрабатываем новую транзакцию
        const depositResult = await this.processTransaction(
          sigInfo.signature,
          custodialAddress
        )

        if (depositResult.success && depositResult.data) {
          deposits.push(depositResult.data)
        }
      }

      console.log(` Processed ${deposits.length} new deposits`)

      return {
        success: true,
        data: deposits
      }

    } catch (error) {
      console.error(' Deposit monitoring failed:', error)
      
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.INDEXER_ERROR,
          'Ошибка мониторинга депозитов',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Обрабатывает конкретную транзакцию и определяет является ли она депозитом
   */
  async processTransaction(
    signature: string,
    custodialAddress: string
  ): Promise<OnchainResult<DepositInfo | null>> {
    try {
      console.log(' Processing transaction:', signature)

      // Получаем детали транзакции
      const transaction = await this.connection.getParsedTransaction(
        signature,
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        }
      )

      if (!transaction) {
        return {
          success: false,
          error: createDepositNotFoundError(signature)
        }
      }

      // Проверяем что транзакция успешна
      if (transaction.meta?.err) {
        console.log(` Transaction failed: ${JSON.stringify(transaction.meta.err)}`)
        return { success: true, data: null }
      }

      // Анализируем инструкции транзакции
      const depositInfo = await this.analyzeTransactionForDeposit(
        transaction,
        custodialAddress,
        signature
      )

      if (!depositInfo) {
        return { success: true, data: null }
      }

      // Сохраняем в БД и создаем запись в леджере
      const processedDeposit = await this.saveDepositToDatabase(depositInfo, transaction)

      console.log(' Deposit processed:', {
        signature,
        amount: depositInfo.amount.toString(),
        token: depositInfo.token
      })

      return {
        success: true,
        data: processedDeposit
      }

    } catch (error) {
      console.error(' Transaction processing failed:', error)
      
      return {
        success: false,
        error: createOnchainError(
          OnchainErrorCode.TRANSACTION_FAILED,
          'Ошибка обработки транзакции',
          { signature, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Анализирует транзакцию и извлекает информацию о депозите
   */
  private async analyzeTransactionForDeposit(
    transaction: ParsedTransactionWithMeta,
    custodialAddress: string,
    signature: string
  ): Promise<DepositInfo | null> {
    try {
      const custodialPubkey = new PublicKey(custodialAddress)

      // Проверяем SOL балансы (pre vs post)
      const accountIndex = transaction.transaction.message.accountKeys.findIndex(
        key => key.pubkey.equals(custodialPubkey)
      )

      if (accountIndex !== -1) {
        const preBalance = transaction.meta?.preBalances[accountIndex] || 0
        const postBalance = transaction.meta?.postBalances[accountIndex] || 0
        const balanceDiff = postBalance - preBalance

        if (balanceDiff > 0) {
          // Найден SOL депозит
          console.log(` Found SOL deposit: ${balanceDiff} lamports`)

          // Ищем пользователя по custodial адресу
          const user = await this.prisma.user.findUnique({
            where: { walletAddress: custodialAddress }
          })

          if (!user) {
            console.warn(` No user found for custodial address: ${custodialAddress}`)
            return null
          }

          return {
            id: `deposit_${signature}`,
            userId: user.id,
            signature,
            amount: BigInt(balanceDiff),
            token: 'SOL',
            status: OnchainTxStatus.CONFIRMED,
            slot: transaction.slot,
            blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000) : new Date(),
            confirmations: 1,
            createdAt: new Date()
          }
        }
      }

      // TODO: Анализ SPL Token депозитов
      // Проверяем инструкции на наличие SPL token transfers

      for (const instruction of transaction.transaction.message.instructions) {
        if ('parsed' in instruction && instruction.parsed) {
          const parsed = instruction.parsed as ParsedInstruction

          if ((parsed as any).type === 'transfer' && (parsed as any).info) {
            // SPL Token transfer
            const info = (parsed as any).info
            
            if (info.destination === custodialAddress) {
              // Найден SPL token депозит
              console.log(` Found SPL token deposit:`, info)

              // Находим mint address
              const mintAddress = await this.getTokenMintFromTransaction(transaction, info)
              
              if (mintAddress && (mintAddress === SUPPORTED_TOKENS.TNG || mintAddress === SUPPORTED_TOKENS.USDC)) {
                const user = await this.prisma.user.findUnique({
                  where: { walletAddress: custodialAddress }
                })

                if (!user) return null

                return {
                  id: `deposit_${signature}`,
                  userId: user.id,
                  signature,
                  amount: BigInt(info.amount || 0),
                  token: mintAddress,
                  status: OnchainTxStatus.CONFIRMED,
                  slot: transaction.slot,
                  blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000) : new Date(),
                  confirmations: 1,
                  createdAt: new Date()
                }
              }
            }
          }
        }
      }

      return null

    } catch (error) {
      console.error(' Error analyzing transaction:', error)
      return null
    }
  }

  /**
   * Сохраняет депозит в базу данных и создает запись в леджере
   */
  private async saveDepositToDatabase(
    depositInfo: DepositInfo,
    transaction: ParsedTransactionWithMeta
  ): Promise<DepositInfo> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Сохраняем on-chain транзакцию
      const onchainTx = await tx.onchainTx.create({
        data: {
          userId: depositInfo.userId,
          signature: depositInfo.signature,
          status: depositInfo.status,
          slot: BigInt(depositInfo.slot || 0),
          blockTime: depositInfo.blockTime,
          purpose: OnchainPurpose.DEPOSIT,
          amount: depositInfo.amount,
          assetId: await this.getAssetIdBySymbol(depositInfo.token),
          rawTx: transaction as any,
          confirmedAt: new Date()
        }
      })

      // 2. Создаем запись в леджере
      const assetSymbol = depositInfo.token === 'SOL' ? 'SOL' : 
                         depositInfo.token === SUPPORTED_TOKENS.TNG ? 'TNG' : 
                         depositInfo.token === SUPPORTED_TOKENS.USDC ? 'USDC' : 'UNKNOWN'

      if (assetSymbol !== 'UNKNOWN') {
        await this.ledgerService.createLedgerEntry({
          userId: depositInfo.userId,
          assetSymbol,
          direction: LedgerDirection.CREDIT,
          amount: depositInfo.amount,
          txType: LedgerTxType.DEPOSIT_ONCHAIN,
          txRef: depositInfo.signature,
          description: `Депозит ${assetSymbol} с блокчейна`,
          metadata: {
            onchainTxId: onchainTx.id,
            slot: depositInfo.slot,
            blockTime: depositInfo.blockTime?.toISOString()
          },
          idempotencyKey: `deposit_${depositInfo.signature}`
        })
      }

      // 3. Обновляем статус обработки
      depositInfo.processedAt = new Date()

      return depositInfo
    })
  }

  /**
   * Получает asset ID по символу токена
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
   * Извлекает mint address из SPL token транзакции
   */
  private async getTokenMintFromTransaction(
    transaction: ParsedTransactionWithMeta,
    transferInfo: any
  ): Promise<string | null> {
    try {
      // Простая реализация - возвращаем TNG mint если это наш токен
      // В продакшене нужно правильно парсить token account
      return SUPPORTED_TOKENS.TNG
    } catch (error) {
      return null
    }
  }

  /**
   * Получает статистику депозитов
   */
  async getDepositStats(timeframeHours = 24) {
    try {
      const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

      const stats = await this.prisma.onchainTx.groupBy({
        by: ['purpose'],
        where: {
          purpose: OnchainPurpose.DEPOSIT,
          createdAt: { gte: since }
        },
        _count: true,
        _sum: { amount: true }
      })

      return {
        timeframeHours,
        totalDeposits: stats[0]?._count || 0,
        totalAmount: stats[0]?._sum.amount?.toString() || '0',
        timestamp: new Date()
      }

    } catch (error) {
      return {
        error: 'Failed to get deposit stats',
        timestamp: new Date()
      }
    }
  }
}
