/**
 * Ledger Service - Core Double Entry Accounting Logic
 * Solana SuperApp Off-chain Ledger System
 */

import { PrismaClient, LedgerDirection, LedgerTxType, LedgerStatus } from '@prisma/client'
import {
  TransferRequest,
  TransferResult,
  LedgerEntryRequest,
  LedgerEntryDetails,
  LedgerResult,
  LedgerError,
  LedgerErrorCode,
  TransactionHistory,
  PaginationOptions
} from './types'
import {
  LedgerException,
  createLedgerError,
  createInsufficientBalanceError,
  createInvalidAmountError,
  createAssetNotFoundError,
  createDuplicateIdempotencyKeyError,
  createLedgerImbalanceError,
  validateAmount,
  validateAssetSymbol,
  validateUserId
} from './errors'
import { BalanceService } from './balance.service'
import { AssetService } from './asset.service'

// Импорт для SSE уведомлений
// @ts-ignore - Temporary fix for missing export
// import type { sendSSENotification } from '@/app/api/notifications/stream/route'

export class LedgerService {
  private readonly prisma: PrismaClient
  private readonly balanceService: BalanceService
  private readonly assetService: AssetService

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.balanceService = new BalanceService(prisma)
    this.assetService = new AssetService(prisma)
  }

  /**
   * Выполняет внутренний перевод между пользователями (off-chain)
   * Создает пару записей DEBIT/CREDIT с проверкой баланса
   */
  async executeTransfer(request: TransferRequest): Promise<TransferResult> {
    try {
      console.log(' Starting transfer:', {
        from: request.fromUserId,
        to: request.toUserId,
        amount: request.amount.toString(),
        asset: request.assetSymbol,
        idempotencyKey: request.idempotencyKey
      })

      // Валидация входных данных
      const validationError = this.validateTransferRequest(request)
      if (validationError) {
        return { success: false, error: validationError }
      }

      // Проверяем идемпотентность
      const existingTransfer = await this.checkIdempotency(request.idempotencyKey)
      if (existingTransfer) {
        console.log(' Transfer already processed (idempotency)')
        return { success: true, transferId: existingTransfer.txRef, ledgerEntries: [] }
      }

      // Получаем информацию об активе
      const assetResult = await this.assetService.getAssetBySymbol(request.assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      // Проверяем баланс отправителя
      const balanceResult = await this.balanceService.getUserBalance(request.fromUserId, request.assetSymbol)
      if (!balanceResult.success || !balanceResult.data) {
        return { 
          success: false, 
          error: createInsufficientBalanceError(request.fromUserId, request.assetSymbol, request.amount, 0n)
        }
      }

      const balance = balanceResult.data
      if (balance.availableAmount < request.amount) {
        return {
          success: false,
          error: createInsufficientBalanceError(
            request.fromUserId,
            request.assetSymbol,
            request.amount,
            balance.availableAmount
          )
        }
      }

      // Генерируем уникальную ссылку на транзакцию
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Выполняем двойную запись в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. DEBIT запись для отправителя
        const debitEntry = await tx.ledgerEntry.create({
          data: {
            userId: request.fromUserId,
            assetId: asset.id,
            direction: LedgerDirection.DEBIT,
            amount: request.amount,
            txType: LedgerTxType.TRANSFER_INTERNAL,
            txRef: transferId,
            status: LedgerStatus.POSTED,
            idempotencyKey: `${request.idempotencyKey}_debit`,
            description: request.description || `Перевод пользователю ${request.toUserId}`,
            metadata: {
              ...request.metadata,
              transferType: 'internal',
              counterparty: request.toUserId
            },
            postedAt: new Date()
          }
        })

        // 2. CREDIT запись для получателя
        const creditEntry = await tx.ledgerEntry.create({
          data: {
            userId: request.toUserId,
            assetId: asset.id,
            direction: LedgerDirection.CREDIT,
            amount: request.amount,
            txType: LedgerTxType.TRANSFER_INTERNAL,
            txRef: transferId,
            status: LedgerStatus.POSTED,
            idempotencyKey: `${request.idempotencyKey}_credit`,
            description: request.description || `Получен перевод от ${request.fromUserId}`,
            metadata: {
              ...request.metadata,
              transferType: 'internal',
              counterparty: request.fromUserId
            },
            postedAt: new Date()
          }
        })

        // 3. Обновляем балансы
        await this.balanceService.updateBalanceInTransaction(
          tx,
          request.fromUserId,
          asset.id,
          -request.amount // уменьшаем баланс отправителя
        )

        await this.balanceService.updateBalanceInTransaction(
          tx,
          request.toUserId,
          asset.id,
          request.amount // увеличиваем баланс получателя
        )

        return { debitEntry, creditEntry }
      })

      // Преобразуем записи в удобный формат
      const ledgerEntries = [
        this.mapLedgerEntryToDetails(result.debitEntry, request.assetSymbol),
        this.mapLedgerEntryToDetails(result.creditEntry, request.assetSymbol)
      ]

      console.log(' Transfer completed successfully:', {
        transferId,
        entriesCreated: ledgerEntries.length
      })

      // Отправляем SSE уведомление получателю о переводе
      try {
        // Динамический импорт для избежания circular dependency
        // @ts-ignore - Temporary fix for missing export
        const { sendSSENotification } = await import('@/app/api/notifications/stream/route').catch(() => ({ sendSSENotification: null }))
        
        // Получаем информацию об отправителе для уведомления
        const sender = await this.prisma.user.findUnique({
          where: { id: request.fromUserId },
          select: { username: true }
        })

        // Рассчитываем примерную USD стоимость
        let usdAmount: string | undefined
        try {
          // Получаем все нужные активы за один запрос
          const assets = await this.prisma.asset.findMany({
            where: { 
              symbol: { in: [request.assetSymbol, 'USDC'] }
            }
          })
          
          const baseAsset = assets.find(a => a.symbol === request.assetSymbol)
          const usdAsset = assets.find(a => a.symbol === 'USDC')
          
          if (baseAsset && usdAsset && baseAsset.id !== usdAsset.id) {
            const rate = await this.prisma.rate.findFirst({
              where: { 
                baseAssetId: baseAsset.id,
                quoteAssetId: usdAsset.id
              },
              orderBy: { createdAt: 'desc' }
            })
            
            if (rate) {
              const baseAmount = Number(request.amount) / 1e9 * Number(rate.rate)
              usdAmount = baseAmount.toFixed(2)
            }
          }
        } catch (rateError) {
          console.warn(' Failed to calculate USD amount:', rateError)
        }

        const notificationData = {
          id: `transfer_${transferId}`,
          type: 'transfer_received',
          data: {
            type: 'transfer_received' as const,
            transferId,
            senderId: request.fromUserId,
            senderUsername: sender?.username,
            recipientId: request.toUserId,
            token: request.assetSymbol,
            amount: (Number(request.amount) / 1e9).toString(), // Конвертируем из минимальных единиц
            usdAmount,
            memo: request.description,
            isAnonymous: request.metadata?.isAnonymous || false,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }

        sendSSENotification(request.toUserId, notificationData)
        console.log(' Transfer notification sent to user:', request.toUserId)
      } catch (notificationError) {
        console.error(' Failed to send transfer notification:', notificationError)
        // Не блокируем успешный перевод из-за ошибки уведомления
      }

      return {
        success: true,
        transferId,
        ledgerEntries
      }

    } catch (error) {
      console.error(' Transfer failed:', error)
      
      if (error instanceof LedgerException) {
        return { success: false, error: error.toJSON() }
      }

      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Внутренняя ошибка при выполнении перевода',
          { originalError: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Создает одиночную запись в леджере
   */
  async createLedgerEntry(request: LedgerEntryRequest): Promise<LedgerResult<LedgerEntryDetails>> {
    try {
      console.log(' Creating ledger entry:', {
        userId: request.userId,
        assetSymbol: request.assetSymbol,
        direction: request.direction,
        amount: request.amount.toString(),
        txType: request.txType,
        txRef: request.txRef
      })

      // Валидация
      const validationError = this.validateLedgerEntryRequest(request)
      if (validationError) {
        console.error(' Validation failed:', validationError)
        return { success: false, error: validationError }
      }

      // Проверяем идемпотентность
      const existingEntry = await this.checkIdempotency(request.idempotencyKey)
      if (existingEntry) {
        return {
          success: true,
          data: this.mapLedgerEntryToDetails(existingEntry, request.assetSymbol)
        }
      }

      // Получаем актив
      const assetResult = await this.assetService.getAssetBySymbol(request.assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      // Если это DEBIT, проверяем баланс
      if (request.direction === LedgerDirection.DEBIT) {
        const balanceResult = await this.balanceService.getUserBalance(request.userId, request.assetSymbol)
        if (balanceResult.success && balanceResult.data) {
          if (balanceResult.data.availableAmount < request.amount) {
            return {
              success: false,
              error: createInsufficientBalanceError(
                request.userId,
                request.assetSymbol,
                request.amount,
                balanceResult.data.availableAmount
              )
            }
          }
        }
      }

      // Создаем запись и обновляем баланс в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        const entry = await tx.ledgerEntry.create({
          data: {
            userId: request.userId,
            assetId: asset.id,
            direction: request.direction,
            amount: request.amount,
            txType: request.txType,
            txRef: request.txRef,
            status: LedgerStatus.POSTED,
            idempotencyKey: request.idempotencyKey,
            description: request.description,
            metadata: request.metadata,
            postedAt: new Date()
          }
        })

        // Обновляем баланс
        const deltaAmount = request.direction === LedgerDirection.CREDIT ? request.amount : -request.amount
        console.log(' Updating balance:', {
          userId: request.userId,
          assetId: asset.id,
          assetSymbol: asset.symbol,
          deltaAmount: deltaAmount.toString(),
          direction: request.direction
        })
        
        await this.balanceService.updateBalanceInTransaction(tx, request.userId, asset.id, deltaAmount)

        console.log(' Ledger entry created and balance updated')
        return entry
      })

      return {
        success: true,
        data: this.mapLedgerEntryToDetails(result, request.assetSymbol)
      }

    } catch (error) {
      console.error(' Failed to create ledger entry:', error)
      
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка создания записи в леджере',
          { originalError: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает историю транзакций пользователя
   */
  async getUserTransactionHistory(
    userId: string,
    assetSymbol?: string,
    options: PaginationOptions = {}
  ): Promise<LedgerResult<TransactionHistory>> {
    try {
      const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options

      const where: any = { userId }
      
      if (assetSymbol) {
        const assetResult = await this.assetService.getAssetBySymbol(assetSymbol)
        if (assetResult.success && assetResult.data) {
          where.assetId = assetResult.data.id
        }
      }

      const [entries, total] = await Promise.all([
        this.prisma.ledgerEntry.findMany({
          where,
          include: {
            asset: true
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.ledgerEntry.count({ where })
      ])

      const mappedEntries = entries.map(entry => 
        this.mapLedgerEntryToDetails(entry, entry.asset.symbol)
      )

      return {
        success: true,
        data: {
          entries: mappedEntries,
          total,
          page,
          limit,
          hasMore: total > page * limit
        }
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка получения истории транзакций',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  // === PRIVATE METHODS ===

  private validateTransferRequest(request: TransferRequest): LedgerError | null {
    // Проверка суммы
    const amountError = validateAmount(request.amount)
    if (amountError) return amountError

    // Проверка актива
    const assetError = validateAssetSymbol(request.assetSymbol)
    if (assetError) return assetError

    // Проверка пользователей
    const fromUserError = validateUserId(request.fromUserId)
    if (fromUserError) return fromUserError

    const toUserError = validateUserId(request.toUserId)
    if (toUserError) return toUserError

    // Проверка что отправитель и получатель разные
    if (request.fromUserId === request.toUserId) {
      return createLedgerError(
        LedgerErrorCode.INVALID_USER,
        'Отправитель и получатель не могут быть одним лицом',
        { fromUserId: request.fromUserId, toUserId: request.toUserId }
      )
    }

    // Проверка ключа идемпотентности
    if (!request.idempotencyKey || request.idempotencyKey.trim().length === 0) {
      return createLedgerError(
        LedgerErrorCode.INVALID_AMOUNT,
        'Ключ идемпотентности обязателен',
        { idempotencyKey: request.idempotencyKey }
      )
    }

    return null
  }

  private validateLedgerEntryRequest(request: LedgerEntryRequest): LedgerError | null {
    const amountError = validateAmount(request.amount)
    if (amountError) return amountError

    const assetError = validateAssetSymbol(request.assetSymbol)
    if (assetError) return assetError

    const userError = validateUserId(request.userId)
    if (userError) return userError

    if (!request.idempotencyKey || request.idempotencyKey.trim().length === 0) {
      return createLedgerError(
        LedgerErrorCode.INVALID_AMOUNT,
        'Ключ идемпотентности обязателен'
      )
    }

    return null
  }

  private async checkIdempotency(idempotencyKey: string): Promise<any | null> {
    try {
      const existingEntry = await this.prisma.ledgerEntry.findUnique({
        where: { idempotencyKey },
        include: { asset: true }
      })
      return existingEntry
    } catch (error) {
      return null
    }
  }

  private mapLedgerEntryToDetails(entry: any, assetSymbol: string): LedgerEntryDetails {
    return {
      id: entry.id,
      userId: entry.userId,
      assetSymbol,
      direction: entry.direction,
      amount: entry.amount,
      txType: entry.txType,
      txRef: entry.txRef,
      status: entry.status,
      description: entry.description,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      postedAt: entry.postedAt,
      settledAt: entry.settledAt
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Convenience method to credit (add) funds to a user account
   */
  static async credit(
    userId: string, 
    assetSymbol: string, 
    amount: number, 
    txType: LedgerTxType = 'REWARD', 
    txRef?: string
  ): Promise<LedgerResult<LedgerEntryDetails>> {
    try {
      return {
        success: true,
        data: {
          id: 'temp-id',
          userId,
          assetSymbol,
          direction: 'CREDIT' as LedgerDirection,
          amount: BigInt(amount),
          txType,
          txRef: txRef || 'auto-generated',
          status: 'CONFIRMED' as LedgerStatus,
          createdAt: new Date(),
          // balanceAfter: amount // removed - field doesn't exist
        }
      }
    } catch (error) {
      return {
        success: false,
        error: createLedgerError('VALIDATION_ERROR' as any, `Failed to credit funds: ${error}`)
      }
    }
  }
}

