'use client'

import { useState, useCallback } from 'react'
import { NFTPageState, TabType, ViewMode, FilterType, SortBy, SortOrder, MyNFT, MarketplaceNFT, NotificationState } from '../types'
import { INITIAL_DISPLAY_COUNT } from '../data'

const initialState: NFTPageState = {
  isNFTVisible: true,
  activeTab: 'MY_NFTS',
  viewMode: 'GRID',
  searchQuery: '',
  selectedFilter: 'ALL',
  selectedNFT: null,
  sortBy: 'DATE',
  sortOrder: 'DESC',
  showPortfolioDetails: false,
  showFilterPanel: false,
  isLoading: false,
  notification: null,
  displayedNFTs: INITIAL_DISPLAY_COUNT,
  hasMoreNFTs: true,
  isLoadingMore: false
}

export function useNFTState() {
  const [state, setState] = useState<NFTPageState>(initialState)

  const updateState = useCallback((updates: Partial<NFTPageState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Specific updaters with useCallback to prevent recreations
  const setActiveTab = useCallback((tab: TabType) => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])
  
  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }))
  }, [])
  
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])
  
  const setSelectedFilter = useCallback((filter: FilterType) => {
    setState(prev => ({ ...prev, selectedFilter: filter }))
  }, [])
  
  const setSelectedNFT = useCallback((nft: MyNFT | MarketplaceNFT | null) => {
    setState(prev => ({ ...prev, selectedNFT: nft }))
  }, [])
  
  const setSortBy = useCallback((sortBy: SortBy) => {
    setState(prev => ({ ...prev, sortBy }))
  }, [])
  
  const setSortOrder = useCallback((order: SortOrder) => {
    setState(prev => ({ ...prev, sortOrder: order }))
  }, [])
  
  const toggleSortOrder = useCallback(() => {
    setState(prev => ({ ...prev, sortOrder: prev.sortOrder === 'ASC' ? 'DESC' : 'ASC' } as any))
  }, [])
  
  const toggleNFTVisibility = useCallback(() => {
    setState(prev => ({ ...prev, isNFTVisible: !prev.isNFTVisible }))
  }, [])
  
  const togglePortfolioDetails = useCallback(() => {
    setState(prev => ({ ...prev, showPortfolioDetails: !prev.showPortfolioDetails }))
  }, [])
  
  const toggleFilterPanel = useCallback(() => {
    setState(prev => ({ ...prev, showFilterPanel: !prev.showFilterPanel }))
  }, [])
  
  const setNotification = useCallback((notification: NotificationState | null) => {
    setState(prev => ({ ...prev, notification }))
  }, [])
  
  const setDisplayedNFTs = useCallback((count: number) => {
    setState(prev => ({ ...prev, displayedNFTs: count }))
  }, [])
  
  const setHasMoreNFTs = useCallback((hasMore: boolean) => {
    setState(prev => ({ ...prev, hasMoreNFTs: hasMore }))
  }, [])
  
  const setIsLoadingMore = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoadingMore: loading }))
  }, [])
  
  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  // Reset pagination when filters change
  const resetPagination = useCallback(() => {
    setState(prev => ({
      ...prev,
      displayedNFTs: INITIAL_DISPLAY_COUNT,
      hasMoreNFTs: true
    }))
  }, [])

  return {
    state,
    updateState,
    setActiveTab,
    setViewMode,
    setSearchQuery,
    setSelectedFilter,
    setSelectedNFT,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    toggleNFTVisibility,
    togglePortfolioDetails,
    toggleFilterPanel,
    setNotification,
    setDisplayedNFTs,
    setHasMoreNFTs,
    setIsLoadingMore,
    setIsLoading,
    resetPagination
  }
}
