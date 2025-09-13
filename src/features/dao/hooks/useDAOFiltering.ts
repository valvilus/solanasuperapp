'use client'

import { useMemo } from 'react'
import { Proposal, ProposalStatus, ProposalType } from '../types'

export function useDAOFiltering(
  proposals: Proposal[],
  filterStatus: ProposalStatus | 'all',
  filterType: ProposalType | 'all',
  searchQuery: string,
  sortBy: 'created' | 'votes' | 'deadline' | 'popularity',
  sortOrder: 'asc' | 'desc'
) {
  
  const filteredProposals = useMemo(() => {
    let filtered = [...proposals]

    // Фильтр по статусу
    if (filterStatus !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === filterStatus)
    }

    // Фильтр по типу
    if (filterType !== 'all') {
      filtered = filtered.filter(proposal => proposal.type === filterType)
    }

    // Поиск по тексту
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(proposal => 
        proposal.title.toLowerCase().includes(query) ||
        proposal.description.toLowerCase().includes(query) ||
        proposal.category.toLowerCase().includes(query) ||
        proposal.proposer.toLowerCase().includes(query) ||
        (proposal.tags && proposal.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortBy) {
        case 'created':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        
        case 'votes':
          aValue = a.totalVotes
          bValue = b.totalVotes
          break
        
        case 'deadline':
          aValue = new Date(a.endTime).getTime()
          bValue = new Date(b.endTime).getTime()
          break
        
        case 'popularity':
          // Популярность = общее количество голосов + процент голосов "за"
          const aPopularity = a.totalVotes + (a.votesFor / Math.max(a.votesFor + a.votesAgainst, 1)) * 100
          const bPopularity = b.totalVotes + (b.votesFor / Math.max(b.votesFor + b.votesAgainst, 1)) * 100
          aValue = aPopularity
          bValue = bPopularity
          break
        
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [proposals, filterStatus, filterType, searchQuery, sortBy, sortOrder])

  // Подсчет предложений по категориям
  const filterCounts = useMemo(() => {
    const counts = {
      all: proposals.length,
      active: 0,
      passed: 0,
      rejected: 0,
      executed: 0,
      treasury: 0,
      feature: 0,
      governance: 0,
      community: 0
    }

    proposals.forEach(proposal => {
      // Подсчет по статусу
      if (proposal.status === 'active') counts.active++
      else if (proposal.status === 'passed') counts.passed++
      else if (proposal.status === 'rejected') counts.rejected++
      else if (proposal.status === 'executed') counts.executed++

      // Подсчет по типу
      if (proposal.type === 'treasury') counts.treasury++
      else if (proposal.type === 'feature') counts.feature++
      else if (proposal.type === 'governance') counts.governance++
      else if (proposal.type === 'community') counts.community++
    })

    return counts
  }, [proposals])

  // Статистика фильтрации
  const filterStats = useMemo(() => {
    const totalFiltered = filteredProposals.length
    const totalOriginal = proposals.length
    
    return {
      totalFiltered,
      totalOriginal,
      isFiltered: totalFiltered !== totalOriginal,
      filterPercentage: totalOriginal > 0 ? (totalFiltered / totalOriginal) * 100 : 0
    }
  }, [filteredProposals.length, proposals.length])

  // Активные фильтры
  const activeFilters = useMemo(() => {
    const filters: any[] = []
    
    if (filterStatus !== 'all') {
      filters.push({ key: 'status', value: filterStatus })
    }
    
    if (filterType !== 'all') {
      filters.push({ key: 'type', value: filterType })
    }
    
    if (searchQuery.trim()) {
      filters.push({ key: 'search', value: searchQuery })
    }
    
    return filters
  }, [filterStatus, filterType, searchQuery])

  return {
    filteredProposals,
    filterCounts,
    filterStats,
    activeFilters
  }
}

