/**
 * Simple Auth Utilities for API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './auth.service'
import { prisma } from '@/lib/prisma'

const authService = new AuthService(prisma, process.env.TELEGRAM_BOT_TOKEN!)

/**
 * Проверка авторизации в API роутах
 */
export async function requireAuth(request: NextRequest): Promise<{ userId: string; telegramId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  // Debug logging
  const url = request.url
  const urlPath = new URL(url).pathname
  
  if (!token) {
    console.log(`🔐 No token provided for ${urlPath}`)
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  // Check token expiry before verification
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const isExpired = payload.exp < Math.floor(Date.now() / 1000)
    if (isExpired) {
      console.log(`🔐 Token expired for ${urlPath}, exp: ${payload.exp}, now: ${Math.floor(Date.now() / 1000)}`)
      return NextResponse.json({ error: 'Токен истек' }, { status: 401 })
    }
  } catch (e) {
    console.log(`🔐 Invalid token format for ${urlPath}`)
    return NextResponse.json({ error: 'Недействительный формат токена' }, { status: 401 })
  }

  const result = await authService.verifyToken(token)
  
  if (!result) {
    console.log(`🔐 Token verification failed for ${urlPath}`)
    return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
  }

  return result
}

/**
 * Опциональная авторизация - не блокирует запрос
 */
export async function optionalAuth(request: NextRequest): Promise<{ userId: string; telegramId: string } | null> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) return null

  return await authService.verifyToken(token)
}

/**
 * Wrapper для защищенных API роутов
 */
export function withAuth(handler: (request: NextRequest, auth: { userId: string; telegramId: string }, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]) => {
    const auth = await requireAuth(request)
    
    if (auth instanceof NextResponse) {
      return auth // Return error response
    }
    
    return handler(request, auth, ...args)
  }
}

/**
 * Wrapper для API роутов с опциональной авторизацией
 */
export function withOptionalAuth(handler: (request: NextRequest, auth: { userId: string; telegramId: string } | null, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]) => {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    let auth: { userId: string; telegramId: string } | null = null
    
    if (token) {
      auth = await authService.verifyToken(token)
    }
    
    return handler(request, auth, ...args)
  }
}