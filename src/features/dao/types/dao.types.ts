'use client'

// Базовые типы для DAO
export type ProposalType = 'treasury' | 'feature' | 'governance' | 'community'
export type ProposalStatus = 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'expired'
export type VoteType = 'for' | 'against' | 'abstain'

// Интерфейс предложения
export interface Proposal {
  id: string
  title: string
  description: string
  type: ProposalType
  status: ProposalStatus
  proposer: string
  createdAt: string
  startTime: string
  endTime: string
  executionTime?: string
  
  // Голосование
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  totalVotes: number
  voteCount: number
  requiredQuorum: number
  
  // Категория и метаданные
  category: string
  tags?: string[]
  discussionUrl?: string
  
  // Исполнение
  actions?: ProposalAction[]
  executionResult?: string
  
  // Пользовательские данные
  userVote?: Vote
}

// Действия предложения
export interface ProposalAction {
  type: 'transfer' | 'mint' | 'burn' | 'upgrade' | 'parameter_change'
  target: string
  amount?: number
  parameters?: Record<string, any>
}

// Голос пользователя
export interface Vote {
  id: string
  proposalId: string
  voter: string
  voteType: VoteType
  votingPower: number
  weight: number
  timestamp: string
  txSignature?: string
  comment?: string
}

// Статистика DAO
export interface DAOStats {
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

// Казна DAO
export interface TreasuryAsset {
  mint: string
  symbol: string
  name: string
  balance: number
  usdValue: number
  percentage: number
  icon?: string
}

export interface Treasury {
  treasuryAddress: string
  totalValueUSD: number
  monthlyIncome: number
  monthlyExpenses: number
  growthRate: number
  assets: TreasuryAsset[]
  recentTransactions: Array<{
    id: string
    title: string
    description: string
    date: string
    type: string
  }>
}

// Участник DAO
export interface DAOMember {
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
  recentVotes?: Array<{
    proposalId: string
    proposalTitle: string
    weight: number
    timestamp: string
  }>
}

// Состояние страницы DAO
export interface DAOPageState {
  selectedProposal: Proposal | null
  activeTab: DAOTabType
  viewMode: 'list' | 'grid'
  filterStatus: ProposalStatus | 'all'
  filterType: ProposalType | 'all'
  searchQuery: string
  sortBy: 'created' | 'votes' | 'deadline' | 'popularity'
  sortOrder: 'asc' | 'desc'
  showCreateModal: boolean
  showVoteModal: boolean
  showDetailsModal: boolean
  isLoading: boolean
  notification: NotificationState | null
}

// Типы вкладок DAO
export type DAOTabType = 'proposals' | 'treasury' | 'members' | 'history' | 'analytics'

// Уведомления
export interface NotificationState {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

// Создание предложения
export interface CreateProposalForm {
  title: string
  description: string
  type: ProposalType
  category: string
  tags: string[]
  actions: ProposalAction[]
  startDelay: number // в часах
  duration: number // в днях
  requiredQuorum: number
}

// Фильтры
export interface ProposalFilters {
  status: ProposalStatus | 'all'
  type: ProposalType | 'all'
  dateRange?: {
    start: string
    end: string
  }
  minVotes?: number
  maxVotes?: number
}

// События DAO
export interface DAOEvent {
  id: string
  type: 'proposal_created' | 'proposal_passed' | 'proposal_rejected' | 'vote_cast' | 'treasury_action'
  title: string
  description: string
  timestamp: string
  relatedProposalId?: string
  relatedMember?: string
  data?: Record<string, any>
}

// Аналитика DAO
export interface DAOAnalytics {
  participationRate: number
  averageVotingPower: number
  proposalSuccessRate: number
  memberGrowth: Array<{
    date: string
    count: number
  }>
  votingActivity: Array<{
    date: string
    votes: number
  }>
  treasuryHistory: Array<{
    date: string
    value: number
  }>
}

