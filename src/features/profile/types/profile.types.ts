'use client'

// Базовые типы для профиля
export type ActivityType = 'vote' | 'trade' | 'learn' | 'create' | 'earn'
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type SettingCategory = 'general' | 'security' | 'notifications' | 'privacy' | 'advanced'

// Интерфейс пользователя (расширенный)
export interface ProfileUser {
  id: string
  telegramId: number
  username?: string
  firstName: string
  lastName?: string
  photoUrl?: string
  languageCode?: string
  isPremium: boolean
  joinedAt: string
  lastActiveAt: string
  
  // Дополнительные поля профиля
  bio?: string
  location?: string
  website?: string
  socialLinks?: SocialLinks
  preferences?: UserPreferences
}

// Социальные сети
export interface SocialLinks {
  twitter?: string
  discord?: string
  github?: string
  linkedin?: string
}

// Предпочтения пользователя
export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto'
  language: string
  timezone: string
  currency: 'USD' | 'EUR' | 'RUB'
  notifications: NotificationSettings
  privacy: PrivacySettings
}

// Настройки уведомлений
export interface NotificationSettings {
  email: boolean
  push: boolean
  inApp: boolean
  marketing: boolean
  security: boolean
  achievements: boolean
  proposals: boolean
  trades: boolean
}

// Настройки приватности
export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private'
  showActivity: boolean
  showStats: boolean
  showAchievements: boolean
  allowMessages: boolean
  showOnLeaderboard: boolean
}

// Достижения
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  tier: AchievementTier
  category: string
  unlockedAt?: string
  progress?: number
  maxProgress?: number
  reward?: AchievementReward
  isLocked: boolean
  isNew?: boolean
}

// Награда за достижение
export interface AchievementReward {
  type: 'token' | 'nft' | 'badge' | 'title' | 'feature'
  amount?: number
  tokenSymbol?: string
  nftId?: string
  title?: string
}

// Статистика пользователя
export interface UserStats {
  totalActiveDays: number
  currentStreak: number
  longestStreak: number
  
  // DAO активность
  proposalsCreated: number
  votesSubmitted: number
  participationRate: number
  
  // Обучение
  coursesCompleted: number
  lessonsCompleted: number
  certificatesEarned: number
  studyTimeHours: number
  
  // Trading
  tradesCompleted: number
  totalVolume: number
  profitLoss: number
  
  // NFT
  nftsOwned: number
  nftsCreated: number
  nftsSold: number
  nftsTransferred: number
  
  // Токены
  tokensEarned: number
  tokensSpent: number
  currentBalance: number
  
  // Социальная активность
  friendsCount: number
  referralsCount: number
  helpfulVotes: number
}

// Активность пользователя
export interface UserActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  data?: Record<string, any>
  
  // Связанные объекты
  relatedProposalId?: string
  relatedNFTId?: string
  relatedTradeId?: string
  relatedCourseId?: string
  
  // Дополнительная информация
  earnedTokens?: number
  experience?: number
  isPublic: boolean
}

// Рейтинг и опыт
export interface UserRanking {
  currentLevel: number
  currentXP: number
  nextLevelXP: number
  totalXP: number
  rank: number
  totalUsers: number
  percentile: number
  
  // Недельные/месячные изменения
  weeklyXPGain: number
  monthlyXPGain: number
  rankChange: number
}

// Настройки профиля
export interface ProfileSettings {
  id: string
  category: SettingCategory
  title: string
  description: string
  icon: string
  value: any
  type: 'boolean' | 'select' | 'text' | 'number' | 'color'
  options?: Array<{ label: string; value: any }>
  isEnabled: boolean
  requiresAuth?: boolean
  isPremiumFeature?: boolean
}

// Состояние страницы профиля
export interface ProfilePageState {
  selectedTab: ProfileTabType
  isEditing: boolean
  showAchievements: boolean
  showSettings: boolean
  showActivity: boolean
  filterActivity: ActivityType | 'all'
  sortActivity: 'newest' | 'oldest' | 'type'
  isLoading: boolean
  notification: NotificationState | null
}

// Типы вкладок профиля
export type ProfileTabType = 'overview' | 'achievements' | 'activity' | 'settings'

// Уведомления
export interface NotificationState {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

// Кошелек в профиле
export interface ProfileWallet {
  address: string
  balances: Array<{
    symbol: string
    balance: number
    usdValue: number
  }>
  totalUsdValue: number
  
  // Недавние транзакции
  recentTransactions: Array<{
    id: string
    type: 'send' | 'receive' | 'swap' | 'stake'
    amount: number
    symbol: string
    timestamp: string
    status: 'pending' | 'confirmed' | 'failed'
  }>
}

// Друзья и рефералы
export interface ProfileNetwork {
  friends: Array<{
    id: string
    username?: string
    firstName: string
    photoUrl?: string
    lastActive: string
    mutualFriends: number
  }>
  
  referrals: Array<{
    id: string
    username?: string
    firstName: string
    joinedAt: string
    isActive: boolean
    earnedFromReferral: number
  }>
  
  pendingInvites: Array<{
    id: string
    email?: string
    telegramUsername?: string
    sentAt: string
    status: 'pending' | 'accepted' | 'expired'
  }>
}

// Экспорт данных профиля
export interface ProfileExport {
  userData: ProfileUser
  stats: UserStats
  achievements: Achievement[]
  activities: UserActivity[]
  wallet: ProfileWallet
  createdAt: string
  format: 'json' | 'csv' | 'pdf'
}

// Настройки бэкапа
export interface BackupSettings {
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  includePrivateData: boolean
  cloudStorage?: 'telegram' | 'google' | 'icloud'
  lastBackup?: string
}



















































