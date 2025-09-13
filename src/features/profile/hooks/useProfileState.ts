'use client'

import { useState } from 'react'
import { ProfilePageState, ProfileTabType, ActivityType, NotificationState } from '../types'

const initialState: ProfilePageState = {
  selectedTab: 'overview',
  isEditing: false,
  showAchievements: false,
  showSettings: false,
  showActivity: false,
  filterActivity: 'all',
  sortActivity: 'newest',
  isLoading: false,
  notification: null
}

export function useProfileState() {
  const [state, setState] = useState<ProfilePageState>(initialState)

  const updateState = (updates: Partial<ProfilePageState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Individual setters
  const setSelectedTab = (tab: ProfileTabType) => updateState({ selectedTab: tab })
  const setIsEditing = (editing: boolean) => updateState({ isEditing: editing })
  const setShowAchievements = (show: boolean) => updateState({ showAchievements: show })
  const setShowSettings = (show: boolean) => updateState({ showSettings: show })
  const setShowActivity = (show: boolean) => updateState({ showActivity: show })
  const setFilterActivity = (filter: ActivityType | 'all') => updateState({ filterActivity: filter })
  const setSortActivity = (sort: 'newest' | 'oldest' | 'type') => updateState({ sortActivity: sort })
  const setIsLoading = (loading: boolean) => updateState({ isLoading: loading })
  const setNotification = (notification: NotificationState | null) => updateState({ notification })

  // Composed actions
  const openEditProfile = () => {
    setIsEditing(true)
    setSelectedTab('overview')
  }

  const closeEditProfile = () => {
    setIsEditing(false)
  }

  const openAchievements = () => {
    setShowAchievements(true)
    setSelectedTab('achievements')
  }

  const closeAchievements = () => {
    setShowAchievements(false)
  }

  const openSettings = () => {
    setShowSettings(true)
    setSelectedTab('settings')
  }

  const closeSettings = () => {
    setShowSettings(false)
  }

  const openActivity = () => {
    setShowActivity(true)
    setSelectedTab('activity')
  }

  const closeActivity = () => {
    setShowActivity(false)
  }

  const toggleTab = (tab: ProfileTabType) => {
    setSelectedTab(tab)
    
    // Автоматически устанавливаем соответствующие флаги
    switch (tab) {
      case 'overview':
        setShowAchievements(false)
        setShowSettings(false)
        setShowActivity(false)
        break
      case 'achievements':
        setShowAchievements(true)
        setShowSettings(false)
        setShowActivity(false)
        break
      case 'activity':
        setShowActivity(true)
        setShowAchievements(false)
        setShowSettings(false)
        break
      case 'settings':
        setShowSettings(true)
        setShowAchievements(false)
        setShowActivity(false)
        break
    }
  }

  // Notification helpers
  const showSuccessNotification = (message: string) => {
    setNotification({ type: 'success', message })
    setTimeout(() => setNotification(null), 3000)
  }

  const showErrorNotification = (message: string) => {
    setNotification({ type: 'error', message })
    setTimeout(() => setNotification(null), 5000)
  }

  const showInfoNotification = (message: string) => {
    setNotification({ type: 'info', message })
    setTimeout(() => setNotification(null), 3000)
  }

  const showWarningNotification = (message: string) => {
    setNotification({ type: 'warning', message })
    setTimeout(() => setNotification(null), 4000)
  }

  return {
    state,
    
    // Individual setters
    setSelectedTab,
    setIsEditing,
    setShowAchievements,
    setShowSettings,
    setShowActivity,
    setFilterActivity,
    setSortActivity,
    setIsLoading,
    setNotification,
    
    // Composed actions
    openEditProfile,
    closeEditProfile,
    openAchievements,
    closeAchievements,
    openSettings,
    closeSettings,
    openActivity,
    closeActivity,
    toggleTab,
    
    // Notification helpers
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification
  }
}



















































