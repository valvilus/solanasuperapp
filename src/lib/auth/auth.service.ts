/**
 * Auth Service - Simple Authentication Business Logic
 * Solana SuperApp Authentication System
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface AuthUser {
  id: string
  telegramId: string
  username?: string
  firstName: string
  lastName?: string
  isPremium: boolean
  photoUrl?: string
  walletAddress?: string
}

export class AuthService {
  private readonly prisma: PrismaClient
  private readonly botToken: string

  constructor(prisma: PrismaClient, botToken: string) {
    this.prisma = prisma
    this.botToken = botToken
  }

  /**
   * Проверка Telegram WebApp данных
   */
  private verifyTelegramData(initData: string): TelegramUser | null {
    try {
      const urlParams = new URLSearchParams(initData)
      const hash = urlParams.get('hash')
      const userParam = urlParams.get('user')
      const authDate = urlParams.get('auth_date')

      if (!hash || !userParam || !authDate) return null

      // Check data age (24 hours max)
      const dataAge = Math.floor(Date.now() / 1000) - parseInt(authDate)
      if (dataAge > 86400) return null

      // Verify signature
      urlParams.delete('hash')
      const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest()
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

      if (calculatedHash !== hash) return null

      return JSON.parse(decodeURIComponent(userParam))
    } catch {
      return null
    }
  }

  /**
   * Простая аутентификация через Telegram WebApp
   */
  async login(initData: string): Promise<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string; expiresIn: number } } | null> {
    try {
      // Verify Telegram data
      const telegramUser = this.verifyTelegramData(initData)
      if (!telegramUser) return null

      // Upsert user (атомарная операция создания или обновления)
      const user = await this.prisma.user.upsert({
        where: { telegramId: BigInt(telegramUser.id) },
        create: {
          telegramId: BigInt(telegramUser.id),
          username: telegramUser.username || undefined,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || undefined,
          languageCode: telegramUser.language_code || 'ru',
          isPremium: telegramUser.is_premium || false,
          photoUrl: telegramUser.photo_url || undefined,
          lastLoginAt: new Date()
        },
        update: {
          username: telegramUser.username || undefined,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || undefined,
          languageCode: telegramUser.language_code || 'ru',
          isPremium: telegramUser.is_premium || false,
          photoUrl: telegramUser.photo_url || undefined,
          lastLoginAt: new Date()
        }
      })

      // Generate tokens
      const tokens = await this.generateTokens(user.id, telegramUser.id.toString())

      const authUser: AuthUser = {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username || undefined,
        firstName: user.firstName,
        lastName: user.lastName || undefined,
        isPremium: user.isPremium,
        photoUrl: user.photoUrl || undefined,
        walletAddress: user.walletAddress || undefined
      }

      return { user: authUser, tokens }
    } catch (error) {
      console.error('Auth error:', error)
      return null
    }
  }

  /**
   * Генерация JWT токенов
   */
  private async generateTokens(userId: string, telegramId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const secret = process.env.JWT_SECRET || 'solana-superapp-secret'
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = 7 * 24 * 60 * 60 // 7 дней для MVP - избегаем проблем с refresh
    
    const payload = {
      sub: userId,
      telegramId,
      iat: now,
      exp: now + expiresIn
    }

    const accessToken = await this.signJWT(payload, secret)
    const refreshToken = crypto.randomBytes(32).toString('hex')

    return {
      accessToken,
      refreshToken,
      expiresIn
    }
  }

  /**
   * Проверка JWT токена
   */
  async verifyToken(token: string): Promise<{ userId: string; telegramId: string } | null> {
    try {
      const secret = process.env.JWT_SECRET || 'solana-superapp-secret'
      const payload = await this.verifyJWT(token, secret)
      
      if (!payload.sub || !payload.telegramId) {
        console.log('🔐 Token payload missing required fields:', { sub: !!payload.sub, telegramId: !!payload.telegramId })
        return null
      }
      
      // Check if user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub }
      })
      
      if (!user) {
        console.log('🔐 User not found in database:', payload.sub)
        return null
      }
      
      return { userId: payload.sub, telegramId: payload.telegramId }
    } catch (error) {
      console.log('🔐 Token verification error:', error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  /**
   * Обновление токенов
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
    try {
      // For simplicity, refresh tokens are just random strings stored in cookies
      // In production, you might want to store them in DB
      
      // Generate new tokens (simplified - no refresh token validation for MVP)
      const secret = process.env.JWT_SECRET || 'solana-superapp-secret'
      const now = Math.floor(Date.now() / 1000)
      const expiresIn = 7 * 24 * 60 * 60 // 7 дней для MVP - избегаем проблем с refresh
      
      // For MVP, we'll just generate new tokens without complex validation
      const newRefreshToken = crypto.randomBytes(32).toString('hex')
      
      return {
        accessToken: '', // Will be generated by caller with user data
        refreshToken: newRefreshToken,
        expiresIn
      }
    } catch {
      return null
    }
  }

  /**
   * JWT утилиты
   */
  private async signJWT(payload: any, secret: string): Promise<string> {
    const { SignJWT } = await import('jose')
    const secretKey = new TextEncoder().encode(secret)
    
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(payload.exp)
      .sign(secretKey)
  }

  private async verifyJWT(token: string, secret: string): Promise<any> {
    const { jwtVerify } = await import('jose')
    const secretKey = new TextEncoder().encode(secret)
    
    const { payload } = await jwtVerify(token, secretKey)
    return payload
  }
}

