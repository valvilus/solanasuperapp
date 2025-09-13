/**
 * Learn System Utilities
 * Solana SuperApp
 */

import { Course, Lesson, Quiz, CategoryStats } from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

export const COURSE_CATEGORIES = {
  blockchain: { label: 'Блокчейн', icon: '', color: 'bg-purple-500' },
  defi: { label: 'DeFi', icon: '', color: 'bg-green-500' },
  nft: { label: 'NFT', icon: '', color: 'bg-pink-500' },
  development: { label: 'Разработка', icon: '', color: 'bg-blue-500' },
  other: { label: 'Другое', icon: '', color: 'bg-gray-500' }
} as const

export const COURSE_LEVELS = {
  beginner: { label: 'Начинающий', icon: '', color: 'bg-green-400' },
  intermediate: { label: 'Средний', icon: '', color: 'bg-yellow-500' },
  advanced: { label: 'Продвинутый', icon: '', color: 'bg-red-500' }
} as const

export const LESSON_TYPES = {
  video: { label: 'Видео', icon: 'Video', color: 'bg-red-500' },
  text: { label: 'Текст', icon: 'FileText', color: 'bg-blue-500' },
  interactive: { label: 'Интерактив', icon: 'Gamepad2', color: 'bg-purple-500' },
  quiz: { label: 'Квиз', icon: 'HelpCircle', color: 'bg-orange-500' }
} as const

export const QUIZ_TYPES = {
  multiple_choice: { label: 'Множественный выбор', icon: '' },
  true_false: { label: 'Верно/Неверно', icon: '' },
  text: { label: 'Текстовый ответ', icon: '' },
  code: { label: 'Код', icon: '' }
} as const

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} ч`
  }
  
  return `${hours} ч ${remainingMinutes} мин`
}

/**
 * Format XP with proper localization
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M XP`
  } else if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K XP`
  }
  return `${xp.toLocaleString()} XP`
}

/**
 * Format token amount
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M TNG`
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K TNG`
  }
  return `${tokens.toLocaleString()} TNG`
}

/**
 * Format percentage
 */
export function formatPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`
}

/**
 * Format students count
 */
export function formatStudentsCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M студентов`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K студентов`
  }
  return `${count} студентов`
}

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Validate course data
 */
export function validateCourse(course: Partial<Course>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!course.title || course.title.trim().length < 3) {
    errors.push('Название курса должно содержать минимум 3 символа')
  }

  if (!course.description || course.description.trim().length < 10) {
    errors.push('Описание курса должно содержать минимум 10 символов')
  }

  if (!course.category || !Object.keys(COURSE_CATEGORIES).includes(course.category)) {
    errors.push('Некорректная категория курса')
  }

  if (!course.level || !Object.keys(COURSE_LEVELS).includes(course.level)) {
    errors.push('Некорректный уровень курса')
  }

  if (!course.duration || course.duration < 5) {
    errors.push('Продолжительность курса должна быть минимум 5 минут')
  }

  if (course.totalRewardTokens && course.totalRewardTokens < 0) {
    errors.push('Количество токенов не может быть отрицательным')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate lesson data
 */
export function validateLesson(lesson: Partial<Lesson>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!lesson.title || lesson.title.trim().length < 3) {
    errors.push('Название урока должно содержать минимум 3 символа')
  }

  if (!lesson.description || lesson.description.trim().length < 10) {
    errors.push('Описание урока должно содержать минимум 10 символов')
  }

  if (!lesson.type || !Object.keys(LESSON_TYPES).includes(lesson.type)) {
    errors.push('Некорректный тип урока')
  }

  if (!lesson.duration || lesson.duration < 1) {
    errors.push('Продолжительность урока должна быть минимум 1 минута')
  }

  if (lesson.type === 'video' && (!lesson.videoUrl || !isValidUrl(lesson.videoUrl))) {
    errors.push('Некорректная ссылка на видео')
  }

  if (lesson.xpReward && lesson.xpReward < 0) {
    errors.push('Количество XP не может быть отрицательным')
  }

  if (lesson.tokenReward && lesson.tokenReward < 0) {
    errors.push('Количество токенов не может быть отрицательным')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate quiz data
 */
export function validateQuiz(quiz: Partial<Quiz>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!quiz.title || quiz.title.trim().length < 3) {
    errors.push('Название квиза должно содержать минимум 3 символа')
  }

  if (!quiz.passingScore || quiz.passingScore < 1 || quiz.passingScore > 100) {
    errors.push('Проходной балл должен быть от 1 до 100%')
  }

  if (quiz.timeLimit && quiz.timeLimit < 1) {
    errors.push('Ограничение времени должно быть минимум 1 минута')
  }

  if (quiz.maxAttempts && quiz.maxAttempts < 1) {
    errors.push('Максимальное количество попыток должно быть минимум 1')
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    errors.push('Квиз должен содержать минимум 1 вопрос')
  }

  // Validate questions
  quiz.questions?.forEach((question, index) => {
    if (!question.question || question.question.trim().length < 5) {
      errors.push(`Вопрос ${index + 1}: текст вопроса должен содержать минимум 5 символов`)
    }

    if (!question.type || !Object.keys(QUIZ_TYPES).includes(question.type)) {
      errors.push(`Вопрос ${index + 1}: некорректный тип вопроса`)
    }

    if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
      errors.push(`Вопрос ${index + 1}: множественный выбор должен иметь минимум 2 варианта`)
    }

    if (!question.points || question.points < 1) {
      errors.push(`Вопрос ${index + 1}: количество баллов должно быть минимум 1`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 60) return 'bg-blue-500'
  if (percentage >= 40) return 'bg-yellow-500'
  if (percentage >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

/**
 * Get user level based on total XP
 */
export function getUserLevel(totalXp: number): { 
  level: number
  title: string
  nextLevelXp: number
  progress: number
  icon: string
} {
  const levels = [
    { level: 1, title: 'Новичок', minXp: 0, nextXp: 100, icon: '' },
    { level: 2, title: 'Изучающий', minXp: 100, nextXp: 300, icon: '' },
    { level: 3, title: 'Практик', minXp: 300, nextXp: 600, icon: '' },
    { level: 4, title: 'Эксперт', minXp: 600, nextXp: 1000, icon: '' },
    { level: 5, title: 'Мастер', minXp: 1000, nextXp: 1500, icon: '' },
    { level: 6, title: 'Гуру', minXp: 1500, nextXp: 2500, icon: '' },
    { level: 7, title: 'Сенсей', minXp: 2500, nextXp: 5000, icon: '' },
    { level: 8, title: 'Легенда', minXp: 5000, nextXp: Infinity, icon: '' }
  ]

  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXp >= levels[i].minXp) {
      const currentLevel = levels[i]
      const progressInLevel = totalXp - currentLevel.minXp
      const levelRange = currentLevel.nextXp === Infinity 
        ? 0 
        : currentLevel.nextXp - currentLevel.minXp
      
      return {
        level: currentLevel.level,
        title: currentLevel.title,
        nextLevelXp: currentLevel.nextXp === Infinity ? 0 : currentLevel.nextXp - totalXp,
        progress: levelRange > 0 ? Math.round((progressInLevel / levelRange) * 100) : 100,
        icon: currentLevel.icon
      }
    }
  }

  return {
    level: 1,
    title: 'Новичок',
    nextLevelXp: 100 - totalXp,
    progress: Math.round((totalXp / 100) * 100),
    icon: ''
  }
}

/**
 * Calculate course difficulty score
 */
export function calculateDifficultyScore(course: Course): number {
  let score = 0
  
  // Base difficulty by level
  switch (course.level) {
    case 'beginner': score += 1; break
    case 'intermediate': score += 3; break
    case 'advanced': score += 5; break
  }
  
  // Add complexity based on duration
  if (course.duration > 480) score += 2 // 8+ hours
  else if (course.duration > 240) score += 1 // 4+ hours
  
  // Add complexity based on lessons count
  const lessonsCount = course.lessons?.length || 0
  if (lessonsCount > 20) score += 2
  else if (lessonsCount > 10) score += 1
  
  return Math.min(score, 10) // Cap at 10
}

/**
 * Generate course completion certificate data
 */
export function generateCertificateData(course: Course, userProgress: any) {
  return {
    certificateId: `cert-${course.id}-${Date.now()}`,
    courseName: course.title,
    completionDate: new Date().toISOString(),
    studentName: userProgress.studentName || 'Student',
    totalXpEarned: userProgress.totalXpEarned || 0,
    totalTokensEarned: userProgress.totalTokensEarned || 0,
    verificationCode: generateVerificationCode()
  }
}

/**
 * Generate verification code for certificate
 */
function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Sort courses by relevance
 */
export function sortCoursesByRelevance(
  courses: Course[], 
  sortBy: 'popular' | 'newest' | 'rating' | 'duration' = 'popular'
): Course[] {
  const sorted = [...courses]
  
  switch (sortBy) {
    case 'popular':
      return sorted.sort((a, b) => (b?.studentsCount || 0) - (a?.studentsCount || 0))
    
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    case 'rating':
      return sorted.sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
    
    case 'duration':
      return sorted.sort((a, b) => a.duration - b.duration)
    
    default:
      return sorted
  }
}

/**
 * Filter courses by search query
 */
export function filterCoursesBySearch(courses: Course[], query: string): Course[] {
  if (!query.trim()) return courses
  
  const searchTerm = query.toLowerCase().trim()
  
  return courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm) ||
    course.description.toLowerCase().includes(searchTerm) ||
    course.shortDescription?.toLowerCase().includes(searchTerm) ||
    course.category.toLowerCase().includes(searchTerm) ||
    course.level.toLowerCase().includes(searchTerm)
  )
}

/**
 * Get trending categories based on stats
 */
export function getTrendingCategories(categoryStats: CategoryStats[]): CategoryStats[] {
  return categoryStats
    .filter(cat => cat.studentsCount > 0)
    .sort((a, b) => (b?.studentsCount || 0) - (a?.studentsCount || 0))
    .slice(0, 5)
}

/**
 * Calculate estimated completion time for course
 */
export function calculateEstimatedCompletion(course: Course, userProgress?: number): string {
  const totalMinutes = course.duration
  const progressPercentage = userProgress || 0
  const remainingMinutes = Math.round(totalMinutes * (100 - progressPercentage) / 100)
  
  if (remainingMinutes <= 0) {
    return 'Завершено'
  }
  
  if (remainingMinutes < 60) {
    return `~${remainingMinutes} мин осталось`
  }
  
  const hours = Math.round(remainingMinutes / 60)
  return `~${hours} ч осталось`
}

/**
 * Generate course share URL
 */
export function generateCourseShareUrl(courseId: string): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/learn/courses/${courseId}`
}

/**
 * Generate lesson share URL
 */
export function generateLessonShareUrl(lessonId: string): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/learn/lessons/${lessonId}`
}






