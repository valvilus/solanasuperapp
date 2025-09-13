/**
 * DAO Proposals API - Get and create DAO proposals
 * GET/POST /api/dao/proposals
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

// GET /api/dao/proposals - получить все предложения
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting DAO proposals...')

    //  ВРЕМЕННЫЙ FALLBACK: Используем mock данные вместо проблемного DAO service
    // TODO: Восстановить после починки DAO контракта
    console.log(' Using mock DAO proposals data while DAO contract is being fixed...')

    // Парсим query параметры
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'

    // Mock данные предложений
    const mockProposals = [
      {
        id: 'proposal-1',
        creator: 'GxU7vTw8hQmxRbw8wGm8KJv3n8kV9a2sH3mT5rS4fN1x',
        title: 'Увеличить награды за стейкинг TNG',
        description: 'Предлагаю увеличить годовую доходность стейкинга TNG с 12% до 15% для привлечения большего количества участников и повышения безопасности сети.',
        status: 'Active',
        votesFor: '25000000000000', // 25,000 TNG
        votesAgainst: '5000000000000', // 5,000 TNG
        votesAbstain: '2000000000000', // 2,000 TNG
        votingPowerSnapshot: '50000000000000', // 50,000 TNG total
        createdAt: Date.now() - 3 * 86400000, // 3 days ago
        votingEndsAt: Date.now() + 4 * 86400000, // ends in 4 days
        executionEta: Date.now() + 5 * 86400000, // execution in 5 days
        actions: [
          {
            type: 'UpdateStakingAPY',
            newApy: 15
          }
        ],
        executedActions: [false]
      },
      {
        id: 'proposal-2',
        creator: 'Hq8T4m2vKs9nR7dL5wE3yB6oP1jF8gA4cU6zX9iN2kM7',
        title: 'Добавить новый токен в farming пулы',
        description: 'Предлагаю добавить USDC в качестве нового токена для farming пулов с TNG, что позволит пользователям получать награды за предоставление ликвидности.',
        status: 'Passed',
        votesFor: '35000000000000', // 35,000 TNG
        votesAgainst: '8000000000000', // 8,000 TNG
        votesAbstain: '3000000000000', // 3,000 TNG
        votingPowerSnapshot: '46000000000000', // 46,000 TNG total
        createdAt: Date.now() - 10 * 86400000, // 10 days ago
        votingEndsAt: Date.now() - 3 * 86400000, // ended 3 days ago
        executionEta: Date.now() - 2 * 86400000, // executed 2 days ago
        actions: [
          {
            type: 'UpdateFarmingRewardRate',
            newRate: '1000000000' // 1 TNG per second
          }
        ],
        executedActions: [true]
      },
      {
        id: 'proposal-3',
        creator: 'Js7K3p5qR9mW2bF6vC8nE1dH4gL7aX5iY9oU3tZ6sN4k',
        title: 'Обновить параметры голосования DAO',
        description: 'Предлагаю увеличить минимальный порог для создания предложений с 100 TNG до 500 TNG для повышения качества предложений.',
        status: 'Rejected',
        votesFor: '15000000000000', // 15,000 TNG
        votesAgainst: '30000000000000', // 30,000 TNG
        votesAbstain: '5000000000000', // 5,000 TNG
        votingPowerSnapshot: '50000000000000', // 50,000 TNG total
        createdAt: Date.now() - 15 * 86400000, // 15 days ago
        votingEndsAt: Date.now() - 8 * 86400000, // ended 8 days ago
        executionEta: 0, // not executed (rejected)
        actions: [
          {
            type: 'UpdateDAOConfig',
            newConfig: {
              proposalThreshold: '500000000000' // 500 TNG
            }
          }
        ],
        executedActions: [false]
      }
    ]

    //  Возвращаем mock данные
    const response = {
      success: true,
      data: {
        proposals: mockProposals.slice(0, limit),
        totalCount: mockProposals.length,
        hasMore: limit < mockProposals.length
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error in DAO proposals API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch DAO proposals',
        code: 'PROPOSALS_ERROR'
      },
      { status: 500 }
    )
  }
})

// POST /api/dao/proposals - создание нового предложения
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Creating new DAO proposal...')

    // Парсим данные запроса
    const body = await request.json()
    const { title, description, actions } = body

    // Валидация
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Недостаточно данных для создания предложения', code: 'INVALID_DATA' },
        { status: 400 }
      )
    }

    //  ВРЕМЕННЫЙ FALLBACK: Симулируем создание предложения
    console.log(' Simulating proposal creation while DAO contract is being fixed...')

    const newProposal = {
      id: `proposal-${Date.now()}`,
      creator: 'mock-user-wallet-address',
      title,
      description,
      status: 'Active',
      votesFor: '0',
      votesAgainst: '0', 
      votesAbstain: '0',
      votingPowerSnapshot: '50000000000000',
      createdAt: Date.now(),
      votingEndsAt: Date.now() + 7 * 86400000, // 7 days from now
      executionEta: Date.now() + 8 * 86400000, // 8 days from now
      actions: actions || [],
      executedActions: (actions || []).map(() => false)
    }

    return NextResponse.json({
      success: true,
      data: {
        proposal: newProposal,
        message: 'Предложение создано успешно (mock режим)'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error(' Error creating DAO proposal:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create DAO proposal',
        code: 'CREATE_PROPOSAL_ERROR'
      },
      { status: 500 }
    )
  }
})