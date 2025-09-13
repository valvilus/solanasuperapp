'use client'

import { 
  Course, 
  Lesson, 
  Quiz, 
  UserProgress, 
  Certificate, 
  Badge,
  LearningStats,
  DailyChallenge,
  Achievement
} from '../types'

// CourseReview type from old system - TODO: integrate with unified types
interface CourseReview {
  id: string
  courseId: string
  userId: string
  username: string
  userAvatar?: string
  rating: number
  comment: string
  pros: string[]
  cons: string[]
  createdAt: string
  isVerified: boolean
  helpfulVotes: number
  userProgress: number
}

import { solanaCompleteCourse } from './solana-course-data'

// Курсы для обучения (будут загружаться из API)
export const courses: Course[] = [solanaCompleteCourse]

// Функция для загрузки курсов из API
export const loadCoursesFromAPI = async (apiCall?: (url: string, options?: RequestInit) => Promise<Response>): Promise<Course[]> => {
  try {
    let response: Response
    
    if (apiCall) {
      // Используем apiCall если он передан (с авторизацией)
      response = await apiCall('/api/learn/courses')
    } else {
      // Fallback к обычному fetch без авторизации
      response = await fetch('/api/learn/courses')
    }
    
    if (response.ok) {
      const data = await response.json()
      const apiCourses = data.success ? data.data.courses || data.data || [] : []
      
      // Всегда добавляем хардкод курс Solana в начало списка
      return [solanaCompleteCourse, ...apiCourses]
    }
    
    // Возвращаем fallback данные включая Solana курс
    return [solanaCompleteCourse, ...fallbackCourses]
  } catch (error) {
    console.error('Error loading courses from API:', error)
    // Возвращаем fallback данные включая Solana курс
    return [solanaCompleteCourse, ...fallbackCourses]
  }
}

// Fallback данные для демонстрации (если API недоступен)
export const fallbackCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Основы Solana Blockchain',
    description: 'Полный курс для изучения экосистемы Solana с нуля. Узнайте о принципах работы блокчейна, токенах, транзакциях и создании dApps.',
    shortDescription: 'Изучите основы Solana и начните работу с блокчейном',
    coverImage: '',
    category: 'BLOCKCHAIN',
    level: 'BEGINNER',
    duration: 480, // 8 часов
    lessonsCount: 6,
    studentsCount: 1247,
    rating: 4.8,
    ratingCount: 156,
    objectives: [],
    xpReward: 100,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    
    isCompleted: false,
    isEnrolled: true,
    progressPercentage: 35,
    lastAccessedAt: '2024-01-23T14:30:00Z',
    
    rewards: [
      {
        id: 'reward-1',
        type: 'TNG_TOKENS',
        amount: 500,
        tokenSymbol: 'TNG',
        title: 'Базовые награды',
        description: '500 TNG за завершение курса',
        isUnlocked: false
      },
      {
        id: 'reward-2', 
        type: 'CERTIFICATE',
        // certificateId: 'cert-solana-basics',
        title: 'Сертификат Solana Developer',
        description: 'On-chain сертификат о прохождении курса',
        imageUrl: '',
        isUnlocked: false
      }
    ],
    totalRewardTokens: 500,
    certificateAvailable: true,
    
    lessons: [], // Заполним ниже
    prerequisites: [],
    learningObjectives: [
      'Понимать архитектуру Solana',
      'Создавать и отправлять транзакции',
      'Работать с SPL токенами',
      'Основы Anchor framework'
    ],
    
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
    createdBy: 'expert-1',
    difficulty: "intermediate",
    estimatedTime: 480,
    
    completionRate: 87.5,
    averageScore: 4.2,
    isPopular: true,
    isNew: false,
    isFeatured: true,
    difficultyScore: 3,
    isActive: true
  },
  {
    id: 'course-2',
    title: 'DeFi на Solana: Jupiter и DEX',
    description: 'Углубленное изучение DeFi протоколов на Solana. Научитесь торговать на DEX, использовать Jupiter агрегатор и зарабатывать в yield farming.',
    shortDescription: 'Мастер-класс по DeFi торговле и yield farming',
    coverImage: '',
    category: 'DEFI',
    level: 'INTERMEDIATE',
    duration: 360, // 6 часов
    lessonsCount: 8,
    studentsCount: 689,
    rating: 4.9,
    ratingCount: 89,
    objectives: [],
    xpReward: 150,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    
    isCompleted: true,
    isEnrolled: true,
    progressPercentage: 100,
    lastAccessedAt: '2024-01-22T09:15:00Z',
    
    rewards: [
      {
        id: 'reward-3',
        type: 'TNG_TOKENS',
        amount: 750,
        tokenSymbol: 'TNG',
        title: 'Продвинутые награды',
        description: '750 TNG за мастерство в DeFi',
        isUnlocked: true,
        unlockedAt: '2024-01-22T09:15:00Z'
      },
      {
        id: 'reward-4',
        type: 'NFT',
        nftId: 'nft-defi-master',
        title: 'DeFi Master NFT',
        description: 'Эксклюзивный NFT для DeFi экспертов',
        imageUrl: '',
        isUnlocked: true,
        unlockedAt: '2024-01-22T09:15:00Z'
      }
    ],
    totalRewardTokens: 750,
    certificateAvailable: true,
    
    lessons: [],
    prerequisites: ['course-1'],
    learningObjectives: [
      'Торговать на Jupiter DEX',
      'Понимать AMM алгоритмы',
      'Участвовать в liquidity mining',
      'Анализировать DeFi риски'
    ],
    
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T12:45:00Z',
    createdBy: 'expert-2',
    difficulty: "intermediate",
    estimatedTime: 360,
    
    completionRate: 92.3,
    averageScore: 4.5,
    isPopular: true,
    isNew: false,
    isFeatured: true,
    difficultyScore: 3,
    isActive: true
  },
  {
    id: 'course-3',
    title: 'NFT Создание и Маркетплейс',
    description: 'Пошаговое руководство по созданию, минтингу и продаже NFT на Solana. Изучите Metaplex, создайте свою коллекцию и запустите успешный проект.',
    shortDescription: 'Создайте и продайте свою первую NFT коллекцию',
    coverImage: '',
    category: 'NFT',
    level: 'INTERMEDIATE',
    duration: 420, // 7 часов
    lessonsCount: 10,
    studentsCount: 543,
    rating: 4.7,
    ratingCount: 67,
    objectives: [],
    xpReward: 200,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    
    isCompleted: false,
    isEnrolled: false,
    progressPercentage: 0,
    
    rewards: [
      {
        id: 'reward-5',
        type: 'TNG_TOKENS',
        amount: 600,
        tokenSymbol: 'TNG',
        title: 'NFT Creator Rewards',
        description: '600 TNG за освоение NFT',
        isUnlocked: false
      },
      {
        id: 'reward-6',
        type: 'BADGE',
        badgeId: 'badge-nft-creator',
        title: 'NFT Creator Badge',
        description: 'Значок создателя NFT',
        imageUrl: '',
        isUnlocked: false
      }
    ],
    totalRewardTokens: 600,
    certificateAvailable: true,
    
    lessons: [],
    prerequisites: ['course-1'],
    learningObjectives: [
      'Создавать NFT с помощью Metaplex',
      'Настраивать royalties и metadata',
      'Запускать NFT коллекции',
      'Продавать на маркетплейсах'
    ],
    
    createdAt: '2024-01-12T14:20:00Z',
    updatedAt: '2024-01-19T16:10:00Z',
    createdBy: 'expert-3',
    difficulty: "intermediate",
    estimatedTime: 420,
    
    completionRate: 78.9,
    averageScore: 4.1,
    isPopular: false,
    isNew: true,
    isFeatured: false,
    difficultyScore: 5,
    isActive: true
  },
  {
    id: 'course-4',
    title: 'Anchor: Разработка Smart Contracts',
    description: 'Профессиональная разработка smart contracts на Solana с помощью Anchor framework. От настройки окружения до деплоя в mainnet.',
    shortDescription: 'Станьте Solana разработчиком с Anchor',
    coverImage: '',
    category: 'DEVELOPMENT',
    level: 'ADVANCED',
    duration: 720, // 12 часов
    lessonsCount: 15,
    studentsCount: 234,
    rating: 4.9,
    ratingCount: 45,
    objectives: [],
    xpReward: 300,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    
    isCompleted: false,
    isEnrolled: false,
    progressPercentage: 0,
    
    rewards: [
      {
        id: 'reward-7',
        type: 'TNG_TOKENS',
        amount: 1000,
        tokenSymbol: 'TNG',
        title: 'Developer Rewards',
        description: '1000 TNG за освоение разработки',
        isUnlocked: false
      },
      {
        id: 'reward-8',
        type: 'CERTIFICATE',
        certificateId: 'cert-anchor-dev',
        title: 'Anchor Developer Certificate',
        description: 'Профессиональный сертификат разработчика',
        imageUrl: '',
        isUnlocked: false
      }
    ],
    totalRewardTokens: 1000,
    certificateAvailable: true,
    
    lessons: [],
    prerequisites: ['course-1'],
    learningObjectives: [
      'Настраивать Anchor окружение',
      'Создавать сложные программы',
      'Тестировать smart contracts',
      'Деплоить в production'
    ],
    
    createdAt: '2024-01-08T11:30:00Z',
    updatedAt: '2024-01-21T13:25:00Z',
    createdBy: 'expert-4',
    difficulty: "intermediate",
    estimatedTime: 720,
    
    completionRate: 65.2,
    averageScore: 4.3,
    isPopular: false,
    isNew: false,
    isFeatured: false,
    difficultyScore: 5,
    isActive: true
  },
  {
    id: 'course-5',
    title: 'Безопасность в Web3',
    description: 'Критически важный курс по безопасности в Web3. Защитите себя от скамов, изучите лучшие практики и безопасные методы работы с DeFi.',
    shortDescription: 'Защитите свои активы в Web3',
    coverImage: '',
    category: 'SECURITY',
    level: 'BEGINNER',
    duration: 240, // 4 часа
    lessonsCount: 6,
    studentsCount: 892,
    rating: 4.9,
    ratingCount: 134,
    objectives: [],
    xpReward: 120,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    
    isCompleted: false,
    isEnrolled: true,
    progressPercentage: 60,
    lastAccessedAt: '2024-01-23T11:20:00Z',
    
    rewards: [
      {
        id: 'reward-9',
        type: 'TNG_TOKENS',
        amount: 300,
        tokenSymbol: 'TNG',
        title: 'Security Rewards',
        description: '300 TNG за изучение безопасности',
        isUnlocked: false
      },
      {
        id: 'reward-10',
        type: 'BADGE',
        badgeId: 'badge-security-expert',
        title: 'Security Expert',
        description: 'Значок эксперта по безопасности',
        imageUrl: '',
        isUnlocked: false
      }
    ],
    totalRewardTokens: 300,
    certificateAvailable: true,
    
    lessons: [],
    prerequisites: [],
    learningObjectives: [
      'Распознавать скам-проекты',
      'Безопасно хранить приватные ключи',
      'Проверять smart contracts',
      'Использовать hardware wallets'
    ],
    
    createdAt: '2024-01-14T09:45:00Z',
    updatedAt: '2024-01-22T14:15:00Z',
    createdBy: 'expert-5',
    difficulty: "intermediate",
    estimatedTime: 240,
    
    completionRate: 94.7,
    averageScore: 4.6,
    isPopular: true,
    isNew: false,
    isFeatured: true,
    difficultyScore: 3,
    isActive: true
  },
  {
    id: 'course-6',
    title: 'Трейдинг на Solana DEX',
    description: 'Профессиональные стратегии трейдинга на децентрализованных биржах Solana. Технический анализ, риск-менеджмент и психология трейдинга.',
    shortDescription: 'Стратегии прибыльного трейдинга',
    coverImage: '',
    category: 'TRADING',
    level: 'ADVANCED',
    duration: 540, // 9 часов
    lessonsCount: 12,
    studentsCount: 456,
    rating: 4.6,
    ratingCount: 78,
    objectives: [],
    xpReward: 350,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    
    isCompleted: false,
    isEnrolled: false,
    progressPercentage: 0,
    
    rewards: [
      {
        id: 'reward-11',
        type: 'TNG_TOKENS',
        amount: 800,
        tokenSymbol: 'TNG',
        title: 'Trader Rewards',
        description: '800 TNG за освоение трейдинга',
        isUnlocked: false
      }
    ],
    totalRewardTokens: 800,
    certificateAvailable: true,
    
    lessons: [],
    prerequisites: ['course-1', 'course-2'],
    learningObjectives: [
      'Технический анализ на криптовалютах',
      'Настройка торговых ботов',
      'Риск-менеджмент портфеля',
      'Психология трейдинга'
    ],
    
    createdAt: '2024-01-11T16:00:00Z',
    updatedAt: '2024-01-20T10:30:00Z',
    createdBy: 'expert-6',
    difficulty: "intermediate",
    estimatedTime: 540,
    
    completionRate: 71.8,
    averageScore: 3.9,
    isPopular: false,
    isNew: true,
    isFeatured: false,
    difficultyScore: 5,
    isActive: true
  }
]

// Прогресс пользователя
export const userProgress: UserProgress = {
  userId: 'user-123',
  courseId: 'course-1',
  totalCoursesCompleted: 4,
  totalCoursesEnrolled: 6,
  totalLessonsCompleted: 24,
  totalQuizzesCompleted: 12,
  totalTimeSpent: 168, // 2.8 часа
  currentStreak: 5,
  longestStreak: 12,
  categoryRanks: {
    NFT: 1,
    DEVELOPMENT: 2,
    BLOCKCHAIN: 1,
    DEFI: 3,
    TRADING: 2,
    SECURITY: 1,
    // GAMING: 1 // removed - category doesn't exist
  },
  
  averageQuizScore: 87.5,
  totalXpEarned: 1450,
  // streakDays: 7, // removed - field doesn't exist
  lastActivityAt: '2024-01-23T14:30:00Z',
  // startedAt: '2024-01-20T10:00:00Z', // removed - field doesn't exist
  
  certificatesEarned: [
    {
      id: 'cert-1',
      courseId: 'course-2',
      userId: 'user-123',
      title: 'DeFi на Solana Специалист',
      description: 'Подтверждает знания в области DeFi на Solana',
      courseName: 'DeFi на Solana',
      studentName: 'Студент',
      verificationCode: 'CERT-001-2024',
      issueDate: '2024-01-22T09:15:00Z',
      blockchainTxId: 'tx123...abc',
      imageUrl: '',
      verificationUrl: 'https://verify.solana-superapp.com/cert-1',
      skills: ['Jupiter DEX', 'Yield Farming', 'AMM', 'Risk Management'],
      grade: 'A+',
      isVerified: true
    }
  ],
  badgesEarned: [
    {
      id: 'badge-1',
      title: 'Первые шаги',
      description: 'Завершить первый урок',
      imageUrl: '',
      category: 'COMPLETION',
      rarity: 'COMMON',
      criteria: 'Завершить первый урок',
      earnedAt: '2024-01-20T10:30:00Z'
    },
    {
      id: 'badge-2', 
      title: 'Неделя обучения',
      description: 'Заниматься 7 дней подряд',
      imageUrl: '',
      category: 'STREAK',
      rarity: 'UNCOMMON',
      criteria: 'Заниматься 7 дней подряд',
      earnedAt: '2024-01-23T14:30:00Z'
    }
  ],
  totalTokensEarned: 750n
}

// Статистика обучения
export const learningStats: LearningStats = {
  totalCoursesEnrolled: 3,
  totalCoursesCompleted: 1,
  totalLessonsCompleted: 24,
  totalQuizzesCompleted: 8,
  totalTimeSpent: 520, // 8.67 часов
  totalXpEarned: 1450,
  totalTokensEarned: 750,
  
  weeklyProgress: [
    {
      weekStart: '2024-01-22',
      lessonsCompleted: 8,
      timeSpent: 240,
      xpEarned: 420,
      tokensEarned: 200
    },
    {
      weekStart: '2024-01-15',
      lessonsCompleted: 12,
      timeSpent: 180,
      xpEarned: 650,
      tokensEarned: 300
    }
  ],
  
  monthlyProgress: [
    {
      month: '2024-01',
      coursesCompleted: 1,
      timeSpent: 520,
      xpEarned: 1450,
      tokensEarned: 750
    }
  ],
  
  averageQuizScore: 87.5,
  averageCourseCompletion: 68.3,
  currentStreak: 7,
  longestStreak: 12,
  
  globalRank: 47,
  categoryRanks: {
    BLOCKCHAIN: 23,
    DEFI: 12,
    NFT: 89,
    TRADING: 156,
    DEVELOPMENT: 234,
    SECURITY: 34
  }
}

// Ежедневные челленджи
export const dailyChallenges: DailyChallenge[] = [
  {
    id: 'challenge-1',
    title: 'Урок дня',
    description: 'Завершите 1 урок сегодня',
    type: 'lesson_completion',
    target: 1,
    currentProgress: 0,
    reward: {
      xp: 50,
      tokens: 25
    },
    expiresAt: '2024-01-24T23:59:59Z',
    isCompleted: false
  },
  {
    id: 'challenge-2',
    title: 'Квиз-мастер',
    description: 'Наберите 90%+ в любом квизе',
    type: 'quiz_score',
    target: 90,
    currentProgress: 87,
    reward: {
      xp: 75,
      tokens: 40,
      badge: 'quiz-master'
    },
    expiresAt: '2024-01-24T23:59:59Z',
    isCompleted: false
  },
  {
    id: 'challenge-3',
    title: 'Час знаний',
    description: 'Проведите 60 минут в обучении',
    type: 'time_spent',
    target: 60,
    currentProgress: 45,
    reward: {
      xp: 100,
      tokens: 50
    },
    expiresAt: '2024-01-24T23:59:59Z',
    isCompleted: false
  }
]

// Достижения
export const achievements: Achievement[] = [
  {
    id: 'achievement-1',
    title: 'Первый шаг',
    description: 'Завершите свой первый урок',
    iconUrl: '',
    category: 'learning',
    rarity: 'COMMON',
    progress: 1,
    maxProgress: 1,
    isUnlocked: true,
    unlockedAt: '2024-01-20T10:30:00Z',
    reward: {
      xp: 50,
      tokens: 25
    }
  },
  {
    id: 'achievement-2',
    title: 'Горящее сердце',
    description: 'Поддерживайте streak 30 дней',
    iconUrl: '',
    category: 'streak',
    rarity: 'EPIC',
    progress: 7,
    maxProgress: 30,
    isUnlocked: false,
    reward: {
      xp: 500,
      tokens: 250,
      nft: 'streak-master-nft'
    }
  },
  {
    id: 'achievement-3',
    title: 'Кандидат наук',
    description: 'Завершите 10 курсов',
    iconUrl: '',
    category: 'completion',
    rarity: 'LEGENDARY',
    progress: 1,
    maxProgress: 10,
    isUnlocked: false,
    reward: {
      xp: 1000,
      tokens: 500,
      nft: 'phd-graduate-nft'
    }
  },
  {
    id: 'achievement-4',
    title: 'Квиз-гений',
    description: 'Наберите 100% в 5 квизах',
    iconUrl: '',
    category: 'score',
    rarity: 'RARE',
    progress: 2,
    maxProgress: 5,
    isUnlocked: false,
    reward: {
      xp: 300,
      tokens: 150
    }
  }
]

// Отзывы о курсах
export const courseReviews: CourseReview[] = [
  {
    id: 'review-1',
    courseId: 'course-1',
    userId: 'user-456',
    username: 'crypto_enthusiast',
    userAvatar: '‍',
    rating: 5,
    comment: 'Отличный курс для начинающих! Все объясняется простым языком, много практических примеров. Рекомендую всем, кто хочет разобраться в Solana.',
    pros: ['Понятные объяснения', 'Практические примеры', 'Хорошая структура'],
    cons: ['Хотелось бы больше углубленных тем'],
    createdAt: '2024-01-22T15:30:00Z',
    isVerified: true,
    helpfulVotes: 23,
    userProgress: 100
  },
  {
    id: 'review-2',
    courseId: 'course-2',
    userId: 'user-789',
    username: 'defi_trader',
    userAvatar: '',
    rating: 5,
    comment: 'Курс превзошел все ожидания! Теперь чувствую себя уверенно в DeFi. Заработал первую прибыль уже через неделю после прохождения.',
    pros: ['Актуальная информация', 'Реальные стратегии', 'Отличные преподаватели'],
    cons: [],
    createdAt: '2024-01-21T11:45:00Z',
    isVerified: true,
    helpfulVotes: 31,
    userProgress: 100
  },
  {
    id: 'review-3',
    courseId: 'course-5',
    userId: 'user-321',
    username: 'security_first',
    userAvatar: '',
    rating: 5,
    comment: 'Жизненно важный курс! Спас меня от нескольких потенциальных скамов. Безопасность - это основа успешной работы в Web3.',
    pros: ['Практические советы', 'Реальные кейсы', 'Актуальные угрозы'],
    cons: ['Немного пугающая статистика'],
    createdAt: '2024-01-20T09:20:00Z',
    isVerified: true,
    helpfulVotes: 18,
    userProgress: 95
  }
]

// Констатны для Learn-to-Earn
export const LEARNING_CONSTANTS = {
  XP_PER_LESSON: 50,
  XP_PER_QUIZ: 25,
  XP_PER_COURSE: 100,
  TOKENS_PER_HOUR: 50,
  STREAK_MULTIPLIER: 1.1,
  DAILY_GOAL_MINUTES: 30,
  LEVELS: [
    { level: 1, xp: 0, title: 'Новичок' },
    { level: 2, xp: 100, title: 'Ученик' },
    { level: 3, xp: 300, title: 'Студент' },
    { level: 4, xp: 600, title: 'Практик' },
    { level: 5, xp: 1000, title: 'Знаток' },
    { level: 10, xp: 3000, title: 'Эксперт' },
    { level: 15, xp: 6000, title: 'Мастер' },
    { level: 20, xp: 10000, title: 'Гуру' }
  ]
} as const

// Категории курсов с метаданными
export const COURSE_CATEGORIES = {
  blockchain: { 
    name: 'Блокчейн', 
    icon: '', 
    color: 'text-purple-400',
    description: 'Основы блокчейн технологий' 
  },
  defi: { 
    name: 'DeFi', 
    icon: '', 
    color: 'text-blue-400',
    description: 'Децентрализованные финансы' 
  },
  nft: { 
    name: 'NFT', 
    icon: '', 
    color: 'text-orange-400',
    description: 'Невзаимозаменяемые токены' 
  },
  trading: { 
    name: 'Трейдинг', 
    icon: '', 
    color: 'text-green-400',
    description: 'Торговые стратегии' 
  },
  development: { 
    name: 'Разработка', 
    icon: '', 
    color: 'text-yellow-400',
    description: 'Программирование dApps' 
  },
  security: { 
    name: 'Безопасность', 
    icon: '', 
    color: 'text-red-400',
    description: 'Защита активов' 
  }
} as const

// Уровни сложности
export const COURSE_LEVELS = {
  beginner: { 
    name: 'Начинающий', 
    color: 'text-green-400', 
    difficulty: "intermediate",
    description: 'Для новичков без опыта' 
  },
  intermediate: { 
    name: 'Средний', 
    color: 'text-yellow-400', 
    difficulty: "intermediate",
    description: 'Базовые знания необходимы' 
  },
  advanced: { 
    name: 'Продвинутый', 
    color: 'text-orange-400', 
    difficulty: "intermediate",
    description: 'Глубокие знания и опыт' 
  },
  expert: { 
    name: 'Эксперт', 
    color: 'text-red-400', 
    difficulty: "intermediate",
    description: 'Для профессионалов' 
  }
} as const

























