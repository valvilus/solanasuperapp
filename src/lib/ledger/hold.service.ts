/**
 * Hold Service - Hold Management for Ledger System  
 * Solana SuperApp
 */

import { PrismaClient, HoldStatus } from '@prisma/client'
import { HoldRequest, HoldDetails, HoldReleaseRequest, LedgerResult, LedgerError } from './types'
import { createLedgerError, createHoldNotFoundError, LedgerErrorCode, validateAmount, validateUserId } from './errors'
import { AssetService } from './asset.service'
import { BalanceService } from './balance.service'

export class HoldService {
  private readonly prisma: PrismaClient
  private readonly assetService: AssetService
  private readonly balanceService: BalanceService

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.assetService = new AssetService(prisma)
    this.balanceService = new BalanceService(prisma)
  }

  /**
   * Создает заморозку средств (hold)
   */
  async createHold(request: HoldRequest): Promise<LedgerResult<HoldDetails>> {
    try {
      console.log(' Creating hold:', {
        userId: request.userId,
        assetSymbol: request.assetSymbol,
        amount: request.amount.toString(),
        purpose: request.purpose
      })

      // Валидация
      const validationError = this.validateHoldRequest(request)
      if (validationError) {
        return { success: false, error: validationError }
      }

      // Получаем актив
      const assetResult = await this.assetService.getAssetBySymbol(request.assetSymbol)
      if (!assetResult.success || !assetResult.data) {
        return { success: false, error: assetResult.error }
      }
      const asset = assetResult.data

      // Проверяем доступный баланс
      const balanceResult = await this.balanceService.getUserBalance(request.userId, request.assetSymbol)
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: createLedgerError(
            LedgerErrorCode.INSUFFICIENT_AVAILABLE_BALANCE,
            'Недостаточно средств для создания заморозки',
            { userId: request.userId, assetSymbol: request.assetSymbol, amount: request.amount.toString() }
          )
        }
      }

      const balance = balanceResult.data
      if (balance.availableAmount < request.amount) {
        return {
          success: false,
          error: createLedgerError(
            LedgerErrorCode.INSUFFICIENT_AVAILABLE_BALANCE,
            'Недостаточно доступных средств для заморозки',
            {
              userId: request.userId,
              assetSymbol: request.assetSymbol,
              required: request.amount.toString(),
              available: balance.availableAmount.toString()
            }
          )
        }
      }

      // Создаем hold и обновляем баланс в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        // Создаем hold
        const hold = await tx.hold.create({
          data: {
            userId: request.userId,
            assetId: asset.id,
            amount: request.amount,
            purpose: request.purpose,
            referenceId: request.referenceId,
            description: request.description,
            metadata: request.metadata as unknown as Record<string, any>,
            expiresAt: request.expiresAt,
            status: HoldStatus.ACTIVE
          }
        })

        // Обновляем баланс (увеличиваем lockedAmount)
        await this.balanceService.lockBalance(request.userId, request.assetSymbol, request.amount)

        return hold
      })

      const holdDetails: HoldDetails = {
        id: result.id,
        userId: result.userId,
        assetSymbol: request.assetSymbol,
        amount: result.amount,
        purpose: result.purpose,
        referenceId: result.referenceId,
        status: result.status,
        description: result.description,
        metadata: result.metadata as unknown as Record<string, any>,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        releasedAt: result.releasedAt,
        expiresAt: result.expiresAt
      }

      console.log(' Hold created successfully:', { holdId: result.id })

      return {
        success: true,
        data: holdDetails
      }

    } catch (error) {
      console.error(' Failed to create hold:', error)
      
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка создания заморозки средств',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Освобождает заморозку (полностью или частично)
   */
  async releaseHold(request: HoldReleaseRequest): Promise<LedgerResult<HoldDetails>> {
    try {
      console.log(' Releasing hold:', {
        holdId: request.holdId,
        releaseAmount: request.releaseAmount?.toString(),
        reason: request.reason
      })

      // Получаем hold
      const hold = await this.prisma.hold.findUnique({
        where: { id: request.holdId },
        include: { asset: true }
      })

      if (!hold) {
        return {
          success: false,
          error: createHoldNotFoundError(request.holdId)
        }
      }

      // Проверяем статус
      if (hold.status !== HoldStatus.ACTIVE) {
        return {
          success: false,
          error: createLedgerError(
            LedgerErrorCode.HOLD_ALREADY_RELEASED,
            'Заморозка уже освобождена или отменена',
            { holdId: request.holdId, currentStatus: hold.status }
          )
        }
      }

      // Определяем сумму для освобождения
      const releaseAmount = request.releaseAmount || hold.amount
      
      if (releaseAmount > hold.amount) {
        return {
          success: false,
          error: createLedgerError(
            LedgerErrorCode.INVALID_HOLD_AMOUNT,
            'Сумма освобождения превышает размер заморозки',
            { holdId: request.holdId, releaseAmount: releaseAmount.toString(), holdAmount: hold.amount.toString() }
          )
        }
      }

      // Освобождаем hold в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        let updatedHold

        if (releaseAmount === hold.amount) {
          // Полное освобождение
          updatedHold = await tx.hold.update({
            where: { id: request.holdId },
            data: {
              status: HoldStatus.RELEASED,
              releasedAt: new Date(),
              updatedAt: new Date()
            }
          })
        } else {
          // Частичное освобождение - уменьшаем сумму заморозки
          updatedHold = await tx.hold.update({
            where: { id: request.holdId },
            data: {
              amount: hold.amount - releaseAmount,
              updatedAt: new Date()
            }
          })
        }

        // Обновляем баланс (уменьшаем lockedAmount)
        await this.balanceService.unlockBalance(hold.userId, hold.asset.symbol, releaseAmount)

        return updatedHold
      })

      const holdDetails: HoldDetails = {
        id: result.id,
        userId: result.userId,
        assetSymbol: hold.asset.symbol,
        amount: result.amount,
        purpose: result.purpose,
        referenceId: result.referenceId,
        status: result.status,
        description: result.description,
        metadata: result.metadata as unknown as Record<string, any>,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        releasedAt: result.releasedAt,
        expiresAt: result.expiresAt
      }

      console.log(' Hold released successfully:', { holdId: request.holdId, amount: releaseAmount.toString() })

      return {
        success: true,
        data: holdDetails
      }

    } catch (error) {
      console.error(' Failed to release hold:', error)
      
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка освобождения заморозки',
          { holdId: request.holdId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает активные заморозки пользователя
   */
  async getUserActiveHolds(userId: string, assetSymbol?: string): Promise<LedgerResult<HoldDetails[]>> {
    try {
      const where: any = {
        userId,
        status: HoldStatus.ACTIVE
      }

      if (assetSymbol) {
        const assetResult = await this.assetService.getAssetBySymbol(assetSymbol)
        if (assetResult.success && assetResult.data) {
          where.assetId = assetResult.data.id
        }
      }

      const holds = await this.prisma.hold.findMany({
        where,
        include: { asset: true },
        orderBy: { createdAt: 'desc' }
      })

      const holdDetails = holds.map(hold => ({
        id: hold.id,
        userId: hold.userId,
        assetSymbol: hold.asset.symbol,
        amount: hold.amount,
        purpose: hold.purpose,
        referenceId: hold.referenceId,
        status: hold.status,
        description: hold.description,
        metadata: hold.metadata as unknown as Record<string, any>,
        createdAt: hold.createdAt,
        updatedAt: hold.updatedAt,
        releasedAt: hold.releasedAt,
        expiresAt: hold.expiresAt
      }))

      return {
        success: true,
        data: holdDetails
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка получения заморозок пользователя',
          { userId, assetSymbol, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Отменяет заморозку (отличается от освобождения)
   */
  async cancelHold(holdId: string, reason?: string): Promise<LedgerResult<HoldDetails>> {
    try {
      const hold = await this.prisma.hold.findUnique({
        where: { id: holdId },
        include: { asset: true }
      })

      if (!hold) {
        return {
          success: false,
          error: createHoldNotFoundError(holdId)
        }
      }

      if (hold.status !== HoldStatus.ACTIVE) {
        return {
          success: false,
          error: createLedgerError(
            LedgerErrorCode.HOLD_ALREADY_RELEASED,
            'Заморозка уже обработана',
            { holdId, currentStatus: hold.status }
          )
        }
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const updatedHold = await tx.hold.update({
          where: { id: holdId },
          data: {
            status: HoldStatus.CANCELLED,
            updatedAt: new Date(),
            metadata: {
              ...(hold.metadata as unknown as Record<string, any>),
              cancelReason: reason,
              cancelledAt: new Date().toISOString()
            } as any
          }
        })

        // Освобождаем заблокированные средства
        await this.balanceService.unlockBalance(hold.userId, hold.asset.symbol, hold.amount)

        return updatedHold
      })

      const holdDetails: HoldDetails = {
        id: result.id,
        userId: result.userId,
        assetSymbol: hold.asset.symbol,
        amount: result.amount,
        purpose: result.purpose,
        referenceId: result.referenceId,
        status: result.status,
        description: result.description,
        metadata: result.metadata as unknown as Record<string, any>,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        releasedAt: result.releasedAt,
        expiresAt: result.expiresAt
      }

      return {
        success: true,
        data: holdDetails
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка отмены заморозки',
          { holdId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Обрабатывает истекшие заморозки
   */
  async processExpiredHolds(): Promise<LedgerResult<number>> {
    try {
      const expiredHolds = await this.prisma.hold.findMany({
        where: {
          status: HoldStatus.ACTIVE,
          expiresAt: {
            lte: new Date()
          }
        },
        include: { asset: true }
      })

      let processedCount = 0

      for (const hold of expiredHolds) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.hold.update({
              where: { id: hold.id },
              data: {
                status: HoldStatus.EXPIRED,
                updatedAt: new Date()
              }
            })

            await this.balanceService.unlockBalance(hold.userId, hold.asset.symbol, hold.amount)
          })

          processedCount++
        } catch (error) {
          console.error(`Failed to process expired hold ${hold.id}:`, error)
        }
      }

      return {
        success: true,
        data: processedCount
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.INTERNAL_ERROR,
          'Ошибка обработки истекших заморозок',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  // === PRIVATE METHODS ===

  private validateHoldRequest(request: HoldRequest): LedgerError | null {
    const amountError = validateAmount(request.amount)
    if (amountError) return amountError

    const userError = validateUserId(request.userId)
    if (userError) return userError

    if (!['SOL', 'USDC', 'TNG'].includes(request.assetSymbol)) {
      return createLedgerError(
        LedgerErrorCode.INVALID_ASSET,
        'Неверный символ актива',
        { assetSymbol: request.assetSymbol }
      )
    }

    if (request.expiresAt && request.expiresAt <= new Date()) {
      return createLedgerError(
        LedgerErrorCode.INVALID_HOLD_AMOUNT,
        'Время истечения заморозки должно быть в будущем',
        { expiresAt: request.expiresAt.toISOString() }
      ) as any
    }

    return null
  }
}

