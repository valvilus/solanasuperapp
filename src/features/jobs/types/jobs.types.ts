'use client'

// Базовые типы для Jobs
export type JobType = 'development' | 'design' | 'marketing' | 'content' | 'community' | 'consulting' | 'other'
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
export type ExperienceLevel = 'junior' | 'middle' | 'senior' | 'expert'
export type PaymentType = 'fixed' | 'hourly' | 'milestone'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'interview'

// Основная структура вакансии/задания
export interface Job {
  id: string
  title: string
  description: string
  type: JobType
  status: JobStatus
  employer: string
  employerAvatar?: string
  employerRating: number
  
  // Оплата и условия
  paymentType: PaymentType
  budget: number
  currency: 'SOL' | 'USDC' | 'TNG'
  hourlyRate?: number
  
  // Требования
  experienceLevel: ExperienceLevel
  skills: string[]
  requirements: string[]
  
  // Временные рамки
  deadline: string
  estimatedHours?: number
  createdAt: string
  updatedAt: string
  
  // Местоположение и формат
  location?: string
  isRemote: boolean
  timezone?: string
  
  // Статистика
  applicationsCount: number
  viewsCount: number
  
  // Дополнительные поля
  category: string
  tags: string[]
  isUrgent: boolean
  isFeatured: boolean
  
  // Эскроу
  escrowAddress?: string
  milestonesCount?: number
}

// Заявка на работу
export interface JobApplication {
  id: string
  jobId: string
  applicant: string
  applicantAvatar?: string
  applicantRating: number
  status: ApplicationStatus
  coverLetter: string
  proposedBudget?: number
  proposedTimeline: string
  portfolioLinks: string[]
  createdAt: string
  
  // Предложение от исполнителя
  proposedMilestones?: Milestone[]
  estimatedHours?: number
}

// Этап работы для эскроу
export interface Milestone {
  id: string
  title: string
  description: string
  amount: number
  deadline: string
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'disputed'
  deliverables: string[]
}

// Эскроу контракт
export interface EscrowContract {
  id: string
  jobId: string
  employer: string
  contractor: string
  totalAmount: number
  currency: 'SOL' | 'USDC' | 'TNG'
  milestones: Milestone[]
  status: 'created' | 'funded' | 'active' | 'completed' | 'disputed' | 'cancelled'
  createdAt: string
  fundedAt?: string
  completedAt?: string
  
  // Блокчейн данные
  onChainAddress?: string
  transactionSignature?: string
}

// Отзыв и рейтинг
export interface Review {
  id: string
  jobId: string
  reviewer: string
  reviewee: string
  rating: number // 1-5
  comment: string
  createdAt: string
  
  // Детальные оценки
  communication: number
  quality: number
  punctuality: number
  professionalism: number
}

// Профиль пользователя для работы
export interface WorkProfile {
  userId: string
  username: string
  avatar?: string
  
  // Статистика
  totalJobs: number
  completedJobs: number
  averageRating: number
  totalEarned: number
  
  // Навыки и опыт
  skills: string[]
  experienceLevel: ExperienceLevel
  hourlyRate?: number
  
  // Портфолио
  portfolio: PortfolioItem[]
  bio: string
  
  // Верификация
  isVerified: boolean
  verificationBadges: string[]
  
  // Статистика репутации
  responseTime: number // в часах
  completionRate: number // процент
  rehireRate: number // процент
}

// Элемент портфолио
export interface PortfolioItem {
  id: string
  title: string
  description: string
  imageUrl?: string
  projectUrl?: string
  technologies: string[]
  completedAt: string
}

// Фильтры для поиска работы
export interface JobFilters {
  type?: JobType | 'all'
  category?: string | 'all'
  status?: string
  search?: string
  experienceLevel?: ExperienceLevel | 'all'
  paymentType?: PaymentType | 'all'
  minBudget?: number
  maxBudget?: number
  currency?: 'SOL' | 'USDC' | 'TNG' | 'all'
  isRemote?: boolean
  deadline?: {
    from?: string
    to?: string
  }
  skills?: string[]
  location?: string
  
  // Сортировка
  sortBy?: 'created' | 'budget' | 'deadline' | 'applications'
  sortOrder?: 'asc' | 'desc'
}

// Состояние страницы Jobs
export interface JobsPageState {
  activeTab: JobsTabType
  selectedJob: Job | null
  isCreateModalOpen: boolean
  isApplicationModalOpen: boolean
  filters: JobFilters
  searchQuery: string
  isLoading: boolean
  
  // Модалки
  showJobDetails: boolean
  showCreateJob: boolean
  showApplication: boolean
  
  // Уведомления
  notification: JobNotification | null
}

// Типы вкладок
export type JobsTabType = 'all' | 'my_jobs' | 'applications' | 'contracts'

// Уведомления
export interface JobNotification {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

// Форма создания работы
export interface CreateJobForm {
  title: string
  description: string
  type: JobType
  category: string
  budget: number
  currency: 'SOL' | 'USDC' | 'TNG'
  paymentType: PaymentType
  hourlyRate?: number
  experienceLevel: ExperienceLevel
  skills: string[]
  requirements: string[]
  deadline: string
  estimatedHours?: number
  isRemote: boolean
  location?: string
  timezone?: string
  isUrgent: boolean
  
  // Эскроу настройки
  enableEscrow: boolean
  milestones: CreateMilestone[]
}

// Создание этапа работы
export interface CreateMilestone {
  title: string
  description: string
  amount: number
  deadline: string
  deliverables: string[]
}

// Форма заявки на работу
export interface ApplicationForm {
  coverLetter: string
  proposedBudget?: number
  proposedTimeline: string
  portfolioLinks: string[]
  estimatedHours?: number
  
  // Предложения по этапам
  proposedMilestones?: CreateMilestone[]
}

// Статистика Jobs платформы
export interface JobsStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  totalBudget: number
  averageJobValue: number
  totalFreelancers: number
  successRate: number
  averageCompletionTime: number
}

// События Jobs системы
export interface JobEvent {
  id: string
  type: 'job_created' | 'application_submitted' | 'application_accepted' | 'job_completed' | 'payment_released' | 'review_submitted'
  jobId: string
  userId: string
  timestamp: string
  data?: Record<string, any>
}

// Поиск талантов
export interface TalentSearch {
  skills: string[]
  experienceLevel: ExperienceLevel[]
  hourlyRateRange: {
    min: number
    max: number
  }
  rating: number
  location?: string
  availability: 'available' | 'busy' | 'any'
}

// Результат поиска талантов
export interface TalentSearchResult {
  profile: WorkProfile
  matchScore: number
  availability: string
  lastActive: string
}

