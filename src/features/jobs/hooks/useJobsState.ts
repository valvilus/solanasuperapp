'use client'

import { useState, useCallback } from 'react'
import type { 
  JobsPageState, 
  JobsTabType, 
  JobFilters, 
  Job, 
  JobNotification 
} from '../types/jobs.types'
import { DEFAULT_FILTERS } from '../data/constants'

// Начальное состояние
const initialState: JobsPageState = {
  activeTab: 'all',
  selectedJob: null,
  isCreateModalOpen: false,
  isApplicationModalOpen: false,
  filters: DEFAULT_FILTERS,
  searchQuery: '',
  isLoading: false,
  showJobDetails: false,
  showCreateJob: false,
  showApplication: false,
  notification: null
}

export function useJobsState() {
  const [state, setState] = useState<JobsPageState>(initialState)

  // Базовые действия со состоянием
  const setActiveTab = useCallback((tab: JobsTabType) => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])

  const setSelectedJob = useCallback((job: Job | null) => {
    setState(prev => ({ ...prev, selectedJob: job }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const setFilters = useCallback((filters: Partial<JobFilters>) => {
    setState(prev => ({ 
      ...prev, 
      filters: { ...prev.filters, ...filters }
    }))
  }, [])

  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  // Модальные окна
  const openCreateJobModal = useCallback(() => {
    setState(prev => ({ ...prev, showCreateJob: true }))
  }, [])

  const closeCreateJobModal = useCallback(() => {
    setState(prev => ({ ...prev, showCreateJob: false }))
  }, [])

  const openJobDetailsModal = useCallback((job: Job) => {
    setState(prev => ({ 
      ...prev, 
      selectedJob: job,
      showJobDetails: true 
    }))
  }, [])

  const closeJobDetailsModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showJobDetails: false,
      selectedJob: null 
    }))
  }, [])

  const openApplicationModal = useCallback((job: Job) => {
    setState(prev => ({ 
      ...prev, 
      selectedJob: job,
      showApplication: true 
    }))
  }, [])

  const closeApplicationModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showApplication: false,
      selectedJob: null 
    }))
  }, [])

  // Уведомления
  const showNotification = useCallback((notification: JobNotification) => {
    setState(prev => ({ ...prev, notification }))
    
    // Автоматически скрывать через 3 секунды
    setTimeout(() => {
      setState(prev => ({ ...prev, notification: null }))
    }, notification.duration || 3000)
  }, [])

  const showSuccessNotification = useCallback((message: string) => {
    showNotification({ type: 'success', message })
  }, [showNotification])

  const showErrorNotification = useCallback((message: string) => {
    showNotification({ type: 'error', message })
  }, [showNotification])

  const showInfoNotification = useCallback((message: string) => {
    showNotification({ type: 'info', message })
  }, [showNotification])

  const showWarningNotification = useCallback((message: string) => {
    showNotification({ type: 'warning', message })
  }, [showNotification])

  const hideNotification = useCallback(() => {
    setState(prev => ({ ...prev, notification: null }))
  }, [])

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: DEFAULT_FILTERS }))
  }, [])

  // Очистка поиска
  const clearSearch = useCallback(() => {
    setState(prev => ({ ...prev, searchQuery: '' }))
  }, [])

  // Сброс всего состояния
  const resetState = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    state,
    
    // Основные действия
    setActiveTab,
    setSelectedJob,
    setSearchQuery,
    setFilters,
    setIsLoading,
    
    // Модальные окна
    openCreateJobModal,
    closeCreateJobModal,
    openJobDetailsModal,
    closeJobDetailsModal,
    openApplicationModal,
    closeApplicationModal,
    
    // Уведомления
    showNotification,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification,
    hideNotification,
    
    // Утилиты
    resetFilters,
    clearSearch,
    resetState
  }
}

