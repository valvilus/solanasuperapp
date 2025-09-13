/**
 * Jobs Data Hook - Управление данными работ через API
 * Solana SuperApp - Jobs System
 */

import { useState, useEffect, useCallback } from 'react'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { JobsService } from '../services/jobs.service'
import type { Job, JobsStats, JobFilters } from '../types/jobs.types'

interface UseJobsDataState {
  jobs: Job[]
  stats: JobsStats | null
  categories: Array<{ id: string; name: string; count: number }>
  loading: boolean
  error: string | null
}

interface UseJobsDataActions {
  loadJobs: (filters?: Partial<JobFilters>, forceRefresh?: boolean) => Promise<void>
  loadStats: (forceRefresh?: boolean) => Promise<void>
  loadCategories: (forceRefresh?: boolean) => Promise<void>
  searchJobs: (query: string, filters?: Partial<JobFilters>) => Promise<Job[]>
  refreshAll: () => Promise<void>
  clearError: () => void
}

export function useJobsData(): UseJobsDataState & UseJobsDataActions {
  const { isAuthenticated } = useCompatibleAuth()
  const jobsService = JobsService.getInstance()

  const [state, setState] = useState<UseJobsDataState>({
    jobs: [],
    stats: null,
    categories: [],
    loading: false,
    error: null
  })

  /**
   * Загружает список работ
   */
  const loadJobs = useCallback(async (
    filters?: Partial<JobFilters>, 
    forceRefresh = false
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const jobs = await jobsService.getJobs(filters, !forceRefresh)
      setState(prev => ({
        ...prev,
        jobs,
        loading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки работ'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [jobsService])

  /**
   * Загружает статистику
   */
  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        jobsService.clearCache()
      }
      
      const stats = await jobsService.getJobsStats()
      setState(prev => ({
        ...prev,
        stats
      }))
    } catch (error) {
      console.error(' Error loading stats:', error)
      // Не показываем ошибку для статистики, используем fallback
      setState(prev => ({
        ...prev,
        stats: {
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          totalBudget: 0,
          averageJobValue: 0,
          totalFreelancers: 0,
          successRate: 0,
          averageCompletionTime: 0
        }
      }))
    }
  }, [jobsService])

  /**
   * Загружает категории
   */
  const loadCategories = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        jobsService.clearCache()
      }
      
      const categories = await jobsService.getJobCategories()
      setState(prev => ({
        ...prev,
        categories
      }))
    } catch (error) {
      console.error(' Error loading categories:', error)
      // Используем fallback категории
      setState(prev => ({
        ...prev,
        categories: [
          { id: 'BLOCKCHAIN_DEVELOPMENT', name: 'Blockchain разработка', count: 0 },
          { id: 'FRONTEND_DEVELOPMENT', name: 'Frontend разработка', count: 0 },
          { id: 'UI_UX_DESIGN', name: 'UI/UX дизайн', count: 0 },
          { id: 'SMART_CONTRACTS', name: 'Смарт-контракты', count: 0 }
        ]
      }))
    }
  }, [jobsService])

  /**
   * Поиск работ
   */
  const searchJobs = useCallback(async (
    query: string, 
    filters?: Partial<JobFilters>
  ): Promise<Job[]> => {
    try {
      const result = await jobsService.searchJobs(query, filters)
      return result.jobs
    } catch (error) {
      console.error(' Error searching jobs:', error)
      throw error
    }
  }, [jobsService])

  /**
   * Обновляет все данные
   */
  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await Promise.all([
        loadJobs({}, true),
        loadStats(true),
        loadCategories(true)
      ])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления данных'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [loadJobs, loadStats, loadCategories])

  /**
   * Очищает ошибку
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Инициализация при монтировании
   */
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadJobs(),
        loadStats(),
        loadCategories()
      ])
    }

    initialize()
  }, []) // Зависимости убираны намеренно для однократной инициализации

  return {
    ...state,
    loadJobs,
    loadStats,
    loadCategories,
    searchJobs,
    refreshAll,
    clearError
  }
}
