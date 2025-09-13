/**
 * Ledger Types - Type definitions for off-chain ledger system
 * Solana SuperApp
 */

import { LedgerDirection, LedgerTxType, LedgerStatus, HoldPurpose, HoldStatus } from '@prisma/client'

// === TRANSFER TYPES ===

export interface TransferRequest {
  fromUserId: string
  toUserId: string
  assetSymbol: string // 'SOL', 'USDC', 'TNG'
  amount: bigint // в минимальных единицах
  description?: string
  metadata?: Record<string, any>
  idempotencyKey: string
}

export interface TransferResult {
  success: boolean
  transferId?: string
  error?: LedgerError
  ledgerEntries?: LedgerEntryDetails[]
}

// === LEDGER ENTRY TYPES ===

export interface LedgerEntryRequest {
  userId: string
  assetSymbol: string
  direction: LedgerDirection
  amount: bigint
  txType: LedgerTxType
  txRef: string
  description?: string
  metadata?: Record<string, any>
  idempotencyKey: string
}

export interface LedgerEntryDetails {
  id: string
  userId: string
  assetSymbol: string
  direction: LedgerDirection
  amount: bigint
  txType: LedgerTxType
  txRef: string
  status: LedgerStatus
  description?: string
  metadata?: Record<string, any>
  createdAt: Date
  postedAt?: Date
  settledAt?: Date
}

// === BALANCE TYPES ===

export interface UserBalance {
  userId: string
  assetSymbol: string
  amountCached: bigint
  lockedAmount: bigint
  availableAmount: bigint
  lastUpdated: Date
  syncedAt?: Date
}

export interface BalanceUpdate {
  userId: string
  assetSymbol: string
  deltaAmount: bigint // положительное = увеличение, отрицательное = уменьшение
  operation: 'credit' | 'debit'
}

// === HOLD TYPES ===

export interface HoldRequest {
  userId: string
  assetSymbol: string
  amount: bigint
  purpose: HoldPurpose
  referenceId?: string
  description?: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

export interface HoldDetails {
  id: string
  userId: string
  assetSymbol: string
  amount: bigint
  purpose: HoldPurpose
  referenceId?: string
  status: HoldStatus
  description?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  releasedAt?: Date
  expiresAt?: Date
}

export interface HoldReleaseRequest {
  holdId: string
  releaseAmount?: bigint // если не указано - освобождается полная сумма
  reason?: string
}

// === ASSET TYPES ===

export interface AssetDetails {
  id: string
  symbol: string
  name: string
  mintAddress?: string
  decimals: number
  isOnchain: boolean
  logoUrl?: string
  description?: string
  isActive: boolean
}

// === ERROR TYPES ===

export interface LedgerError {
  code: LedgerErrorCode
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export enum LedgerErrorCode {
  // Валидация
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_ASSET = 'INVALID_ASSET',
  INVALID_USER = 'INVALID_USER',
  
  // Балансы
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_AVAILABLE_BALANCE = 'INSUFFICIENT_AVAILABLE_BALANCE',
  
  // Идемпотентность
  DUPLICATE_IDEMPOTENCY_KEY = 'DUPLICATE_IDEMPOTENCY_KEY',
  CONFLICTING_IDEMPOTENCY_KEY = 'CONFLICTING_IDEMPOTENCY_KEY',
  
  // Holds
  HOLD_NOT_FOUND = 'HOLD_NOT_FOUND',
  HOLD_ALREADY_RELEASED = 'HOLD_ALREADY_RELEASED',
  HOLD_EXPIRED = 'HOLD_EXPIRED',
  INVALID_HOLD_AMOUNT = 'INVALID_HOLD_AMOUNT',
  
  // Система
  LEDGER_IMBALANCE = 'LEDGER_IMBALANCE',
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// === RESULT WRAPPER ===

export interface LedgerResult<T> {
  success: boolean
  data?: T
  error?: LedgerError
}

// === UTILITY TYPES ===

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TransactionHistory {
  entries: LedgerEntryDetails[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// === VALIDATION HELPERS ===

export const ASSET_SYMBOLS = ['SOL', 'USDC', 'TNG'] as const
export type AssetSymbol = typeof ASSET_SYMBOLS[number]

export function isValidAssetSymbol(symbol: string): symbol is AssetSymbol {
  return ASSET_SYMBOLS.includes(symbol as AssetSymbol)
}

