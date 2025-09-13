/**
 * On-chain Types - Type definitions for blockchain operations
 * Solana SuperApp
 */

import { OnchainTxStatus, OnchainPurpose } from '@prisma/client'

// === DEPOSIT TYPES ===

export interface DepositRequest {
  userAddress: string
  expectedAmount?: bigint
  token?: string // mint address для SPL токенов
  memo?: string
  timeoutMs?: number
}

export interface DepositInfo {
  id: string
  userId: string
  signature: string
  amount: bigint
  token: string // 'SOL' или mint address
  status: OnchainTxStatus
  slot?: number
  blockTime?: Date
  confirmations: number
  createdAt: Date
  processedAt?: Date
}

export interface DepositMonitorConfig {
  pollIntervalMs: number
  maxRetries: number
  confirmationThreshold: number
  timeoutMs: number
}

// === WITHDRAWAL TYPES ===

export interface WithdrawalRequest {
  fromUserId: string
  toAddress: string
  amount: bigint
  token?: string // mint address для SPL токенов, undefined для SOL
  memo?: string
  priority?: TransactionPriority
  validateBalance?: boolean
}

export interface WithdrawalInfo {
  id: string
  userId: string
  signature?: string
  amount: bigint
  token: string
  toAddress: string
  status: WithdrawalStatus
  estimatedFee?: bigint
  actualFee?: bigint
  error?: string
  createdAt: Date
  submittedAt?: Date
  confirmedAt?: Date
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  SIGNED = 'signed',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FINALIZED = 'finalized',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TransactionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// === INDEXER TYPES ===

export interface IndexerConfig {
  startSlot?: number
  batchSize: number
  pollIntervalMs: number
  maxRetries: number
  webhookUrl?: string
  filterAccounts: string[] // custodial addresses для мониторинга
}

export interface TransactionEvent {
  signature: string
  slot: number
  blockTime: Date
  status: 'success' | 'failed'
  fee: bigint
  accounts: string[]
  instructions: InstructionInfo[]
  memo?: string
}

export interface InstructionInfo {
  programId: string
  type: 'system_transfer' | 'spl_transfer' | 'unknown'
  data: any
}

// === SYNC TYPES ===

export interface BalanceSync {
  address: string
  onchainBalance: bigint
  offchainBalance: bigint
  difference: bigint
  token: string
  lastSynced: Date
  needsReconciliation: boolean
}

export interface SyncReport {
  totalAccounts: number
  syncedAccounts: number
  discrepancies: BalanceSync[]
  errors: string[]
  timestamp: Date
}

// === WEBHOOK TYPES ===

export interface WebhookPayload {
  type: 'deposit' | 'withdrawal' | 'error'
  data: DepositInfo | WithdrawalInfo | ErrorInfo
  timestamp: Date
  signature?: string // для верификации
}

export interface ErrorInfo {
  code: string
  message: string
  details?: any
  transaction?: string
}

// === RPC TYPES ===

export interface SolanaRPCConfig {
  endpoint: string
  commitment: 'processed' | 'confirmed' | 'finalized'
  timeout: number
  retries: number
  wsEndpoint?: string
}

export interface TokenAccountInfo {
  mint: string
  owner: string
  amount: bigint
  decimals: number
  isNative: boolean
}

// === RESULT WRAPPER ===

export interface OnchainResult<T> {
  success: boolean
  data?: T
  error?: OnchainError
}

// === ERROR TYPES ===

export interface OnchainError {
  code: OnchainErrorCode
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export enum OnchainErrorCode {
  // RPC ошибки
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',
  RPC_TIMEOUT = 'RPC_TIMEOUT',
  RPC_RATE_LIMITED = 'RPC_RATE_LIMITED',
  
  // Транзакции
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  
  // Депозиты
  DEPOSIT_NOT_FOUND = 'DEPOSIT_NOT_FOUND',
  DEPOSIT_ALREADY_PROCESSED = 'DEPOSIT_ALREADY_PROCESSED',
  DEPOSIT_AMOUNT_MISMATCH = 'DEPOSIT_AMOUNT_MISMATCH',
  
  // Выводы
  WITHDRAWAL_PREPARATION_FAILED = 'WITHDRAWAL_PREPARATION_FAILED',
  WITHDRAWAL_SIGNING_FAILED = 'WITHDRAWAL_SIGNING_FAILED',
  WITHDRAWAL_SUBMISSION_FAILED = 'WITHDRAWAL_SUBMISSION_FAILED',
  
  // Токены
  INVALID_TOKEN_MINT = 'INVALID_TOKEN_MINT',
  TOKEN_ACCOUNT_NOT_FOUND = 'TOKEN_ACCOUNT_NOT_FOUND',
  TOKEN_INSUFFICIENT_BALANCE = 'TOKEN_INSUFFICIENT_BALANCE',
  
  // Адреса
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  ADDRESS_NOT_OWNED = 'ADDRESS_NOT_OWNED',
  
  // Система
  INDEXER_ERROR = 'INDEXER_ERROR',
  SYNC_ERROR = 'SYNC_ERROR',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// === UTILITIES ===

export interface PriorityFeeConfig {
  [TransactionPriority.LOW]: number
  [TransactionPriority.MEDIUM]: number
  [TransactionPriority.HIGH]: number
  [TransactionPriority.URGENT]: number
}

export const DEFAULT_PRIORITY_FEES: PriorityFeeConfig = {
  [TransactionPriority.LOW]: 1000,      // 1000 micro-lamports
  [TransactionPriority.MEDIUM]: 5000,   // 5000 micro-lamports  
  [TransactionPriority.HIGH]: 10000,    // 10000 micro-lamports
  [TransactionPriority.URGENT]: 50000   // 50000 micro-lamports
}

export const SUPPORTED_TOKENS = {
  SOL: null, // нативный токен
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet
  TNG: '7UuuwrzNE5fAgpCNqRFcrLFGYg8HsMb3uUTNrojC2PX7'  // наш токен
} as const
