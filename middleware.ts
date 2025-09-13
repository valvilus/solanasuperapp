/**
 * Simple Middleware Configuration
 * Solana SuperApp - Basic Security Headers
 */

import { NextRequest, NextResponse } from 'next/server'

export default function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Basic security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // CORS for Telegram WebApp
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://web.telegram.org',
    'https://telegram.org',
    'https://solana-superapp-dev.loca.lt',
    'http://localhost:3000'
  ]
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
}

