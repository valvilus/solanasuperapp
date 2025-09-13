/**
 * Premium Filter Panel Component - Advanced Filtering & Search
 * Solana SuperApp - Premium Design System
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  X, 
  Filter,
  SortAsc,
  SortDesc,
  Ticket,
  Gift,
  Trophy,
  Diamond,
  FileText,
  Grid3X3,
  List,
  RotateCcw,
  ChevronDown,
  Sparkles
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import type { 
  NftFilter, 
  NftSortBy, 
  NftSortOrder,
  ViewMode
} from '@/features/nft/types'

interface FilterCounts {
  all: number
  tickets: number
  coupons: number
  badges: number
  collectibles: number
  certificates: number
}

interface PremiumFilterPanelProps {
  searchTerm: string
  activeFilter: NftFilter
  sortBy: NftSortBy
  sortOrder: NftSortOrder
  viewMode: ViewMode
  filterCounts: FilterCounts
  onSearchChange: (term: string) => void
  onFilterChange: (filter: NftFilter) => void
  onSortChange: (sortBy: NftSortBy, sortOrder: NftSortOrder) => void
  onViewModeChange: (mode: ViewMode) => void
  className?: string
}

export function PremiumFilterPanel({
  searchTerm,
  activeFilter,
  sortBy,
  sortOrder,
  viewMode,
  filterCounts,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onViewModeChange,
  className = ''
}: PremiumFilterPanelProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSortOptions, setShowSortOptions] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => onSearchChange(term), 300),
    [onSearchChange]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    debouncedSearch(value)
  }

  const handleFilterClick = (filter: NftFilter) => {
    hapticFeedback.selection()
    onFilterChange(filter)
  }

  const handleSortClick = (newSortBy: NftSortBy) => {
    hapticFeedback.selection()
    if (sortBy === newSortBy) {
      // Toggle order if same sort field
      onSortChange(newSortBy, sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      // New sort field, default to DESC
      onSortChange(newSortBy, 'DESC')
    }
    setShowSortOptions(false)
  }

  const handleViewModeToggle = () => {
    hapticFeedback.impact('light')
    onViewModeChange(viewMode === 'GRID' ? 'LIST' : 'GRID')
  }

  const handleResetFilters = () => {
    hapticFeedback.impact('medium')
    onSearchChange('')
    onFilterChange('ALL')
    onSortChange('DATE', 'DESC')
  }

  const filterButtons = [
    { 
      key: 'ALL' as NftFilter, 
      label: 'Все', 
      icon: Sparkles, 
      count: filterCounts.all 
    },
    { 
      key: 'TICKETS' as NftFilter, 
      label: 'Билеты', 
      icon: Ticket, 
      count: filterCounts.tickets 
    },
    { 
      key: 'COUPONS' as NftFilter, 
      label: 'Купоны', 
      icon: Gift, 
      count: filterCounts.coupons 
    },
    { 
      key: 'BADGES' as NftFilter, 
      label: 'Значки', 
      icon: Trophy, 
      count: filterCounts.badges 
    },
    { 
      key: 'COLLECTIBLES' as NftFilter, 
      label: 'Коллекционные', 
      icon: Diamond, 
      count: filterCounts.collectibles 
    },
    { 
      key: 'CERTIFICATES' as NftFilter, 
      label: 'Сертификаты', 
      icon: FileText, 
      count: filterCounts.certificates 
    }
  ]

  const sortOptions = [
    { key: 'DATE' as NftSortBy, label: 'Дата' },
    { key: 'NAME' as NftSortBy, label: 'Название' },
    { key: 'TYPE' as NftSortBy, label: 'Тип' },
    { key: 'VALUE' as NftSortBy, label: 'Стоимость' }
  ]

  const activeSortOption = sortOptions.find(opt => opt.key === sortBy)
  const hasActiveFilters = searchTerm || activeFilter !== 'ALL' || sortBy !== 'DATE' || sortOrder !== 'DESC'

  return (
    <motion.div
      className={`space-y-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Search Bar */}
      <div className="relative">
        <motion.div
          animate={{ 
            scale: isSearchFocused ? 1.02 : 1,
            borderColor: isSearchFocused ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
          }}
          className="relative"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className={`w-5 h-5 transition-colors ${
              isSearchFocused ? 'text-solana-purple' : 'text-gray-400'
            }`} />
          </div>
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            defaultValue={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="
              w-full pl-12 pr-4 py-3.5 rounded-xl
              bg-gradient-to-r from-white/5 to-white/10 
              border border-white/20 backdrop-blur-sm
              text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-purple-500/40 
              focus:border-purple-500/30 focus:bg-white/10
              hover:border-white/30 hover:bg-white/5
              transition-all duration-300 ease-out
              shadow-lg shadow-black/10
            "
          />
          {searchTerm && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Minimalist Filter Section */}
      <div className="space-y-3">
        <motion.div 
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isFiltersExpanded ? 0 : 180 }}
              transition={{ duration: 0.3 }}
              className="p-1 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
            <h3 className="text-sm font-medium text-white">Категории</h3>
            <div className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20">
              <span className="text-xs text-gray-300">{filterCounts.all}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetFilters()
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Сбросить
              </motion.button>
            )}
            
            <span className="text-xs text-gray-500">
              {isFiltersExpanded ? 'Свернуть' : 'Развернуть'}
            </span>
          </div>
        </motion.div>

        {/* Minimalist Filter Pills */}
        <AnimatePresence>
          {isFiltersExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {/* First row - Primary filters */}
              <div className="flex flex-wrap gap-2">
                {filterButtons.slice(0, 3).map((filter, index) => (
                  <motion.button
                    key={filter.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFilterClick(filter.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
                      "touch-manipulation select-none text-sm font-medium min-h-[40px]",
                      activeFilter === filter.key
                        ? "bg-purple-500/20 border-purple-400/50 text-white shadow-lg shadow-purple-500/25"
                        : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30 hover:text-white"
                    )}
                  >
                    <filter.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-none">{filter.label}</span>
                    {filter.count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs leading-none",
                        activeFilter === filter.key
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-gray-400"
                      )}>
                        {filter.count}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Second row - Secondary filters */}
              <div className="flex flex-wrap gap-2">
                {filterButtons.slice(3).map((filter, index) => (
                  <motion.button
                    key={filter.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index + 3) * 0.05, duration: 0.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFilterClick(filter.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
                      "touch-manipulation select-none text-sm font-medium min-h-[40px]",
                      activeFilter === filter.key
                        ? "bg-purple-500/20 border-purple-400/50 text-white shadow-lg shadow-purple-500/25"
                        : "bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30 hover:text-white"
                    )}
                  >
                    <filter.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-none">{filter.label}</span>
                    {filter.count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs leading-none",
                        activeFilter === filter.key
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-gray-400"
                      )}>
                        {filter.count}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Minimalist Sort & View Controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Compact Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSortOptions(!showSortOptions)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-200"
            >
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-white">
                {activeSortOption?.label || 'Дата'}
              </span>
              <div className="flex items-center gap-1">
                {sortOrder === 'ASC' ? (
                  <SortAsc className="w-3 h-3 text-emerald-400" />
                ) : (
                  <SortDesc className="w-3 h-3 text-orange-400" />
                )}
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-400 transition-transform duration-200",
                  showSortOptions && "rotate-180"
                )} />
              </div>
            </motion.button>

            <AnimatePresence>
              {showSortOptions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl p-2 z-50 shadow-xl"
                >
                  {sortOptions.map((option) => (
                    <motion.button
                      key={option.key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSortClick(option.key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                        sortBy === option.key
                          ? "bg-solana-purple/20 text-white"
                          : "text-gray-300 hover:bg-white/10"
                      )}
                    >
                      <span className="text-sm">{option.label}</span>
                      {sortBy === option.key && (
                        <div className="flex items-center gap-1">
                          {sortOrder === 'ASC' ? (
                            <SortAsc className="w-4 h-4" />
                          ) : (
                            <SortDesc className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Compact View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/20">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleViewModeToggle}
            className={cn(
              "p-2 rounded-md transition-all duration-200",
              viewMode === 'GRID'
                ? "bg-purple-500/20 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleViewModeToggle}
            className={cn(
              "p-2 rounded-md transition-all duration-200",
              viewMode === 'LIST'
                ? "bg-purple-500/20 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <List className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Compact Active Filters Summary */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg p-3 border border-white/10"
          >
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-white">Применены:</span>
            
            <div className="flex flex-wrap items-center gap-1">
              {searchTerm && (
                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Поиск: {searchTerm}
                </span>
              )}
              {activeFilter !== 'ALL' && (
                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {filterButtons.find(f => f.key === activeFilter)?.label}
                </span>
              )}
              {(sortBy !== 'DATE' || sortOrder !== 'DESC') && (
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeSortOption?.label} {sortOrder === 'ASC' ? '↑' : '↓'}
                </span>
              )}
            </div>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleResetFilters}
              className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-gray-400 hover:text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}
