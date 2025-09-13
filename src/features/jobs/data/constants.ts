'use client'

import { 
  Code, 
  Palette, 
  Megaphone, 
  PenTool, 
  Users, 
  Briefcase,
  MoreHorizontal,
  Search,
  Plus,
  Filter,
  TrendingUp,
  Zap,
  Award,
  Clock
} from 'lucide-react'

// Быстрые действия для Jobs
export const jobsQuickActions = [
  { 
    id: 'search-jobs', 
    title: 'Поиск', 
    icon: Search, 
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/15 to-blue-500/5' 
  },
  { 
    id: 'create-job', 
    title: 'Создать', 
    icon: Plus, 
    color: 'text-green-400', 
    bgColor: 'from-green-500/15 to-green-500/5' 
  },
  { 
    id: 'my-applications', 
    title: 'Заявки', 
    icon: Briefcase, 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/15 to-purple-500/5' 
  },
  { 
    id: 'talent-search', 
    title: 'Таланты', 
    icon: Award, 
    color: 'text-yellow-400', 
    bgColor: 'from-yellow-500/15 to-yellow-500/5' 
  },
  { 
    id: 'contracts', 
    title: 'Контракты', 
    icon: Filter, 
    color: 'text-cyan-400', 
    bgColor: 'from-cyan-500/15 to-cyan-500/5' 
  },
  { 
    id: 'analytics', 
    title: 'Аналитика', 
    icon: TrendingUp, 
    color: 'text-orange-400', 
    bgColor: 'from-orange-500/15 to-orange-500/5' 
  },
  { 
    id: 'featured', 
    title: 'Топ работы', 
    icon: Zap, 
    color: 'text-pink-400', 
    bgColor: 'from-pink-500/15 to-pink-500/5' 
  },
  { 
    id: 'urgent', 
    title: 'Срочные', 
    icon: Clock, 
    color: 'text-red-400', 
    bgColor: 'from-red-500/15 to-red-500/5' 
  }
] as const

// Типы работ с иконками и цветами
export const jobTypes = [
  {
    id: 'development',
    label: 'Разработка',
    icon: Code,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'design',
    label: 'Дизайн',
    icon: Palette,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30'
  },
  {
    id: 'marketing',
    label: 'Маркетинг',
    icon: Megaphone,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30'
  },
  {
    id: 'content',
    label: 'Контент',
    icon: PenTool,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30'
  },
  {
    id: 'community',
    label: 'Сообщество',
    icon: Users,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30'
  },
  {
    id: 'consulting',
    label: 'Консалтинг',
    icon: Briefcase,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30'
  },
  {
    id: 'other',
    label: 'Другое',
    icon: MoreHorizontal,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30'
  }
] as const

// Уровни опыта
export const experienceLevels = [
  { id: 'junior', label: 'Junior', description: '0-2 года', color: 'text-green-400' },
  { id: 'middle', label: 'Middle', description: '2-5 лет', color: 'text-blue-400' },
  { id: 'senior', label: 'Senior', description: '5+ лет', color: 'text-purple-400' },
  { id: 'expert', label: 'Expert', description: '10+ лет', color: 'text-orange-400' }
] as const

// Типы оплаты
export const paymentTypes = [
  { id: 'fixed', label: 'Фиксированная', description: 'Одна сумма за весь проект' },
  { id: 'hourly', label: 'Почасовая', description: 'Оплата за отработанные часы' },
  { id: 'milestone', label: 'Этапы', description: 'Оплата по этапам работы' }
] as const

// Валюты
export const currencies = [
  { id: 'SOL', label: 'SOL', symbol: '', color: 'text-solana-purple' },
  { id: 'USDC', label: 'USDC', symbol: '$', color: 'text-blue-400' },
  { id: 'TNG', label: 'TNG', symbol: '₸', color: 'text-solana-green' }
] as const

// Популярные навыки по категориям
export const skillsByCategory = {
  development: [
    'React', 'Next.js', 'TypeScript', 'Solana Web3', 'Rust', 'Anchor',
    'Node.js', 'Python', 'JavaScript', 'Smart Contracts', 'DeFi', 'NFT'
  ],
  design: [
    'UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Prototyping',
    'User Research', 'Web3 UX', 'Mobile Design', 'Brand Design'
  ],
  marketing: [
    'Digital Marketing', 'Social Media', 'Content Marketing', 'SEO',
    'PPC', 'Influencer Marketing', 'PR', 'Growth Hacking'
  ],
  content: [
    'Content Writing', 'Copywriting', 'Technical Writing', 'Blog Writing',
    'Social Media Content', 'Video Editing', 'Podcast Production'
  ],
  community: [
    'Community Management', 'Discord', 'Telegram', 'Reddit',
    'Event Management', 'Moderation', 'Engagement Strategies'
  ],
  consulting: [
    'Business Strategy', 'Project Management', 'Financial Analysis',
    'Legal Consulting', 'Technical Consulting', 'Tokenomics'
  ]
} as const

// Статусы работ
export const jobStatuses = [
  { id: 'open', label: 'Открыта', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { id: 'in_progress', label: 'В работе', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { id: 'completed', label: 'Завершена', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { id: 'cancelled', label: 'Отменена', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  { id: 'disputed', label: 'Спор', color: 'text-red-400', bgColor: 'bg-red-500/20' }
] as const

// Статусы заявок
export const applicationStatuses = [
  { id: 'pending', label: 'На рассмотрении', color: 'text-yellow-400' },
  { id: 'accepted', label: 'Принята', color: 'text-green-400' },
  { id: 'rejected', label: 'Отклонена', color: 'text-red-400' },
  { id: 'interview', label: 'Интервью', color: 'text-blue-400' }
] as const

// Настройки отображения
export const JOBS_PER_PAGE = 10
export const INITIAL_JOBS_COUNT = 6

// Минимальные и максимальные значения
export const MIN_BUDGET = 100
export const MAX_BUDGET = 100000
export const MIN_HOURLY_RATE = 5
export const MAX_HOURLY_RATE = 500

// Временные константы
export const DEADLINE_OPTIONS = [
  { label: '1 неделя', value: 7 },
  { label: '2 недели', value: 14 },
  { label: '1 месяц', value: 30 },
  { label: '2 месяца', value: 60 },
  { label: '3 месяца', value: 90 },
  { label: 'Более 3 месяцев', value: 365 }
] as const

// Размеры команды
export const TEAM_SIZES = [
  { label: 'Индивидуально', value: 1 },
  { label: 'Малая команда (2-5)', value: 5 },
  { label: 'Средняя команда (6-10)', value: 10 },
  { label: 'Большая команда (10+)', value: 50 }
] as const

// Часовые пояса (основные для СНГ)
export const TIMEZONES = [
  { label: 'UTC+3 (Москва)', value: 'UTC+3' },
  { label: 'UTC+4 (Самара)', value: 'UTC+4' },
  { label: 'UTC+5 (Екатеринбург)', value: 'UTC+5' },
  { label: 'UTC+6 (Алматы)', value: 'UTC+6' },
  { label: 'UTC+7 (Новосибирск)', value: 'UTC+7' },
  { label: 'UTC+8 (Иркутск)', value: 'UTC+8' },
  { label: 'UTC+9 (Якутск)', value: 'UTC+9' }
] as const

// Фильтры по умолчанию
export const DEFAULT_FILTERS = {
  type: 'all',
  experienceLevel: 'all',
  paymentType: 'all',
  currency: 'all',
  isRemote: undefined,
  sortBy: 'created',
  sortOrder: 'desc'
} as const

// Сортировка
export const SORT_OPTIONS = [
  { id: 'created', label: 'По дате создания' },
  { id: 'budget', label: 'По бюджету' },
  { id: 'deadline', label: 'По дедлайну' },
  { id: 'applications', label: 'По количеству заявок' }
] as const

// Категории работ (расширенные)
export const JOB_CATEGORIES = [
  'Blockchain Development',
  'Smart Contract Development', 
  'DeFi Development',
  'NFT Development',
  'Frontend Development',
  'Backend Development',
  'Mobile Development',
  'UI/UX Design',
  'Web Design',
  'Brand Design',
  'Motion Design',
  'Digital Marketing',
  'Content Marketing',
  'Social Media Marketing',
  'SEO/SEM',
  'Content Writing',
  'Technical Writing',
  'Copywriting',
  'Translation',
  'Community Management',
  'Discord Management',
  'Event Management',
  'Business Consulting',
  'Technical Consulting',
  'Security Audit',
  'Project Management',
  'DevOps',
  'QA/Testing',
  'Data Analysis',
  'Research',
  'Other'
] as const

// Валютные символы для отображения
export const CURRENCY_SYMBOLS = {
  SOL: '',
  USDC: '$',
  TNG: '₸'
} as const

// Лимиты для форм
export const FORM_LIMITS = {
  TITLE_MIN: 10,
  TITLE_MAX: 100,
  DESCRIPTION_MIN: 50,
  DESCRIPTION_MAX: 2000,
  COVER_LETTER_MIN: 100,
  COVER_LETTER_MAX: 1000,
  SKILLS_MAX: 10,
  REQUIREMENTS_MAX: 10,
  PORTFOLIO_LINKS_MAX: 5,
  MILESTONES_MAX: 10
} as const

