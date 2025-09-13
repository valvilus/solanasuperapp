/**
 * Real-time Notifications API - Server-Sent Events
 */

import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth/auth.service'
import { prisma } from '@/lib/prisma'
import { addConnection, removeConnection } from '@/lib/notifications/notification-stream'

const authService = new AuthService(prisma, process.env.TELEGRAM_BOT_TOKEN!)

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters (for SSE)
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response('Unauthorized: No token provided', { status: 401 })
    }

    const authResult = await authService.verifyToken(token)
    if (!authResult) {
      return new Response('Unauthorized: Invalid token', { status: 401 })
    }

    const userId = authResult.userId

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Save connection
        addConnection(userId, {
          controller,
          lastPing: Date.now()
        })

        // Send initial connection confirmation
        const welcomeEvent = `event: connected\ndata: ${JSON.stringify({ 
          message: 'Connected to notifications stream',
          userId,
          timestamp: new Date().toISOString()
        })}\n\n`
        
        controller.enqueue(new TextEncoder().encode(welcomeEvent))
      },

      cancel() {
        // Clean up connection on client disconnect
        removeConnection(userId)
      }
    })

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
}