'use client'

import { useState, useCallback } from 'react'
import { DAOPageState, DAOTabType, ProposalStatus, ProposalType, Proposal, NotificationState } from '../types/dao.types'

const initialState: DAOPageState = {
  selectedProposal: null,
  activeTab: 'proposals',
  viewMode: 'list',
  filterStatus: 'all',
  filterType: 'all',
  searchQuery: '',
  sortBy: 'created',
  sortOrder: 'desc',
  showCreateModal: false,
  showVoteModal: false,
  showDetailsModal: false,
  isLoading: false,
  notification: null
}

export function useDAOState() {
  const [state, setState] = useState<DAOPageState>(initialState)

  const updateState = useCallback((updates: Partial<DAOPageState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Specific updaters
  const setSelectedProposal = useCallback((proposal: Proposal | null) => updateState({ selectedProposal: proposal }), [updateState])
  const setActiveTab = useCallback((tab: DAOTabType) => updateState({ activeTab: tab }), [updateState])
  const setViewMode = useCallback((mode: 'list' | 'grid') => updateState({ viewMode: mode }), [updateState])
  const setFilterStatus = useCallback((status: ProposalStatus | 'all') => updateState({ filterStatus: status }), [updateState])
  const setFilterType = useCallback((type: ProposalType | 'all') => updateState({ filterType: type }), [updateState])
  const setSearchQuery = useCallback((query: string) => updateState({ searchQuery: query }), [updateState])
  const setSortBy = useCallback((sortBy: 'created' | 'votes' | 'deadline' | 'popularity') => updateState({ sortBy }), [updateState])
  const setSortOrder = useCallback((order: 'asc' | 'desc') => updateState({ sortOrder: order }), [updateState])
  const toggleSortOrder = useCallback(() => updateState({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' }), [updateState, state.sortOrder])
  const setShowCreateModal = useCallback((show: boolean) => updateState({ showCreateModal: show }), [updateState])
  const setShowVoteModal = useCallback((show: boolean) => updateState({ showVoteModal: show }), [updateState])
  const setShowDetailsModal = useCallback((show: boolean) => updateState({ showDetailsModal: show }), [updateState])
  const setIsLoading = useCallback((loading: boolean) => updateState({ isLoading: loading }), [updateState])
  const setNotification = useCallback((notification: NotificationState | null) => updateState({ notification }), [updateState])

  // Composed actions
  const openProposalDetails = useCallback((proposal: Proposal) => {
    setSelectedProposal(proposal)
    setShowDetailsModal(true)
  }, [setSelectedProposal, setShowDetailsModal])

  const closeProposalDetails = useCallback(() => {
    setSelectedProposal(null)
    setShowDetailsModal(false)
  }, [setSelectedProposal, setShowDetailsModal])

  const openCreateModal = useCallback(() => {
    setShowCreateModal(true)
  }, [setShowCreateModal])

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false)
  }, [setShowCreateModal])

  const openVoteModal = useCallback((proposal: Proposal) => {
    setSelectedProposal(proposal)
    setShowVoteModal(true)
  }, [setSelectedProposal, setShowVoteModal])

  const closeVoteModal = useCallback(() => {
    setShowVoteModal(false)
    setSelectedProposal(null)
  }, [setShowVoteModal, setSelectedProposal])

  const clearFilters = useCallback(() => {
    setFilterStatus('all')
    setFilterType('all')
    setSearchQuery('')
    setSortBy('created')
    setSortOrder('desc')
  }, [setFilterStatus, setFilterType, setSearchQuery, setSortBy, setSortOrder])

  const showSuccessNotification = useCallback((message: string) => {
    setNotification({ type: 'success', message })
    setTimeout(() => setNotification(null), 3000)
  }, [setNotification])

  const showErrorNotification = useCallback((message: string) => {
    setNotification({ type: 'error', message })
    setTimeout(() => setNotification(null), 5000)
  }, [setNotification])

  const showInfoNotification = useCallback((message: string) => {
    setNotification({ type: 'info', message })
    setTimeout(() => setNotification(null), 3000)
  }, [setNotification])

  const showWarningNotification = useCallback((message: string) => {
    setNotification({ type: 'warning', message })
    setTimeout(() => setNotification(null), 4000)
  }, [setNotification])

  return {
    state,
    
    // Individual setters
    setSelectedProposal,
    setActiveTab,
    setViewMode,
    setFilterStatus,
    setFilterType,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    setShowCreateModal,
    setShowVoteModal,
    setIsLoading,
    setNotification,
    
    // Composed actions
    openProposalDetails,
    closeProposalDetails,
    openCreateModal,
    closeCreateModal,
    openVoteModal,
    closeVoteModal,
    clearFilters,
    
    // Modal state setters - removed duplicates
    
    // Notification helpers
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification
  }
}
