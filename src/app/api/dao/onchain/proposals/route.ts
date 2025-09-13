/**
 * DAO Proposals API - On-chain proposal operations
 * GET/POST /api/dao/onchain/proposals
 * Real blockchain integration
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { withAuth } from '@/lib/auth'
import { DAOService } from '@/lib/onchain/dao.service'

// GET /api/dao/onchain/proposals - получить все предложения
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting DAO proposals from blockchain...')

    // Парсим query параметры
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'active', 'passed', 'rejected', 'executed'

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
          code: 'DAO_NOT_INITIALIZED'
        },
        { status: 503 }
      )
    }

    // Получаем все предложения с блокчейна
    const allProposals = await daoService.getAllProposals()
    
    // Фильтруем по статусу если указан
    let filteredProposals = allProposals
    if (status) {
      filteredProposals = allProposals.filter(proposal => 
        proposal.status.toLowerCase() === status.toLowerCase()
      )
    }

    // Применяем пагинацию
    const proposals = filteredProposals.slice(offset, offset + limit)
    
    // Преобразуем в формат для frontend
    const formattedProposals = proposals.map(proposal => ({
      id: proposal.id.toString(),
      creator: proposal.creator.toString(),
      title: proposal.title,
      description: proposal.description,
      status: proposal.status,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      votesAbstain: proposal.votesAbstain,
      createdAt: proposal.createdAt * 1000, // Convert to milliseconds
      votingEndsAt: proposal.votingEndsAt * 1000,
      executionEta: proposal.executionEta * 1000,
      actions: proposal.actions,
      // Additional frontend fields
      type: proposal.actions.length > 0 ? 'treasury' : 'governance',
      proposer: proposal.creator.toString(),
      startTime: proposal.createdAt * 1000,
      endTime: proposal.votingEndsAt * 1000,
      votes: {
        for: parseInt(proposal.votesFor),
        against: parseInt(proposal.votesAgainst),
        abstain: parseInt(proposal.votesAbstain)
      },
      totalVotes: parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst) + parseInt(proposal.votesAbstain),
      requiredQuorum: 1000, // From DAO config
      category: 'governance',
      currentStatus: proposal.status
    }))

    const response = {
      success: true,
      data: {
        proposals: formattedProposals,
        totalCount: filteredProposals.length,
        hasMore: offset + limit < filteredProposals.length,
        pagination: {
          limit,
          offset,
          total: filteredProposals.length
        }
      },
      timestamp: new Date().toISOString(),
      source: 'on-chain'
    }

    console.log(` Retrieved ${proposals.length} proposals from blockchain`)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error getting DAO proposals:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении предложений DAO',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'DAO_PROPOSALS_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

// POST /api/dao/onchain/proposals - создать новое предложение
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Creating DAO proposal on blockchain...')

    const body = await request.json()
    const { title, description, actions = [], userWallet, walletType = 'external' } = body

    // Валидация
    if (!title || !description) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Название и описание обязательны',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    if (!userWallet) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Кошелек пользователя обязателен',
          code: 'WALLET_REQUIRED'
        },
        { status: 400 }
      )
    }

    // Проверяем валидность PublicKey
    let creatorPublicKey: PublicKey
    try {
      creatorPublicKey = new PublicKey(userWallet)
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Невалидный адрес кошелька',
          code: 'INVALID_WALLET_ADDRESS',
          details: `Received: ${userWallet}`
        },
        { status: 400 }
      )
    }

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
          code: 'DAO_NOT_INITIALIZED'
        },
        { status: 503 }
      )
    }

    // Проверяем, есть ли у пользователя достаточно TNG для создания предложения
    const userVotingPower = await daoService.getUserVotingPower(new PublicKey(userWallet))
    const proposalThreshold = '100000000000' // 100 TNG
    
    if (parseInt(userVotingPower) < parseInt(proposalThreshold)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Недостаточно TNG для создания предложения. Требуется: ${parseInt(proposalThreshold) / 1e9} TNG`,
          code: 'INSUFFICIENT_VOTING_POWER'
        },
        { status: 400 }
      )
    }

    // Создаем предложение на блокчейне
    console.log(` Creating proposal using ${walletType} wallet for user:`, userWallet)
    
    const signature = await daoService.createProposal({
      creator: creatorPublicKey,
      title,
      description,
      actions,
      walletType, // Передаем тип кошелька в сервис
      userId: walletType === 'custodial' ? auth.userId : undefined // Передаем userId для custodial кошелька
    })

    const response = {
      success: true,
      data: {
        signature,
        message: 'Предложение успешно создано',
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        proposalId: signature // Используем signature как временный ID
      },
      timestamp: new Date().toISOString(),
      source: 'on-chain'
    }

    console.log(' DAO proposal created on blockchain:', signature)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error creating DAO proposal:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при создании предложения DAO',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'DAO_PROPOSAL_CREATE_ERROR'
      },
      { status: 500 }
    )
  }
})