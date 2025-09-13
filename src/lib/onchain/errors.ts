/**
 * On-chain Errors - Error handling for blockchain operations
 * Solana SuperApp
 */

import { OnchainError, OnchainErrorCode } from './types'

export class OnchainException extends Error {
  public readonly code: OnchainErrorCode
  public readonly details?: Record<string, any>
  public readonly timestamp: Date

  constructor(error: OnchainError) {
    super(error.message)
    this.name = 'OnchainException'
    this.code = error.code
    this.details = error.details
    this.timestamp = error.timestamp
  }

  toJSON(): OnchainError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    }
  }
}

// === ERROR FACTORY FUNCTIONS ===

export function createOnchainError(
  code: OnchainErrorCode,
  message: string,
  details?: Record<string, any>
): OnchainError {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  }
}

export function createRPCConnectionError(endpoint: string, originalError?: string): OnchainError {
  return createOnchainError(
    OnchainErrorCode.RPC_CONNECTION_FAILED,
    `Ошибка подключения к Solana RPC: ${endpoint}`,
    { endpoint, originalError }
  )
}

export function createTransactionNotFoundError(signature: string): OnchainError {
  return createOnchainError(
    OnchainErrorCode.TRANSACTION_NOT_FOUND,
    `Транзакция не найдена: ${signature}`,
    { signature }
  )
}

export function createTransactionFailedError(
  signature: string,
  error: string,
  slot?: number
): OnchainError {
  return createOnchainError(
    OnchainErrorCode.TRANSACTION_FAILED,
    `Транзакция не удалась: ${error}`,
    { signature, error, slot }
  )
}

export function createInsufficientFundsError(
  address: string,
  required: bigint,
  available: bigint,
  token?: string
): OnchainError {
  return createOnchainError(
    OnchainErrorCode.INSUFFICIENT_FUNDS,
    `Недостаточно средств для операции`,
    {
      address,
      required: required.toString(),
      available: available.toString(),
      token: token || 'SOL'
    }
  )
}

export function createDepositNotFoundError(signature: string): OnchainError {
  return createOnchainError(
    OnchainErrorCode.DEPOSIT_NOT_FOUND,
    `Депозит не найден: ${signature}`,
    { signature }
  )
}

export function createDepositAlreadyProcessedError(signature: string): OnchainError {
  return createOnchainError(
    OnchainErrorCode.DEPOSIT_ALREADY_PROCESSED,
    `Депозит уже обработан: ${signature}`,
    { signature }
  )
}

export function createWithdrawalPreparationError(
  reason: string,
  details?: any
): OnchainError {
  return createOnchainError(
    OnchainErrorCode.WITHDRAWAL_PREPARATION_FAILED,
    `Ошибка подготовки вывода: ${reason}`,
    { reason, details }
  )
}

export function createWithdrawalSigningError(
  keyId: string,
  error: string
): OnchainError {
  return createOnchainError(
    OnchainErrorCode.WITHDRAWAL_SIGNING_FAILED,
    `Ошибка подписания транзакции вывода`,
    { keyId, error }
  )
}

export function createInvalidTokenMintError(mint: string): OnchainError {
  return createOnchainError(
    OnchainErrorCode.INVALID_TOKEN_MINT,
    `Неверный mint address токена: ${mint}`,
    { mint }
  )
}

export function createInvalidAddressError(address: string): OnchainError {
  return createOnchainError(
    OnchainErrorCode.INVALID_ADDRESS,
    `Неверный Solana адрес: ${address}`,
    { address }
  )
}

export function createIndexerError(error: string, details?: any): OnchainError {
  return createOnchainError(
    OnchainErrorCode.INDEXER_ERROR,
    `Ошибка индексера: ${error}`,
    { error, details }
  )
}

export function createWebhookDeliveryError(
  url: string,
  status: number,
  response?: string
): OnchainError {
  return createOnchainError(
    OnchainErrorCode.WEBHOOK_DELIVERY_FAILED,
    `Ошибка доставки webhook: ${status}`,
    { url, status, response }
  )
}

// === VALIDATION HELPERS ===

export function validateSolanaAddress(address: string): OnchainError | null {
  try {
    // Базовая проверка длины и символов для Solana адреса
    if (!address || address.length < 32 || address.length > 44) {
      return createInvalidAddressError(address)
    }
    
    // Проверка что адрес состоит из допустимых символов Base58
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
    if (!base58Regex.test(address)) {
      return createInvalidAddressError(address)
    }
    
    return null
  } catch (error) {
    return createInvalidAddressError(address)
  }
}

export function validateTokenMint(mint: string): OnchainError | null {
  if (mint === 'SOL') return null // нативный токен
  
  const addressError = validateSolanaAddress(mint)
  if (addressError) {
    return createInvalidTokenMintError(mint)
  }
  return null
}

export function validateAmount(amount: bigint): OnchainError | null {
  if (amount <= 0n) {
    return createOnchainError(
      OnchainErrorCode.INSUFFICIENT_FUNDS,
      `Сумма должна быть положительной: ${amount}`,
      { amount: amount.toString() }
    )
  }
  return null
}
