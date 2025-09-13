'use client'

import { AchievementTier, UserRanking, UserActivity, ActivityType } from '../types'

/**
 * Получить цвет для уровня достижения
 */
export function getAchievementTierColor(tier: AchievementTier): string {
  const colors = {
    bronze: 'text-amber-600',
    silver: 'text-gray-400',
    gold: 'text-yellow-400',
    platinum: 'text-purple-400',
    diamond: 'text-blue-400'
  }
  return colors[tier] || 'text-gray-400'
}

/**
 * Получить фоновый градиент для уровня достижения
 */
export function getAchievementTierGradient(tier: AchievementTier): string {
  const gradients = {
    bronze: 'from-amber-600/20 to-amber-800/5',
    silver: 'from-gray-400/20 to-gray-600/5',
    gold: 'from-yellow-400/20 to-yellow-600/5',
    platinum: 'from-purple-400/20 to-purple-600/5',
    diamond: 'from-blue-400/20 to-blue-600/5'
  }
  return gradients[tier] || 'from-gray-400/20 to-gray-600/5'
}

/**
 * Получить прогресс до следующего уровня
 */
export function getLevelProgress(ranking: UserRanking): number {
  const currentLevelXP = ranking.currentXP
  const nextLevelXP = ranking.nextLevelXP
  const previousLevelXP = getLevelRequirement(ranking.currentLevel - 1)
  
  const progressInLevel = currentLevelXP - previousLevelXP
  const totalLevelXP = nextLevelXP - previousLevelXP
  
  return (progressInLevel / totalLevelXP) * 100
}

/**
 * Получить требование XP для определенного уровня
 */
export function getLevelRequirement(level: number): number {
  // Простая формула прогрессии уровней
  if (level <= 1) return 0
  return Math.floor(100 * Math.pow(1.5, level - 2))
}

/**
 * Получить название ранга на основе уровня
 */
export function getRankTitle(level: number): string {
  if (level >= 30) return 'Легенда'
  if (level >= 25) return 'Мастер'
  if (level >= 20) return 'Эксперт'
  if (level >= 15) return 'Опытный'
  if (level >= 10) return 'Продвинутый'
  if (level >= 5) return 'Новичок'
  return 'Начинающий'
}

/**
 * Получить цвет для типа активности
 */
export function getActivityTypeColor(type: ActivityType): string {
  const colors = {
    vote: 'text-purple-400',
    trade: 'text-blue-400',
    learn: 'text-green-400',
    create: 'text-orange-400',
    earn: 'text-yellow-400'
  }
  return colors[type] || 'text-gray-400'
}

/**
 * Получить иконку для типа активности
 */
export function getActivityTypeIcon(type: ActivityType): string {
  const icons = {
    vote: '',
    trade: '',
    learn: '',
    create: '',
    earn: ''
  }
  return icons[type] || ''
}

/**
 * Форматировать относительное время
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  
  if (minutes < 1) return 'Только что'
  if (minutes < 60) return `${minutes} мин назад`
  if (hours < 24) return `${hours} ч назад`
  if (days < 7) return `${days} дн назад`
  if (weeks < 4) return `${weeks} нед назад`
  if (months < 12) return `${months} мес назад`
  
  return time.toLocaleDateString('ru-RU')
}

/**
 * Вычислить процентиль пользователя
 */
export function calculatePercentile(rank: number, totalUsers: number): number {
  return ((totalUsers - rank) / totalUsers) * 100
}

/**
 * Получить текст изменения ранга
 */
export function getRankChangeText(change: number): { text: string; color: string } {
  if (change > 0) {
    return { text: `+${change}`, color: 'text-green-400' }
  } else if (change < 0) {
    return { text: `${change}`, color: 'text-red-400' }
  } else {
    return { text: '0', color: 'text-gray-400' }
  }
}

/**
 * Фильтровать активности по типу
 */
export function filterActivitiesByType(
  activities: UserActivity[], 
  type: ActivityType | 'all'
): UserActivity[] {
  if (type === 'all') return activities
  return activities.filter(activity => activity.type === type)
}

/**
 * Сортировать активности
 */
export function sortActivities(
  activities: UserActivity[], 
  sortBy: 'newest' | 'oldest' | 'type'
): UserActivity[] {
  const sorted = [...activities]
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    case 'oldest':
      return sorted.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    case 'type':
      return sorted.sort((a, b) => a.type.localeCompare(b.type))
    default:
      return sorted
  }
}

/**
 * Проверить, новое ли достижение
 */
export function isRecentAchievement(unlockedAt?: string): boolean {
  if (!unlockedAt) return false
  
  const unlocked = new Date(unlockedAt)
  const now = new Date()
  const diffDays = (now.getTime() - unlocked.getTime()) / (1000 * 60 * 60 * 24)
  
  return diffDays <= 7 // Новое, если получено в последние 7 дней
}

/**
 * Получить статус стрика
 */
export function getStreakStatus(currentStreak: number): {
  status: 'cold' | 'warm' | 'hot' | 'fire'
  color: string
  icon: string
} {
  if (currentStreak >= 30) {
    return { status: 'fire', color: 'text-red-400', icon: '' }
  } else if (currentStreak >= 14) {
    return { status: 'hot', color: 'text-orange-400', icon: '' }
  } else if (currentStreak >= 7) {
    return { status: 'warm', color: 'text-yellow-400', icon: '' }
  } else {
    return { status: 'cold', color: 'text-blue-400', icon: '' }
  }
}

/**
 * Валидация username
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username.trim()) {
    return { isValid: false, error: 'Username не может быть пустым' }
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username должен содержать минимум 3 символа' }
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username не должен превышать 20 символов' }
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username может содержать только буквы, цифры и подчеркивания' }
  }
  
  if (username.startsWith('_') || username.endsWith('_')) {
    return { isValid: false, error: 'Username не может начинаться или заканчиваться подчеркиванием' }
  }
  
  return { isValid: true }
}

/**
 * Генерация случайного аватара placeholder
 */
export function generateAvatarPlaceholder(name: string): string {
  const colors = [
    '#9945FF', '#14F195', '#00D4FF', '#FFE66D', 
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
  ]
  
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
  
  const colorIndex = name.length % colors.length
  const color = colors[colorIndex]
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
      <text x="50" y="50" text-anchor="middle" dy=".35em" fill="white" font-size="40" font-family="Arial, sans-serif">${initials}</text>
    </svg>
  `)}`
}

/**
 * Форматировать большие числа для отображения
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

/**
 * Получить цвет для процента изменения
 */
export function getChangeColor(change: number): string {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-gray-400'
}



















































