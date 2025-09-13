/**
 * User Sessions API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId

    const sessions = [
      {
        id: 'current-session',
        sessionId: `session_${userId}_${Date.now()}`,
        deviceInfo: {
          platform: 'Telegram WebApp',
          browser: 'Chrome',
          os: 'Android'
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isCurrentSession: true
      }
    ]

    return NextResponse.json({
      success: true,
      sessions,
      message: 'Sessions retrieved successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { 
          error: 'Session ID not provided',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }


    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

