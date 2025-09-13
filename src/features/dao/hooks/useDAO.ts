'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import * as DAOApi from '../services/dao-api.service'
import * as OnChainDAO from '../services/onchain-dao.service'
import { Proposal, DAOStats } from '../types/dao.types'

export interface DAOData {
  proposals: Proposal[]
  stats: {
    overview: {
      totalMembers: number
      totalProposals: number
      activeProposals: number
      totalVotes: number
      treasuryValue: string
      userVotingPower: string
      userTotalVotes: number
      governanceTokenSymbol: string
    }
    metrics: {
      proposalSuccessRate: number
      participationRate: number
      averageVotesPerProposal: number
      averageVotingPower: number
      quorumReachedRate: number
    }
    proposalStats: any
    topProposals: any[]
    recentActivity: any
    userStats: any
  }
  treasury: {
    treasuryAddress: string
    totalValueUSD: number
    monthlyIncome: number
    monthlyExpenses: number
    growthRate: number
    assets: Array<{
      mint: string
      symbol: string
      name: string
      balance: number
      usdValue: number
      percentage: number
      icon: string
    }>
    stats: any
    recentTransactions: any[]
  }
  members: {
    members: Array<{
      id: string
      address: string
      username: string
      avatar: string | null
      votingPower: number
      totalVotes: number
      proposalsCreated: number
      reputation: number
      joinedAt: string
      isActive: boolean
      lastActivity: string
      recentVotes: any[]
    }>
    totalCount: number
    hasMore: boolean
    stats: any
    pagination: any
  }
  isOnChain: boolean  // Флаг, что DAO работает полностью on-chain
  daoInitialized: boolean  // Статус инициализации DAO контракта
}

interface UseDAOResult {
  data: DAOData | null
  isLoading: boolean
  error: string | null
  
  // Actions
  refreshAll: () => Promise<void>
  refreshProposals: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshTreasury: () => Promise<void>
  refreshMembers: () => Promise<void>
  
  // Proposal actions
  createProposal: (form: any) => Promise<void>
  voteOnProposal: (proposalId: string, vote: string, comment?: string) => Promise<void>
  
  // Filters
  getProposals: (filters?: {
    status?: string
    type?: string
    search?: string
    sortBy?: string
    sortOrder?: string
    limit?: number
    offset?: number
  }) => Promise<Proposal[]>
}

export function useDAO(): UseDAOResult {
  const { apiCall, isAuthenticated } = useCompatibleAuth()
  const [data, setData] = useState<DAOData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping DAO data load')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Load all data in parallel
      const [proposalsResult, statsResult, treasuryResult, membersResult] = await Promise.allSettled([
        DAOApi.getProposals(apiCall, { limit: 20 }),
        DAOApi.getDAOStats(apiCall, true),
        DAOApi.getDAOTreasury(apiCall),
        DAOApi.getDAOMembers(apiCall, { limit: 10 })
      ])

      const newData: DAOData = {
        proposals: proposalsResult.status === 'fulfilled' ? proposalsResult.value.proposals : [],
        stats: statsResult.status === 'fulfilled' ? statsResult.value : getEmptyStats(),
        treasury: treasuryResult.status === 'fulfilled' ? treasuryResult.value : getEmptyTreasury(),
        members: membersResult.status === 'fulfilled' ? membersResult.value : getEmptyMembers(),
        isOnChain: true,  // DAO теперь работает полностью on-chain
        daoInitialized: true  // DAO контракт инициализирован
      }

      setData(newData)

      // Log any failed requests
      if (proposalsResult.status === 'rejected') {
        console.error('Failed to load proposals:', proposalsResult.reason)
      }
      if (statsResult.status === 'rejected') {
        console.error('Failed to load stats:', statsResult.reason)
      }
      if (treasuryResult.status === 'rejected') {
        console.error('Failed to load treasury:', treasuryResult.reason)
      }
      if (membersResult.status === 'rejected') {
        console.error('Failed to load members:', membersResult.reason)
      }

    } catch (error: any) {
      console.error(' Error loading DAO data:', error)
      
      // Проверяем, если ошибка связана с неинициализированным DAO
      if (error?.message?.includes('DAO контракт не инициализирован')) {
        setData({
          proposals: [],
          stats: getEmptyStats(),
          treasury: getEmptyTreasury(),
          members: getEmptyMembers(),
          isOnChain: true,
          daoInitialized: false  // DAO контракт НЕ инициализирован
        })
        setError('DAO контракт не инициализирован. Обратитесь к администратору.')
      } else {
        setError(error.message || 'Ошибка загрузки данных DAO')
      }
    } finally {
      setIsLoading(false)
    }
  }, [apiCall, isAuthenticated])

  // Refresh individual sections
  const refreshProposals = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const result = await DAOApi.getProposals(apiCall, { limit: 20 })
      setData(prev => prev ? { ...prev, proposals: result.proposals } : null)
    } catch (error: any) {
      console.error('Error refreshing proposals:', error)
      setError(error.message || 'Ошибка обновления предложений')
    }
  }, [apiCall, isAuthenticated])

  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const result = await DAOApi.getDAOStats(apiCall, true)
      setData(prev => prev ? { ...prev, stats: result } : null)
    } catch (error: any) {
      console.error('Error refreshing stats:', error)
      setError(error.message || 'Ошибка обновления статистики')
    }
  }, [apiCall, isAuthenticated])

  const refreshTreasury = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const result = await DAOApi.getDAOTreasury(apiCall)
      setData(prev => prev ? { ...prev, treasury: result } : null)
    } catch (error: any) {
      console.error('Error refreshing treasury:', error)
      setError(error.message || 'Ошибка обновления казны')
    }
  }, [apiCall, isAuthenticated])

  const refreshMembers = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const result = await DAOApi.getDAOMembers(apiCall, { limit: 10 })
      setData(prev => prev ? { ...prev, members: result } : null)
    } catch (error: any) {
      console.error('Error refreshing members:', error)
      setError(error.message || 'Ошибка обновления участников')
    }
  }, [apiCall, isAuthenticated])

  // Actions
  const createProposal = useCallback(async (form: any) => {
    if (!isAuthenticated) throw new Error('Требуется авторизация')
    
    console.log(' useDAO.createProposal called with:', form)
    
    const newProposal = await DAOApi.createProposal(apiCall, form)
    console.log(' Proposal created, refreshing data...')
    
    await refreshProposals()
    await refreshStats()
    
    console.log(' Data refreshed successfully')
  }, [apiCall, isAuthenticated, refreshProposals, refreshStats])

  const voteOnProposal = useCallback(async (proposalId: string, vote: string, comment?: string) => {
    if (!isAuthenticated) throw new Error('Требуется авторизация')
    
    await DAOApi.voteOnProposal(apiCall, proposalId, {
      vote: vote as any,
      comment
    })
    await refreshProposals()
    await refreshStats()
  }, [apiCall, isAuthenticated, refreshProposals, refreshStats])

  const getProposals = useCallback(async (filters = {}) => {
    if (!isAuthenticated) return []
    
    const result = await DAOApi.getProposals(apiCall, filters)
    return result.proposals
  }, [apiCall, isAuthenticated])

  // Initialize data on mount
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  return {
    data,
    isLoading,
    error,
    refreshAll: loadAllData,
    refreshProposals,
    refreshStats,
    refreshTreasury,
    refreshMembers,
    createProposal,
    voteOnProposal,
    getProposals
  }
}

// Helper functions for empty states
function getEmptyStats() {
  return {
    overview: {
      totalMembers: 0,
      totalProposals: 0,
      activeProposals: 0,
      totalVotes: 0,
      treasuryValue: '0 USD',
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
}

function getEmptyTreasury() {
  return {
    treasuryAddress: '',
    totalValueUSD: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    growthRate: 0,
    assets: [],
    stats: {},
    recentTransactions: []
  }
}

function getEmptyMembers() {
  return {
    members: [],
    totalCount: 0,
    hasMore: false,
    stats: {},
    pagination: {}
  }
}

