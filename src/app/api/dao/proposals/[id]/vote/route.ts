/**
 * DAO Voting API - Cast vote on proposal with TNG token weight
 * POST /api/dao/proposals/[id]/vote
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { TNGTokenService } from '@/lib/onchain/tng-token.service'
import { DAOService } from '@/lib/onchain/dao.service'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VoteType } from '@prisma/client'

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
)

// POST /api/dao/proposals/[id]/vote - голосование по предложению
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before using its properties
    const { id } = await params
    console.log(' Casting vote on proposal:', id)

    // Проверяем авторизацию
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) {
      return auth
    }

    const userId = auth.userId

    // Проверяем, что мы работаем только с on-chain DAO
    console.log(' Processing on-chain only vote for proposal:', id)

    // Парсим тело запроса
    const body = await request.json()
    const { vote, comment } = body

    // Валидация голоса
    if (!vote || !['FOR', 'AGAINST', 'ABSTAIN'].includes(vote.toUpperCase())) {
      return NextResponse.json(
        { error: 'Недопустимый тип голоса. Используйте: FOR, AGAINST, ABSTAIN', code: 'INVALID_VOTE' },
        { status: 400 }
      )
    }

    const voteType = vote.toUpperCase() as VoteType

    // ИСПРАВЛЕНО: Получаем предложение из блокчейна (не из базы данных)
    let proposal: any
    
    try {
      const daoService = new DAOService(connection)
      
      // Проверяем инициализацию DAO
      const isInitialized = await daoService.isDAOInitialized()
      if (!isInitialized) {
        return NextResponse.json(
          { error: 'DAO контракт не инициализирован', code: 'DAO_NOT_INITIALIZED' },
          { status: 503 }
        )
      }
      
      // Получаем предложение из блокчейна
      const allProposals = await daoService.getAllProposals()
      proposal = allProposals.find((p: any) => p.id.toString() === id)
      
      if (!proposal) {
        return NextResponse.json(
          { error: 'Предложение не найдено в блокчейне', code: 'PROPOSAL_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      console.log(' Found proposal in blockchain:', {
        id: proposal.id.toString(),
        status: proposal.status,
        votingEndsAt: proposal.votingEndsAt
      })
      
    } catch (error) {
      console.error(' Error fetching proposal from blockchain:', error)
      return NextResponse.json(
        { error: 'Ошибка получения предложения из блокчейна', code: 'BLOCKCHAIN_ERROR' },
        { status: 500 }
      )
    }

    // ИСПРАВЛЕНО: Проверяем что предложение активно (case insensitive)
    const now = new Date()
    const proposalStatus = proposal.status.toLowerCase()
    
    console.log(' Checking proposal status:', {
      rawStatus: proposal.status,
      normalizedStatus: proposalStatus,
      isActive: proposalStatus === 'active'
    })
    
    if (proposalStatus !== 'active') {
      return NextResponse.json(
        { 
          error: 'Предложение не активно для голосования', 
          code: 'PROPOSAL_NOT_ACTIVE',
          details: { status: proposal.status }
        },
        { status: 400 }
      )
    }

    // ИСПРАВЛЕНО: Время в блокчейне в секундах, конвертируем в миллисекунды
    const votingEndsAt = new Date(proposal.votingEndsAt * 1000)
    const votingStartsAt = new Date(proposal.createdAt * 1000)
    
    console.log(' Checking voting time window:', {
      now: now.toISOString(),
      start: votingStartsAt.toISOString(),
      end: votingEndsAt.toISOString(),
      isAfterStart: now >= votingStartsAt,
      isBeforeEnd: now <= votingEndsAt,
      isTimeValid: now >= votingStartsAt && now <= votingEndsAt
    })
    
    if (now < votingStartsAt || now > votingEndsAt) {
      return NextResponse.json(
        { 
          error: 'Голосование не проводится в данный момент', 
          code: 'VOTING_NOT_ACTIVE',
          details: {
            now: now.toISOString(),
            start: votingStartsAt.toISOString(),
            end: votingEndsAt.toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Проверяем что пользователь еще не голосовал
    const existingVote = await prisma.dAOVote.findUnique({
      where: {
        userId_proposalId: {
          userId,
          proposalId: id
        }
      }
    })

    if (existingVote) {
      return NextResponse.json(
        { error: 'Вы уже проголосовали по этому предложению', code: 'ALREADY_VOTED' },
        { status: 400 }
      )
    }

    // Получаем пользователя с кошельком
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    })

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'У пользователя нет кошелька', code: 'NO_WALLET' },
        { status: 400 }
      )
    }

    // Получаем TNG баланс пользователя (сначала из кеша, потом on-chain)
    let tngBalance = BigInt(0)
    
    // Проверяем кешированный баланс в базе данных
    const cachedBalance = await prisma.balance.findFirst({
      where: {
        userId,
        asset: { symbol: 'TNG' }
      },
      include: { asset: true }
    })

    if (cachedBalance && cachedBalance.availableAmount > 0) {
      tngBalance = cachedBalance.availableAmount
      console.log(' Using cached TNG balance:', Number(tngBalance) / 1e9, 'TNG')
    } else {
      // Fallback на on-chain баланс
      try {
        const tngService = new TNGTokenService(connection)
        const userPublicKey = new PublicKey(user.walletAddress)
        const balanceResult = await tngService.getTNGBalance(userPublicKey)

        if (balanceResult.success && balanceResult.data) {
          tngBalance = BigInt(balanceResult.data.balance)
          console.log(' Using on-chain TNG balance:', Number(tngBalance) / 1e9, 'TNG')
        }
      } catch (error) {
        console.error('Error getting on-chain TNG balance:', error)
      }
    }

    const minVotingBalance = BigInt(100 * 1e9) // 100 TNG минимум для голосования

    if (tngBalance < minVotingBalance) {
      return NextResponse.json(
        { 
          error: `Недостаточно TNG для голосования. Требуется минимум 100 TNG, у вас ${Number(tngBalance) / 1e9} TNG`, 
          code: 'INSUFFICIENT_TNG' 
        },
        { status: 400 }
      )
    }

    // ИСПРАВЛЕНО: Создаем только голос в БД (предложение хранится в блокчейне)
    const newVote = await prisma.dAOVote.create({
      data: {
        userId,
        proposalId: id,
        vote: voteType,
        weight: tngBalance, // вес голоса = TNG баланс
        comment: comment || null
      }
    })

    // TODO: В будущем здесь нужно будет отправить транзакцию в блокчейн
    // для обновления счетчиков голосования в смарт-контракте DAO
    
    const result = { vote: newVote, proposal: proposal }

    console.log(' Vote cast successfully:', {
      proposalId: id,
      userId,
      vote: voteType,
      weight: Number(tngBalance) / 1e9
    })

    // ИСПРАВЛЕНО: Проверяем достижение кворума из блокчейна (числа как строки)
    const totalVotes = parseInt(result.proposal.votesFor) + parseInt(result.proposal.votesAgainst)
    const quorumRequired = 1000 // Из DAO конфигурации
    const quorumReached = totalVotes >= quorumRequired
    
    // TODO: В будущем здесь можно добавить логику обновления статуса предложения в блокчейне
    console.log(' Vote statistics:', {
      totalVotes,
      quorumRequired,
      quorumReached,
      votesFor: result.proposal.votesFor,
      votesAgainst: result.proposal.votesAgainst
    })

    return NextResponse.json({
      success: true,
      data: {
        voteId: result.vote.id,
        vote: voteType.toLowerCase(),
        weight: Number(tngBalance),
        timestamp: result.vote.createdAt.toISOString(),
        
        // ИСПРАВЛЕНО: Обновленная статистика предложения из блокчейна
        proposal: {
          id: id,
          votesFor: parseInt(result.proposal.votesFor),
          votesAgainst: parseInt(result.proposal.votesAgainst),
          totalVotes: totalVotes,
          requiredQuorum: quorumRequired,
          quorumReached,
          status: result.proposal.status.toLowerCase()
        }
      },
      message: 'Голос успешно зарегистрирован',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Error casting vote:', error)
    
    // Специальная обработка для уже проголосовавших пользователей
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Вы уже проголосовали по этому предложению',
          code: 'ALREADY_VOTED',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

