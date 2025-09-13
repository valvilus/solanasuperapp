/**
 * Unified Learn Service
 * Solana SuperApp - Learn-to-Earn Platform
 * 
 * This service combines all Learn functionality:
 * - Database operations (via API)
 * - Blockchain operations  
 * - User progress tracking
 * - Rewards management
 */

import { 
  Course,
  Lesson,
  Quiz,
  UserProgress,
  CourseFilters,
  ApiResponse,
  BlockchainCourse,
  BlockchainUserCourse,
  CreateCourseParams,
  SubmitAnswerParams,
  ClaimRewardParams,
  LearnError,
  LearnErrorCode,
  Certificate,
  DailyChallenge,
  Achievement,
  LeaderboardEntry
} from '@/types/learn.types'

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================

export class LearnService {
  private static instance: LearnService
  private authToken: string | null = null

  private constructor() {
    this.initializeAuth()
  }

  public static getInstance(): LearnService {
    if (!LearnService.instance) {
      LearnService.instance = new LearnService()
    }
    return LearnService.instance
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  private initializeAuth() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('solana_superapp_auth')
        if (stored) {
          const authData = JSON.parse(stored)
          if (authData.accessToken) {
            // Check if token is still valid
            const payload = JSON.parse(atob(authData.accessToken.split('.')[1]))
            const now = Math.floor(Date.now() / 1000)
            
            if (payload.exp > now) {
              this.authToken = authData.accessToken
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      }
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    
    return headers
  }

  private async handleApiResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Network error', 
        code: 'NETWORK_ERROR' 
      }))
      
      throw new LearnError(
        this.mapHttpStatusToErrorCode(response.status),
        errorData.error || `HTTP error! status: ${response.status}`,
        { status: response.status, ...errorData }
      )
    }

    const data: ApiResponse<T> = await response.json()
    
    if (!data.success) {
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        data.error || 'API returned unsuccessful response',
        data
      )
    }

    return data.data!
  }

  private mapHttpStatusToErrorCode(status: number): LearnErrorCode {
    switch (status) {
      case 404: return LearnErrorCode.NOT_FOUND
      case 401: return LearnErrorCode.UNAUTHORIZED
      case 400: return LearnErrorCode.VALIDATION_ERROR
      case 409: return LearnErrorCode.ALREADY_EXISTS
      case 429: return LearnErrorCode.LIMIT_EXCEEDED
      default: return LearnErrorCode.INTERNAL_ERROR
    }
  }

  // ============================================================================
  // COURSE OPERATIONS (UNIFIED WITH INTEGRATION LAYER)
  // ============================================================================

  async getCourses(filters: CourseFilters = {}): Promise<Course[]> {
    try {
      // Use integration service for unified data access
      const { learnIntegrationService } = await import('@/lib/integration/learn-integration.service')
      const allCourses = await learnIntegrationService.getAllCoursesUnified()
      
      // Apply filters
      let filteredCourses = allCourses

      if (filters.category && (filters as any).category !== 'all') {
        filteredCourses = filteredCourses.filter(course => 
          (course.category as any).toLowerCase() === String(filters.category).toLowerCase()
        )
      }

      if (filters.level && (filters as any).level !== 'all') {
        filteredCourses = filteredCourses.filter(course => 
          (course.level as any).toLowerCase() === String(filters.level).toLowerCase()
        )
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredCourses = filteredCourses.filter(course => 
          course.title.toLowerCase().includes(searchTerm) ||
          course.description.toLowerCase().includes(searchTerm)
        )
      }

      if (filters.showCompleted !== undefined) {
        filteredCourses = filteredCourses.filter(course => 
          course.isCompleted === filters.showCompleted
        )
      }

      if (filters.showEnrolled !== undefined) {
        filteredCourses = filteredCourses.filter(course => 
          course.isEnrolled === filters.showEnrolled
        )
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          filteredCourses.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          break
        case 'popular':
          filteredCourses.sort((a, b) => (b?.studentsCount || 0) - (a?.studentsCount || 0))
          break
        case 'rating':
          filteredCourses.sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
          break
        case 'duration':
          filteredCourses.sort((a, b) => a.duration - b.duration)
          break
        default:
          // Default to popular
          filteredCourses.sort((a, b) => (b?.studentsCount || 0) - (a?.studentsCount || 0))
      }

      // Apply pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 20
      
      return filteredCourses.slice(offset, offset + limit)

    } catch (error) {
      console.error('Error fetching unified courses:', error)
      throw error
    }
  }

  async getCourseById(courseId: string): Promise<Course> {
    try {
      // Use integration service for unified data access
      const { learnIntegrationService } = await import('@/lib/integration/learn-integration.service')
      const course = await learnIntegrationService.getCourseUnified(courseId)
      
      if (!course) {
        throw new LearnError(
          LearnErrorCode.NOT_FOUND,
          `Course not found: ${courseId}`
        )
      }
      
      return course
    } catch (error) {
      console.error('Error fetching unified course:', error)
      throw error
    }
  }

  async enrollInCourse(courseId: string): Promise<void> {
    try {
      const response = await fetch(`/api/learn/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      await this.handleApiResponse<void>(response)
    } catch (error) {
      console.error('Error enrolling in course:', error)
      throw error
    }
  }

  async completeCourse(courseId: string): Promise<{
    xpEarned: number
    tokensEarned: number
    certificateId?: string
  }> {
    try {
      const response = await fetch(`/api/learn/courses/${courseId}/complete`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error completing course:', error)
      throw error
    }
  }

  // ============================================================================
  // LESSON OPERATIONS  
  // ============================================================================

  async getLessonById(lessonId: string): Promise<Lesson> {
    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}`, {
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse<Lesson>(response)
    } catch (error) {
      console.error('Error fetching lesson:', error)
      throw error
    }
  }

  async startLesson(lessonId: string): Promise<void> {
    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      await this.handleApiResponse<void>(response)
    } catch (error) {
      console.error('Error starting lesson:', error)
      throw error
    }
  }

  async completeLesson(lessonId: string, timeSpent: number = 0, score?: number): Promise<{
    xpEarned: number
    tokensEarned: number
    achievements?: Achievement[]
  }> {
    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ timeSpent, score })
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error completing lesson:', error)
      throw error
    }
  }

  // ============================================================================
  // QUIZ OPERATIONS
  // ============================================================================

  async getQuizById(quizId: string): Promise<Quiz> {
    try {
      const response = await fetch(`/api/learn/quizzes/${quizId}`, {
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse<Quiz>(response)
    } catch (error) {
      console.error('Error fetching quiz:', error)
      throw error
    }
  }

  async startQuiz(quizId: string): Promise<{ attemptId: string }> {
    try {
      const response = await fetch(`/api/learn/quizzes/${quizId}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error starting quiz:', error)
      throw error
    }
  }

  async submitQuizAnswers(quizId: string, answers: any[], timeSpent: number): Promise<{
    score: number
    percentage: number
    isPassed: boolean
    xpEarned: number
    tokensEarned: number
  }> {
    try {
      const response = await fetch(`/api/learn/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ answers, timeSpent })
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error submitting quiz answers:', error)
      throw error
    }
  }

  // ============================================================================
  // USER PROGRESS & STATS
  // ============================================================================

  async getUserProfile(): Promise<UserProgress> {
    try {
      const response = await fetch('/api/learn/user/profile', {
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse<UserProgress>(response)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  async getUserCertificates(): Promise<Certificate[]> {
    try {
      const response = await fetch('/api/learn/user/certificates', {
        headers: this.getAuthHeaders()
      })

      const data = await this.handleApiResponse<{ certificates: Certificate[] }>(response)
      return data.certificates || []
    } catch (error) {
      console.error('Error fetching user certificates:', error)
      throw error
    }
  }

  async getUserAchievements(): Promise<Achievement[]> {
    try {
      const response = await fetch('/api/learn/user/achievements', {
        headers: this.getAuthHeaders()
      })

      const data = await this.handleApiResponse<{ achievements: Achievement[] }>(response)
      return data.achievements || []
    } catch (error) {
      console.error('Error fetching user achievements:', error)
      throw error
    }
  }

  async getDailyChallenges(): Promise<DailyChallenge[]> {
    try {
      const response = await fetch('/api/learn/user/challenges', {
        headers: this.getAuthHeaders()
      })

      const data = await this.handleApiResponse<{ challenges: DailyChallenge[] }>(response)
      return data.challenges || []
    } catch (error) {
      console.error('Error fetching daily challenges:', error)
      throw error
    }
  }

  async getLeaderboard(category?: string, timeframe?: string): Promise<LeaderboardEntry[]> {
    try {
      const queryParams = new URLSearchParams()
      if (category) queryParams.set('category', category)
      if (timeframe) queryParams.set('timeframe', timeframe)

      const response = await fetch(`/api/learn/leaderboard?${queryParams}`, {
        headers: this.getAuthHeaders()
      })

      const data = await this.handleApiResponse<{ leaderboard: LeaderboardEntry[] }>(response)
      return data.leaderboard || []
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      throw error
    }
  }

  // ============================================================================
  // BLOCKCHAIN INTEGRATION
  // ============================================================================

  async getBlockchainConfig(): Promise<any> {
    try {
      const response = await fetch('/api/learn-contract?action=config', {
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error fetching blockchain config:', error)
      throw new LearnError(LearnErrorCode.BLOCKCHAIN_ERROR, 'Failed to fetch blockchain config', error)
    }
  }

  async getBlockchainCourses(): Promise<BlockchainCourse[]> {
    try {
      const response = await fetch('/api/learn-contract?action=courses', {
        headers: this.getAuthHeaders()
      })

      const data = await this.handleApiResponse<{ courses: BlockchainCourse[] }>(response)
      return data.courses || []
    } catch (error) {
      console.error('Error fetching blockchain courses:', error)
      throw new LearnError(LearnErrorCode.BLOCKCHAIN_ERROR, 'Failed to fetch blockchain courses', error)
    }
  }

  async getBlockchainUserProgress(): Promise<{
    completedCourses: number
    totalRewardsClaimed: bigint
    userCourses: BlockchainUserCourse[]
  }> {
    try {
      const response = await fetch('/api/learn-contract?action=user-progress', {
        headers: this.getAuthHeaders()
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error fetching blockchain user progress:', error)
      throw new LearnError(LearnErrorCode.BLOCKCHAIN_ERROR, 'Failed to fetch blockchain user progress', error)
    }
  }

  async createBlockchainCourse(params: CreateCourseParams): Promise<{
    signature: string
    courseId: number
  }> {
    try {
      const response = await fetch('/api/learn-contract', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'create_course',
          ...params
        })
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error creating blockchain course:', error)
      throw new LearnError(LearnErrorCode.BLOCKCHAIN_ERROR, 'Failed to create blockchain course', error)
    }
  }

  async submitBlockchainAnswer(params: SubmitAnswerParams): Promise<{
    signature: string
    courseId: number
  }> {
    try {
      const response = await fetch('/api/learn-contract', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'submit_answer',
          ...params
        })
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error submitting blockchain answer:', error)
      throw new LearnError(LearnErrorCode.BLOCKCHAIN_ERROR, 'Failed to submit blockchain answer', error)
    }
  }

  async claimBlockchainReward(params: ClaimRewardParams): Promise<{
    signature: string
    courseId: number
  }> {
    try {
      const response = await fetch('/api/learn-contract', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'claim_reward',
          ...params
        })
      })

      return await this.handleApiResponse(response)
    } catch (error) {
      console.error('Error claiming blockchain reward:', error)
      throw new LearnError(LearnErrorCode.BLOCKCHAIN_ERROR, 'Failed to claim blockchain reward', error)
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  public updateAuthToken(token: string | null) {
    this.authToken = token
  }

  public clearError() {
    // Implementation for clearing errors in UI state management
  }

  public async refreshAllData(): Promise<{
    courses: Course[]
    userProgress: UserProgress
    certificates: Certificate[]
    achievements: Achievement[]
    challenges: DailyChallenge[]
  }> {
    try {
      const [courses, userProgress, certificates, achievements, challenges] = await Promise.all([
        this.getCourses(),
        this.getUserProfile(),
        this.getUserCertificates(),
        this.getUserAchievements(),
        this.getDailyChallenges()
      ])

      return {
        courses,
        userProgress,
        certificates,
        achievements,
        challenges
      }
    } catch (error) {
      console.error('Error refreshing all data:', error)
      throw error
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

export const learnService = LearnService.getInstance()
export default learnService
