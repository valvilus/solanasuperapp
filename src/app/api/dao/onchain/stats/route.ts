/**
 * DAO Statistics API - On-chain DAO statistics
 * GET /api/dao/onchain/stats
 * Real blockchain integration
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { withAuth } from '@/lib/auth'
import { DAOService } from '@/lib/onchain/dao.service'
import { formatTNGAmount } from '@/lib/utils/format-tng'
import { prisma } from '@/lib/prisma'

// GET /api/dao/onchain/stats - статистика DAO
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting DAO statistics from blockchain...')

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

    // Получаем конфигурацию DAO
    const daoConfig = await daoService.getDAOConfig()
    if (!daoConfig) {
      throw new Error('Failed to get DAO config')
    }

    // Получаем все предложения для статистики
    const allProposals = await daoService.getAllProposals()
    
    // Подсчитываем статистики
    const totalProposals = allProposals.length
    const activeProposals = allProposals.filter(p => 
      p.status === 'Active' && 
      Math.floor(Date.now() / 1000) < p.votingEndsAt
    ).length
    
    const passedProposals = allProposals.filter(p => p.status === 'Passed').length
    const rejectedProposals = allProposals.filter(p => p.status === 'Rejected').length
    const executedProposals = allProposals.filter(p => p.status === 'Executed').length

    // Подсчитываем общее количество голосов
    const totalVotes = allProposals.reduce((sum, proposal) => {
      return sum + parseInt(proposal.votesFor) + parseInt(proposal.votesAgainst) + parseInt(proposal.votesAbstain)
    }, 0)

    // Получаем баланс казны
    const treasuryBalance = await daoService.getTreasuryBalance()
    
    // Подсчитываем участие (пример - можно улучшить)
    const participationRate = totalProposals > 0 ? 
      Math.round((totalVotes / (totalProposals * 100)) * 100) / 100 : 0

    // Получаем информацию о пользователе из базы данных
    let userVotingPower = '0'
    let userTotalVotes = 0
    let userWallet: string | null = null
    
    try {
      // Получаем пользователя из базы данных по userId из auth
      console.log(' DEBUG: Getting user from database by userId:', auth.userId)
      
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: {
          walletAddress: true,
          telegramId: true
        }
      })
      
      if (user?.walletAddress) {
        userWallet = user.walletAddress
        console.log(' DEBUG: Found user custodial wallet:', userWallet)
        
        try {
          console.log(' DEBUG: Getting user voting power for wallet:', userWallet)
          
          const userPublicKey = new PublicKey(userWallet)
          console.log(' DEBUG: PublicKey created successfully:', userPublicKey.toBase58())
          
          userVotingPower = await daoService.getUserVotingPower(userPublicKey)
          console.log(' DEBUG: Raw user voting power (lamports):', userVotingPower)
          
          // Convert to TNG for debugging
          const tngAmount = parseFloat(userVotingPower) / 1e9
          console.log(' DEBUG: User voting power in TNG:', tngAmount)
          
          // Подсчет голосов пользователя требует дополнительной логики
          userTotalVotes = 0 // TODO: Implement user vote counting from DAO proposals
          
        } catch (votingPowerError) {
          console.error(' DEBUG: Error getting user voting power:', votingPowerError)
          console.error(' DEBUG: Error details:', {
            message: votingPowerError instanceof Error ? votingPowerError.message : 'Unknown error',
            wallet: userWallet
          })
        }
      } else {
        console.log(' DEBUG: No custodial wallet found for user')
      }
    } catch (dbError) {
      console.error(' DEBUG: Error getting user from database:', dbError)
      console.error(' DEBUG: Database error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: auth.userId
      })
    }

    const response = {
      success: true,
      data: {
        totalProposals,
        activeProposals,
        passedProposals,
        rejectedProposals,
        executedProposals,
        totalVotes,
        totalMembers: 0, // TODO: Implement member counting from on-chain data
        totalVotingPower: treasuryBalance.tng || '0',
        treasuryBalance: {
          sol: treasuryBalance.sol || '0',
          tng: treasuryBalance.tng || '0'
        },
        participationRate,
        averageVotingTime: 3.5, // TODO: Calculate from on-chain data
        
        // User-specific data
        userVotingPower,
        userTotalVotes,
        governanceTokenSymbol: 'TNG',
        
        // DAO configuration
        config: {
          votingDuration: daoConfig.votingDuration,
          executionDelay: daoConfig.executionDelay,
          quorumThreshold: daoConfig.quorumThreshold,
          proposalThreshold: daoConfig.proposalThreshold,
          authority: daoConfig.authority.toString(),
          treasury: daoConfig.treasury.toString()
        },
        
        // Overview for compatibility
        overview: {
          totalMembers: 0,
          totalProposals,
          activeProposals,
          totalVotes,
          treasuryValue: formatTNGAmount(treasuryBalance.tng || '0'),
          userVotingPower: formatTNGAmount(userVotingPower),
          userTotalVotes,
          governanceTokenSymbol: 'TNG',
          participationRate
        }
      },
      timestamp: new Date().toISOString(),
      source: 'on-chain',
      blockHeight: await connection.getSlot()
    }

    console.log(' DAO statistics retrieved from blockchain')
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(' Error getting DAO statistics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении статистики DAO',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'DAO_STATS_ERROR'
      },
      { status: 500 }
    )
  }
})
