'use client'

import { useState, useCallback } from 'react'
import { DeFiPageState, DeFiTabType, TimeframeType, ChartType, Token, NotificationState } from '../types'

const initialState: DeFiPageState = {
  activeTab: 'portfolio',
  selectedToken: null,
  selectedTimeframe: '24H',
  chartType: 'area',
  showPortfolioDetails: false,
  swapSettings: {
    slippage: 0.5,
    autoRefresh: true,
    soundEnabled: true
  },
  isLoading: false,
  notification: null
}

export function useDeFiState() {
  const [state, setState] = useState<DeFiPageState>(initialState)

  const updateState = useCallback((updates: Partial<DeFiPageState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Tab Management
  const setActiveTab = useCallback((tab: DeFiTabType) => {
    updateState({ activeTab: tab })
  }, [updateState])

  // Token Selection
  const setSelectedToken = useCallback((token: Token | null) => {
    updateState({ selectedToken: token })
  }, [updateState])

  // Chart Controls
  const setSelectedTimeframe = useCallback((timeframe: TimeframeType) => {
    updateState({ selectedTimeframe: timeframe })
  }, [updateState])

  const setChartType = useCallback((chartType: ChartType) => {
    updateState({ chartType })
  }, [updateState])

  // Portfolio Controls
  const togglePortfolioDetails = useCallback(() => {
    updateState({ showPortfolioDetails: !state.showPortfolioDetails })
  }, [updateState, state.showPortfolioDetails])

  // Swap Settings
  const updateSwapSettings = useCallback((settings: Partial<typeof state.swapSettings>) => {
    updateState({ 
      swapSettings: { ...state.swapSettings, ...settings }
    })
  }, [updateState, state.swapSettings])

  const setSlippage = useCallback((slippage: number) => {
    updateSwapSettings({ slippage })
  }, [updateSwapSettings])

  const toggleAutoRefresh = useCallback(() => {
    updateSwapSettings({ autoRefresh: !state.swapSettings.autoRefresh })
  }, [updateSwapSettings, state.swapSettings.autoRefresh])

  const toggleSound = useCallback(() => {
    updateSwapSettings({ soundEnabled: !state.swapSettings.soundEnabled })
  }, [updateSwapSettings, state.swapSettings.soundEnabled])

  // Loading State
  const setIsLoading = useCallback((loading: boolean) => {
    updateState({ isLoading: loading })
  }, [updateState])

  // Notifications
  const setNotification = useCallback((notification: NotificationState | null) => {
    updateState({ notification })
  }, [updateState])

  const showSuccessNotification = useCallback((message: string, action?: NotificationState['action']) => {
    setNotification({ type: 'success', message, action })
    setTimeout(() => setNotification(null), 4000)
  }, [setNotification])

  const showErrorNotification = useCallback((message: string, action?: NotificationState['action']) => {
    setNotification({ type: 'error', message, action })
    setTimeout(() => setNotification(null), 6000)
  }, [setNotification])

  const showInfoNotification = useCallback((message: string, action?: NotificationState['action']) => {
    setNotification({ type: 'info', message, action })
    setTimeout(() => setNotification(null), 4000)
  }, [setNotification])

  const showWarningNotification = useCallback((message: string, action?: NotificationState['action']) => {
    setNotification({ type: 'warning', message, action })
    setTimeout(() => setNotification(null), 5000)
  }, [setNotification])

  // Combined Actions
  const selectTokenAndSwitchToChart = useCallback((token: Token) => {
    setSelectedToken(token)
    setActiveTab('analytics')
  }, [setSelectedToken, setActiveTab])

  const resetToDefaults = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    state,
    
    // Tab Management
    setActiveTab,
    
    // Token Selection
    setSelectedToken,
    selectTokenAndSwitchToChart,
    
    // Chart Controls  
    setSelectedTimeframe,
    setChartType,
    
    // Portfolio
    togglePortfolioDetails,
    
    // Swap Settings
    updateSwapSettings,
    setSlippage,
    toggleAutoRefresh,
    toggleSound,
    
    // Loading
    setIsLoading,
    
    // Notifications
    setNotification,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification,
    
    // Utils
    resetToDefaults
  }
}



















































