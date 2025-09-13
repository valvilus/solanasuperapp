/**
 * DAO Statistics API - Get comprehensive DAO statistics
 * GET /api/dao/stats
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    
    try {
      const onchainStatsUrl = new URL('/api/dao/onchain/stats', request.url)
      
      const { searchParams } = new URL(request.url)
      const userWallet = searchParams.get('userWallet')
      if (userWallet) {
        onchainStatsUrl.searchParams.set('userWallet', userWallet)
      }
      
      const onchainResponse = await fetch(onchainStatsUrl.toString(), {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Content-Type': 'application/json'
        }
      })
      
      if (onchainResponse.ok) {
        const onchainData = await onchainResponse.json()
        return NextResponse.json(onchainData)
      }
    } catch (error) {
    }
    
    
    const fallbackStats = {
      overview: {
        totalMembers: 0,
        totalProposals: 0,
        activeProposals: 0,
        totalVotes: 0,
        treasuryValue: '0 TNG',
        userVotingPower: '0 TNG',
        userTotalVotes: 0,
        governanceTokenSymbol: 'TNG'
      },
      metrics: {
        proposalSuccessRate: 0,
        participationRate: 0,
        averageVotesPerProposal: 0,
        averageVotingPower: 0,
        quorumReachedRate: 0
      },
      proposalStats: {},
      topProposals: [],
      recentActivity: {},
      userStats: {}
    }

    return NextResponse.json({
      success: true,
      data: fallbackStats,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch DAO statistics',
        code: 'STATS_ERROR'
      },
      { status: 500 }
    )
  }
})