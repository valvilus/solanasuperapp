'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, MapPin, DollarSign } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import type { JobFilters } from '@/features/jobs/types/jobs.types'
import { 
  jobTypes, 
  experienceLevels, 
  paymentTypes, 
  currencies,
  SORT_OPTIONS
} from '@/features/jobs/data/constants'

interface JobsFiltersProps {
  searchQuery: string
  filters: JobFilters
  onSearchChange: (query: string) => void
  onFiltersChange: (filters: Partial<JobFilters>) => void
  onResetFilters: () => void
  resultsCount: number
  className?: string
}

export function JobsFilters({
  searchQuery,
  filters,
  onSearchChange,
  onFiltersChange,
  onResetFilters,
  resultsCount,
  className = ''
}: JobsFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== 'all' && value !== ''
  ).length

  const handleFilterChange = (key: keyof JobFilters, value: any) => {
    onFiltersChange({ [key]: value })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Поиск */}
      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск работы, навыков, компаний..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-white/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Быстрые фильтры */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Фильтры</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{resultsCount} результатов</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showAdvancedFilters ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Filter className="w-4 h-4 text-gray-400" />
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-solana-green text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </motion.button>
          </div>
        </div>

        {/* Основные фильтры */}
        <div className="space-y-3">
          {/* Тип работы */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Тип работы</label>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              <button
                onClick={() => handleFilterChange('type', 'all')}
                className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${
                  (!filters.type || filters.type === 'all')
                    ? 'bg-white/10 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Все
              </button>
              {jobTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleFilterChange('type', type.id)}
                  className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${
                    filters.type === type.id
                      ? `${type.bgColor} ${type.color} border ${type.borderColor}`
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Удаленная работа */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remote"
              checked={filters.isRemote === true}
              onChange={(e) => handleFilterChange('isRemote', e.target.checked ? true : undefined)}
              className="rounded border-gray-600 text-solana-green focus:ring-solana-green focus:ring-offset-0"
            />
            <label htmlFor="remote" className="text-sm text-gray-300 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Только удаленная работа
            </label>
          </div>
        </div>
      </div>

      {/* Расширенные фильтры */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 space-y-4"
          >
            <SimpleCard className="p-4 border border-white/10">
              <div className="space-y-4">
                {/* Уровень опыта */}
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Уровень опыта</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFilterChange('experienceLevel', 'all')}
                      className={`p-2 text-xs rounded-lg transition-colors ${
                        (!filters.experienceLevel || filters.experienceLevel === 'all')
                          ? 'bg-white/10 text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Любой
                    </button>
                    {experienceLevels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => handleFilterChange('experienceLevel', level.id)}
                        className={`p-2 text-xs rounded-lg transition-colors ${
                          filters.experienceLevel === level.id
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className={level.color}>{level.label}</div>
                        <div className="text-gray-500">{level.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Тип оплаты */}
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Тип оплаты</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFilterChange('paymentType', 'all')}
                      className={`p-2 text-xs rounded-lg transition-colors ${
                        (!filters.paymentType || filters.paymentType === 'all')
                          ? 'bg-white/10 text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Любой
                    </button>
                    {paymentTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleFilterChange('paymentType', type.id)}
                        className={`p-2 text-xs rounded-lg transition-colors ${
                          filters.paymentType === type.id
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="text-white">{type.label}</div>
                        <div className="text-gray-500">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Бюджет */}
                <div>
                  <label className="text-sm text-gray-300 mb-2 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Бюджет
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {currencies.map((currency) => (
                      <button
                        key={currency.id}
                        onClick={() => handleFilterChange('currency', currency.id === filters.currency ? 'all' : currency.id)}
                        className={`p-2 text-xs rounded-lg transition-colors ${
                          filters.currency === currency.id
                            ? `bg-white/10 text-white border border-white/20`
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={currency.color}>{currency.symbol}</span> {currency.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        placeholder="Мин. бюджет"
                        value={filters.minBudget || ''}
                        onChange={(e) => handleFilterChange('minBudget', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm outline-none focus:border-white/20"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Макс. бюджет"
                        value={filters.maxBudget || ''}
                        onChange={(e) => handleFilterChange('maxBudget', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Сортировка */}
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Сортировка</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleFilterChange('sortBy', option.id)}
                        className={`p-2 text-xs rounded-lg transition-colors ${
                          filters.sortBy === option.id
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleFilterChange('sortOrder', 'desc')}
                      className={`flex-1 p-2 text-xs rounded-lg transition-colors ${
                        filters.sortOrder === 'desc'
                          ? 'bg-white/10 text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      По убыванию
                    </button>
                    <button
                      onClick={() => handleFilterChange('sortOrder', 'asc')}
                      className={`flex-1 p-2 text-xs rounded-lg transition-colors ${
                        filters.sortOrder === 'asc'
                          ? 'bg-white/10 text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      По возрастанию
                    </button>
                  </div>
                </div>

                {/* Сброс фильтров */}
                {activeFiltersCount > 0 && (
                  <SimpleButton
                    onClick={onResetFilters}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Сбросить все фильтры
                  </SimpleButton>
                )}
              </div>
            </SimpleCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

