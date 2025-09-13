/**
 * Wallet API - Custodial Wallet Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/wallet - получить информацию о кошельке пользователя
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const walletService = new CustodialWalletService(prisma)
    const walletResult = await walletService.getOrCreateUserWallet(auth.userId)
    
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json({ error: 'Ошибка получения кошелька' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        wallet: walletResult.data
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
})

// POST /api/wallet - создать кошелек
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const walletService = new CustodialWalletService(prisma)
    const walletResult = await walletService.getOrCreateUserWallet(auth.userId)
    
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json({ error: 'Ошибка создания кошелька' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        wallet: walletResult.data
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
})