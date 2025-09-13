/**
 * Pending Transfers API Route
 * Создание и управление отложенными переводами для незарегистрированных пользователей
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

interface CreatePendingTransferRequest {
  recipientUsername: string
  token: 'SOL' | 'TNG' | 'USDC'
  amount: number
  memo?: string
  isAnonymous?: boolean
}

interface PendingTransferResponse {
  id: string
  recipientUsername: string
  token: string
  amount: string
  memo?: string
  status: string
  expiresAt?: string
  createdAt: string
}

// POST /api/transfers/pending - Создание отложенного перевода
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Получаем пользователя из базы данных
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, firstName: true, lastName: true }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    // Получаем данные запроса
    const body: CreatePendingTransferRequest = await request.json()
    const { recipientUsername, token: transferToken, amount, memo, isAnonymous } = body

    // Валидация
    if (!recipientUsername || !recipientUsername.trim()) {
      return NextResponse.json(
        { error: 'Username получателя обязателен' },
        { status: 400 }
      )
    }

    if (!transferToken || !['SOL', 'TNG', 'USDC'].includes(transferToken)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый токен' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Некорректная сумма' },
        { status: 400 }
      )
    }

    const username = recipientUsername.replace('@', '').trim()

    console.log(' Creating pending transfer:', {
      sender: currentUser.username,
      recipientUsername: username,
      token: transferToken,
      amount
    })

    // Проверяем, существует ли уже пользователь с таким username
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        username: true,
        firstName: true
      }
    })

    if (existingUser) {
      // Пользователь уже зарегистрирован - делаем обычный перевод
      return NextResponse.json(
        {
          error: 'Пользователь уже зарегистрирован',
          registeredUser: {
            id: existingUser.id,
            username: existingUser.username,
            firstName: existingUser.firstName
          },
          shouldUseDirectTransfer: true
        },
        { status: 400 }
      )
    }

    // Проверяем баланс отправителя (заглушка - в реальности нужно проверить через ledger)
    // TODO: Интегрировать с реальной системой балансов
    
    // Конвертируем amount в минимальные единицы
    const amountInMinimalUnits = BigInt(Math.floor(amount * (transferToken === 'SOL' ? 1e9 : 1e6)))

    // Создаем отложенный перевод
    const pendingTransfer = await prisma.pendingTransfer.create({
      data: {
        senderId: currentUser.id,
        recipientUsername: username,
        token: transferToken,
        amount: amountInMinimalUnits,
        memo: memo || null,
        isAnonymous: isAnonymous || false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
        status: 'PENDING'
      }
    })

    // TODO: Списать средства с баланса отправителя
    // TODO: Отправить уведомление в Telegram если возможно

    console.log(' Pending transfer created:', {
      id: pendingTransfer.id,
      recipientUsername: username
    })

    const response: PendingTransferResponse = {
      id: pendingTransfer.id,
      recipientUsername: username,
      token: transferToken,
      amount: amount.toString(),
      memo: memo || undefined,
      status: pendingTransfer.status,
      expiresAt: pendingTransfer.expiresAt?.toISOString(),
      createdAt: pendingTransfer.createdAt.toISOString()
    }

    return NextResponse.json({
      success: true,
      transfer: response,
      message: `Перевод ${amount} ${transferToken} создан для @${username}. Средства будут переданы когда пользователь зарегистрируется.`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Pending transfer creation error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка создания отложенного перевода',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

// GET /api/transfers/pending - Получение отложенных переводов текущего пользователя
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Получаем пользователя из базы данных
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, firstName: true, lastName: true }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'sent' | 'received' | 'all'

    // Получаем отложенные переводы
    const where: any = {}
    
    if (type === 'sent') {
      where.senderId = currentUser.id
    } else if (type === 'received') {
      where.recipientId = currentUser.id
    } else {
      // Все переводы (отправленные и полученные)
      where.OR = [
        { senderId: currentUser.id },
        { recipientId: currentUser.id }
      ]
    }

    const pendingTransfers = await prisma.pendingTransfer.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        },
        recipient: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Ограничиваем количество
    })

    const transfers = pendingTransfers.map(transfer => ({
      id: transfer.id,
      recipientUsername: transfer.recipientUsername,
      token: transfer.token,
      amount: transfer.amount.toString(),
      memo: transfer.memo,
      status: transfer.status,
      expiresAt: transfer.expiresAt?.toISOString(),
      processedAt: transfer.processedAt?.toISOString(),
      createdAt: transfer.createdAt.toISOString(),
      sender: transfer.sender,
      recipient: transfer.recipient,
      isSent: transfer.senderId === currentUser.id
    }))

    return NextResponse.json({
      success: true,
      transfers,
      count: transfers.length,
      type: type || 'all',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Get pending transfers error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка получения отложенных переводов',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})
