import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/auth.service'
import { prisma } from '@/lib/prisma'

const authService = new AuthService(prisma, process.env.TELEGRAM_BOT_TOKEN!)

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json()
    
    if (!initData) {
      return NextResponse.json({ error: 'initData required' }, { status: 400 })
    }

    const result = await authService.login(initData)
    
    if (!result) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 })
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn
      }
    })

    response.cookies.set('refresh-token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Authorization failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 401 })
    }

    const result = await authService.verifyToken(token)
    
    if (!result) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({ valid: true, userId: result.userId })
  } catch (error) {
    return NextResponse.json({ error: 'Token verification failed' }, { status: 500 })
  }
}
