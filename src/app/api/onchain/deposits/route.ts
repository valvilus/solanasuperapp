/**
 * Deposits API - On-chain Deposit Management
 * GET/POST /api/onchain/deposits
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { DepositService } from '@/lib/onchain'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
)

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId

    // Получаем custodial адрес пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    })

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'У пользователя нет custodial кошелька', code: 'NO_WALLET' },
        { status: 400 }
      )
    }

    // Парсим query параметры
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Получаем депозиты из БД
    const deposits = await prisma.onchainTx.findMany({
      where: {
        userId,
        purpose: 'DEPOSIT'
      },
      include: {
        asset: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const depositData = deposits.map(deposit => ({
      id: deposit.id,
      signature: deposit.signature,
      amount: deposit.amount?.toString() || '0',
      token: deposit.asset?.symbol || 'SOL',
      status: deposit.status,
      slot: deposit.slot?.toString(),
      blockTime: deposit.blockTime,
      confirmations: deposit.status === 'CONFIRMED' ? 1 : 0,
      createdAt: deposit.createdAt,
      confirmedAt: deposit.confirmedAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        userId,
        custodialAddress: user.walletAddress,
        deposits: depositData,
        total: depositData.length
      },
      message: 'Депозиты получены успешно'
    })

  } catch (error) {
    console.error(' Deposits API error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    )
  }
})

// POST /api/onchain/deposits/monitor - запустить мониторинг депозитов
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Starting deposit monitoring...')

    const userId = auth.userId

    // Получаем custodial адрес пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    })

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'У пользователя нет custodial кошелька', code: 'NO_WALLET' },
        { status: 400 }
      )
    }

    // Запускаем мониторинг депозитов
    const depositService = new DepositService(connection, prisma)
    const monitorResult = await depositService.monitorDeposits(user.walletAddress)

    if (!monitorResult.success) {
      return NextResponse.json(
        {
          error: monitorResult.error?.message || 'Ошибка мониторинга депозитов',
          code: monitorResult.error?.code || 'MONITOR_FAILED',
          details: monitorResult.error?.details,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    const newDeposits = monitorResult.data || []

    console.log(' Deposit monitoring completed:', {
      userId,
      newDeposits: newDeposits.length
    })

    return NextResponse.json({
      success: true,
      data: {
        userId,
        custodialAddress: user.walletAddress,
        newDeposits: newDeposits.map(deposit => ({
          id: deposit.id,
          signature: deposit.signature,
          amount: deposit.amount.toString(),
          token: deposit.token,
          status: deposit.status,
          createdAt: deposit.createdAt
        })),
        monitoredAt: new Date()
      },
      message: `Найдено ${newDeposits.length} новых депозитов`
    })

  } catch (error) {
    console.error(' Deposit monitoring error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    )
  }
})
