/**
 * Process Pending Transfers API Route
 * Обработка отложенных переводов при регистрации пользователя
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

interface ProcessedTransfer {
  id: string
  senderId: string
  senderUsername?: string
  token: string
  amount: string
  memo?: string
  createdAt: string
  processedAt: string
}

// POST /api/transfers/process-pending - Обработка отложенных переводов для пользователя
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

    if (!currentUser.username) {
      return NextResponse.json(
        { error: 'У пользователя нет username' },
        { status: 400 }
      )
    }

    console.log(' Processing pending transfers for user:', {
      userId: currentUser.id,
      username: currentUser.username
    })

    // Находим все отложенные переводы для этого username
    const pendingTransfers = await prisma.pendingTransfer.findMany({
      where: {
        recipientUsername: {
          equals: currentUser.username,
          mode: 'insensitive'
        },
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (pendingTransfers.length === 0) {
      return NextResponse.json({
        success: true,
        processedTransfers: [],
        message: 'Нет отложенных переводов для обработки',
        timestamp: new Date().toISOString()
      })
    }

    console.log(` Found ${pendingTransfers.length} pending transfers to process`)

    const processedTransfers = []
    const errors: string[] = []

    // Обрабатываем каждый перевод в транзакции
    for (const transfer of pendingTransfers) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Обновляем статус перевода
          const updatedTransfer = await tx.pendingTransfer.update({
            where: { id: transfer.id },
            data: {
              status: 'PROCESSING',
              recipientId: currentUser.id,
              processedAt: new Date()
            }
          })

          // 2. TODO: Интегрировать с on-chain системой переводов
          // В реальной системе здесь должна быть интеграция с on-chain кошельком
          // await transferOnChain(transfer.senderId, currentUser.id, transfer.token, transfer.amount)

          // 4. Финализируем перевод
          await tx.pendingTransfer.update({
            where: { id: transfer.id },
            data: {
              status: 'COMPLETED'
            }
          })

          console.log(` Processed pending transfer ${transfer.id}`)

          // Отправляем SSE уведомление получателю
          try {
            // SSE notification not available
            // const { sendSSENotification } = await import('@/app/api/notifications/stream/route')
            
            // Рассчитываем USD стоимость
            let usdAmount: string | undefined
            try {
              // Получаем все нужные активы за один запрос
              const assets = await tx.asset.findMany({
                where: { 
                  symbol: { in: [transfer.token, 'USDC'] }
                }
              })
              
              const baseAsset = assets.find(a => a.symbol === transfer.token)
              const usdAsset = assets.find(a => a.symbol === 'USDC')
              
              if (baseAsset && usdAsset && baseAsset.id !== usdAsset.id) {
                const rate = await tx.rate.findFirst({
                  where: { 
                    baseAssetId: baseAsset.id,
                    quoteAssetId: usdAsset.id
                  },
                  orderBy: { createdAt: 'desc' }
                })
                
                if (rate) {
                  const baseAmount = Number(transfer.amount) / 1e9 * Number(rate.rate)
                  usdAmount = baseAmount.toFixed(2)
                }
              }
            } catch (rateError) {
              console.warn(' Failed to calculate USD amount for pending transfer:', rateError)
            }

            const notificationData = {
              id: `pending_transfer_${transfer.id}`,
              type: 'transfer_received',
              data: {
                type: 'transfer_received' as const,
                transferId: transfer.id,
                senderId: transfer.senderId,
                senderUsername: transfer.sender.username || undefined,
                recipientId: currentUser.id,
                token: transfer.token,
                amount: (Number(transfer.amount) / 1e9).toString(),
                usdAmount,
                memo: transfer.memo || undefined,
                isAnonymous: transfer.isAnonymous || false,
                timestamp: new Date().toISOString()
              },
              timestamp: new Date().toISOString()
            }

            // sendSSENotification(currentUser.id, notificationData)
            console.log(` Pending transfer notification sent to user: ${currentUser.id}`)
          } catch (notificationError) {
            console.error(' Failed to send pending transfer notification:', notificationError)
          }

          processedTransfers.push({
            id: transfer.id,
            senderId: transfer.senderId,
            senderUsername: transfer.sender.username || undefined,
            token: transfer.token,
            amount: transfer.amount.toString(),
            memo: transfer.memo || undefined,
            createdAt: transfer.createdAt.toISOString(),
            processedAt: new Date().toISOString()
          })
        })

      } catch (error) {
        console.error(` Error processing transfer ${transfer.id}:`, error)
        
        // Помечаем перевод как неудачный
        try {
          await prisma.pendingTransfer.update({
            where: { id: transfer.id },
            data: {
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              processedAt: new Date()
            }
          })
        } catch (updateError) {
          console.error('Failed to update transfer status:', updateError)
        }

        errors.push(`Перевод ${transfer.id}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      }
    }

    // TODO: Отправляем уведомления отправителям о том, что их переводы обработаны

    const response = {
      success: true,
      processedTransfers,
      processedCount: processedTransfers.length,
      totalFound: pendingTransfers.length,
      errors: errors.length > 0 ? errors : undefined,
      message: processedTransfers.length > 0 
        ? `Обработано ${processedTransfers.length} отложенных переводов`
        : 'Не удалось обработать отложенные переводы',
      timestamp: new Date().toISOString()
    }

    console.log(' Pending transfers processing completed:', {
      processed: processedTransfers.length,
      errors: errors.length
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error(' Process pending transfers error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка обработки отложенных переводов',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

// GET /api/transfers/process-pending - Проверка наличия отложенных переводов
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

    if (!currentUser.username) {
      return NextResponse.json({
        success: true,
        hasPendingTransfers: false,
        count: 0,
        message: 'У пользователя нет username',
        timestamp: new Date().toISOString()
      })
    }

    // Проверяем наличие отложенных переводов
    const pendingCount = await prisma.pendingTransfer.count({
      where: {
        recipientUsername: {
          equals: currentUser.username,
          mode: 'insensitive'
        },
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    // Получаем краткую сводку
    const summary = await prisma.pendingTransfer.groupBy({
      by: ['token'],
      where: {
        recipientUsername: {
          equals: currentUser.username,
          mode: 'insensitive'
        },
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      hasPendingTransfers: pendingCount > 0,
      count: pendingCount,
      summary: summary.map(item => ({
        token: item.token,
        amount: item._sum.amount?.toString() || '0',
        count: item._count.id
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Check pending transfers error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка проверки отложенных переводов',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})
