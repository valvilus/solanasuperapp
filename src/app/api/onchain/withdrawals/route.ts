/**
 * Withdrawals API - On-chain Withdrawal Management  
 * GET/POST /api/onchain/withdrawals
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { WithdrawalService } from '@/lib/onchain'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
)

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const withdrawals = await prisma.onchainTx.findMany({
      where: {
        userId,
        purpose: 'WITHDRAW'
      },
      include: {
        asset: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const withdrawalData = withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      signature: withdrawal.signature,
      amount: withdrawal.amount?.toString() || '0',
      token: withdrawal.asset?.symbol || 'SOL',
      toAddress: withdrawal.toAddress,
      status: withdrawal.status,
      slot: withdrawal.slot?.toString(),
      blockTime: withdrawal.blockTime,
      createdAt: withdrawal.createdAt,
      confirmedAt: withdrawal.confirmedAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        userId,
        withdrawals: withdrawalData,
        total: withdrawalData.length
      },
      message: 'Выводы получены успешно'
    })

  } catch (error) {
    
    
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

// POST /api/onchain/withdrawals - создать новый вывод
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Processing withdrawal request

    const userId = auth.userId

    // Парсим тело запроса
    const body = await request.json()
    const { toAddress, amount, token, memo, priority } = body

    // Validate inputs and process

    // Валидация входных данных
    if (!toAddress || typeof toAddress !== 'string') {
      return NextResponse.json(
        { error: 'Адрес получателя обязателен', code: 'INVALID_ADDRESS' },
        { status: 400 }
      )
    }

    if (!amount || typeof amount !== 'string') {
      return NextResponse.json(
        { error: 'Сумма обязательна', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    // Конвертируем amount в BigInt
    let amountBigInt: bigint
    try {
      amountBigInt = BigInt(amount)
      if (amountBigInt <= 0n) {
        throw new Error('Amount must be positive')
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Неверный формат суммы', code: 'INVALID_AMOUNT_FORMAT' },
        { status: 400 }
      )
    }

    // Проверяем что у пользователя есть кошелек
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

    // Создаем сервисы
    const walletService = new CustodialWalletService(prisma)
    const withdrawalService = new WithdrawalService(connection, prisma, walletService)

    // Выполняем вывод
    const withdrawalResult = await withdrawalService.processWithdrawal({
      fromUserId: userId,
      toAddress,
      amount: amountBigInt,
      token,
      memo,
      priority: priority || 'medium',
      validateBalance: true
    })

    if (!withdrawalResult.success || !withdrawalResult.data) {
      const statusCode = getStatusCodeFromOnchainError(withdrawalResult.error?.code)
      return NextResponse.json(
        {
          error: withdrawalResult.error?.message || 'Ошибка выполнения вывода',
          code: withdrawalResult.error?.code || 'WITHDRAWAL_FAILED',
          details: withdrawalResult.error?.details,
          timestamp: new Date().toISOString()
        },
        { status: statusCode }
      )
    }

    const withdrawal = withdrawalResult.data

    // Success

    return NextResponse.json({
      success: true,
      data: {
        withdrawal: {
          id: withdrawal.id,
          signature: withdrawal.signature,
          amount: withdrawal.amount.toString(),
          token: withdrawal.token,
          toAddress: withdrawal.toAddress,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
          submittedAt: withdrawal.submittedAt,
          confirmedAt: withdrawal.confirmedAt,
          estimatedFee: withdrawal.estimatedFee?.toString(),
          actualFee: withdrawal.actualFee?.toString()
        }
      },
      message: 'Вывод выполнен успешно'
    })

  } catch (error) {
    
    
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

/**
 * Определяет HTTP статус по коду ошибки on-chain операций
 */
function getStatusCodeFromOnchainError(errorCode?: string): number {
  switch (errorCode) {
    case 'INVALID_ADDRESS':
    case 'INVALID_TOKEN_MINT':
    case 'INSUFFICIENT_FUNDS':
      return 400

    case 'TRANSACTION_NOT_FOUND':
    case 'DEPOSIT_NOT_FOUND':
      return 404

    case 'RPC_RATE_LIMITED':
      return 429

    case 'RPC_CONNECTION_FAILED':
    case 'RPC_TIMEOUT':
    case 'TRANSACTION_FAILED':
    case 'TRANSACTION_TIMEOUT':
    case 'WITHDRAWAL_PREPARATION_FAILED':
    case 'WITHDRAWAL_SIGNING_FAILED':
    case 'WITHDRAWAL_SUBMISSION_FAILED':
    case 'INDEXER_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return 500
  }
}
