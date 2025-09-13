/**
 * Wallet Types - Type definitions for custodial wallet system
 * Solana SuperApp
 */

// === WALLET TYPES ===

export interface CustodialWallet {
  id: string
  userId: string
  publicKey: string
  type: WalletType
  status: WalletStatus
  createdAt: Date
  lastUsedAt?: Date
  metadata?: {
    keyId?: string
    derivationPath?: string
    userIndex?: number
    createdBy?: string
    restoredFrom?: string
    [key: string]: any
  }
}

export interface WalletKeyData {
  walletId: string
  kmsKeyId: string
  publicKey: string
  encryptedPrivateKey?: string // для mock KMS
  derivationPath?: string
  createdAt: Date
}

export enum WalletType {
  CUSTODIAL = 'custodial',
  EXTERNAL = 'external'
}

export enum WalletStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FROZEN = 'frozen',
  DELETED = 'deleted',
  NEEDS_MIGRATION = 'needs_migration'
}

// === KMS TYPES ===

export interface KMSKeyReference {
  keyId: string
  publicKey: string
  algorithm: 'Ed25519'
  usage: KeyUsage[]
  metadata?: Record<string, any>
}

export enum KeyUsage {
  SIGN = 'sign',
  VERIFY = 'verify'
}

export interface SignRequest {
  keyId: string
  message: Uint8Array
  algorithm?: 'Ed25519'
}

export interface SignResult {
  signature: Uint8Array
  keyId: string
  algorithm: string
}

// === WALLET GENERATION ===

export interface WalletGenerationRequest {
  userId: string
  derivationPath?: string
  metadata?: Record<string, any>
}

export interface WalletGenerationResult {
  wallet: CustodialWallet
  keyReference: KMSKeyReference
}

// === WALLET OPERATIONS ===

export interface WalletBalanceInfo {
  publicKey: string
  solBalance: bigint
  tokens: TokenBalance[]
  lastSynced: Date
}

export interface TokenBalance {
  mint: string
  symbol: string
  amount: bigint
  decimals: number
  uiAmount: number
}

export interface TransactionRequest {
  fromWalletId: string
  toAddress: string
  amount: bigint
  token?: string // mint address для SPL токенов, undefined для SOL
  memo?: string
  priority?: TransactionPriority
}

export enum TransactionPriority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high'
}

export interface PreparedTransaction {
  transaction: any // Solana Transaction object
  signers: string[] // KMS key IDs needed for signing
  estimatedFee: bigint
  blockhash: string
}

// === ERROR TYPES ===

export interface WalletError {
  code: WalletErrorCode
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export enum WalletErrorCode {
  // Генерация кошелька
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  WALLET_CREATION_FAILED = 'WALLET_CREATION_FAILED',
  
  // KMS ошибки
  KMS_KEY_NOT_FOUND = 'KMS_KEY_NOT_FOUND',
  KMS_SIGN_FAILED = 'KMS_SIGN_FAILED',
  KMS_ACCESS_DENIED = 'KMS_ACCESS_DENIED',
  
  // Кошелек не найден
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_INACTIVE = 'WALLET_INACTIVE',
  WALLET_FROZEN = 'WALLET_FROZEN',
  
  // Solana RPC
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',
  TRANSACTION_SIMULATION_FAILED = 'TRANSACTION_SIMULATION_FAILED',
  TRANSACTION_SEND_FAILED = 'TRANSACTION_SEND_FAILED',
  INSUFFICIENT_SOL_BALANCE = 'INSUFFICIENT_SOL_BALANCE',
  
  // Валидация
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_TOKEN_MINT = 'INVALID_TOKEN_MINT',
  INVALID_TOKEN_ACCOUNT = 'INVALID_TOKEN_ACCOUNT',
  
  // NFT Errors
  NFT_MINT_FAILED = 'NFT_MINT_FAILED',
  NFT_NOT_FOUND = 'NFT_NOT_FOUND',
  NFT_TRANSFER_FAILED = 'NFT_TRANSFER_FAILED',
  GET_USER_NFTS_FAILED = 'GET_USER_NFTS_FAILED',
  LIST_NFT_FAILED = 'LIST_NFT_FAILED',
  NFT_NOT_FOR_SALE = 'NFT_NOT_FOR_SALE',
  CANNOT_BUY_OWN_NFT = 'CANNOT_BUY_OWN_NFT',
  BUY_NFT_FAILED = 'BUY_NFT_FAILED',
  RECIPIENT_WALLET_NOT_FOUND = 'RECIPIENT_WALLET_NOT_FOUND',
  
  // Balance Errors  
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  
  // Система
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// === RESULT WRAPPER ===

export interface WalletResult<T> {
  success: boolean
  data?: T
  error?: WalletError
}

// === CONFIG ===

export interface WalletServiceConfig {
  solanaRpcUrl: string
  kmsProvider: 'mock' | 'aws' | 'gcp' | 'azure' | 'database_encrypted'
  derivationPathPrefix: string
  defaultPriority: TransactionPriority
  maxRetries: number
  timeoutMs: number
}

// === SOLANA SPECIFIC ===

export interface SolanaTransactionInfo {
  signature: string
  slot?: number
  blockTime?: Date
  fee: bigint
  status: 'pending' | 'confirmed' | 'finalized' | 'failed'
  confirmations: number
  error?: string
}
