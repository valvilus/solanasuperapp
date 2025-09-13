/**
 * DAO Configuration API - On-chain DAO configuration
 * GET/POST /api/dao/onchain/config
 * Real blockchain integration
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { withAuth } from '@/lib/auth'
import { DAOService } from '@/lib/onchain/dao.service'

// GET /api/dao/onchain/config - получить конфигурацию DAO
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting DAO configuration from blockchain...')

    // Инициализируем подключение к Solana
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    // Создаем DAO service
    const daoService = new DAOService(connection)

    // Проверяем, инициализирован ли DAO
    const isInitialized = await daoService.isDAOInitialized()
    if (!isInitialized) {
      return NextResponse.json(
        { 
          success: false,
          error: 'DAO контракт не инициализирован', 
          code: 'DAO_NOT_INITIALIZED',
          details: 'Обратитесь к администратору для инициализации DAO'
        },
        { status: 503 }
      )
    }

    // Получаем конфигурацию DAO
    const daoConfig = await daoService.getDAOConfig()
    if (!daoConfig) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Не удалось получить конфигурацию DAO', 
          code: 'DAO_CONFIG_ERROR'
        },
        { status: 500 }
      )
    }

    // Преобразуем в удобный формат
    const response = {
      success: true,
      data: {
        authority: daoConfig.authority.toString(),
        treasury: daoConfig.treasury.toString(),
        tngMint: daoConfig.tngMint.toString(),
        votingDuration: daoConfig.votingDuration,
        executionDelay: daoConfig.executionDelay,
        quorumThreshold: daoConfig.quorumThreshold,
        proposalThreshold: daoConfig.proposalThreshold,
        totalProposals: daoConfig.totalProposals,
        isInitialized: true
      },
      timestamp: new Date().toISOString(),
      source: 'on-chain'
    }

    console.log(' DAO configuration retrieved from blockchain')
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error in DAO config API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении конфигурации DAO',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'DAO_CONFIG_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

// POST /api/dao/onchain/config - инициализировать DAO (только для администратора)
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Initializing DAO on blockchain...')

    // Проверяем права администратора (можно добавить дополнительную проверку)
    if (auth.userId !== 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Недостаточно прав для инициализации DAO',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      votingDuration = 604800, // 7 дней
      executionDelay = 86400,  // 24 часа
      quorumThreshold = '1000000000000', // 1000 TNG
      proposalThreshold = '100000000000'  // 100 TNG
    } = body

    // Инициализируем подключение к Solana
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    // Создаем DAO service
    const daoService = new DAOService(connection)

    // Проверяем, не инициализирован ли уже DAO
    const isInitialized = await daoService.isDAOInitialized()
    if (isInitialized) {
      return NextResponse.json(
        { 
          success: false,
          error: 'DAO уже инициализирован',
          code: 'DAO_ALREADY_INITIALIZED'
        },
        { status: 400 }
      )
    }

    // Инициализируем DAO (требует sponsor keypair в окружении)
    const signature = await daoService.initializeDAO({
      votingDuration,
      executionDelay,
      quorumThreshold,
      proposalThreshold
    })

    const response = {
      success: true,
      data: {
        signature,
        message: 'DAO успешно инициализирован',
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      },
      timestamp: new Date().toISOString()
    }

    console.log(' DAO initialized on blockchain:', signature)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error initializing DAO:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при инициализации DAO',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'DAO_INIT_ERROR'
      },
      { status: 500 }
    )
  }
})