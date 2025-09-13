/**
 * Wallet Errors - Error handling for custodial wallet system
 * Solana SuperApp
 */

import { WalletError, WalletErrorCode } from './types'

export class WalletException extends Error {
  public readonly code: WalletErrorCode
  public readonly details?: Record<string, any>
  public readonly timestamp: Date

  constructor(error: WalletError) {
    super(error.message)
    this.name = 'WalletException'
    this.code = error.code
    this.details = error.details
    this.timestamp = error.timestamp
  }

  toJSON(): WalletError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    }
  }
}

// === ERROR FACTORY FUNCTIONS ===

export function createWalletError(
  code: WalletErrorCode,
  message: string,
  details?: Record<string, any>
): WalletError {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  }
}

export function createWalletNotFoundError(walletId: string): WalletError {
  return createWalletError(
    WalletErrorCode.WALLET_NOT_FOUND,
    `Кошелек не найден: ${walletId}`,
    { walletId }
  )
}

export function createKMSKeyNotFoundError(keyId: string): WalletError {
  return createWalletError(
    WalletErrorCode.KMS_KEY_NOT_FOUND,
    `KMS ключ не найден: ${keyId}`,
    { keyId }
  )
}

export function createInvalidAddressError(address: string): WalletError {
  return createWalletError(
    WalletErrorCode.INVALID_ADDRESS,
    `Неверный адрес Solana: ${address}`,
    { address }
  )
}

export function createInsufficientBalanceError(
  publicKey: string,
  required: bigint,
  available: bigint
): WalletError {
  return createWalletError(
    WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
    `Недостаточно SOL для операции`,
    {
      publicKey,
      required: required.toString(),
      available: available.toString()
    }
  )
}

export function createRPCConnectionError(endpoint: string, originalError?: string): WalletError {
  return createWalletError(
    WalletErrorCode.RPC_CONNECTION_FAILED,
    `Ошибка подключения к Solana RPC: ${endpoint}`,
    { endpoint, originalError }
  )
}

export function createTransactionFailedError(
  signature: string,
  error: string
): WalletError {
  return createWalletError(
    WalletErrorCode.TRANSACTION_SEND_FAILED,
    `Транзакция не удалась: ${error}`,
    { signature, error }
  )
}

// === VALIDATION HELPERS ===

export function validateSolanaAddress(address: string): WalletError | null {
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

export function validateAmount(amount: bigint): WalletError | null {
  if (amount <= 0n) {
    return createWalletError(
      WalletErrorCode.INVALID_AMOUNT,
      `Сумма должна быть положительной: ${amount}`,
      { amount: amount.toString() }
    )
  }
  return null
}

export function validateTokenMint(mint: string): WalletError | null {
  const addressError = validateSolanaAddress(mint)
  if (addressError) {
    return createWalletError(
      WalletErrorCode.INVALID_TOKEN_MINT,
      `Неверный mint address токена: ${mint}`,
      { mint }
    )
  }
  return null
}
