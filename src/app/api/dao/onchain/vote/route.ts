/**
 * DAO Voting API - On-chain voting operations
 * POST /api/dao/onchain/vote
 * Real blockchain integration
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { withAuth } from '@/lib/auth'
import { DAOService } from '@/lib/onchain/dao.service'

// POST /api/dao/onchain/vote - голосование по предложению
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Processing DAO vote on blockchain...')

    const body = await request.json()
    const { proposalId, vote, userWallet, walletType = 'external' } = body

    // Валидация
    if (!proposalId || !vote || !userWallet) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Все поля обязательны: proposalId, vote, userWallet',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    if (!['For', 'Against', 'Abstain'].includes(vote)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Недопустимый тип голоса. Допустимы: For, Against, Abstain',
          code: 'INVALID_VOTE_TYPE'
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

    // Проверяем, есть ли у пользователя право голоса (TNG токены)
    const userVotingPower = await daoService.getUserVotingPower(new PublicKey(userWallet))
    
    if (parseInt(userVotingPower) === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'У вас нет права голоса. Для голосования нужны TNG токены.',
          code: 'NO_VOTING_POWER'
        },
        { status: 400 }
      )
    }

    // Получаем информацию о предложении для проверки
    // proposalId - это числовой ID, а не PublicKey
    const proposal = await daoService.getProposal(parseInt(proposalId))
    if (!proposal) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Предложение не найдено',
          code: 'PROPOSAL_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Проверяем, что голосование еще активно
    const now = Math.floor(Date.now() / 1000)
    if (now > proposal.votingEndsAt) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Период голосования по этому предложению завершен',
          code: 'VOTING_PERIOD_ENDED'
        },
        { status: 400 }
      )
    }

    // Проверяем, не голосовал ли уже пользователь
    // Получаем PDA предложения из числового ID
    const [proposalPDA] = daoService.getProposalPDA(parseInt(proposalId))
    const hasVoted = await daoService.hasUserVoted(proposalPDA, new PublicKey(userWallet))
    if (hasVoted) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Вы уже голосовали по этому предложению',
          code: 'ALREADY_VOTED'
        },
        { status: 400 }
      )
    }

    // Выполняем голосование на блокчейне
    console.log(` Processing vote using ${walletType} wallet for user:`, userWallet)
    
    const signature = await daoService.vote({
      proposalId: proposalPDA, // Используем PDA предложения
      voter: new PublicKey(userWallet),
      vote: vote as 'For' | 'Against' | 'Abstain',
      walletType, // Передаем тип кошелька в сервис
      userId: walletType === 'custodial' ? auth.userId : undefined // Передаем userId для custodial кошелька
    })

    const response = {
      success: true,
      data: {
        signature,
        message: `Ваш голос "${vote}" успешно учтен`,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        votingPower: userVotingPower,
        vote: vote
      },
      timestamp: new Date().toISOString(),
      source: 'on-chain'
    }

    console.log(` Vote "${vote}" recorded on blockchain:`, signature)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error processing DAO vote:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при обработке голоса',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'DAO_VOTE_ERROR'
      },
      { status: 500 }
    )
  }
})