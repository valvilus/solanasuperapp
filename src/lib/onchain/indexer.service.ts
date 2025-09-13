/**
 * Transaction Indexer - Automated monitoring and processing of blockchain events
 * Solana SuperApp
 */

import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js'
import { PrismaClient } from '@prisma/client'
import {
  IndexerConfig,
  TransactionEvent,
  OnchainResult,
  OnchainError,
  OnchainErrorCode
} from './types'
import {
  createOnchainError,
  createIndexerError
} from './errors'
import { DepositService } from './deposit.service'

export class TransactionIndexer {
  private readonly connection: Connection
  private readonly prisma: PrismaClient
  private readonly depositService: DepositService
  private readonly config: IndexerConfig
  private isRunning = false
  private intervalId?: NodeJS.Timeout
  private lastProcessedSlot = 0

  constructor(
    connection: Connection,
    prisma: PrismaClient,
    config: IndexerConfig
  ) {
    this.connection = connection
    this.prisma = prisma
    this.depositService = new DepositService(connection, prisma)
    this.config = config

    console.log(' TransactionIndexer initialized:', {
      endpoint: connection.rpcEndpoint,
      pollInterval: config.pollIntervalMs,
      filterAccounts: config.filterAccounts.length,
      batchSize: config.batchSize
    })
  }

  /**
   * Запускает индексер
   */
  async start(): Promise<OnchainResult<boolean>> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          error: createIndexerError('Индексер уже запущен')
        }
      }

      console.log(' Starting transaction indexer...')

      // Получаем стартовый slot
      if (!this.config.startSlot) {
        const currentSlot = await this.connection.getSlot('confirmed')
        this.lastProcessedSlot = currentSlot
        console.log(` Starting from current slot: ${currentSlot}`)
      } else {
        this.lastProcessedSlot = this.config.startSlot
        console.log(` Starting from configured slot: ${this.config.startSlot}`)
      }

      this.isRunning = true

      // Запускаем периодический опрос
      this.intervalId = setInterval(async () => {
        try {
          await this.processNewTransactions()
        } catch (error) {
          console.error(' Indexer processing error:', error)
          // Продолжаем работу несмотря на ошибки
        }
      }, this.config.pollIntervalMs)

      console.log(' Transaction indexer started successfully')

      return {
        success: true,
        data: true
      }

    } catch (error) {
      this.isRunning = false
      console.error(' Failed to start indexer:', error)
      
      return {
        success: false,
        error: createIndexerError(
          `Ошибка запуска индексера: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }

  /**
   * Останавливает индексер
   */
  async stop(): Promise<void> {
    console.log(' Stopping transaction indexer...')
    
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    
    console.log(' Transaction indexer stopped')
  }

  /**
   * Обрабатывает новые транзакции для отслеживаемых адресов
   */
  private async processNewTransactions(): Promise<void> {
    try {
      console.log(' Processing new transactions...')

      const currentSlot = await this.connection.getSlot('confirmed')
      console.log(` Current slot: ${currentSlot}, last processed: ${this.lastProcessedSlot}`)

      // Обрабатываем каждый отслеживаемый адрес
      for (const address of this.config.filterAccounts) {
        try {
          await this.processAddressTransactions(address)
        } catch (error) {
          console.error(` Error processing address ${address}:`, error)
          // Продолжаем с другими адресами
        }
      }

      this.lastProcessedSlot = currentSlot

    } catch (error) {
      console.error(' Error in processNewTransactions:', error)
      throw error
    }
  }

  /**
   * Обрабатывает транзакции для конкретного адреса
   */
  private async processAddressTransactions(address: string): Promise<void> {
    try {
      const publicKey = new PublicKey(address)

      // Получаем последние транзакции
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        {
          limit: this.config.batchSize,
          before: undefined // получаем самые новые
        }
      )

      console.log(` Found ${signatures.length} transactions for ${address}`)

      // Обрабатываем каждую транзакцию
      for (const sigInfo of signatures) {
        await this.processSignature(sigInfo, address)
      }

    } catch (error) {
      console.error(` Error processing address ${address}:`, error)
      throw error
    }
  }

  /**
   * Обрабатывает конкретную подпись транзакции
   */
  private async processSignature(
    sigInfo: ConfirmedSignatureInfo,
    custodialAddress: string
  ): Promise<void> {
    try {
      const signature = sigInfo.signature

      // Проверяем, не обработана ли уже эта транзакция
      const existingTx = await this.prisma.onchainTx.findFirst({
        where: { signature }
      })

      if (existingTx) {
        console.log(` Transaction already processed: ${signature}`)
        return
      }

      console.log(` Processing new transaction: ${signature}`)

      // Обрабатываем как потенциальный депозит
      const depositResult = await this.depositService.processTransaction(
        signature,
        custodialAddress
      )

      if (!depositResult.success) {
        console.warn(` Failed to process transaction ${signature}:`, depositResult.error?.message)
        return
      }

      const depositInfo = depositResult.data
      if (depositInfo) {
        console.log(` Processed deposit: ${signature}`, {
          amount: depositInfo.amount.toString(),
          token: depositInfo.token,
          userId: depositInfo.userId
        })

        // Отправляем webhook если настроен
        if (this.config.webhookUrl) {
          await this.sendWebhook('deposit', depositInfo)
        }
      } else {
        console.log(` Transaction ${signature} is not a deposit`)
      }

    } catch (error) {
      console.error(` Error processing signature ${sigInfo.signature}:`, error)
      // Не прерываем обработку других транзакций
    }
  }

  /**
   * Отправляет webhook уведомление
   */
  private async sendWebhook(type: 'deposit' | 'withdrawal' | 'error', data: any): Promise<void> {
    try {
      if (!this.config.webhookUrl) return

      const payload = {
        type,
        data,
        timestamp: new Date().toISOString(),
        source: 'solana-indexer'
      }

      console.log(` Sending webhook: ${type}`)

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Solana-SuperApp-Indexer/1.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error(` Webhook delivery failed: ${response.status}`)
      } else {
        console.log(` Webhook delivered successfully`)
      }

    } catch (error) {
      console.error(' Webhook error:', error)
    }
  }

  /**
   * Получает статус индексера
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastProcessedSlot: this.lastProcessedSlot,
      config: {
        pollIntervalMs: this.config.pollIntervalMs,
        batchSize: this.config.batchSize,
        filterAccounts: this.config.filterAccounts.length,
        webhookConfigured: !!this.config.webhookUrl
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Принудительно обрабатывает транзакции (для тестирования)
   */
  async forceProcess(): Promise<OnchainResult<number>> {
    try {
      console.log(' Force processing transactions...')

      let processedCount = 0

      for (const address of this.config.filterAccounts) {
        try {
          await this.processAddressTransactions(address)
          processedCount++
        } catch (error) {
          console.error(` Error force processing ${address}:`, error)
        }
      }

      return {
        success: true,
        data: processedCount
      }

    } catch (error) {
      return {
        success: false,
        error: createIndexerError(
          `Ошибка принудительной обработки: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }

  /**
   * Получает статистику работы индексера
   */
  async getIndexerStats(timeframeHours = 24) {
    try {
      const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

      // Статистика депозитов
      const depositStats = await this.prisma.onchainTx.groupBy({
        by: ['purpose'],
        where: {
          purpose: 'DEPOSIT',
          createdAt: { gte: since }
        },
        _count: true,
        _sum: { amount: true }
      })

      // Статистика выводов
      const withdrawalStats = await this.prisma.onchainTx.groupBy({
        by: ['purpose'],
        where: {
          purpose: 'WITHDRAW',
          createdAt: { gte: since }
        },
        _count: true,
        _sum: { amount: true }
      })

      return {
        timeframeHours,
        deposits: {
          count: depositStats[0]?._count || 0,
          totalAmount: depositStats[0]?._sum.amount?.toString() || '0'
        },
        withdrawals: {
          count: withdrawalStats[0]?._count || 0,
          totalAmount: withdrawalStats[0]?._sum.amount?.toString() || '0'
        },
        indexer: this.getStatus(),
        timestamp: new Date()
      }

    } catch (error) {
      return {
        error: 'Failed to get indexer stats',
        timestamp: new Date()
      }
    }
  }
}
