'use client'

import { Users, Vote, Coins, FileText, Settings, TrendingUp } from 'lucide-react'

// Быстрые действия для DAO
export const daoQuickActions = [
  { 
    id: 'create-proposal', 
    title: 'Создать', 
    icon: FileText, 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/15 to-purple-500/5' 
  },
  { 
    id: 'treasury', 
    title: 'Казна', 
    icon: Coins, 
    color: 'text-green-400', 
    bgColor: 'from-green-500/15 to-green-500/5' 
  },
  { 
    id: 'members', 
    title: 'Участники', 
    icon: Users, 
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/15 to-blue-500/5' 
  },
  { 
    id: 'analytics', 
    title: 'Аналитика', 
    icon: TrendingUp, 
    color: 'text-orange-400', 
    bgColor: 'from-orange-500/15 to-orange-500/5' 
  }
] as const

// Настройки отображения
export const PROPOSALS_PER_PAGE = 10
export const INITIAL_PROPOSALS_COUNT = 5

// Минимальные требования для действий
export const MIN_VOTING_POWER = 100 // TNG
export const MIN_PROPOSAL_POWER = 1000 // TNG для создания предложения

// Временные константы
export const PROPOSAL_DURATIONS = [
  { label: '3 дня', value: 3 },
  { label: '1 неделя', value: 7 },
  { label: '2 недели', value: 14 },
  { label: '1 месяц', value: 30 }
] as const

export const QUORUM_OPTIONS = [
  { label: '10% (базовый)', value: 0.1 },
  { label: '25% (стандартный)', value: 0.25 },
  { label: '50% (критический)', value: 0.5 }
] as const

