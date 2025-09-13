/**
 * Cache Keys - Centralized Cache Key Management
 * Solana SuperApp Database Optimization
 */

export const CacheKeys = {
  // Assets
  ASSET_BY_SYMBOL: (symbol: string) => `asset:symbol:${symbol}`,
  ALL_ACTIVE_ASSETS: 'assets:active:all',
  
  // Rates/Prices
  RATE_LATEST: (baseSymbol: string, quoteSymbol: string) => `rate:${baseSymbol}:${quoteSymbol}:latest`,
  PRICE_USD: (symbol: string) => `price:${symbol}:usd`,
  ALL_PRICES: 'prices:all',
  
  // Users
  USER_BALANCE: (userId: string, assetSymbol: string) => `balance:${userId}:${assetSymbol}`,
  USER_BALANCES: (userId: string) => `balances:${userId}:all`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  
  // System
  SYSTEM_CONFIG: 'system:config',
  
  // Transactions
  PENDING_TRANSFERS: (userId: string) => `transfers:pending:${userId}`,
  
  // Course/Learning
  ACTIVE_COURSES: 'courses:active:all',
  USER_COURSE_PROGRESS: (userId: string, courseId: string) => `course:progress:${userId}:${courseId}`,
  
  // DAO
  ACTIVE_PROPOSALS: 'dao:proposals:active',
  PROPOSAL_RESULTS: (proposalId: string) => `dao:proposal:${proposalId}:results`,
} as const

export const CacheTags = {
  // Assets & Rates
  ASSETS: 'assets',
  RATES: 'rates',
  PRICES: 'prices',
  
  // Users
  USERS: 'users',
  BALANCES: 'balances',
  
  // User-specific tags
  USER: (userId: string) => `user:${userId}`,
  USER_BALANCE: (userId: string) => `balance:${userId}`,
  
  // System
  SYSTEM: 'system',
  
  // Features
  COURSES: 'courses',
  DAO: 'dao',
  TRANSFERS: 'transfers',
} as const

export const CacheTTL = {
  // Short-lived (1-5 minutes) - frequently changing data
  BALANCES: 2 * 60 * 1000, // 2 minutes
  PRICES: 30 * 1000, // 30 seconds for prices
  RATES: 60 * 1000, // 1 minute for rates
  
  // Medium-lived (5-30 minutes) - moderately changing data
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  PENDING_TRANSFERS: 5 * 60 * 1000, // 5 minutes
  PROPOSAL_RESULTS: 5 * 60 * 1000, // 5 minutes
  
  // Long-lived (30+ minutes) - rarely changing data
  ASSETS: 60 * 60 * 1000, // 1 hour
  ACTIVE_COURSES: 30 * 60 * 1000, // 30 minutes
  ACTIVE_PROPOSALS: 15 * 60 * 1000, // 15 minutes
  SYSTEM_CONFIG: 60 * 60 * 1000, // 1 hour
} as const

