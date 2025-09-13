import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/auth.service'
import { prisma } from '@/lib/prisma'

const authService = new AuthService(prisma, process.env.TELEGRAM_BOT_TOKEN!)

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh-token')?.value
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 })
    }

    // For MVP, we need to get user data from the refresh token
    // In a real implementation, refresh tokens would be stored in DB with user associations
    // For now, we'll try to decode user info from the cookie or use a simple approach
    
    // Get user from session or regenerate based on existing auth state
    // This is simplified for MVP - in production you'd store refresh tokens in DB
    const result = await authService.refreshTokens(refreshToken)
    
    if (!result) {
      const response = NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
      response.cookies.delete('refresh-token')
      return response
    }
    
    // For MVP, we need user data to generate proper access token
    // This is a simplified approach - in production, refresh tokens would contain user info
    console.log('🔐 Refresh token validation needs user data - simplified for MVP')

    const response = NextResponse.json({
      success: true,
      tokens: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      }
    })

    response.cookies.set('refresh-token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
  }
}

