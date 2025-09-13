/**
 * Learn Hooks - Хуки для Learn-to-Earn системы
 * Solana SuperApp
 */

import { useState, useEffect, useCallback } from 'react'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { 
  Course, 
  Lesson, 
  Quiz, 
  QuizAnswer, 
  QuizResult, 
  UserProgress,
  CourseFilters,
  Leaderboard,
  CategoryStats,
  ApiResponse 
} from '@/lib/learn/types'

// ============================================================================
// COURSES
// ============================================================================

export function useCourses(filters: CourseFilters = {}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.category) params.set('category', filters.category)
      if (filters.level) params.set('level', filters.level)
      if (filters.search) params.set('search', filters.search)
      if (filters.featured) params.set('featured', 'true')
      if (filters.limit) params.set('limit', filters.limit.toString())
      if (filters.offset) params.set('offset', filters.offset.toString())

      const response = await apiCall(`/api/learn/courses?${params}`)
      const data: ApiResponse<Course[]> = await response.json()

      if (data.success) {
        setCourses(data.data || [])
      } else {
        setError(data.error || 'Ошибка загрузки курсов')
      }
    } catch (err) {
      console.error('Error fetching courses:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, filters])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses
  }
}

export function useCourse(courseId: string) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchCourse = useCallback(async () => {
    if (!courseId) return

    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/courses/${courseId}`)
      const data: ApiResponse<Course> = await response.json()

      if (data.success) {
        setCourse(data.data || null)
      } else {
        setError(data.error || 'Курс не найден')
      }
    } catch (err) {
      console.error('Error fetching course:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, courseId])

  const enrollInCourse = useCallback(async () => {
    try {
      const response = await apiCall(`/api/learn/courses/${courseId}/enroll`, {
        method: 'POST'
      })
      const data: ApiResponse = await response.json()

      if (data.success) {
        // Refresh course data
        await fetchCourse()
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error enrolling in course:', err)
      return { success: false, error: 'Ошибка записи на курс' }
    }
  }, [apiCall, courseId, fetchCourse])

  useEffect(() => {
    fetchCourse()
  }, [fetchCourse])

  return {
    course,
    loading,
    error,
    enrollInCourse,
    refetch: fetchCourse
  }
}

// ============================================================================
// LESSONS
// ============================================================================

export function useLesson(lessonId: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return

    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/lessons/${lessonId}`)
      const data: ApiResponse<Lesson> = await response.json()

      if (data.success) {
        setLesson(data.data || null)
      } else {
        setError(data.error || 'Урок не найден')
      }
    } catch (err) {
      console.error('Error fetching lesson:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, lessonId])

  const completeLesson = useCallback(async (timeSpent: number = 0) => {
    try {
      const response = await apiCall(`/api/learn/lessons/${lessonId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ timeSpent })
      })
      const data: ApiResponse = await response.json()

      if (data.success) {
        // Refresh lesson data
        await fetchLesson()
        return { success: true, data: data.data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error completing lesson:', err)
      return { success: false, error: 'Ошибка завершения урока' }
    }
  }, [apiCall, lessonId, fetchLesson])

  useEffect(() => {
    fetchLesson()
  }, [fetchLesson])

  return {
    lesson,
    loading,
    error,
    completeLesson,
    refetch: fetchLesson
  }
}

// ============================================================================
// QUIZZES
// ============================================================================

export function useQuiz(quizId: string) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return

    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/quizzes/${quizId}`)
      const data: ApiResponse<Quiz> = await response.json()

      if (data.success) {
        setQuiz(data.data || null)
      } else {
        setError(data.error || 'Квиз не найден')
      }
    } catch (err) {
      console.error('Error fetching quiz:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, quizId])

  const submitQuiz = useCallback(async (answers: QuizAnswer[], timeSpent: number = 0) => {
    try {
      const response = await apiCall(`/api/learn/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, timeSpent })
      })
      const data: ApiResponse<QuizResult> = await response.json()

      if (data.success) {
        return { success: true, result: data.data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error submitting quiz:', err)
      return { success: false, error: 'Ошибка отправки квиза' }
    }
  }, [apiCall, quizId])

  useEffect(() => {
    fetchQuiz()
  }, [fetchQuiz])

  return {
    quiz,
    loading,
    error,
    submitQuiz,
    refetch: fetchQuiz
  }
}

/**
 * Get quiz by lesson ID (получение квиза по ID урока)
 */
export function useQuizByLesson(lessonId: string) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchQuiz = useCallback(async () => {
    if (!lessonId) return

    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/lessons/${lessonId}/quiz`)
      const data: ApiResponse<Quiz | null> = await response.json()

      if (data.success) {
        setQuiz(data.data) // может быть null, если у урока нет квиза
      } else {
        setError(data.error || 'Квиз урока не найден')
      }
    } catch (err) {
      console.error('Error fetching lesson quiz:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, lessonId])

  const submitQuiz = useCallback(async (answers: QuizAnswer[], timeSpent: number = 0) => {
    if (!quiz) {
      return { success: false, error: 'Квиз не найден' }
    }
    
    try {
      const response = await apiCall(`/api/learn/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, timeSpent })
      })
      const data: ApiResponse<QuizResult> = await response.json()

      if (data.success) {
        return { success: true, result: data.data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Error submitting quiz:', err)
      return { success: false, error: 'Ошибка отправки квиза' }
    }
  }, [apiCall, quiz])

  useEffect(() => {
    fetchQuiz()
  }, [fetchQuiz])

  return {
    quiz,
    loading,
    error,
    submitQuiz,
    refetch: fetchQuiz
  }
}

// ============================================================================
// USER PROGRESS
// ============================================================================

export function useUserProgress() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall, isAuthenticated } = useCompatibleAuth()

  const fetchProgress = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/learn/user/progress')
      const data: ApiResponse<UserProgress> = await response.json()

      if (data.success) {
        setProgress(data.data || null)
      } else {
        setError(data.error || 'Ошибка загрузки прогресса')
      }
    } catch (err) {
      console.error('Error fetching user progress:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, isAuthenticated])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress
  }
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export function useLeaderboard(timeframe: 'weekly' | 'monthly' | 'all_time' = 'all_time') {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/leaderboard?timeframe=${timeframe}`)
      const data: ApiResponse<Leaderboard> = await response.json()

      if (data.success) {
        setLeaderboard(data.data || null)
      } else {
        setError(data.error || 'Ошибка загрузки лидерборда')
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall, timeframe])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return {
    leaderboard,
    loading,
    error,
    refetch: fetchLeaderboard
  }
}

// ============================================================================
// CATEGORIES
// ============================================================================

export function useCategories() {
  const [categories, setCategories] = useState<CategoryStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/learn/categories')
      const data: ApiResponse<CategoryStats[]> = await response.json()

      if (data.success) {
        setCategories(data.data || [])
      } else {
        setError(data.error || 'Ошибка загрузки категорий')
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format XP number with proper localization
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M XP`
  } else if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K XP`
  }
  return `${xp} XP`
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
  return `${tokens} TNG`
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
 * Get level badge based on XP
 */
export function getUserLevel(totalXp: number): { level: number; title: string; nextLevelXp: number } {
  const levels = [
    { level: 1, title: 'Новичок', minXp: 0, nextXp: 100 },
    { level: 2, title: 'Изучающий', minXp: 100, nextXp: 300 },
    { level: 3, title: 'Практик', minXp: 300, nextXp: 600 },
    { level: 4, title: 'Эксперт', minXp: 600, nextXp: 1000 },
    { level: 5, title: 'Мастер', minXp: 1000, nextXp: 1500 },
    { level: 6, title: 'Гуру', minXp: 1500, nextXp: 2500 },
    { level: 7, title: 'Сенсей', minXp: 2500, nextXp: 5000 },
    { level: 8, title: 'Легенда', minXp: 5000, nextXp: Infinity }
  ]

  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXp >= levels[i].minXp) {
      return {
        level: levels[i].level,
        title: levels[i].title,
        nextLevelXp: levels[i].nextXp === Infinity ? 0 : levels[i].nextXp - totalXp
      }
    }
  }

  return {
    level: levels[0].level,
    title: levels[0].title,
    nextLevelXp: levels[0].nextXp
  }
}

// ============================================================================
// ADDITIONAL LEARN HOOKS FOR NEW FUNCTIONALITY
// ============================================================================

/**
 * Get achievements
 */
export function useAchievements(category?: string) {
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (category) params.append('category', category)
      
      const response = await fetch(`/api/learn/achievements?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch achievements')
      }

      const data = await response.json()
      if (data.success) {
        setAchievements(data.data.achievements || [])
      } else {
        throw new Error(data.error || 'Failed to fetch achievements')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching achievements:', err)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  return {
    achievements,
    loading,
    error,
    refetch: fetchAchievements
  }
}

/**
 * Create course
 */
export function useCreateCourse() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const mutateAsync = async (courseData: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall('/api/learn/courses', {
        method: 'POST',
        body: JSON.stringify(courseData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create course')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    mutateAsync,
    loading,
    error
  }
}

/**
 * Create lesson
 */
export function useCreateLesson() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { apiCall } = useCompatibleAuth()

  const createLesson = async (courseId: string, lessonData: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/courses/${courseId}/lessons`, {
        method: 'POST',
        body: JSON.stringify(lessonData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create lesson')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    createLesson,
    loading,
    error
  }
}

/**
 * Create quiz
 */
export function useCreateQuiz() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuiz = async (lessonId: string, quizData: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/learn/lessons/${lessonId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create quiz')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    createQuiz,
    loading,
    error
  }
}

/**
 * Get certificate
 */
export function useCertificate(courseId: string) {
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCertificate = useCallback(async () => {
    if (!courseId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/learn/certificates/${courseId}`)
      
      if (response.status === 404) {
        setCertificate(null)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch certificate')
      }

      const data = await response.json()
      if (data.success) {
        setCertificate(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch certificate')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching certificate:', err)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  const generateCertificate = async () => {
    try {
      const response = await fetch(`/api/learn/certificates/${courseId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate certificate')
      }

      const data = await response.json()
      setCertificate(data.data)
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchCertificate()
  }, [fetchCertificate])

  return {
    certificate,
    loading,
    error,
    generateCertificate,
    refetch: fetchCertificate
  }
}


/**
 * Get course progress
 */
export function useCourseProgress(courseId: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { apiCall, isAuthenticated } = useCompatibleAuth()

  const fetchProgress = useCallback(async () => {
    if (!courseId || !isAuthenticated) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(`/api/learn/courses/${courseId}/progress`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Ошибка загрузки прогресса')
      }
    } catch (err) {
      console.error('Error fetching course progress:', err)
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [courseId, apiCall, isAuthenticated])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    data,
    loading,
    error,
    refetch: fetchProgress
  }
}