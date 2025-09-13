'use client'

import { 
  Course, 
  CourseLevel, 
  CourseCategory, 
  UserProgress,
  Achievement,
  Quiz,
  LearningStats 
} from '../types'

/**
 * Получить цвет для категории курса
 */
export function getCategoryColor(category: CourseCategory): string {
  const colors = {
    blockchain: 'text-purple-400',
    defi: 'text-blue-400',
    nft: 'text-orange-400',
    trading: 'text-green-400',
    development: 'text-yellow-400',
    security: 'text-red-400'
  }
  return colors[category] || 'text-gray-400'
}

/**
 * Получить фоновый градиент для категории
 */
export function getCategoryGradient(category: CourseCategory): string {
  const gradients = {
    blockchain: 'from-purple-500/15 to-purple-500/5',
    defi: 'from-blue-500/15 to-blue-500/5',
    nft: 'from-orange-500/15 to-orange-500/5',
    trading: 'from-green-500/15 to-green-500/5',
    development: 'from-yellow-500/15 to-yellow-500/5',
    security: 'from-red-500/15 to-red-500/5'
  }
  return gradients[category] || 'from-gray-500/15 to-gray-500/5'
}

/**
 * Получить цвет для уровня сложности
 */
export function getLevelColor(level: CourseLevel): string {
  const colors = {
    beginner: 'text-green-400',
    intermediate: 'text-yellow-400',
    advanced: 'text-orange-400',
    expert: 'text-red-400'
  }
  return colors[level] || 'text-gray-400'
}

/**
 * Получить иконку для категории
 */
export function getCategoryIcon(category: CourseCategory): string {
  const icons = {
    blockchain: '',
    defi: '',
    nft: '',
    trading: '',
    development: '',
    security: ''
  }
  return icons[category] || ''
}

/**
 * Получить название категории на русском
 */
export function getCategoryName(category: CourseCategory): string {
  const names = {
    blockchain: 'Блокчейн',
    defi: 'DeFi',
    nft: 'NFT',
    trading: 'Трейдинг', 
    development: 'Разработка',
    security: 'Безопасность'
  }
  return names[category] || 'Неизвестно'
}

/**
 * Получить название уровня на русском
 */
export function getLevelName(level: CourseLevel): string {
  const names = {
    beginner: 'Начинающий',
    intermediate: 'Средний',
    advanced: 'Продвинутый',
    expert: 'Эксперт'
  }
  return names[level] || 'Неизвестно'
}

/**
 * Форматировать время в читаемый вид
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
 * Вычислить прогресс курса
 */
export function calculateCourseProgress(course: Course): number {
  if (!course.lessons || course.lessons.length === 0) {
    return course.progressPercentage || 0
  }
  
  const completedLessons = course.lessons.filter(lesson => lesson.isCompleted).length
  return Math.round((completedLessons / course.lessons.length) * 100)
}

/**
 * Получить статус курса
 */
export function getCourseStatus(course: Course): {
  status: 'not_started' | 'in_progress' | 'completed'
  text: string
  color: string
} {
  if (course.isCompleted) {
    return { status: 'completed', text: 'Завершен', color: 'text-green-400' }
  }
  
  if (course.isEnrolled && course.progressPercentage > 0) {
    return { status: 'in_progress', text: 'В процессе', color: 'text-blue-400' }
  }
  
  return { status: 'not_started', text: 'Не начат', color: 'text-gray-400' }
}

/**
 * Получить цвет прогресса
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'text-green-400'
  if (percentage >= 75) return 'text-blue-400'
  if (percentage >= 50) return 'text-yellow-400'
  if (percentage >= 25) return 'text-orange-400'
  return 'text-red-400'
}

/**
 * Фильтровать курсы
 */
export function filterCourses(
  courses: Course[],
  filters: {
    category?: CourseCategory | 'all'
    level?: CourseLevel | 'all'
    search?: string
    showCompleted?: boolean
    showEnrolled?: boolean
  }
): Course[] {
  return courses.filter(course => {
    // Фильтр по категории
    if (filters.category && filters.category !== 'all' && course.category !== filters.category) {
      return false
    }
    
    // Фильтр по уровню
    if (filters.level && filters.level !== 'all' && course.level !== filters.level) {
      return false
    }
    
    // Поиск по названию и описанию
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase()
      const matchesTitle = course.title.toLowerCase().includes(searchLower)
      const matchesDescription = course.description.toLowerCase().includes(searchLower)
      const matchesObjectives = course.learningObjectives.some(obj => 
        obj.toLowerCase().includes(searchLower)
      )
      
      if (!matchesTitle && !matchesDescription && !matchesObjectives) {
        return false
      }
    }
    
    // Фильтр по завершенным курсам
    if (filters.showCompleted !== undefined) {
      if (filters.showCompleted && !course.isCompleted) return false
      if (!filters.showCompleted && course.isCompleted) return false
    }
    
    // Фильтр по записанным курсам
    if (filters.showEnrolled !== undefined) {
      if (filters.showEnrolled && !course.isEnrolled) return false
      if (!filters.showEnrolled && course.isEnrolled) return false
    }
    
    return true
  })
}

/**
 * Сортировать курсы
 */
export function sortCourses(
  courses: Course[],
  sortBy: 'newest' | 'popular' | 'rating' | 'duration'
): Course[] {
  const sorted = [...courses]
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    
    case 'popular':
      return sorted.sort((a, b) => (b?.studentsCount || 0) - (a?.studentsCount || 0))
    
    case 'rating':
      return sorted.sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
    
    case 'duration':
      return sorted.sort((a, b) => a.duration - b.duration)
    
    default:
      return sorted
  }
}

/**
 * Вычислить уровень пользователя по XP
 */
export function calculateUserLevel(totalXP: number): {
  level: number
  currentLevelXP: number
  nextLevelXP: number
  progress: number
} {
  // Простая формула уровней: level = floor(sqrt(XP / 100))
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1
  const currentLevelXP = Math.pow(level - 1, 2) * 100
  const nextLevelXP = Math.pow(level, 2) * 100
  const progress = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
  
  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(progress, 100)
  }
}

/**
 * Получить титул пользователя по уровню
 */
export function getUserTitle(level: number): string {
  if (level >= 50) return 'Легенда Обучения'
  if (level >= 40) return 'Гуру Знаний'
  if (level >= 30) return 'Мастер'
  if (level >= 25) return 'Эксперт'
  if (level >= 20) return 'Специалист'
  if (level >= 15) return 'Знаток'
  if (level >= 10) return 'Практик'
  if (level >= 5) return 'Студент'
  return 'Новичок'
}

/**
 * Проверить, заслуживает ли пользователь достижение
 */
export function checkAchievementProgress(
  achievement: Achievement,
  stats: LearningStats
): { isEarned: boolean; progress: number } {
  let progress = 0
  let isEarned = false
  
  switch (achievement.category) {
    case 'completion':
      progress = stats.totalCoursesCompleted
      break
    case 'streak':
      progress = stats.currentStreak
      break
    case 'score':
      progress = Math.floor(stats.averageQuizScore)
      break
    case 'social':
      progress = stats.totalLessonsCompleted
      break
    default:
      progress = 0
  }
  
  isEarned = progress >= achievement.maxProgress
  
  return { isEarned, progress: Math.min(progress, achievement.maxProgress) }
}

/**
 * Форматировать большие числа
 */
export function formatLargeNumber(num: number | undefined | null): string {
  if (!num || typeof num !== 'number') {
    return '0'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Получить процент правильных ответов в квизе
 */
export function calculateQuizScore(quiz: Quiz): number {
  if (!quiz.attempts || quiz.attempts.length === 0) return 0
  
  const lastAttempt = quiz.attempts[quiz.attempts.length - 1]
  return lastAttempt.percentage
}

/**
 * Проверить, прошел ли пользователь квиз
 */
export function isQuizPassed(quiz: Quiz): boolean {
  const score = calculateQuizScore(quiz)
  return score >= quiz.passingScore
}

/**
 * Получить рекомендуемые курсы на основе прогресса
 */
export function getRecommendedCourses(
  allCourses: Course[],
  userProgress: UserProgress[],
  completedCategories: CourseCategory[]
): Course[] {
  return allCourses
    .filter(course => {
      // Исключаем уже записанные курсы
      const isEnrolled = userProgress.some(p => p.courseId === course.id)
      if (isEnrolled) return false
      
      // Рекомендуем курсы из новых категорий
      if (!completedCategories.includes(course.category)) return true
      
      // Рекомендуем продвинутые курсы из знакомых категорий
      if (completedCategories.includes(course.category) && course.level !== 'BEGINNER') {
        return true
      }
      
      return false
    })
    .sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
    .slice(0, 6)
}

/**
 * Вычислить оценку курса буквенно
 */
export function getLetterGrade(percentage: number): string {
  if (percentage >= 95) return 'A+'
  if (percentage >= 90) return 'A'
  if (percentage >= 85) return 'B+'
  if (percentage >= 80) return 'B'
  if (percentage >= 75) return 'C+'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

/**
 * Получить цвет для оценки
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-green-400'
    case 'B+':
    case 'B':
      return 'text-blue-400'
    case 'C+':
    case 'C':
      return 'text-yellow-400'
    case 'D':
      return 'text-orange-400'
    case 'F':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

/**
 * Проверить доступность курса
 */
export function isCourseAccessible(course: Course, userLevel: number): boolean {
  const requiredLevel = getRequiredLevelForCourse(course.level)
  return userLevel >= requiredLevel
}

/**
 * Получить требуемый уровень для курса
 */
export function getRequiredLevelForCourse(courseLevel: CourseLevel): number {
  const requirements = {
    beginner: 1,
    intermediate: 5,
    advanced: 15,
    expert: 25
  }
  return requirements[courseLevel] || 1
}

/**
 * Форматировать время до дедлайна
 */
export function formatTimeUntilDeadline(deadline: string): string {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Истекло'
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays} дн`
  if (diffHours > 0) return `${diffHours} ч`
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  return `${diffMinutes} мин`
}

/**
 * Безопасно преобразовать значение в число (для BigInt строк)
 */
export function safeNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * Безопасно отформатировать рейтинг
 */
export function formatRating(rating: any): string {
  return safeNumber(rating).toFixed(1)
}

/**
 * Безопасное отображение значений (заменяет NaN, null, undefined на прочерк или 0)
 */
export function safeValue(value?: number | string, fallback: string = '—'): string {
  if (value === undefined || value === null || value === '' || 
      (typeof value === 'number' && (isNaN(value) || !isFinite(value)))) {
    return fallback;
  }
  return value.toString();
}

/**
 * Безопасное отображение числовых значений
 */
export function safeNumberDisplay(value?: number, fallback: string = '0'): string {
  if (value === undefined || value === null || 
      (typeof value === 'number' && (isNaN(value) || !isFinite(value)))) {
    return fallback;
  }
  return Math.round(value).toString();
}

/**
 * Безопасное отображение процентов
 */
export function safePercentage(value?: number, fallback: string = '—'): string {
  if (value === undefined || value === null || 
      (typeof value === 'number' && (isNaN(value) || !isFinite(value)))) {
    return fallback;
  }
  return `${Math.round(value)}%`;
}



























