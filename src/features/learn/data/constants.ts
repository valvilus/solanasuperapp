'use client'

import { BookOpen, Trophy, Activity, Users, Target, Award } from 'lucide-react'

// Быстрые действия для Learn страницы
export const learnQuickActions = [
  { 
    id: 'continue-learning', 
    title: 'Продолжить', 
    icon: BookOpen, 
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/15 to-blue-500/5' 
  },
  { 
    id: 'daily-challenge', 
    title: 'Челлендж', 
    icon: Target, 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/15 to-purple-500/5' 
  },
  { 
    id: 'leaderboard', 
    title: 'Рейтинг', 
    icon: Trophy, 
    color: 'text-yellow-400', 
    bgColor: 'from-yellow-500/15 to-yellow-500/5' 
  },
  { 
    id: 'certificates', 
    title: 'Сертификаты', 
    icon: Award, 
    color: 'text-green-400', 
    bgColor: 'from-green-500/15 to-green-500/5' 
  }
] as const

// Вкладки страницы обучения
export const LEARN_TABS = [
  { id: 'explore', label: 'Обзор', icon: 'Compass' },
  { id: 'my_courses', label: 'Мои курсы', icon: 'BookOpen' },
  { id: 'certificates', label: 'Сертификаты', icon: 'Award' },
  { id: 'leaderboard', label: 'Рейтинг', icon: 'Trophy' }
] as const

// Опции фильтрации
export const FILTER_CATEGORIES = [
  { value: 'all', label: 'Все категории' },
  { value: 'blockchain', label: 'Блокчейн' },
  { value: 'defi', label: 'DeFi' },
  { value: 'nft', label: 'NFT' },
  { value: 'trading', label: 'Трейдинг' },
  { value: 'development', label: 'Разработка' },
  { value: 'security', label: 'Безопасность' }
] as const

export const FILTER_LEVELS = [
  { value: 'all', label: 'Все уровни' },
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' }
] as const

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'popular', label: 'Популярные' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'duration', label: 'По времени' }
] as const

// Настройки отображения
export const DISPLAY_SETTINGS = {
  COURSES_PER_PAGE: 6,
  REVIEWS_PER_PAGE: 5,
  LEADERBOARD_SIZE: 10,
  RECENT_ACTIVITY_SIZE: 5,
  CERTIFICATES_PER_PAGE: 8
} as const

// Лимиты для системы
export const SYSTEM_LIMITS = {
  MAX_COURSE_TITLE_LENGTH: 100,
  MAX_COURSE_DESCRIPTION_LENGTH: 500,
  MAX_LESSON_DURATION: 120, // минут
  MAX_QUIZ_QUESTIONS: 50,
  MAX_ATTEMPTS_PER_QUIZ: 3,
  MIN_PASSING_SCORE: 60, // процентов
  MAX_REVIEW_LENGTH: 1000
} as const

// Награды и геймификация
export const GAMIFICATION = {
  XP_RATES: {
    LESSON_COMPLETE: 50,
    QUIZ_PASS: 25,
    COURSE_COMPLETE: 100,
    PERFECT_QUIZ: 50,
    DAILY_GOAL: 30,
    STREAK_BONUS: 10
  },
  TOKEN_RATES: {
    LESSON_COMPLETE: 10,
    QUIZ_PASS: 5,
    COURSE_COMPLETE: 50,
    DAILY_CHALLENGE: 25,
    PERFECT_SCORE: 15
  },
  STREAK_MULTIPLIERS: {
    7: 1.1,   // +10% за неделю
    14: 1.2,  // +20% за 2 недели
    30: 1.5,  // +50% за месяц
    90: 2.0   // +100% за 3 месяца
  }
} as const

// Типы уведомлений для обучения
export const NOTIFICATION_TYPES = {
  COURSE_COMPLETED: 'course_completed',
  LESSON_COMPLETED: 'lesson_completed',
  QUIZ_PASSED: 'quiz_passed',
  CERTIFICATE_EARNED: 'certificate_earned',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  DAILY_GOAL_REACHED: 'daily_goal_reached',
  STREAK_MILESTONE: 'streak_milestone',
  NEW_COURSE_AVAILABLE: 'new_course_available'
} as const

// Настройки времени
export const TIME_SETTINGS = {
  QUIZ_DEFAULT_TIME: 300, // 5 минут
  LESSON_AUTOPLAY_DELAY: 3, // секунд
  PROGRESS_SAVE_INTERVAL: 30, // секунд
  ACTIVITY_TIMEOUT: 1800, // 30 минут неактивности
  CERTIFICATE_CACHE_TIME: 3600 // час
} as const

// Статусы элементов обучения
export const ITEM_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  LOCKED: 'locked',
  EXPIRED: 'expired'
} as const

// Цвета для элементов UI
export const UI_COLORS = {
  CATEGORIES: {
    blockchain: 'purple',
    defi: 'blue', 
    nft: 'orange',
    trading: 'green',
    development: 'yellow',
    security: 'red'
  },
  LEVELS: {
    beginner: 'green',
    intermediate: 'yellow',
    advanced: 'orange',
    expert: 'red'
  },
  PROGRESS: {
    0: 'gray',
    25: 'red',
    50: 'yellow',
    75: 'blue',
    100: 'green'
  }
} as const



















































