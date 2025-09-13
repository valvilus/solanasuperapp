/**
 * Jobs Service - API интеграция для работы с вакансиями
 * Solana SuperApp - Jobs System
 */

import type { 
  Job, 
  JobApplication, 
  JobsStats, 
  JobFilters,
  CreateJobForm,
  ApplicationForm 
} from '../types/jobs.types'

export class JobsService {
  private static instance: JobsService
  private static externalApiCall: ((url: string, options?: RequestInit) => Promise<Response>) | null = null
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 минут

  static getInstance(): JobsService {
    if (!JobsService.instance) {
      JobsService.instance = new JobsService()
    }
    return JobsService.instance
  }

  /**
   * Позволяет внедрить внешнюю функцию apiCall из AuthContext для корректной аутентификации
   */
  static configure(params: { apiCall?: (url: string, options?: RequestInit) => Promise<Response> }) {
    if (params.apiCall) {
      JobsService.externalApiCall = params.apiCall
    }
  }

  private constructor() {}

  /**
   * Проверяет валидность кеша
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < this.CACHE_TTL
  }

  /**
   * Получает данные из кеша
   */
  private getFromCache<T>(key: string): T | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)!.data as T
    }
    return null
  }

  /**
   * Сохраняет данные в кеш
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Очищает кеш
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Загрузка файла портфолио (изображение/pdf)
   */
  async uploadPortfolioFile(file: File): Promise<{ url: string; cid?: string }> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await this.apiCall('/api/jobs/portfolio/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to upload portfolio file`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload portfolio file')
      }

      return data.data
    } catch (error) {
      console.error(' Portfolio upload error:', error)
      throw error
    }
  }

  /**
   * Выполняет API запрос с авторизацией
   */
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Если передана внешняя реализация apiCall, используем её (добавляет JWT/refresh)
    if (JobsService.externalApiCall) {
      return JobsService.externalApiCall(endpoint, options)
    }
    // Получаем токен авторизации из контекста или localStorage
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('auth_token') 
      : null

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return fetch(endpoint, {
      ...options,
      headers
    })
  }

  /**
   * Получает список работ с фильтрацией
   */
  async getJobs(filters?: Partial<JobFilters>, useCache = true): Promise<Job[]> {
    const cacheKey = `jobs_${JSON.stringify(filters || {})}`
    
    if (useCache) {
      const cached = this.getFromCache<Job[]>(cacheKey)
      if (cached) return cached
    }

    try {
      const params = new URLSearchParams()
      if (filters?.search) params.set('search', filters.search)
      if (filters?.category && filters.category !== 'all') params.set('category', filters.category)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.paymentType) params.set('paymentType', filters.paymentType)
      if (filters?.minBudget) params.set('minBudget', filters.minBudget.toString())
      if (filters?.maxBudget) params.set('maxBudget', filters.maxBudget.toString())

      const response = await this.apiCall(`/api/jobs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch jobs`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch jobs')
      }

      const jobs = this.transformJobsFromAPI(data.data)
      this.setCache(cacheKey, jobs)
      return jobs

    } catch (error) {
      console.error(' Error fetching jobs:', error)
      throw error
    }
  }

  /**
   * Получает расширенный поиск работ
   */
  async searchJobs(
    query: string, 
    filters?: Partial<JobFilters>,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 20,
    offset = 0
  ): Promise<{ jobs: Job[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        q: query,
        sortBy,
        sortOrder,
        limit: limit.toString(),
        offset: offset.toString()
      })

      if (filters?.category && filters.category !== 'all') params.set('category', filters.category)
      if (filters?.paymentType) params.set('paymentType', filters.paymentType)
      if (filters?.minBudget) params.set('minBudget', filters.minBudget.toString())
      if (filters?.maxBudget) params.set('maxBudget', filters.maxBudget.toString())
      if (filters?.skills?.length) params.set('skills', filters.skills.join(','))

      const response = await this.apiCall(`/api/jobs/search?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to search jobs`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to search jobs')
      }

      return {
        jobs: this.transformJobsFromAPI(data.data.jobs),
        pagination: data.data.pagination
      }

    } catch (error) {
      console.error(' Error searching jobs:', error)
      throw error
    }
  }

  /**
   * Получает детали конкретной работы
   */
  async getJobById(jobId: string): Promise<Job> {
    const cacheKey = `job_${jobId}`
    
    const cached = this.getFromCache<Job>(cacheKey)
    if (cached) return cached

    try {
      const response = await this.apiCall(`/api/jobs/${jobId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch job`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch job')
      }

      const job = this.transformJobFromAPI(data.data)
      this.setCache(cacheKey, job)
      return job

    } catch (error) {
      console.error(' Error fetching job:', error)
      throw error
    }
  }

  /**
   * Создает новую работу
   */
  async createJob(jobData: CreateJobForm): Promise<{ jobId: string; job: Job }> {
    try {
      const response = await this.apiCall('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to create job`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to create job')
      }

      // Очищаем кеш после создания
      this.clearCache()

      return data.data

    } catch (error) {
      console.error(' Error creating job:', error)
      throw error
    }
  }

  /**
   * Обновляет работу
   */
  async updateJob(jobId: string, jobData: Partial<CreateJobForm>): Promise<void> {
    try {
      const response = await this.apiCall(`/api/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify(jobData)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to update job`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to update job')
      }

      // Очищаем кеш после обновления
      this.clearCache()

    } catch (error) {
      console.error(' Error updating job:', error)
      throw error
    }
  }

  /**
   * Удаляет работу
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      const response = await this.apiCall(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to delete job`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete job')
      }

      // Очищаем кеш после удаления
      this.clearCache()

    } catch (error) {
      console.error(' Error deleting job:', error)
      throw error
    }
  }

  /**
   * Подает заявку на работу
   */
  async applyToJob(jobId: string, applicationData: ApplicationForm): Promise<{ applicationId: string }> {
    try {
      const response = await this.apiCall('/api/jobs/apply', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          coverLetter: applicationData.coverLetter,
          proposedRate: applicationData.proposedBudget,
          estimatedTime: applicationData.proposedTimeline,
          portfolio: applicationData.portfolioLinks
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to apply to job`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to apply to job')
      }

      return data.data

    } catch (error) {
      console.error(' Error applying to job:', error)
      throw error
    }
  }

  /**
   * Получает заявки пользователя
   */
  async getUserApplications(status?: string): Promise<JobApplication[]> {
    const cacheKey = `applications_${status || 'all'}`
    
    const cached = this.getFromCache<JobApplication[]>(cacheKey)
    if (cached) return cached

    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)

      const response = await this.apiCall(`/api/jobs/applications?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch applications`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch applications')
      }

      const applications = this.transformApplicationsFromAPI(data.data.applications)
      this.setCache(cacheKey, applications)
      return applications

    } catch (error) {
      console.error(' Error fetching applications:', error)
      throw error
    }
  }

  /**
   * Получает статистику платформы
   */
  async getJobsStats(): Promise<JobsStats> {
    const cacheKey = 'jobs_stats'
    
    const cached = this.getFromCache<JobsStats>(cacheKey)
    if (cached) return cached

    try {
      const response = await this.apiCall('/api/jobs/stats')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch stats`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stats')
      }

      const stats: JobsStats = {
        totalJobs: data.data.totalJobs,
        activeJobs: data.data.activeJobs,
        completedJobs: data.data.completedJobs,
        totalBudget: data.data.totalBudget,
        averageJobValue: data.data.averageJobValue,
        totalFreelancers: data.data.totalFreelancers,
        successRate: data.data.successRate,
        averageCompletionTime: data.data.averageCompletionTime
      }

      this.setCache(cacheKey, stats)
      return stats

    } catch (error) {
      console.error(' Error fetching stats:', error)
      throw error
    }
  }

  // =========================
  // Escrow API
  // =========================

  async createEscrow(params: { jobId: string; freelancerId: string; amount: number; token?: 'SOL' | 'USDC' | 'TNG'; terms?: string; milestones?: any[] }): Promise<{ escrowId: string }> {
    try {
      const response = await this.apiCall('/api/jobs/escrow', {
        method: 'POST',
        body: JSON.stringify({
          jobId: params.jobId,
          freelancerId: params.freelancerId,
          amount: params.amount,
          token: params.token || 'USDC',
          terms: params.terms,
          milestones: params.milestones
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to create escrow')
      return data.data
    } catch (error) {
      console.error(' Escrow create error:', error)
      throw error
    }
  }

  async fundEscrow(escrowId: string): Promise<void> {
    const response = await this.apiCall(`/api/jobs/escrow/${escrowId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'fund' })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to fund escrow')
  }

  async releaseEscrow(escrowId: string, releaseAmount?: number): Promise<void> {
    const response = await this.apiCall(`/api/jobs/escrow/${escrowId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'release', releaseAmount })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to release escrow')
  }

  async cancelEscrow(escrowId: string): Promise<void> {
    const response = await this.apiCall(`/api/jobs/escrow/${escrowId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel' })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to cancel escrow')
  }

  async listEscrows(params?: { role?: 'employer' | 'freelancer' | 'all'; status?: string }): Promise<any[]> {
    const query = new URLSearchParams()
    if (params?.role) query.set('role', params.role)
    if (params?.status) query.set('status', params.status)
    const response = await this.apiCall(`/api/jobs/escrow?${query.toString()}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Failed to load escrows')
    return data.data
  }

  /**
   * Получает категории работ
   */
  async getJobCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    const cacheKey = 'job_categories'
    
    const cached = this.getFromCache<Array<{ id: string; name: string; count: number }>>(cacheKey)
    if (cached) return cached

    try {
      const response = await this.apiCall('/api/jobs/categories')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch categories`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch categories')
      }

      this.setCache(cacheKey, data.data.categories)
      return data.data.categories

    } catch (error) {
      console.error(' Error fetching categories:', error)
      throw error
    }
  }

  /**
   * Трансформирует данные работ из API формата в клиентский
   */
  private transformJobsFromAPI(apiJobs: any[]): Job[] {
    return apiJobs.map(job => this.transformJobFromAPI(job))
  }

  /**
   * Трансформирует данные работы из API формата в клиентский
   */
  private transformJobFromAPI(apiJob: any): Job {
    return {
      id: apiJob.id,
      title: apiJob.title,
      description: apiJob.description,
      type: this.getJobTypeFromCategory(apiJob.category) as any,
      status: apiJob.status.toLowerCase(),
      employer: apiJob.employer?.name || apiJob.employer?.username || 'Анонимный работодатель',
      employerAvatar: this.getEmployerAvatar(apiJob.employer?.name),
      employerRating: 4.5, // TODO: получать из API
      paymentType: apiJob.paymentType.toLowerCase(),
      budget: apiJob.paymentAmount || apiJob.budget,
      currency: apiJob.paymentToken || apiJob.currency,
      experienceLevel: 'middle', // TODO: добавить в API
      skills: apiJob.skills || [],
      requirements: apiJob.requirements || [],
      deadline: apiJob.updatedAt, // TODO: добавить поле deadline в API
      estimatedHours: 160, // TODO: вычислять из estimatedTime
      createdAt: apiJob.createdAt,
      updatedAt: apiJob.updatedAt,
      isRemote: true, // TODO: добавить в API
      timezone: 'UTC+6',
      applicationsCount: apiJob.applicationsCount || 0,
      viewsCount: 0, // TODO: добавить в API
      category: this.getCategoryLabel(apiJob.category),
      tags: apiJob.skills?.slice(0, 4) || [],
      isUrgent: false, // TODO: добавить в API
      isFeatured: false, // TODO: добавить в API
      milestonesCount: 1
    }
  }

  /**
   * Трансформирует данные заявок из API формата в клиентский
   */
  private transformApplicationsFromAPI(apiApplications: any[]): JobApplication[] {
    return apiApplications.map(app => ({
      id: app.id,
      jobId: app.job.id,
      applicant: app.applicant?.name || 'Анонимный соискатель',
      applicantAvatar: '‍',
      applicantRating: 4.5,
      status: app.status.toLowerCase(),
      coverLetter: app.coverLetter,
      proposedBudget: app.proposedRate || 0,
      proposedTimeline: app.estimatedTime || 'Не указано',
      portfolioLinks: app.portfolio || [],
      createdAt: app.createdAt,
      estimatedHours: 160
    }))
  }

  /**
   * Получает тип работы из категории
   */
  private getJobTypeFromCategory(category: string): string {
    const typeMap: Record<string, string> = {
      'FRONTEND_DEVELOPMENT': 'development',
      'BACKEND_DEVELOPMENT': 'development',
      'BLOCKCHAIN_DEVELOPMENT': 'development',
      'MOBILE_DEVELOPMENT': 'development',
      'SMART_CONTRACTS': 'development',
      'UI_UX_DESIGN': 'design',
      'MARKETING': 'marketing',
      'CONTENT_WRITING': 'writing',
      'TRANSLATION': 'writing',
      'COMMUNITY_MANAGEMENT': 'marketing',
      'PROJECT_MANAGEMENT': 'management',
      'CONSULTING': 'consulting',
      'AUDIT': 'security'
    }
    return typeMap[category] || 'other'
  }

  /**
   * Получает аватар работодателя
   */
  private getEmployerAvatar(employerName?: string): string {
    if (!employerName) return ''
    
    const avatarMap: Record<string, string> = {
      'Superteam Kazakhstan': '',
      'Solana Almaty Hub': '',
      'Qazaq DeFi': '',
      'Astana Web3 Studio': '',
      'Tengri Labs': ''
    }
    
    return avatarMap[employerName] || ''
  }

  /**
   * Получает человеко-читаемое название категории
   */
  private getCategoryLabel(category: string): string {
    const labelMap: Record<string, string> = {
      'BLOCKCHAIN_DEVELOPMENT': 'Blockchain разработка',
      'FRONTEND_DEVELOPMENT': 'Frontend разработка',
      'BACKEND_DEVELOPMENT': 'Backend разработка',
      'MOBILE_DEVELOPMENT': 'Мобильная разработка',
      'UI_UX_DESIGN': 'UI/UX дизайн',
      'SMART_CONTRACTS': 'Смарт-контракты',
      'DEFI': 'DeFi проекты',
      'NFT': 'NFT проекты',
      'MARKETING': 'Маркетинг',
      'CONTENT_WRITING': 'Копирайтинг',
      'TRANSLATION': 'Переводы',
      'COMMUNITY_MANAGEMENT': 'Управление сообществом',
      'PROJECT_MANAGEMENT': 'Проект-менеджмент',
      'CONSULTING': 'Консалтинг',
      'AUDIT': 'Аудит',
      'OTHER': 'Другое'
    }
    return labelMap[category] || category
  }
}
