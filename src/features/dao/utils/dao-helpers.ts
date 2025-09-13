'use client'

import type { 
  Proposal, 
  ProposalStatus, 
  ProposalType, 
  Vote, 
  VoteType, 
  DAOStats,
  Treasury,
  DAOMember 
} from '../types/dao.types'

/**
 * Форматирование времени для предложений
 */
export const formatTimeRemaining = (endTime: string): string => {
  const now = new Date()
  const end = new Date(endTime)
  const diff = end.getTime() - now.getTime()
  
  if (diff <= 0) return 'Завершено'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}д ${hours}ч`
  if (hours > 0) return `${hours}ч ${minutes}м`
  return `${minutes}м`
}

/**
 * Расчет процента голосов "за"
 */
export const calculateApprovalRate = (proposal: Proposal): number => {
  const totalDecisiveVotes = proposal.votesFor + proposal.votesAgainst
  if (totalDecisiveVotes === 0) return 0
  return (proposal.votesFor / totalDecisiveVotes) * 100
}

/**
 * Проверка достижения кворума
 */
export const hasReachedQuorum = (proposal: Proposal): boolean => {
  return proposal.totalVotes >= proposal.requiredQuorum
}

/**
 * Определение результата голосования
 */
export const getProposalResult = (proposal: Proposal): 'passed' | 'rejected' | 'pending' => {
  if (proposal.status !== 'active' && new Date(proposal.endTime) > new Date()) {
    return 'pending'
  }
  
  if (!hasReachedQuorum(proposal)) {
    return 'rejected'
  }
  
  const approvalRate = calculateApprovalRate(proposal)
  return approvalRate > 50 ? 'passed' : 'rejected'
}

/**
 * Форматирование больших чисел
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Форматирование TNG токенов из lamports (wei)
 */
export const formatTNGAmount = (lamports: string | number): string => {
  const amount = typeof lamports === 'string' ? parseFloat(lamports) : lamports
  const tngAmount = amount / 1e9 // Convert from lamports to TNG
  
  if (tngAmount >= 1000000000) return `${(tngAmount / 1000000000).toFixed(1)}B TNG`
  if (tngAmount >= 1000000) return `${(tngAmount / 1000000).toFixed(1)}M TNG`
  if (tngAmount >= 1000) return `${(tngAmount / 1000).toFixed(1)}K TNG`
  if (tngAmount >= 1) return `${tngAmount.toLocaleString()} TNG`
  return `${tngAmount.toFixed(3)} TNG`
}

/**
 * Форматирование валюты
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Расчет процента голосов "за" от общего числа голосов
 */
export const calculateVotePercentage = (proposal: Proposal): number => {
  if (proposal.totalVotes === 0) return 0
  return (proposal.votesFor / proposal.totalVotes) * 100
}

/**
 * Расчет процента достижения кворума
 */
export const calculateQuorumPercentage = (proposal: Proposal): number => {
  if (proposal.requiredQuorum === 0) return 0
  return Math.min((proposal.totalVotes / proposal.requiredQuorum) * 100, 100)
}

/**
 * Получение информации об оставшемся времени
 */
export const getTimeRemaining = (endTime: string): { isExpired: boolean; timeText: string } => {
  const now = new Date()
  const end = new Date(endTime)
  const diff = end.getTime() - now.getTime()
  
  if (diff <= 0) {
    return { isExpired: true, timeText: 'Завершено' }
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  let timeText = ''
  if (days > 0) timeText = `${days}д ${hours}ч`
  else if (hours > 0) timeText = `${hours}ч ${minutes}м`
  else timeText = `${minutes}м`
  
  return { isExpired: false, timeText }
}

/**
 * Расчет силы голоса пользователя
 */
export const calculateVotingPower = (tokenBalance: number, totalSupply: number): number => {
  if (totalSupply === 0) return 0
  return (tokenBalance / totalSupply) * 100
}

/**
 * Проверка возможности создания предложения
 */
export const canCreateProposal = (userTokens: number, minRequirement: number = 1000): boolean => {
  return userTokens >= minRequirement
}

/**
 * Проверка возможности голосования
 */
export const canVote = (userTokens: number, minRequirement: number = 100): boolean => {
  return userTokens >= minRequirement
}

/**
 * Получение цвета статуса предложения
 */
export const getProposalStatusColor = (status: ProposalStatus): string => {
  const colors = {
    draft: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
    active: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    passed: 'text-green-400 bg-green-500/20 border-green-500/30',
    rejected: 'text-red-400 bg-red-500/20 border-red-500/30',
    executed: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    expired: 'text-gray-400 bg-gray-500/20 border-gray-500/30'
  }
  return colors[status] || colors.draft
}

/**
 * Получение цвета типа предложения
 */
export const getProposalTypeColor = (type: ProposalType): string => {
  const colors = {
    treasury: 'text-green-400 bg-green-500/20 border-green-500/30',
    feature: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    governance: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    community: 'text-orange-400 bg-orange-500/20 border-orange-500/30'
  }
  return colors[type] || colors.community
}

/**
 * Сортировка предложений
 */
export const sortProposals = (
  proposals: Proposal[], 
  sortBy: 'created' | 'votes' | 'deadline' | 'popularity', 
  order: 'asc' | 'desc' = 'desc'
): Proposal[] => {
  const sorted = [...proposals].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'votes':
        comparison = a.totalVotes - b.totalVotes
        break
      case 'deadline':
        comparison = new Date(a.endTime).getTime() - new Date(b.endTime).getTime()
        break
      case 'popularity':
        comparison = calculateApprovalRate(a) - calculateApprovalRate(b)
        break
      default:
        return 0
    }
    
    return order === 'asc' ? comparison : -comparison
  })
  
  return sorted
}

/**
 * Фильтрация предложений
 */
export const filterProposals = (
  proposals: Proposal[],
  filters: {
    status?: ProposalStatus | 'all'
    type?: ProposalType | 'all'
    search?: string
  }
): Proposal[] => {
  return proposals.filter(proposal => {
    // Фильтр по статусу
    if (filters.status && filters.status !== 'all' && proposal.status !== filters.status) {
      return false
    }
    
    // Фильтр по типу
    if (filters.type && filters.type !== 'all' && proposal.type !== filters.type) {
      return false
    }
    
    // Поиск по тексту
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        proposal.title.toLowerCase().includes(searchLower) ||
        proposal.description.toLowerCase().includes(searchLower) ||
        proposal.proposer.toLowerCase().includes(searchLower)
      )
    }
    
    return true
  })
}

/**
 * Подсчет времени до истечения предложения
 */
export const getTimeUntilExpiry = (endTime: string): number => {
  return new Date(endTime).getTime() - new Date().getTime()
}

/**
 * Проверка истечения предложения
 */
export const isProposalExpired = (endTime: string): boolean => {
  return getTimeUntilExpiry(endTime) <= 0
}

/**
 * Генерация краткого описания для предложения
 */
export const generateProposalSummary = (proposal: Proposal): string => {
  const timeRemaining = formatTimeRemaining(proposal.endTime)
  const approvalRate = calculateApprovalRate(proposal)
  const quorumStatus = hasReachedQuorum(proposal) ? 'Кворум достигнут' : 'Кворум не достигнут'
  
  return `${timeRemaining} • ${approvalRate.toFixed(1)}% за • ${quorumStatus}`
}

/**
 * Расчет статистики участника DAO
 */
export const calculateMemberStats = (member: DAOMember, allProposals: Proposal[]): {
  participationRate: number
  successRate: number
  influence: number
} => {
  const memberProposals = allProposals.filter(p => p.proposer === member.address)
  const passedProposals = memberProposals.filter(p => getProposalResult(p) === 'passed')
  
  return {
    participationRate: (member.totalVotes / allProposals.length) * 100,
    successRate: memberProposals.length > 0 ? (passedProposals.length / memberProposals.length) * 100 : 0,
    influence: member.votingPower + member.reputation
  }
}

/**
 * Валидация данных предложения
 */
export const validateProposalData = (data: {
  title: string
  description: string
  type: ProposalType
  duration: number
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!data.title || data.title.trim().length < 10) {
    errors.push('Заголовок должен содержать минимум 10 символов')
  }
  
  if (!data.description || data.description.trim().length < 50) {
    errors.push('Описание должно содержать минимум 50 символов')
  }
  
  if (data.duration < 1 || data.duration > 30) {
    errors.push('Продолжительность должна быть от 1 до 30 дней')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
