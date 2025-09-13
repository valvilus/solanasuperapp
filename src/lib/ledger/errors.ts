/**
 * Ledger Errors - Error handling for off-chain ledger system
 * Solana SuperApp
 */

import { LedgerError, LedgerErrorCode } from './types'

// Re-export LedgerErrorCode for easier imports
export { LedgerErrorCode }

export class LedgerException extends Error {
  public readonly code: LedgerErrorCode
  public readonly details?: Record<string, any>
  public readonly timestamp: Date

  constructor(error: LedgerError) {
    super(error.message)
    this.name = 'LedgerException'
    this.code = error.code
    this.details = error.details
    this.timestamp = error.timestamp
  }

  toJSON(): LedgerError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    }
  }
}

// === ERROR FACTORY FUNCTIONS ===

export function createLedgerError(
  code: LedgerErrorCode,
  message: string,
  details?: Record<string, any>
): LedgerError {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  }
}

export function createInsufficientBalanceError(
  userId: string,
  assetSymbol: string,
  required: bigint,
  available: bigint
): LedgerError {
  return createLedgerError(
    LedgerErrorCode.INSUFFICIENT_BALANCE,
    `Недостаточно средств для операции`,
    {
      userId,
      assetSymbol,
      required: required.toString(),
      available: available.toString()
    }
  )
}

export function createInvalidAmountError(amount: bigint): LedgerError {
  return createLedgerError(
    LedgerErrorCode.INVALID_AMOUNT,
    `Неверная сумма: ${amount}. Сумма должна быть положительной`,
    { amount: amount.toString() }
  )
}

export function createAssetNotFoundError(assetSymbol: string): LedgerError {
  return createLedgerError(
    LedgerErrorCode.ASSET_NOT_FOUND,
    `Актив не найден: ${assetSymbol}`,
    { assetSymbol }
  )
}

export function createDuplicateIdempotencyKeyError(
  idempotencyKey: string,
  existingEntryId: string
): LedgerError {
  return createLedgerError(
    LedgerErrorCode.DUPLICATE_IDEMPOTENCY_KEY,
    `Операция с таким ключом идемпотентности уже выполнена`,
    { idempotencyKey, existingEntryId }
  )
}

export function createHoldNotFoundError(holdId: string): LedgerError {
  return createLedgerError(
    LedgerErrorCode.HOLD_NOT_FOUND,
    `Заморозка средств не найдена: ${holdId}`,
    { holdId }
  )
}

export function createLedgerImbalanceError(
  txRef: string,
  expectedSum: bigint,
  actualSum: bigint
): LedgerError {
  return createLedgerError(
    LedgerErrorCode.LEDGER_IMBALANCE,
    `Нарушен баланс двойной записи`,
    {
      txRef,
      expectedSum: expectedSum.toString(),
      actualSum: actualSum.toString()
    }
  )
}

// === VALIDATION HELPERS ===

export function validateAmount(amount: bigint): LedgerError | null {
  if (amount <= 0n) {
    return createInvalidAmountError(amount)
  }
  return null
}

export function validateAssetSymbol(assetSymbol: string): LedgerError | null {
  if (!['SOL', 'USDC', 'TNG'].includes(assetSymbol)) {
    return createAssetNotFoundError(assetSymbol)
  }
  return null
}

export function validateUserId(userId: string): LedgerError | null {
  if (!userId || userId.trim().length === 0) {
    return createLedgerError(
      LedgerErrorCode.INVALID_USER,
      'Идентификатор пользователя не может быть пустым',
      { userId }
    )
  }
  return null
}

