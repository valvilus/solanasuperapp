/**
 * Indexer Management API - Control transaction indexer
 * GET/POST /api/onchain/indexer
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { TransactionIndexer } from '@/lib/onchain'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
)

// Глобальный экземпляр индексера
let globalIndexer: TransactionIndexer | null = null

// GET /api/onchain/indexer - статус индексера
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting indexer status...')

    // TODO: Проверить права админа
    // Пока разрешаем всем авторизованным пользователям

    // Парсим query параметры
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    // Получаем статус индексера или возвращаем дефолтный
    const indexerStatus = globalIndexer ? globalIndexer.getStatus() : {
      isRunning: false,
      lastProcessedSlot: 0,
      addressCount: 0,
      timestamp: new Date().toISOString()
    }

    let response: any = {
      success: true,
      data: {
        indexer: indexerStatus,
        isConfigured: !!globalIndexer
      },
      message: 'Статус индексера получен'
    }

    // Добавляем статистику если запрошено
    if (includeStats && globalIndexer) {
      const timeframe = parseInt(searchParams.get('timeframe') || '24')
      const stats = await globalIndexer.getIndexerStats(timeframe)
      response.data.stats = stats
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error(' Indexer status API error:', error)
    
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

// POST /api/onchain/indexer - управление индексером
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Processing indexer command...')

    // Парсим тело запроса
    const body = await request.json()
    const { action, config } = body

    console.log(' Indexer action:', { action, hasConfig: !!config })

    switch (action) {
      case 'start':
        return await handleStartIndexer(config)
      
      case 'stop':
        return await handleStopIndexer()
      
      case 'restart':
        return await handleRestartIndexer(config)
      
      case 'force_process':
        return await handleForceProcess()
      
      default:
        return NextResponse.json(
          { error: `Неизвестное действие: ${action}`, code: 'INVALID_ACTION' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error(' Indexer management API error:', error)
    
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
 * Запускает индексер
 */
async function handleStartIndexer(config?: any) {
  try {
    if (globalIndexer && globalIndexer.getStatus().isRunning) {
      return NextResponse.json(
        { error: 'Индексер уже запущен', code: 'ALREADY_RUNNING' },
        { status: 400 }
      )
    }

    // Получаем custodial адреса всех пользователей для мониторинга
    const users = await prisma.user.findMany({
      where: {
        walletAddress: { not: null }
      },
      select: { walletAddress: true }
    })

    const filterAccounts = users
      .map(user => user.walletAddress)
      .filter(Boolean) as string[]

    if (filterAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Нет custodial адресов для мониторинга', code: 'NO_ADDRESSES' },
        { status: 400 }
      )
    }

    // Конфигурация индексера
    const indexerConfig = {
      pollIntervalMs: config?.pollIntervalMs || 10000, // 10 секунд
      batchSize: config?.batchSize || 10,
      maxRetries: config?.maxRetries || 3,
      filterAccounts,
      webhookUrl: config?.webhookUrl || process.env.INDEXER_WEBHOOK_URL
    }

    console.log(' Starting indexer with config:', {
      pollInterval: indexerConfig.pollIntervalMs,
      addressCount: filterAccounts.length,
      hasWebhook: !!indexerConfig.webhookUrl
    })

    globalIndexer = new TransactionIndexer(connection, prisma, indexerConfig)
    const startResult = await globalIndexer.start()

    if (!startResult.success) {
      globalIndexer = null
      return NextResponse.json(
        {
          error: startResult.error?.message || 'Ошибка запуска индексера',
          code: startResult.error?.code || 'START_FAILED',
          details: startResult.error?.details
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        status: globalIndexer.getStatus(),
        config: indexerConfig
      },
      message: 'Индексер запущен успешно'
    })

  } catch (error) {
    globalIndexer = null
    throw error
  }
}

/**
 * Останавливает индексер
 */
async function handleStopIndexer() {
  if (!globalIndexer) {
    return NextResponse.json(
      { error: 'Индексер не запущен', code: 'NOT_RUNNING' },
      { status: 400 }
    )
  }

  await globalIndexer.stop()
  globalIndexer = null

  return NextResponse.json({
    success: true,
    data: { stopped: true },
    message: 'Индексер остановлен'
  })
}

/**
 * Перезапускает индексер
 */
async function handleRestartIndexer(config?: any) {
  // Останавливаем если запущен
  if (globalIndexer) {
    await globalIndexer.stop()
    globalIndexer = null
  }

  // Запускаем заново
  return await handleStartIndexer(config)
}

/**
 * Принудительно обрабатывает транзакции
 */
async function handleForceProcess() {
  if (!globalIndexer) {
    return NextResponse.json(
      { error: 'Индексер не запущен', code: 'NOT_RUNNING' },
      { status: 400 }
    )
  }

  const processResult = await globalIndexer.forceProcess()

  if (!processResult.success) {
    return NextResponse.json(
      {
        error: processResult.error?.message || 'Ошибка принудительной обработки',
        code: processResult.error?.code || 'FORCE_PROCESS_FAILED'
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      processedAddresses: processResult.data,
      timestamp: new Date()
    },
    message: 'Принудительная обработка выполнена'
  })
}
