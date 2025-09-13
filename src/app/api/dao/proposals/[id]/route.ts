/**
 * DAO Proposal Details API - ON-CHAIN proposal details
 * GET /api/dao/proposals/[id]
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, requireAuth } from '@/lib/auth'
import { Connection, PublicKey } from '@solana/web3.js'
import { DAOService } from '@/lib/onchain/dao.service'
import { prisma } from '@/lib/prisma'
import { ProposalStatus } from '@prisma/client'

// GET /api/dao/proposals/[id] - ON-CHAIN детали предложения  
export const GET = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string },
  context: { params: Promise<{ id: string }> }
) => {
  try {
    // Await params before using its properties
    const { id } = await context.params
    console.log(' Getting ON-CHAIN DAO proposal details:', id)

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
    
    // Ищем предложение по ID (id может быть строкой или числом)
    const proposal = allProposals.find(p => p.id === id || p.id.toString() === id)

    if (!proposal) {
      return NextResponse.json(
        { error: 'Предложение не найдено', code: 'PROPOSAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Получаем пользователя из БД для userVote
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { walletAddress: true }
    })

    let userVote: any = null
    if (user?.walletAddress) {
      try {
        const userPublicKey = new PublicKey(user.walletAddress)
        
        // ИСПРАВЛЕНО: Используем proposalId для создания PublicKey блокчейна
        let hasVoted = false
        if (proposal.id) {
          try {
            // Получаем PDA для предложения на блокчейне
            const proposalPDA = daoService.getProposalPDA(parseInt(proposal.id))
            const proposalPublicKey = proposalPDA[0] // Берем PublicKey из кортежа [PublicKey, number]
            hasVoted = await daoService.hasUserVoted(proposalPublicKey, userPublicKey)
          } catch (publicKeyError) {
            console.log(`Proposal ${proposal.id} PDA creation failed, skipping blockchain vote check:`, publicKeyError)
          }
        } else {
          console.log(`Proposal has no valid id, skipping blockchain vote check`)
        }
        
        if (hasVoted) {
          // TODO: Получить детали голоса пользователя с блокчейна
          userVote = {
            vote: 'for', // Временная заглушка
            weight: 0,
            timestamp: new Date().toISOString(),
            comment: null
          }
        }
      } catch (error) {
        console.log(' Could not check user vote status:', error)
      }
    }

    // ИСПРАВЛЕНО: Добавляем детальное логирование временных меток
    const createdAtDate = new Date(proposal.createdAt * 1000)
    const endTimeDate = new Date(proposal.votingEndsAt * 1000)
    const now = new Date()
    
    console.log(' Proposal time analysis:', {
      proposalId: proposal.id.toString(),
      status: proposal.status,
      createdAt: createdAtDate.toISOString(),
      endTime: endTimeDate.toISOString(),
      now: now.toISOString(),
      isAfterStart: now >= createdAtDate,
      isBeforeEnd: now <= endTimeDate,
      timeUntilEnd: (endTimeDate.getTime() - now.getTime()) / 1000 / 60, // minutes
      isTimeValid: now >= createdAtDate && now <= endTimeDate
    })

    // Форматируем ответ
    const formattedProposal = {
      id: proposal.id.toString(),
      title: proposal.title,
      description: proposal.description,
      type: proposal.actions.length > 0 ? 'treasury' : 'governance',
      status: proposal.status.toLowerCase(),
      proposer: proposal.creator.toString(),
      createdAt: createdAtDate.toISOString(),
      startTime: createdAtDate.toISOString(),
      endTime: endTimeDate.toISOString(),
      
      votesFor: parseInt(proposal.votesFor),
      votesAgainst: parseInt(proposal.votesAgainst),
      totalVotes: parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst) + parseInt(proposal.votesAbstain),
      requiredQuorum: 1000, // From DAO config
      
      category: proposal.actions.length > 0 ? 'Казна' : 'Управление',
      // ИСПРАВЛЕНО: Используем правильное сравнение статуса (с учетом регистра)
      isActive: proposal.status.toLowerCase() === 'active', // Исправлен case sensitivity bug
      
      userVote,
      votes: [], // TODO: Получить детали голосов с блокчейна
      voteCount: parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst) + parseInt(proposal.votesAbstain)
    }

    console.log(' Final formatted proposal:', {
      id: formattedProposal.id,
      status: formattedProposal.status,
      isActive: formattedProposal.isActive,
      hasUserVote: !!formattedProposal.userVote
    })

    return NextResponse.json({
      success: true,
      data: formattedProposal,
      message: 'Детали предложения получены успешно (on-chain)',
      timestamp: new Date().toISOString(),
      source: 'on-chain'
    })

  } catch (error) {
    console.error(' Error fetching ON-CHAIN proposal details:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка получения деталей предложения',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROPOSAL_FETCH_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

// PUT /api/dao/proposals/[id] - обновление предложения (только создатель)
export const PUT = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Await params before using its properties
    const { id } = await params
    console.log(' Updating DAO proposal:', id)

    // Проверяем авторизацию
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) {
      return auth
    }

    const userId = auth.userId

    // Получаем предложение
    const proposal = await prisma.dAOProposal.findUnique({
      where: { id }
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Предложение не найдено', code: 'PROPOSAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Проверяем права на обновление (пока только статус можно менять)
    // В будущем можно добавить поле creatorId в модель
    
    // Парсим тело запроса
    const body = await request.json()
    const { status } = body

    if (status && !['DRAFT', 'ACTIVE', 'PASSED', 'REJECTED', 'EXECUTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Недопустимый статус предложения', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // Обновляем предложение
    const updatedProposal = await prisma.dAOProposal.update({
      where: { id },
      data: {
        ...(status && { status: status as ProposalStatus }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedProposal.id,
        status: updatedProposal.status.toLowerCase(),
        updatedAt: updatedProposal.updatedAt.toISOString()
      },
      message: 'Предложение успешно обновлено',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Error updating proposal:', error)
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

// DELETE /api/dao/proposals/[id] - удаление предложения (только создатель)
export const DELETE = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Await params before using its properties
    const { id } = await params
    console.log(' Deleting DAO proposal:', id)

    // Проверяем авторизацию
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) {
      return auth
    }

    const userId = auth.userId

    // Получаем предложение
    const proposal = await prisma.dAOProposal.findUnique({
      where: { id },
      include: {
        _count: {
          select: { votes: true }
        }
      }
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Предложение не найдено', code: 'PROPOSAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Проверяем права на удаление - только создатель может удалить
    if (proposal.creatorId && proposal.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Только создатель может удалить предложение', code: 'NOT_CREATOR' },
        { status: 403 }
      )
    }

    // Нельзя удалить предложение если по нему уже есть голоса
    if (proposal._count.votes > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить предложение с существующими голосами', code: 'HAS_VOTES' },
        { status: 400 }
      )
    }

    // Soft delete - меняем статус вместо удаления
    await prisma.dAOProposal.update({
      where: { id },
      data: {
        status: 'REJECTED' as ProposalStatus,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Предложение успешно удалено',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Error deleting proposal:', error)
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

// Helper function
function getProposalCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    'TREASURY': 'Казна',
    'GOVERNANCE': 'Управление',
    'FEATURE': 'Фича',
    'COMMUNITY': 'Сообщество'
  }
  return categoryMap[type] || 'Другое'
}

