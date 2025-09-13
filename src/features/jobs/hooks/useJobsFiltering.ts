'use client'

import { useMemo } from 'react'
import type { Job, JobFilters } from '../types/jobs.types'

export function useJobsFiltering(
  jobs: Job[],
  filters: JobFilters,
  searchQuery: string
) {
  const filteredJobs = useMemo(() => {
    let result = [...jobs]

    // Поиск по тексту
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(job => 
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.employer.toLowerCase().includes(query) ||
        job.skills.some(skill => skill.toLowerCase().includes(query)) ||
        job.category.toLowerCase().includes(query) ||
        job.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Фильтр по типу работы
    if (filters.type && filters.type !== 'all') {
      result = result.filter(job => job.type === filters.type)
    }

    // Фильтр по уровню опыта
    if (filters.experienceLevel && filters.experienceLevel !== 'all') {
      result = result.filter(job => job.experienceLevel === filters.experienceLevel)
    }

    // Фильтр по типу оплаты
    if (filters.paymentType && filters.paymentType !== 'all') {
      result = result.filter(job => job.paymentType === filters.paymentType)
    }

    // Фильтр по валюте
    if (filters.currency && filters.currency !== 'all') {
      result = result.filter(job => job.currency === filters.currency)
    }

    // Фильтр по бюджету
    if (filters.minBudget !== undefined) {
      result = result.filter(job => job.budget >= filters.minBudget!)
    }
    if (filters.maxBudget !== undefined) {
      result = result.filter(job => job.budget <= filters.maxBudget!)
    }

    // Фильтр по удаленной работе
    if (filters.isRemote !== undefined) {
      result = result.filter(job => job.isRemote === filters.isRemote)
    }

    // Фильтр по местоположению
    if (filters.location) {
      result = result.filter(job => 
        job.location?.toLowerCase().includes(filters.location!.toLowerCase()) ||
        (filters.location === 'remote' && job.isRemote)
      )
    }

    // Фильтр по навыкам
    if (filters.skills && filters.skills.length > 0) {
      result = result.filter(job => 
        filters.skills!.some(skill => 
          job.skills.some(jobSkill => 
            jobSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      )
    }

    // Фильтр по дедлайну
    if (filters.deadline?.from) {
      const fromDate = new Date(filters.deadline.from)
      result = result.filter(job => new Date(job.deadline) >= fromDate)
    }
    if (filters.deadline?.to) {
      const toDate = new Date(filters.deadline.to)
      result = result.filter(job => new Date(job.deadline) <= toDate)
    }

    // Сортировка
    const sortBy = filters.sortBy || 'created'
    const sortOrder = filters.sortOrder || 'desc'

    result.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'budget':
          comparison = a.budget - b.budget
          break
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'applications':
          comparison = a.applicationsCount - b.applicationsCount
          break
        default:
          return 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [jobs, filters, searchQuery])

  // Статистика фильтрации
  const stats = useMemo(() => {
    const total = jobs.length
    const filtered = filteredJobs.length
    const openJobs = filteredJobs.filter(job => job.status === 'open').length
    const urgentJobs = filteredJobs.filter(job => job.isUrgent).length
    const featuredJobs = filteredJobs.filter(job => job.isFeatured).length

    return {
      total,
      filtered,
      openJobs,
      urgentJobs,
      featuredJobs,
      averageBudget: filteredJobs.length > 0 
        ? filteredJobs.reduce((sum, job) => sum + job.budget, 0) / filteredJobs.length 
        : 0
    }
  }, [jobs, filteredJobs])

  // Группировка по категориям
  const jobsByCategory = useMemo(() => {
    const grouped: Record<string, Job[]> = {}
    
    filteredJobs.forEach(job => {
      if (!grouped[job.category]) {
        grouped[job.category] = []
      }
      grouped[job.category].push(job)
    })

    return grouped
  }, [filteredJobs])

  // Популярные навыки в текущих результатах
  const popularSkills = useMemo(() => {
    const skillCount: Record<string, number> = {}
    
    filteredJobs.forEach(job => {
      job.skills.forEach(skill => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
    })

    return Object.entries(skillCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }))
  }, [filteredJobs])

  // Диапазон бюджетов
  const budgetRange = useMemo(() => {
    if (filteredJobs.length === 0) {
      return { min: 0, max: 0 }
    }

    const budgets = filteredJobs.map(job => job.budget)
    return {
      min: Math.min(...budgets),
      max: Math.max(...budgets)
    }
  }, [filteredJobs])

  return {
    filteredJobs,
    stats,
    jobsByCategory,
    popularSkills,
    budgetRange
  }
}

