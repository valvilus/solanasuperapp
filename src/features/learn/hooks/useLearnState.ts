'use client'

import { useState } from 'react'
import { 
  LearnPageState, 
  LearnTabType, 
  CourseCategory, 
  CourseLevel, 
  Course,
  Quiz,
  LearnNotification 
} from '../types'

const initialState: LearnPageState = {
  selectedCategory: 'all',
  selectedLevel: 'all',
  searchQuery: '',
  sortBy: 'popular',
  currentTab: 'explore',
  
  isLoading: false,
  showFilters: false,
  showSearch: false,
  showMyProgress: false,
  
  selectedCourse: undefined,
  showCourseDetails: false,
  showQuizModal: false,
  currentQuiz: undefined,
  
  notification: null
}

export function useLearnState() {
  const [state, setState] = useState<LearnPageState>(initialState)

  const updateState = (updates: Partial<LearnPageState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Individual setters
  const setSelectedCategory = (category: CourseCategory | 'all') => updateState({ selectedCategory: category })
  const setSelectedLevel = (level: CourseLevel | 'all') => updateState({ selectedLevel: level })
  const setSearchQuery = (query: string) => updateState({ searchQuery: query })
  const setSortBy = (sort: 'newest' | 'popular' | 'rating' | 'duration') => updateState({ sortBy: sort })
  const setCurrentTab = (tab: LearnTabType) => updateState({ currentTab: tab })
  const setIsLoading = (loading: boolean) => updateState({ isLoading: loading })
  const setNotification = (notification: LearnNotification | null) => updateState({ notification })

  // UI state setters
  const setShowFilters = (show: boolean) => updateState({ showFilters: show })
  const setShowSearch = (show: boolean) => updateState({ showSearch: show })
  const setShowMyProgress = (show: boolean) => updateState({ showMyProgress: show })
  const setShowCourseDetails = (show: boolean) => updateState({ showCourseDetails: show })
  const setShowQuizModal = (show: boolean) => updateState({ showQuizModal: show })

  // Complex setters
  const setSelectedCourse = (course: Course | undefined) => {
    updateState({ 
      selectedCourse: course,
      showCourseDetails: !!course 
    })
  }

  const setCurrentQuiz = (quiz: Quiz | undefined) => {
    updateState({ 
      currentQuiz: quiz,
      showQuizModal: !!quiz 
    })
  }

  // Tab management
  const switchTab = (tab: LearnTabType) => {
    setCurrentTab(tab)
    
    // Reset related states when switching tabs
    switch (tab) {
      case 'explore':
        setSelectedCourse(undefined)
        setShowFilters(false)
        break
      case 'my_courses':
        setShowSearch(false)
        break
      case 'certificates':
        setShowFilters(false)
        setShowSearch(false)
        break
      case 'leaderboard':
        setShowFilters(false)
        setShowSearch(false)
        break
    }
  }

  // Search and filter management
  const toggleFilters = () => {
    setShowFilters(!state.showFilters)
    if (!state.showFilters) {
      setShowSearch(false) // Close search when opening filters
    }
  }

  const toggleSearch = () => {
    setShowSearch(!state.showSearch)
    if (!state.showSearch) {
      setShowFilters(false) // Close filters when opening search
    }
  }

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedLevel('all')
    setSearchQuery('')
    setSortBy('popular')
  }

  const applyQuickFilter = (category: CourseCategory) => {
    setSelectedCategory(category)
    setShowFilters(false)
    if (state.currentTab !== 'explore') {
      setCurrentTab('explore')
    }
  }

  // Course management
  const openCourseDetails = (course: Course) => {
    setSelectedCourse(course)
    setShowCourseDetails(true)
  }

  const closeCourseDetails = () => {
    setSelectedCourse(undefined)
    setShowCourseDetails(false)
  }

  // Quiz management
  const openQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz)
    setShowQuizModal(true)
  }

  const closeQuiz = () => {
    setCurrentQuiz(undefined)
    setShowQuizModal(false)
  }

  // Notification helpers
  const showSuccessNotification = (message: string, action?: { label: string; handler: () => void }) => {
    setNotification({ type: 'success', message, action })
    setTimeout(() => setNotification(null), 4000)
  }

  const showErrorNotification = (message: string, action?: { label: string; handler: () => void }) => {
    setNotification({ type: 'error', message, action })
    setTimeout(() => setNotification(null), 6000)
  }

  const showInfoNotification = (message: string, action?: { label: string; handler: () => void }) => {
    setNotification({ type: 'info', message, action })
    setTimeout(() => setNotification(null), 4000)
  }

  const showWarningNotification = (message: string, action?: { label: string; handler: () => void }) => {
    setNotification({ type: 'warning', message, action })
    setTimeout(() => setNotification(null), 5000)
  }

  // Progress management
  const toggleMyProgress = () => {
    setShowMyProgress(!state.showMyProgress)
  }

  // Search helpers
  const performSearch = (query: string) => {
    setSearchQuery(query)
    if (state.currentTab !== 'explore') {
      setCurrentTab('explore')
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setShowSearch(false)
  }

    return {
    state,
    updateState,
    
    // Individual setters
    setSelectedCategory,
    setSelectedLevel,
    setSearchQuery,
    setSortBy,
    setCurrentTab,
    setIsLoading,
    setNotification,
    
    // UI state setters
    setShowFilters,
    setShowSearch,
    setShowMyProgress,
    setShowCourseDetails,
    setShowQuizModal,
    
    // Complex setters
    setSelectedCourse,
    setCurrentQuiz,
    
    // Tab management
    switchTab,
    
    // Search and filter management
    toggleFilters,
    toggleSearch,
    clearFilters,
    applyQuickFilter,
    
    // Course management
    openCourseDetails,
    closeCourseDetails,
    
    // Quiz management
    openQuiz,
    closeQuiz,
    
    // Notification helpers
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification,
    
    // Progress management
    toggleMyProgress,
    
    // Search helpers
    performSearch,
    clearSearch
  }
}



























