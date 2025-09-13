/**
 * Типы и интерфейсы для системы авторизации
 * Solana SuperApp - Enterprise Authentication System
 */

import { User } from '@prisma/client'

// =============================================================================
// JWT TOKEN TYPES
// =============================================================================

export interface JWTPayload {
  sub: string           // user ID
  telegramId: string    // Telegram user ID
  username?: string     // Telegram username
  iat: number          // issued at
  exp: number          // expires at
  type: 'access' | 'refresh'
  sessionId: string    // unique session identifier
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface TokenValidationResult {
  valid: boolean
  payload?: JWTPayload
  error?: string
  expired?: boolean
}

// =============================================================================
// TELEGRAM TYPES
// =============================================================================

export interface TelegramInitData {
  query_id?: string
  user: string
  auth_date: string
  hash: string
  [key: string]: any
}

export interface TelegramUserData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
  allows_write_to_pm?: boolean
}

export interface TelegramVerificationResult {
  valid: boolean
  userData?: TelegramUserData
  error?: string
  expired?: boolean
}

// =============================================================================
// AUTH REQUEST/RESPONSE TYPES
// =============================================================================

export interface LoginRequest {
  initData: string
  deviceInfo?: {
    userAgent: string
    platform: string
    language: string
  }
}

export interface LoginResponse {
  success: boolean
  user: SafeUser
  tokens: TokenPair
  message: string
  sessionId: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  success: boolean
  tokens: TokenPair
  message: string
}

export interface LogoutRequest {
  refreshToken?: string
  allDevices?: boolean
}

export interface LogoutResponse {
  success: boolean
  message: string
}

// =============================================================================
// USER TYPES
// =============================================================================

// Безопасная версия User без чувствительных данных
export interface SafeUser {
  id: string
  telegramId: string
  username?: string
  firstName: string
  lastName?: string
  languageCode: string
  isPremium: boolean
  photoUrl?: string
  walletAddress?: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

// Расширенный профиль пользователя
export interface UserProfile extends SafeUser {
  // Статистика активности
  totalTransactions: number
  totalNFTs: number
  totalVotes: number
  totalCoursesCompleted: number
  totalJobsCompleted: number
  
  // Балансы (будут добавлены позже)
  solBalance?: number
  usdcBalance?: number
  tngBalance?: number
  
  // Рейтинги и достижения
  reputation: number
  level: number
  badges: Badge[]
  achievements: Achievement[]
  
  // Настройки
  preferences: UserPreferences
}

export interface Badge {
  id: string
  name: string
  description: string
  imageUrl: string
  earnedAt: Date
  category: 'learning' | 'trading' | 'dao' | 'development' | 'special'
}

export interface Achievement {
  id: string
  title: string
  description: string
  progress: number
  maxProgress: number
  completed: boolean
  completedAt?: Date
  rewardType: 'tng' | 'nft' | 'badge'
  rewardAmount?: number
}

export interface UserPreferences {
  notifications: {
    email: boolean
    push: boolean
    telegram: boolean
    marketing: boolean
  }
  privacy: {
    showProfile: boolean
    showActivity: boolean
    showBalances: boolean
  }
  theme: 'dark' | 'light' | 'system'
  language: string
  currency: 'USD' | 'EUR' | 'RUB'
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export interface UserSession {
  id: string
  userId: string
  sessionId: string
  deviceInfo: DeviceInfo
  ipAddress: string
  userAgent: string
  isActive: boolean
  lastActivity: Date
  createdAt: Date
  expiresAt: Date
}

export interface DeviceInfo {
  platform: string
  browser: string
  os: string
  version: string
  mobile: boolean
}

// =============================================================================
// AUTH ERRORS
// =============================================================================

export enum AuthErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TELEGRAM_DATA = 'INVALID_TELEGRAM_DATA',
  TELEGRAM_DATA_EXPIRED = 'TELEGRAM_DATA_EXPIRED',
  
  // Token errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  
  // Rate limiting
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_BLOCKED = 'USER_BLOCKED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface AuthError {
  code: AuthErrorCode
  message: string
  details?: any
  timestamp: Date
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: any) => string
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  resetTime: number
}

// =============================================================================
// AUTH MIDDLEWARE TYPES
// =============================================================================

export interface AuthenticatedRequest {
  user: SafeUser
  session: UserSession
  tokens?: {
    accessToken: string
    payload: JWTPayload
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean
  allowRefreshToken?: boolean
  checkSession?: boolean
  updateLastActivity?: boolean
}

// =============================================================================
// AUTH SERVICE CONFIGURATION
// =============================================================================

export interface AuthConfig {
  jwt: {
    secret: string
    accessTokenExpiry: string    // e.g., '15m'
    refreshTokenExpiry: string   // e.g., '7d'
    issuer: string
    audience: string
  }
  telegram: {
    botToken: string
    dataExpiryTime: number       // seconds (default: 86400 = 24h)
  }
  session: {
    maxConcurrentSessions: number // default: 5
    inactivityTimeout: number     // minutes (default: 30)
    extendOnActivity: boolean     // default: true
  }
  rateLimit: {
    login: RateLimitConfig
    refresh: RateLimitConfig
    general: RateLimitConfig
  }
  security: {
    bcryptRounds: number         // for hashing sensitive data
    allowedOrigins: string[]
    requireSecureConnection: boolean
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Схема валидации для различных полей авторизации
export interface ValidationSchema {
  telegramId: {
    type: 'string';
    required: true;
    pattern: RegExp;
  };
  initData: {
    type: 'string';
    required: true;
    minLength: number;
  };
  refreshToken: {
    type: 'string';
    required: true;
    minLength: number;
  };
}

// Конкретная конфигурация валидации
export const VALIDATION_RULES: ValidationSchema = {
  telegramId: {
    type: 'string',
    required: true,
    pattern: /^\d+$/
  },
  initData: {
    type: 'string',
    required: true,
    minLength: 10
  },
  refreshToken: {
    type: 'string',
    required: true,
    minLength: 10
  }
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type AuthResult<T = any> = {
  success: true
  data: T
} | {
  success: false
  error: AuthError
}

export type AsyncAuthResult<T = any> = Promise<AuthResult<T>>

// Type guards
export function isValidTelegramUserData(data: any): data is TelegramUserData {
  return (
    typeof data === 'object' &&
    typeof data.id === 'number' &&
    typeof data.first_name === 'string' &&
    data.id > 0
  )
}

export function isValidJWTPayload(payload: any): payload is JWTPayload {
  return (
    typeof payload === 'object' &&
    typeof payload.sub === 'string' &&
    typeof payload.telegramId === 'string' &&
    typeof payload.type === 'string' &&
    ['access', 'refresh'].includes(payload.type)
  )
}

// =============================================================================
// EXPORT DEFAULTS
// =============================================================================

export const DEFAULT_AUTH_CONFIG: Partial<AuthConfig> = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'solana-superapp',
    audience: 'solana-superapp-users'
  },
  session: {
    maxConcurrentSessions: 5,
    inactivityTimeout: 30,
    extendOnActivity: true
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    dataExpiryTime: 86400 // 24 hours
  },
  security: {
    bcryptRounds: 12,
    allowedOrigins: ['http://localhost:3000', 'https://localhost:3000'],
    requireSecureConnection: true
  }
}

