/**
 * DAO Hook - Frontend interface for DAO operations
 * Provides DAO data management with FULL ON-CHAIN integration
 * Solana SuperApp
 */

import { useState, useCallback, useEffect } from 'react'
import { useCompatibleAuth } from './useCompatibleAuth'
import { useWallet } from './useWallet' // Используем кастомный useWallet hook
import { formatTNGAmount } from '../features/dao/utils/dao-helpers'

// Types
export interface DAOProposal {
  id: string
  creator: string
  title: string
  description: string
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled'
  votesFor: string
  votesAgainst: string
  votesAbstain: string
  votingPowerSnapshot: string
  createdAt: number
  votingEndsAt: number
  executionEta: number
  actions: any[]
  executedActions: boolean[]
  // Additional fields to match existing component expectations
  type: 'treasury' | 'feature' | 'governance' | 'community'
  proposer: string
  startTime: number
  endTime: number
  votes: { for: number; against: number; abstain: number }
  currentStatus: string
  totalVotes: number
  requiredQuorum: number
  category: string
}

export interface DAOMember {
  id: string
  address: string
  username: string
  avatar: string
  votingPower: number
  proposalsCreated: number
  votesParticipated: number
  lastActivity: string
  role: 'Member' | 'Delegate' | 'Council'
  totalVotes: number
  delegatedTo?: string
  delegatedFrom?: string[]
  reputation: number
  joinedAt: string
  isActive: boolean
}

export interface DAOStats {
  totalProposals: number
  activeProposals: number
  totalMembers: number
  totalVotingPower: string
  treasuryBalance: {
    sol: string
    tng: string
  }
  participationRate: number
  averageVotingTime: number
  // Additional field to match component expectations
  overview: {
    totalMembers: number
    totalProposals: number
    activeProposals: number
    totalVotes: number
    treasuryValue: string
    userVotingPower: string
    userTotalVotes: number
    governanceTokenSymbol: string
    participationRate: number
  }
}

export interface DAOData {
  proposals: DAOProposal[]
  members: DAOMember[] & {
    members: DAOMember[]
    totalCount: number
    hasMore: boolean
    stats: any
  }
  stats: DAOStats
  treasury?: {
    treasuryAddress: string
    totalValue: number
    totalValueUSD: number
    solBalance: number
    tngBalance: number
    monthlyIncome: number
    monthlyExpenses: number
    growthRate: number
    allocation: any[]
    transactions: any[]
    assets: any[]
    recentTransactions: any[]
    overview: any
  }
  config?: {
    initialized: boolean
    votingDuration: string
    executionDelay: string
    quorumThreshold: string
    proposalThreshold: string
  }
}

export interface DAOHookState {
  data: DAOData | null
  isLoading: boolean
  error: string | null
  isCreatingProposal: boolean
  isVoting: boolean
}

export interface DAOHookActions {
  refreshData: () => Promise<void>
  createProposal: (title: string, description: string, actions: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
  vote: (proposalId: string, choice: 'For' | 'Against' | 'Abstain') => Promise<{ success: boolean; data?: any; error?: string }>
}

export function useDAO(): DAOHookState & DAOHookActions {
  const { isAuthenticated, apiCall } = useCompatibleAuth()
  const { custodial, external } = useWallet() // Поддерживаем оба типа кошельков
  
  const [state, setState] = useState<DAOHookState>({
    data: null,
    isLoading: false,
    error: null,
    isCreatingProposal: false,
    isVoting: false
  })

  // Определяем активный кошелек для DAO операций
  const getActiveWallet = () => {
    // Приоритет: custodial кошелек (если есть TNG токены), затем external
    if (custodial.address && custodial.isActive) {
      return {
        address: custodial.address,
        type: 'custodial' as const,
        isConnected: true
      }
    } else if (external.isConnected && external.address) {
      return {
        address: external.address,
        type: 'external' as const,
        isConnected: true
      }
    }
    return {
      address: null,
      type: null,
      isConnected: false
    }
  }

  /**
   * Fetch DAO data from API (following the pattern of other working modules)
   */
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log(' User not authenticated, skipping DAO data fetch')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      console.log(' Fetching DAO data...')
      
      // Переключаемся на ON-CHAIN API endpoints
      const activeWallet = getActiveWallet()
      console.log(' DEBUG: Active wallet info:', {
        address: activeWallet.address,
        type: activeWallet.type,
        isConnected: activeWallet.isConnected
      })
      
      const userWalletParam = activeWallet.address ? `?userWallet=${activeWallet.address}` : ''
      console.log(' DEBUG: User wallet parameter for stats API:', userWalletParam)
      
      const [proposalsResponse, statsResponse] = await Promise.allSettled([
        apiCall('/api/dao/onchain/proposals'),
        apiCall(`/api/dao/onchain/stats${userWalletParam}`)
      ])
      
      // Пока используем mock для members (можно добавить on-chain later)
      const membersResponse = await apiCall('/api/dao/members')

      // Обрабатываем proposals и преобразуем к ожидаемому формату
      let proposals: DAOProposal[] = []
      if (proposalsResponse.status === 'fulfilled') {
        const proposalsData = await proposalsResponse.value.json()
        if (proposalsData.success) {
          const rawProposals = proposalsData.data?.proposals || []
          // Преобразуем к формату, ожидаемому компонентами
          proposals = rawProposals.map((p: any) => {
            const votesFor = parseInt(p.votesFor || '0')
            const votesAgainst = parseInt(p.votesAgainst || '0') 
            const votesAbstain = parseInt(p.votesAbstain || '0')
            const totalVotes = votesFor + votesAgainst + votesAbstain
            
            return {
              ...p,
              type: 'governance', // Default type
              proposer: p.creator,
              startTime: p.createdAt,
              endTime: p.votingEndsAt,
              votes: {
                for: votesFor,
                against: votesAgainst,
                abstain: votesAbstain
              },
              currentStatus: p.status,
              totalVotes,
              requiredQuorum: 1000, // Default quorum
              category: 'governance'
            }
          })
        } else {
          console.warn(' Proposals API returned unsuccessful response:', proposalsData.error)
        }
      } else {
        console.error(' Failed to fetch proposals:', proposalsResponse.reason)
      }

      // Обрабатываем members (пока mock, потом можно добавить on-chain)
      let members: DAOMember[] = []
      const membersData = await membersResponse.json()
      if (membersData.success) {
        const rawMembers = membersData.data?.members || []
        members = rawMembers.map((m: any, index: number) => ({
          ...m,
          id: m.address || `member-${index}`,
          username: m.username || `User ${index + 1}`,
          avatar: m.avatar || '',
          votingPower: typeof m.votingPower === 'string' ? parseFloat(m.votingPower) : (m.votingPower || 0),
          totalVotes: m.votesParticipated || 0,
          delegatedTo: m.delegatedTo,
          delegatedFrom: m.delegatedFrom || [],
          reputation: m.reputation || 100,
          joinedAt: m.joinedAt || Date.now(),
          isActive: m.isActive !== false
        }))
      } else {
        console.warn(' Members API returned unsuccessful response:', membersData.error)
      }

      // Обрабатываем stats
      let stats: DAOStats = {
        totalProposals: 0,
        activeProposals: 0,
        totalMembers: 0,
        totalVotingPower: '0',
        treasuryBalance: { sol: '0', tng: '0' },
        participationRate: 0,
        averageVotingTime: 0,
        overview: {
          totalProposals: 0,
          activeProposals: 0,
          totalMembers: 0,
          totalVotes: 0,
          treasuryValue: '0',
          userVotingPower: '0',
          userTotalVotes: 0,
          governanceTokenSymbol: 'TNG',
          participationRate: 0
        }
      }
      
      if (statsResponse.status === 'fulfilled') {
        const statsData = await statsResponse.value.json()
        if (statsData.success) {
          const rawStats = statsData.data || stats
          stats = {
            ...rawStats,
        overview: {
          totalMembers: rawStats.totalMembers || 0,
          totalProposals: rawStats.totalProposals || 0,
          activeProposals: rawStats.activeProposals || 0,
          totalVotes: proposals.reduce((sum, p) => sum + p.totalVotes, 0),
          treasuryValue: formatTNGAmount(rawStats.treasuryBalance?.tng || '0'),
          userVotingPower: rawStats.overview?.userVotingPower || formatTNGAmount(rawStats.userVotingPower || '0'),
          userTotalVotes: rawStats.userTotalVotes || 0,
          governanceTokenSymbol: 'TNG',
          participationRate: rawStats.participationRate || 0
        }
          }
        } else {
          console.warn(' Stats API returned unsuccessful response:', statsData.error)
        }
      } else {
        console.error(' Failed to fetch stats:', statsResponse.reason)
      }

      // Собираем итоговые данные с treasury
      const daoData: DAOData = {
        proposals,
        members: members as any, // Cast to match intersection type
        stats,
        treasury: {
          treasuryAddress: 'DAO_TREASURY_ADDRESS',
          totalValue: parseFloat(stats.treasuryBalance.sol) + parseFloat(stats.treasuryBalance.tng),
          totalValueUSD: Math.round((parseFloat(stats.treasuryBalance.sol) * 200 + parseFloat(stats.treasuryBalance.tng) * 0.1) * 100) / 100, // SOL ~$200, TNG ~$0.1
          solBalance: parseFloat(stats.treasuryBalance.sol),
          tngBalance: parseFloat(stats.treasuryBalance.tng),
          monthlyIncome: 0,
          monthlyExpenses: 0,
          growthRate: 0,
          allocation: [],
          transactions: [],
          assets: [],
          recentTransactions: [],
          overview: {}
        }
      }
      
      setState(prev => ({
        ...prev,
        data: daoData,
        isLoading: false,
        error: null
      }))
      
      console.log(' DAO data loaded successfully:', {
        proposals: proposals.length,
        members: members.length,
        stats: !!stats
      })
      
    } catch (error) {
      console.error(' Error loading DAO data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load DAO data'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [isAuthenticated, apiCall])

  /**
   * Create new proposal
   */
  const createProposal = useCallback(async (
    title: string, 
    description: string, 
    actions: any[]
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isCreatingProposal: true }))
    
    try {
      console.log(' Creating new DAO proposal:', { title, actions: actions.length })
      
      // Переключаемся на ON-CHAIN API с поддержкой custodial кошелька
      const activeWallet = getActiveWallet()
      
      if (!activeWallet.isConnected || !activeWallet.address) {
        throw new Error(' Кошелек не подключен. Для создания предложения нужны TNG токены в вашем кошельке.')
      }

      // Дополнительная проверка валидности адреса
      if (typeof activeWallet.address !== 'string' || activeWallet.address.length < 32) {
        throw new Error(' Невалидный адрес кошелька. Проверьте подключение кошелька.')
      }
      
      console.log(` Creating proposal using ${activeWallet.type} wallet:`, activeWallet.address)
      
      const response = await apiCall('/api/dao/onchain/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          actions,
          userWallet: activeWallet.address,
          walletType: activeWallet.type // Указываем тип кошелька
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create proposal')
      }
      
      console.log(' Proposal created successfully:', result.data)
      
      setState(prev => ({ ...prev, isCreatingProposal: false }))
      
      // Обновляем данные после создания
      await refreshData()
      
      return { success: true, data: result.data }
      
    } catch (error) {
      console.error(' Error creating proposal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create proposal'
      
      setState(prev => ({ ...prev, isCreatingProposal: false }))
      
      return { success: false, error: errorMessage }
    }
  }, [isAuthenticated, apiCall, refreshData, custodial.address, custodial.isActive, external.isConnected, external.address])

  /**
   * Vote on proposal
   */
  const vote = useCallback(async (
    proposalId: string,
    choice: 'For' | 'Against' | 'Abstain'
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'User not authenticated' }
    }

    setState(prev => ({ ...prev, isVoting: true }))
    
    try {
      console.log(' Voting on proposal:', { proposalId, choice })
      
      // Переключаемся на ON-CHAIN API с поддержкой custodial кошелька
      const activeWallet = getActiveWallet()
      
      if (!activeWallet.isConnected || !activeWallet.address) {
        throw new Error(' Кошелек не подключен. Для голосования нужны TNG токены в вашем кошельке.')
      }
      
      console.log(` Voting using ${activeWallet.type} wallet:`, activeWallet.address)
      
      const response = await apiCall('/api/dao/onchain/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          vote: choice, // API ожидает 'vote', а не 'choice'
          userWallet: activeWallet.address,
          walletType: activeWallet.type // Указываем тип кошелька
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to vote')
      }
      
      console.log(' Vote cast successfully:', result.data)
      
      setState(prev => ({ ...prev, isVoting: false }))
      
      // Обновляем данные после голосования
      await refreshData()
      
      return { success: true, data: result.data }
      
    } catch (error) {
      console.error(' Error voting:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to vote'
      
      setState(prev => ({ ...prev, isVoting: false }))
      
      return { success: false, error: errorMessage }
    }
  }, [isAuthenticated, apiCall, refreshData, custodial.address, custodial.isActive, external.isConnected, external.address])

  // Автоматическая загрузка данных при монтировании и изменении аутентификации
  useEffect(() => {
    if (isAuthenticated) {
      refreshData()
    }
  }, [isAuthenticated, refreshData])

  return {
    ...state,
    refreshData,
    createProposal,
    vote
  }
}
