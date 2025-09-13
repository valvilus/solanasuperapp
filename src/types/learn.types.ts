/**
 * Unified Learn System Types
 * Solana SuperApp - Learn-to-Earn Platform
 * 
 * This file contains all unified types for the Learn system:
 * - Database models integration
 * - Blockchain contract types
 * - Frontend UI types
 * - API service types
 */

// ============================================================================
// BASE ENUMS & UNIONS
// ============================================================================

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
export type CourseCategory = 'BLOCKCHAIN' | 'DEFI' | 'NFT' | 'TRADING' | 'DEVELOPMENT' | 'SECURITY'
export type LessonType = 'VIDEO' | 'TEXT' | 'INTERACTIVE' | 'QUIZ' | 'PRACTICAL'
export type QuizType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING' | 'CODE_COMPLETION' | 'PRACTICAL'
export type RewardType = 'TNG_TOKENS' | 'XP_POINTS' | 'NFT' | 'CERTIFICATE' | 'BADGE'

// ============================================================================
// UNIFIED REWARD SYSTEM
// ============================================================================

/**
 * Unified reward configuration for cross-platform rewards
 */
export interface UnifiedReward {
  id: string
  type: RewardType
  
  // Token rewards
  tokenAmount?: number        // TNG tokens (main unit)
  tokenSymbol?: string        // 'TNG'
  blockchainAmount?: number   // Blockchain smallest units (for precision)
  
  // XP rewards  
  xpPoints: number
  
  // NFT rewards
  nftMetadata?: {
    name: string
    description: string
    image: string
    attributes: Record<string, any>
  }
  
  // Certificate/Badge
  certificateTemplate?: string
  badgeIcon?: string
  
  // Metadata
  title: string
  description: string
  imageUrl?: string
  isUnlocked: boolean
  unlockedAt?: string
  
  // Requirements
  minimumScore?: number       // Required score percentage
  completionRequired?: boolean // Must complete course/lesson
  timeRequirement?: number    // Minimum time spent
}

/**
 * Token conversion utilities
 */
export class TokenConverter {
  // TNG Token precision (9 decimals like SOL)
  static readonly TNG_DECIMALS = 9
  static readonly TNG_MULTIPLIER = Math.pow(10, TokenConverter.TNG_DECIMALS)
  
  /**
   * Convert TNG tokens to blockchain smallest units
   */
  static tngToBlockchain(tngAmount: number): number {
    return Math.floor(tngAmount * TokenConverter.TNG_MULTIPLIER)
  }
  
  /**
   * Convert blockchain units to TNG tokens
   */
  static blockchainToTng(blockchainAmount: number): number {
    return blockchainAmount / TokenConverter.TNG_MULTIPLIER
  }
  
  /**
   * Format TNG amount for display
   */
  static formatTNG(amount: number, precision: number = 4): string {
    return `${amount.toFixed(precision)} TNG`
  }
  
  /**
   * Calculate XP from TNG tokens (standard conversion rate)
   */
  static tngToXP(tngAmount: number, multiplier: number = 2): number {
    return Math.floor(tngAmount * multiplier)
  }
}
export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED'

export type LearnTabType = 'explore' | 'my_courses' | 'certificates' | 'leaderboard'
export type BadgeCategory = 'COMPLETION' | 'STREAK' | 'SCORE' | 'PARTICIPATION' | 'SPECIAL'
export type BadgeRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

// ============================================================================
// BLOCKCHAIN INTEGRATION TYPES
// ============================================================================

/**
 * Blockchain Course structure from smart contract
 */
export interface BlockchainCourse {
  courseId: number
  title: string
  description: string
  creator: string // PublicKey as string
  rewardAmount: number // TNG tokens in smallest units
  totalCompletions: number
  isActive: boolean
  createdAt: number // Unix timestamp
  bump: number
}

/**
 * Blockchain User Course Progress from smart contract
 */
export interface BlockchainUserCourse {
  user: string // PublicKey as string
  courseId: number
  answerHash: string
  isCompleted: boolean
  completedAt: number // Unix timestamp
  isRewardClaimed: boolean
  claimedAt?: number // Unix timestamp
  bump: number
}

/**
 * Blockchain Learn Config from smart contract
 */
export interface BlockchainLearnConfig {
  admin: string // PublicKey as string
  totalCourses: number
  totalRewardsDistributed: number
  isActive: boolean
  bump: number
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Unified Course interface combining database and blockchain data
 */
export interface Course {
  // Core identifiers (matches database)
  id: string // Database ID
  blockchainId?: number // Optional blockchain course ID

  // Basic information
  title: string
  description: string
  shortDescription?: string
  coverImage?: string

  // Classification
  category: CourseCategory
  level: CourseLevel
  difficulty?: string

  // Metrics
  duration: number // minutes
  lessonsCount: number
  studentsCount: number
  rating: number // 0-5
  ratingCount: number

  // Content structure
  lessons: Lesson[]
  quizzes?: Quiz[]
  prerequisites: string[]
  learningObjectives: string[]
  objectives: string[]

  // Rewards system (unified)
  totalRewardTokens: number // TNG tokens
  xpReward: number
  certificateAvailable: boolean
  rewards: CourseReward[]

  // User progress (when user is authenticated)
  isEnrolled: boolean
  isCompleted: boolean
  progressPercentage: number
  totalXpEarned: number
  totalTokensEarned: bigint
  lastAccessedAt?: string
  startedAt?: string
  completedAt?: string

  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  difficultyScore: number // 1-10
  estimatedTime: number // minutes
  completionRate: number // percentage
  averageScore?: number

  // Flags
  isPopular: boolean
  isNew: boolean
  isFeatured: boolean
  isActive: boolean

  // Blockchain integration
  blockchainData?: {
    courseId: number
    creator: string
    onchainRewardAmount: number
    totalCompletions: number
    isActiveOnchain: boolean
  }
}

/**
 * Unified Lesson interface
 */
export interface Lesson {
  id: string
  courseId: string
  title: string
  description: string
  type: LessonType
  order: number
  duration: number // minutes

  // Content
  content?: string // For text lessons
  videoUrl?: string // For video lessons
  interactiveConfig?: Record<string, any> // For interactive lessons
  coverImage?: string // Lesson cover image
  transcript?: string // Video transcript

  // Rewards
  xpReward: number
  tokenReward: number // TNG tokens
  rewards: LessonReward[]

  // User progress
  isCompleted: boolean
  isLocked: boolean
  score?: number
  timeSpent: number // minutes
  completedAt?: string

  // Resources
  resources?: Resource[]
  notes?: string // User notes

  // Metadata
  createdAt: string
  updatedAt: string
}

/**
 * Unified Quiz interface
 */
export interface Quiz {
  id: string
  courseId?: string
  lessonId?: string
  title: string
  description: string
  
  // Configuration
  type: QuizType
  timeLimit?: number // seconds
  attemptsAllowed: number
  passingScore: number // percentage
  isRandomized: boolean
  
  // Content
  questions: QuizQuestion[]
  
  // Rewards
  xpReward: number
  tokenReward: number
  rewards: QuizReward[]
  
  // User progress
  attempts: QuizAttempt[]
  bestScore?: number
  isPassed: boolean
  isCompleted: boolean
  attemptsUsed: number
  availableAttempts?: number
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface QuizQuestion {
  id: string
  quizId: string
  type: QuizType
  question: string
  explanation?: string
  points: number
  order: number
  
  // Options for multiple choice
  options?: QuizOption[]
  
  // Correct answer (hidden from client)
  correctAnswer?: string | string[] | boolean
  
  // Code templates for programming questions
  codeTemplate?: string
  expectedOutput?: string
  
  // Media
  imageUrl?: string
  videoUrl?: string
}

export interface QuizOption {
  id: string
  text: string
  isCorrect?: boolean // Hidden from client
  explanation?: string
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  score: number
  percentage: number
  isPassed: boolean
  timeSpent: number // seconds
  startedAt: string
  completedAt?: string
  answers: QuizAnswer[]
}

export interface QuizAnswer {
  questionId: string
  userAnswer: string | string[] | boolean
  isCorrect?: boolean
  points: number
  timeSpent: number // seconds
}

// ============================================================================
// REWARD SYSTEM
// ============================================================================

export interface CourseReward {
  id: string
  type: RewardType
  amount?: number
  tokenSymbol?: string
  xpPoints?: number
  title: string
  description: string
  imageUrl?: string
  isUnlocked: boolean
  unlockedAt?: string
  // Optional IDs for different reward types
  nftId?: string
  badgeId?: string
  certificateId?: string
}

export interface LessonReward {
  id: string
  type: RewardType
  amount?: number
  tokenSymbol?: string
  xpPoints: number
  isUnlocked: boolean
}

export interface QuizReward {
  id: string
  type: RewardType
  amount?: number
  tokenSymbol?: string
  xpPoints: number
  minimumScore: number // percentage required
  isUnlocked: boolean
}

// ============================================================================
// USER PROGRESS & STATISTICS
// ============================================================================

export interface UserProgress {
  userId: string
  
  // Overall progress
  totalCoursesEnrolled: number
  totalCoursesCompleted: number
  totalLessonsCompleted: number
  totalQuizzesCompleted: number
  totalTimeSpent: number // minutes
  
  // Rewards earned
  totalXpEarned: number
  totalTokensEarned: bigint
  certificatesEarned: Certificate[]
  badgesEarned: Badge[]
  
  // Streaks and engagement
  currentStreak: number
  longestStreak: number
  averageQuizScore: number
  lastActivityAt: string
  
  // Rankings
  globalRank?: number
  categoryRanks: Record<CourseCategory, number>
  
  // Blockchain integration
  blockchainProgress?: {
    completedCourses: number
    totalRewardsClaimed: bigint
    userCourses: BlockchainUserCourse[]
  }
  
  // Individual course progress (for compatibility)
  courseId?: string
  progress?: number
}

export interface Certificate {
  id: string
  courseId: string
  userId: string
  title: string
  description: string
  imageUrl?: string
  courseName: string
  studentName: string
  
  // Verification
  verificationCode: string
  verificationUrl?: string
  isVerified: boolean
  blockchainTxId?: string
  
  // Metadata
  issueDate: string
  validUntil?: string
  skills: string[]
  grade?: string
}

export interface Badge {
  id: string
  title: string
  description: string
  imageUrl: string
  category: BadgeCategory
  rarity: BadgeRarity
  
  // Progress
  progress?: number
  maxProgress?: number
  
  // Metadata
  earnedAt: string
  criteria: string
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

export interface LearnPageState {
  // Filters and search
  selectedCategory: CourseCategory | 'all'
  selectedLevel: CourseLevel | 'all'
  searchQuery: string
  sortBy: 'newest' | 'popular' | 'rating' | 'duration'
  
  // Current view
  currentTab: LearnTabType
  
  // UI states
  isLoading: boolean
  showFilters: boolean
  showSearch: boolean
  showMyProgress: boolean
  
  // Modals
  selectedCourse?: Course
  showCourseDetails: boolean
  showQuizModal: boolean
  currentQuiz?: Quiz
  
  // Notifications
  notification: LearnNotification | null
}

export interface LearnNotification {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  action?: {
    label: string
    handler: () => void
  }
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
  timestamp?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface CourseFilters {
  category?: CourseCategory
  level?: CourseLevel
  search?: string
  sortBy?: 'newest' | 'popular' | 'rating' | 'duration'
  limit?: number
  offset?: number
  showCompleted?: boolean
  showEnrolled?: boolean
}

// ============================================================================
// GAMIFICATION & SOCIAL
// ============================================================================

export interface DailyChallenge {
  id: string
  title: string
  description: string
  type: 'lesson_completion' | 'quiz_score' | 'streak' | 'time_spent'
  target: number
  currentProgress: number
  reward: {
    xp: number
    tokens?: number
    badge?: string
  }
  expiresAt: string
  isCompleted: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  iconUrl: string
  category: 'learning' | 'social' | 'streak' | 'score' | 'completion'
  rarity: BadgeRarity
  progress: number
  maxProgress: number
  isUnlocked: boolean
  unlockedAt?: string
  reward?: {
    xp?: number
    tokens?: number
    nft?: string
  }
}

export interface LeaderboardEntry {
  userId: string
  userName: string
  userAvatar?: string
  position: number
  score: number
  stats: {
    xpEarned: number
    tokensEarned: number
    coursesCompleted: number
    certificatesEarned: number
  }
  badges: string[]
  isCurrentUser?: boolean
}

// ============================================================================
// MISCELLANEOUS
// ============================================================================

export interface Resource {
  id: string
  title: string
  type: 'pdf' | 'link' | 'video' | 'article' | 'tool'
  url: string
  description?: string
}

export interface LearningStats {
  totalCoursesEnrolled: number
  totalCoursesCompleted: number
  totalLessonsCompleted: number
  totalQuizzesCompleted: number
  totalTimeSpent: number
  totalXpEarned: number
  totalXP?: number // Alias for totalXpEarned
  totalTokensEarned: number
  averageQuizScore: number
  averageCourseCompletion: number
  currentStreak: number
  longestStreak: number
  weeklyProgress?: Array<{weekStart: string; lessonsCompleted: number; timeSpent: number; xpEarned: number; tokensEarned: number}>
  monthlyProgress?: Array<{month: string; coursesCompleted: number; timeSpent: number; xpEarned: number; tokensEarned: number}>
  totalTokens?: number // Alias for totalTokensEarned
  globalRank?: number
  categoryRanks: Record<CourseCategory, number>
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export enum LearnErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class LearnError extends Error {
  constructor(
    public code: LearnErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'LearnError'
  }
}

// ============================================================================
// BLOCKCHAIN CONTRACT INTERFACES
// ============================================================================

export interface CreateCourseParams {
  title: string
  description: string
  rewardAmount: number
  courseId: number
}

export interface SubmitAnswerParams {
  courseId: number
  answerHash: string
}

export interface ClaimRewardParams {
  courseId: number
}
