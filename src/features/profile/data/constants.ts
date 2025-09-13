'use client'

import { User, Settings, Trophy, Activity, Share2, Shield } from 'lucide-react'

// Быстрые действия для профиля
export const profileQuickActions = [
  { 
    id: 'edit-profile', 
    title: 'Редактировать', 
    icon: User, 
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/15 to-blue-500/5' 
  },
  { 
    id: 'achievements', 
    title: 'Достижения', 
    icon: Trophy, 
    color: 'text-yellow-400', 
    bgColor: 'from-yellow-500/15 to-yellow-500/5' 
  },
  { 
    id: 'activity', 
    title: 'Активность', 
    icon: Activity, 
    color: 'text-green-400', 
    bgColor: 'from-green-500/15 to-green-500/5' 
  },
  { 
    id: 'share', 
    title: 'Поделиться', 
    icon: Share2, 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/15 to-purple-500/5' 
  }
] as const

// Категории настроек
export const settingsCategories = [
  {
    id: 'general',
    title: 'Основные',
    icon: Settings,
    color: 'text-gray-400'
  },
  {
    id: 'security',
    title: 'Безопасность', 
    icon: Shield,
    color: 'text-red-400'
  },
  {
    id: 'notifications',
    title: 'Уведомления',
    icon: 'Bell',
    color: 'text-blue-400'
  },
  {
    id: 'privacy',
    title: 'Приватность',
    icon: 'Eye',
    color: 'text-green-400'
  }
] as const

// Уровни опыта
export const XP_MULTIPLIERS = {
  vote: 10,
  learn: 100,
  trade: 5,
  create: 50,
  earn: 25,
  refer: 200,
  achievement: 75
} as const

// Награды за уровни
export const LEVEL_REWARDS = {
  5: { tokens: 500, title: 'Новичок' },
  10: { tokens: 1000, nft: 'level-10-badge' },
  15: { tokens: 2000, title: 'Опытный' },
  20: { tokens: 5000, nft: 'level-20-badge' },
  25: { tokens: 10000, title: 'Эксперт' },
  30: { tokens: 20000, nft: 'level-30-legendary' }
} as const

// Настройки отображения
export const ITEMS_PER_PAGE = {
  achievements: 12,
  activities: 20,
  friends: 15,
  transactions: 10
} as const



















































