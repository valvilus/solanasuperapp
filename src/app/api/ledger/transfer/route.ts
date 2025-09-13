/**
 * Ledger Transfer API - Off-chain Transfer Endpoint
 * POST /api/ledger/transfer
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { LedgerService } from '@/lib/ledger'
import { TransferRequest } from '@/lib/ledger/types'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/ledger/transfer - выполнить off-chain перевод
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Processing transfer request...')

    const userId = auth.userId

    // Парсим тело запроса
    const body = await request.json()
    const {
      toUserId,
      assetSymbol,
      amount,
      description,
      metadata,
      idempotencyKey
    } = body

    console.log(' Transfer details:', {
      fromUserId: userId,
      toUserId,
      assetSymbol,
      amount,
      idempotencyKey
    })

    // Валидация входных данных
    if (!toUserId || typeof toUserId !== 'string') {
      return NextResponse.json(
        { error: 'Получатель (toUserId) обязателен', code: 'INVALID_RECIPIENT' },
        { status: 400 }
      )
    }

    if (!assetSymbol || !['SOL', 'USDC', 'TNG'].includes(assetSymbol)) {
      return NextResponse.json(
        { error: 'Неверный символ актива', code: 'INVALID_ASSET' },
        { status: 400 }
      )
    }

    if (!amount || typeof amount !== 'string') {
      return NextResponse.json(
        { error: 'Сумма обязательна', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return NextResponse.json(
        { error: 'Ключ идемпотентности обязателен', code: 'MISSING_IDEMPOTENCY_KEY' },
        { status: 400 }
      )
    }

    // Проверяем что пользователь не переводит сам себе
    if (userId === toUserId) {
      return NextResponse.json(
        { error: 'Нельзя переводить средства самому себе', code: 'SELF_TRANSFER' },
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

    // Проверяем существование получателя
    // Сначала пробуем найти по ID, потом по wallet address
    let recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, username: true, walletAddress: true }
    })

    // Если не найден по ID, пробуем найти по wallet address
    if (!recipient) {
      recipient = await prisma.user.findFirst({
        where: { walletAddress: toUserId },
        select: { id: true, username: true, walletAddress: true }
      })
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Получатель не найден. Убедитесь что пользователь зарегистрирован в системе.', code: 'RECIPIENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Используем ID найденного получателя для дальнейшей обработки
    const actualToUserId = recipient.id

    // Создаем запрос на перевод
    const transferRequest: TransferRequest = {
      fromUserId: userId,
      toUserId: actualToUserId, // Используем реальный ID получателя
      assetSymbol,
      amount: amountBigInt,
      description,
      metadata,
      idempotencyKey
    }

    // Выполняем перевод через LedgerService
    const ledgerService = new LedgerService(prisma)
    const transferResult = await ledgerService.executeTransfer(transferRequest)

    if (!transferResult.success) {
      const statusCode = getStatusCodeFromLedgerError(transferResult.error?.code)
      return NextResponse.json(
        {
          error: transferResult.error?.message || 'Ошибка выполнения перевода',
          code: transferResult.error?.code || 'TRANSFER_FAILED',
          details: transferResult.error?.details,
          timestamp: new Date().toISOString()
        },
        { status: statusCode }
      )
    }

    console.log(' Transfer completed successfully:', transferResult.transferId)

    // Возвращаем успешный результат
    return NextResponse.json({
      success: true,
      transferId: transferResult.transferId,
      message: 'Перевод выполнен успешно',
      details: {
        fromUserId: userId,
        toUserId: actualToUserId,
        recipientWalletAddress: recipient.walletAddress,
        assetSymbol,
        amount: amount,
        description,
        timestamp: new Date().toISOString()
      },
      ledgerEntries: transferResult.ledgerEntries?.map(entry => ({
        id: entry.id,
        direction: entry.direction,
        amount: entry.amount.toString(),
        status: entry.status,
        createdAt: entry.createdAt
      }))
    })

  } catch (error) {
    console.error(' Transfer API error:', error)
    
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

// GET /api/ledger/transfer - получить историю переводов пользователя
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting transfer history...')

    const userId = auth.userId

    // Парсим query параметры
    const { searchParams } = new URL(request.url)
    const assetSymbol = searchParams.get('asset')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // максимум 100

    console.log(' History request:', { userId, assetSymbol, page, limit })

    // Получаем историю через LedgerService
    const ledgerService = new LedgerService(prisma)
    const historyResult = await ledgerService.getUserTransactionHistory(
      userId,
      assetSymbol || undefined,
      { page, limit }
    )

    if (!historyResult.success) {
      return NextResponse.json(
        {
          error: historyResult.error?.message || 'Ошибка получения истории',
          code: historyResult.error?.code || 'HISTORY_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    const history = historyResult.data!

    return NextResponse.json({
      success: true,
      data: {
        transactions: history.entries.map(entry => ({
          id: entry.id,
          direction: entry.direction,
          amount: entry.amount.toString(),
          assetSymbol: entry.assetSymbol,
          txType: entry.txType,
          status: entry.status,
          description: entry.description,
          metadata: entry.metadata,
          createdAt: entry.createdAt,
          postedAt: entry.postedAt
        })),
        pagination: {
          total: history.total,
          page: history.page,
          limit: history.limit,
          hasMore: history.hasMore,
          totalPages: Math.ceil(history.total / history.limit)
        }
      },
      message: 'История получена успешно'
    })

  } catch (error) {
    console.error(' Transfer history API error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

/**
 * Определяет HTTP статус по коду ошибки леджера
 */
function getStatusCodeFromLedgerError(errorCode?: string): number {
  switch (errorCode) {
    case 'INSUFFICIENT_BALANCE':
    case 'INSUFFICIENT_AVAILABLE_BALANCE':
    case 'INVALID_AMOUNT':
    case 'INVALID_ASSET':
    case 'INVALID_USER':
      return 400
    
    case 'ASSET_NOT_FOUND':
    case 'HOLD_NOT_FOUND':
      return 404
    
    case 'DUPLICATE_IDEMPOTENCY_KEY':
      return 409
    
    case 'INTERNAL_ERROR':
    case 'DATABASE_ERROR':
    case 'LEDGER_IMBALANCE':
    default:
      return 500
  }
}

