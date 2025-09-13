/**
 * Types for Learn-to-Earn System
 * Solana SuperApp
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// ============================================================================
// COURSE TYPES
// ============================================================================

export interface Course {
  id: string
  title: string
  description: string
  shortDescription?: string
  coverImage?: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: 'blockchain' | 'defi' | 'nft' | 'development' | 'other'
  duration: number // minutes
  totalRewardTokens: number
  certificateAvailable: boolean
  isActive: boolean
  studentsCount: number
  rating: number
  createdBy: string
  createdAt: string
  // User progress (populated when userId provided)
  isEnrolled?: boolean
  isCompleted?: boolean
  progressPercentage?: number
  totalXpEarned?: number
  totalTokensEarned?: number
  lastAccessedAt?: string
  // Related data
  lessons?: Lesson[]
  instructor?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface CourseFilters {
  category?: string
  level?: string
  search?: string
  featured?: boolean
  limit?: number
  offset?: number
}

export interface CreateCourseData {
  title: string
  description: string
  shortDescription?: string
  category: string
  level: string
  duration: number
  totalRewardTokens: number
  certificateAvailable?: boolean
  coverImage?: string
}

// ============================================================================
// LESSON TYPES
// ============================================================================

export interface Lesson {
  id: string
  courseId: string
  title: string
  description: string
  type: 'video' | 'text' | 'interactive' | 'quiz'
  order: number
  duration: number // minutes
  content?: string
  videoUrl?: string
  coverImage?: string
  transcript?: string
  xpReward: number
  tokenReward: number
  isRequired: boolean
  // User progress (populated when userId provided)
  isCompleted?: boolean
  isLocked?: boolean
  completedAt?: string
  timeSpent?: number
  progress?: number // 0-100
  // Related data
  quiz?: Quiz
  course?: {
    id: string
    title: string
  }
}

export interface CreateLessonData {
  courseId: string
  title: string
  description: string
  type: 'video' | 'text' | 'interactive' | 'quiz'
  order: number
  duration: number
  content?: string
  videoUrl?: string
  coverImage?: string
  transcript?: string
  xpReward: number
  tokenReward: number
  isRequired?: boolean
}

// ============================================================================
// QUIZ TYPES
// ============================================================================

export interface Quiz {
  id: string
  lessonId: string
  title: string
  description: string
  timeLimit?: number // minutes
  passingScore: number // percentage
  maxAttempts?: number
  questions: QuizQuestion[]
  // User progress (populated when userId provided)
  attemptsUsed?: number
  bestScore?: number
  isPassed?: boolean
  lastAttemptAt?: string
  availableAttempts?: number
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'text' | 'code'
  question: string
  options?: string[]
  correctAnswer?: any // Only included for admin/grading
  explanation?: string
  points: number
  order: number
  // Additional question metadata
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
}

export interface QuizAnswer {
  questionId: string
  answer: string | boolean | string[]
  timeSpent?: number
}

export interface QuizSubmission {
  quizId: string
  answers: QuizAnswer[]
  timeSpent?: number
}

export interface QuizResult {
  attemptId: string
  score: number
  totalPoints: number
  percentage: number
  isPassed: boolean
  passingScore: number
  xpEarned: number
  tokensEarned: number
  timeSpent: number
  submittedAt: string
  detailedAnswers: {
    [questionId: string]: {
      question: string
      userAnswer: any
      correctAnswer?: any
      isCorrect: boolean
      points: number
      explanation?: string
    }
  }
}

export interface CreateQuizData {
  lessonId: string
  title: string
  description: string
  timeLimit?: number
  passingScore: number
  maxAttempts?: number
  questions: CreateQuizQuestionData[]
}

export interface CreateQuizQuestionData {
  type: 'multiple_choice' | 'true_false' | 'text' | 'code'
  question: string
  options?: string[]
  correctAnswer: any
  explanation?: string
  points: number
  order: number
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
}

// ============================================================================
// USER PROGRESS TYPES
// ============================================================================

export interface UserProgress {
  totalXp: number
  totalTokens: number
  completedCourses: number
  completedLessons: number
  totalLessons: number
  currentStreak: number
  longestStreak: number
  achievements: Achievement[]
  certificates: Certificate[]
  // Recent activity
  recentCompletions: {
    type: 'course' | 'lesson' | 'quiz'
    id: string
    title: string
    completedAt: string
    xpEarned: number
    tokensEarned: number
  }[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'progress' | 'streak' | 'score' | 'special'
  unlockedAt: string
  xpReward: number
  tokenReward: number
}

export interface Certificate {
  id: string
  courseId: string
  courseTitle: string
  issuedAt: string
  certificateUrl?: string
  verificationCode: string
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  displayName: string
  avatar?: string
  totalXp: number
  totalTokens: number
  completedCourses: number
  achievements: number
  // Change indicators
  rankChange?: number // positive = up, negative = down
  isCurrentUser?: boolean
}

export interface Leaderboard {
  timeframe: 'weekly' | 'monthly' | 'all_time'
  entries: LeaderboardEntry[]
  currentUser?: LeaderboardEntry
  totalUsers: number
  lastUpdated: string
}

// ============================================================================
// CATEGORY & STATS TYPES
// ============================================================================

export interface CategoryStats {
  category: string
  coursesCount: number
  studentsCount: number
  averageRating: number
  totalDuration: number
  totalRewards: number
}

export interface LearningStats {
  totalCourses: number
  totalLessons: number
  totalStudents: number
  totalXpAwarded: number
  totalTokensAwarded: number
  averageCompletionRate: number
  categories: CategoryStats[]
  // Growth metrics
  growthMetrics: {
    newStudentsThisWeek: number
    newCoursesThisMonth: number
    completionRateChange: number
  }
}

// ============================================================================
// NOTIFICATION & ACTIVITY TYPES
// ============================================================================

export interface LearningNotification {
  id: string
  type: 'achievement' | 'course_completion' | 'new_course' | 'reminder'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: string
}

export interface LearningActivity {
  id: string
  userId: string
  type: 'course_enrolled' | 'lesson_completed' | 'quiz_passed' | 'achievement_unlocked'
  entityId: string
  entityType: 'course' | 'lesson' | 'quiz' | 'achievement'
  metadata: {
    title: string
    xpEarned?: number
    tokensEarned?: number
    score?: number
  }
  timestamp: string
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

export interface SearchFilters {
  query?: string
  category?: string
  level?: string
  duration?: {
    min?: number
    max?: number
  }
  rating?: {
    min?: number
  }
  features?: {
    certificate?: boolean
    hasVideo?: boolean
    hasQuiz?: boolean
  }
  sortBy?: 'popular' | 'newest' | 'rating' | 'duration'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
  courses: Course[]
  lessons: Lesson[]
  totalResults: number
  filters: {
    categories: { key: string; label: string; count: number }[]
    levels: { key: string; label: string; count: number }[]
    durations: { min: number; max: number }
  }
}

// ============================================================================
// ADMIN & INSTRUCTOR TYPES
// ============================================================================

export interface CourseAnalytics {
  courseId: string
  studentsEnrolled: number
  studentsCompleted: number
  completionRate: number
  averageScore: number
  averageCompletionTime: number
  studentFeedback: {
    averageRating: number
    totalReviews: number
    ratingDistribution: { [rating: number]: number }
  }
  lessonAnalytics: {
    lessonId: string
    title: string
    completionRate: number
    averageTimeSpent: number
    dropoffRate: number
  }[]
}

export interface InstructorStats {
  instructorId: string
  totalCourses: number
  totalStudents: number
  averageRating: number
  totalRevenue: number
  topCourses: {
    courseId: string
    title: string
    studentsCount: number
    rating: number
  }[]
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface LearnError {
  code: string
  message: string
  details?: any
}

export const LearnErrorCodes = {
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  LESSON_NOT_FOUND: 'LESSON_NOT_FOUND',
  QUIZ_NOT_FOUND: 'QUIZ_NOT_FOUND',
  NOT_ENROLLED: 'NOT_ENROLLED',
  ALREADY_ENROLLED: 'ALREADY_ENROLLED',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  MAX_ATTEMPTS_REACHED: 'MAX_ATTEMPTS_REACHED',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  INVALID_ANSWERS: 'INVALID_ANSWERS',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  SMART_CONTRACT_ERROR: 'SMART_CONTRACT_ERROR'
} as const

export type LearnErrorCode = typeof LearnErrorCodes[keyof typeof LearnErrorCodes]






