'use client'

import { 
  ProfileUser, 
  UserStats, 
  Achievement, 
  UserActivity, 
  UserRanking,
  ProfileWallet,
  ProfileNetwork,
  ProfileSettings 
} from '../types'

// Профиль пользователя (fallback данные для неавторизованных)
export const profileUser: ProfileUser = {
  id: 'guest-user',
  telegramId: 0,
  username: undefined,
  firstName: 'Имя',
  lastName: 'Фамилия',
  photoUrl: undefined,
  languageCode: 'ru',
  isPremium: false,
  joinedAt: '2024-01-15T10:00:00Z',
  lastActiveAt: '2024-01-23T14:30:00Z',
  
  bio: '', // Пустое описание - можно редактировать
  location: '',
  website: '',
  
  socialLinks: {
    twitter: '',
    discord: '',
    github: ''
  },
  
  preferences: {
    theme: 'dark',
    language: 'ru',
    timezone: 'Europe/Moscow',
    currency: 'USD',
    
    notifications: {
      email: true,
      push: true,
      inApp: true,
      marketing: false,
      security: true,
      achievements: true,
      proposals: true,
      trades: true
    },
    
    privacy: {
      profileVisibility: 'public',
      showActivity: true,
      showStats: true,
      showAchievements: true,
      allowMessages: true,
      showOnLeaderboard: true
    }
  }
}

// Статистика пользователя
export const userStats: UserStats = {
  totalActiveDays: 42,
  currentStreak: 7,
  longestStreak: 15,
  
  // DAO активность
  proposalsCreated: 3,
  votesSubmitted: 18,
  participationRate: 95.8,
  
  // Обучение
  coursesCompleted: 12,
  lessonsCompleted: 87,
  certificatesEarned: 8,
  studyTimeHours: 156,
  
  // Trading
  tradesCompleted: 24,
  totalVolume: 15420.50,
  profitLoss: 1250.75,
  
  // NFT
  nftsOwned: 23,
  nftsCreated: 5,
  nftsSold: 8,
  nftsTransferred: 12,
  
  // Токены
  tokensEarned: 45670,
  tokensSpent: 23450,
  currentBalance: 22220,
  
  // Социальная активность
  friendsCount: 47,
  referralsCount: 12,
  helpfulVotes: 89
}

// Достижения
export const achievements: Achievement[] = [
  {
    id: 'ach-001',
    title: 'Первые шаги',
    description: 'Завершите свой первый курс в Learn-to-Earn',
    icon: '',
    tier: 'bronze',
    category: 'Обучение',
    unlockedAt: '2024-01-16T12:00:00Z',
    progress: 1,
    maxProgress: 1,
    reward: {
      type: 'token',
      amount: 100,
      tokenSymbol: 'TNG'
    },
    isLocked: false,
    isNew: false
  },
  {
    id: 'ach-002',
    title: 'DAO Активист',
    description: 'Проголосуйте в 10 предложениях DAO',
    icon: '',
    tier: 'silver',
    category: 'DAO',
    unlockedAt: '2024-01-20T16:30:00Z',
    progress: 18,
    maxProgress: 10,
    reward: {
      type: 'nft',
      nftId: 'nft-dao-activist'
    },
    isLocked: false,
    isNew: true
  },
  {
    id: 'ach-003',
    title: 'NFT Коллекционер',
    description: 'Соберите 20 разных NFT',
    icon: '',
    tier: 'gold',
    category: 'NFT',
    unlockedAt: '2024-01-22T09:15:00Z',
    progress: 23,
    maxProgress: 20,
    reward: {
      type: 'badge',
      title: 'Коллекционер'
    },
    isLocked: false,
    isNew: true
  },
  {
    id: 'ach-004',
    title: 'Трейдинг Мастер',
    description: 'Совершите прибыльные сделки на сумму $10,000',
    icon: '',
    tier: 'platinum',
    category: 'Трейдинг',
    progress: 8420,
    maxProgress: 10000,
    isLocked: true
  },
  {
    id: 'ach-005',
    title: 'Создатель Сообщества',
    description: 'Пригласите 25 друзей в SuperApp',
    icon: '',
    tier: 'diamond',
    category: 'Сообщество',
    progress: 12,
    maxProgress: 25,
    isLocked: true
  },
  {
    id: 'ach-006',
    title: 'Страйк Чемпион',
    description: 'Поддерживайте активность 30 дней подряд',
    icon: '',
    tier: 'gold',
    category: 'Активность',
    progress: 7,
    maxProgress: 30,
    isLocked: true
  }
]

// Активность пользователя
export const userActivities: UserActivity[] = [
  {
    id: 'act-001',
    type: 'vote',
    title: 'Проголосовал в DAO',
    description: 'За предложение "Увеличение пула наград для Learn-to-Earn"',
    timestamp: '2024-01-23T14:20:00Z',
    relatedProposalId: 'prop-001',
    earnedTokens: 50,
    experience: 10,
    isPublic: true
  },
  {
    id: 'act-002',
    type: 'learn',
    title: 'Завершил курс',
    description: 'Основы DeFi на Solana - получен сертификат',
    timestamp: '2024-01-23T11:45:00Z',
    relatedCourseId: 'course-defi-basics',
    earnedTokens: 500,
    experience: 100,
    isPublic: true
  },
  {
    id: 'act-003',
    type: 'trade',
    title: 'Обмен токенов',
    description: 'Обменял 1000 TNG на 0.5 SOL через Jupiter',
    timestamp: '2024-01-23T09:30:00Z',
    data: { fromToken: 'TNG', toToken: 'SOL', amount: 1000, received: 0.5 },
    isPublic: false
  },
  {
    id: 'act-004',
    type: 'create',
    title: 'Создал NFT',
    description: 'Загрузил новый NFT "Solana Sunset" в коллекцию',
    timestamp: '2024-01-22T18:15:00Z',
    relatedNFTId: 'nft-solana-sunset',
    earnedTokens: 100,
    experience: 50,
    isPublic: true
  },
  {
    id: 'act-005',
    type: 'earn',
    title: 'Получил награду',
    description: 'Достижение "DAO Активист" - 200 TNG',
    timestamp: '2024-01-20T16:30:00Z',
    earnedTokens: 200,
    experience: 75,
    isPublic: true
  }
]

// Рейтинг пользователя
export const userRanking: UserRanking = {
  currentLevel: 12,
  currentXP: 2850,
  nextLevelXP: 3200,
  totalXP: 15750,
  rank: 47,
  totalUsers: 1247,
  percentile: 96.2,
  
  weeklyXPGain: 285,
  monthlyXPGain: 1150,
  rankChange: +3
}

// Кошелек профиля (мок-данные для отображения)
export const profileWallet: ProfileWallet = {
  address: '', // Будет заполнен реальными данными из useWallet
  totalUsdValue: 0,
  
  balances: [
    {
      symbol: 'SOL',
      balance: 12.45,
      usdValue: 2489.50
    },
    {
      symbol: 'TNG',
      balance: 22220,
      usdValue: 222.20
    },
    {
      symbol: 'USDC',
      balance: 135.95,
      usdValue: 135.95
    }
  ],
  
  recentTransactions: [
    {
      id: 'tx-001',
      type: 'receive',
      amount: 500,
      symbol: 'TNG',
      timestamp: '2024-01-23T11:45:00Z',
      status: 'confirmed'
    },
    {
      id: 'tx-002',
      type: 'swap',
      amount: 1000,
      symbol: 'TNG',
      timestamp: '2024-01-23T09:30:00Z',
      status: 'confirmed'
    },
    {
      id: 'tx-003',
      type: 'send',
      amount: 0.1,
      symbol: 'SOL',
      timestamp: '2024-01-22T15:20:00Z',
      status: 'confirmed'
    }
  ]
}

// Сеть друзей и рефералов
export const profileNetwork: ProfileNetwork = {
  friends: [
    {
      id: 'friend-001',
      username: 'crypto_dev',
      firstName: 'Анна',
      photoUrl: undefined,
      lastActive: '2024-01-23T13:00:00Z',
      mutualFriends: 5
    },
    {
      id: 'friend-002',
      firstName: 'Максим',
      photoUrl: undefined,
      lastActive: '2024-01-23T10:30:00Z',
      mutualFriends: 2
    },
    {
      id: 'friend-003',
      username: 'solana_fan',
      firstName: 'Елена',
      photoUrl: undefined,
      lastActive: '2024-01-22T20:15:00Z',
      mutualFriends: 8
    }
  ],
  
  referrals: [
    {
      id: 'ref-001',
      username: 'new_user_1',
      firstName: 'Дмитрий',
      joinedAt: '2024-01-20T14:00:00Z',
      isActive: true,
      earnedFromReferral: 100
    },
    {
      id: 'ref-002',
      firstName: 'Ольга',
      joinedAt: '2024-01-18T09:30:00Z',
      isActive: true,
      earnedFromReferral: 100
    }
  ],
  
  pendingInvites: [
    {
      id: 'invite-001',
      telegramUsername: 'potential_user',
      sentAt: '2024-01-22T16:00:00Z',
      status: 'pending'
    }
  ]
}

// Настройки профиля
export const profileSettings: ProfileSettings[] = [
  {
    id: 'notifications-push',
    category: 'notifications',
    title: 'Push уведомления',
    description: 'Получать уведомления на устройство',
    icon: '',
    value: true,
    type: 'boolean',
    isEnabled: true
  },
  {
    id: 'notifications-email',
    category: 'notifications',
    title: 'Email уведомления',
    description: 'Получать важные уведомления на почту',
    icon: '',
    value: true,
    type: 'boolean',
    isEnabled: true
  },
  {
    id: 'privacy-profile',
    category: 'privacy',
    title: 'Видимость профиля',
    description: 'Кто может видеть ваш профиль',
    icon: '',
    value: 'public',
    type: 'select',
    options: [
      { label: 'Публичный', value: 'public' },
      { label: 'Только друзья', value: 'friends' },
      { label: 'Приватный', value: 'private' }
    ],
    isEnabled: true
  },
  {
    id: 'security-2fa',
    category: 'security',
    title: 'Двухфакторная аутентификация',
    description: 'Дополнительная защита аккаунта',
    icon: '',
    value: false,
    type: 'boolean',
    isEnabled: true,
    requiresAuth: true,
    isPremiumFeature: true
  },
  {
    id: 'general-theme',
    category: 'general',
    title: 'Тема оформления',
    description: 'Выберите тему интерфейса',
    icon: '',
    value: 'dark',
    type: 'select',
    options: [
      { label: 'Темная', value: 'dark' },
      { label: 'Светлая', value: 'light' },
      { label: 'Авто', value: 'auto' }
    ],
    isEnabled: true
  },
  {
    id: 'general-language',
    category: 'general',
    title: 'Язык интерфейса',
    description: 'Язык приложения',
    icon: '',
    value: 'ru',
    type: 'select',
    options: [
      { label: 'Русский', value: 'ru' },
      { label: 'English', value: 'en' },
      { label: 'Español', value: 'es' }
    ],
    isEnabled: true
  }
]

// Константы
export const ACHIEVEMENT_TIERS = {
  bronze: { name: 'Бронза', color: '#CD7F32', icon: '' },
  silver: { name: 'Серебро', color: '#C0C0C0', icon: '' },
  gold: { name: 'Золото', color: '#FFD700', icon: '' },
  platinum: { name: 'Платина', color: '#E5E4E2', icon: '' },
  diamond: { name: 'Алмаз', color: '#B9F2FF', icon: '' }
} as const

export const ACTIVITY_TYPES = {
  vote: { name: 'Голосование', color: 'text-purple-400', icon: '' },
  trade: { name: 'Трейдинг', color: 'text-blue-400', icon: '' },
  learn: { name: 'Обучение', color: 'text-green-400', icon: '' },
  create: { name: 'Создание', color: 'text-orange-400', icon: '' },
  earn: { name: 'Заработок', color: 'text-yellow-400', icon: '' }
} as const

export const LEVEL_REQUIREMENTS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 450 },
  { level: 5, xp: 700 },
  { level: 10, xp: 2500 },
  { level: 15, xp: 6000 },
  { level: 20, xp: 12000 },
  { level: 25, xp: 20000 },
  { level: 30, xp: 30000 }
] as const



















































