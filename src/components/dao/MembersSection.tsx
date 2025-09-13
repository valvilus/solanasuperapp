'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Crown, Vote, Calendar, Activity, Search, Filter, Star, TrendingUp, ExternalLink } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DAOMember {
  id: string
  address: string
  username: string
  avatar: string | null
  votingPower: number
  totalVotes: number
  proposalsCreated: number
  reputation: number
  joinedAt: string
  isActive: boolean
  lastActivity: string
  recentVotes?: Array<{
    proposalId: string
    proposalTitle: string
    weight: number
    timestamp: string
  }>
}

interface MembersSectionProps {
  members: DAOMember[]
  totalCount: number
  hasMore: boolean
  stats: {
    totalMembers: number
    activeMembers: number
    participationRate: number
    totalVotingPower: number
    averageVotingPower: number
    topMember?: {
      username: string
      votingPower: number
      reputation: number
    }
  }
  isLoading?: boolean
  onLoadMore?: () => void
  onSearch?: (query: string) => void
  className?: string
}

export function MembersSection({
  members,
  totalCount,
  hasMore,
  stats,
  isLoading = false,
  onLoadMore,
  onSearch,
  className = ''
}: MembersSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'votingPower' | 'totalVotes' | 'reputation' | 'joinedAt'>('votingPower')

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const getReputationColor = (reputation: number) => {
    if (reputation >= 90) return 'text-yellow-400'
    if (reputation >= 70) return 'text-green-400'
    if (reputation >= 50) return 'text-blue-400'
    return 'text-gray-400'
  }

  const getReputationBadge = (reputation: number) => {
    if (reputation >= 90) return 'Эксперт'
    if (reputation >= 70) return 'Активный'
    if (reputation >= 50) return 'Участник'
    return 'Новичок'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatVotingPower = (power: number | undefined) => {
    if (power == null || isNaN(power)) return '0'
    if (power >= 1000000) return `${(power / 1000000).toFixed(1)}M`
    if (power >= 1000) return `${(power / 1000).toFixed(1)}K`
    return power.toString()
  }

  // Функция для открытия Solana Explorer
  const openSolanaExplorer = (address: string, type: 'address' | 'tx' = 'address') => {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'https://explorer.solana.com' 
      : 'https://explorer.solana.com'
    
    const cluster = process.env.NODE_ENV === 'development' ? '?cluster=devnet' : ''
    const url = `${baseUrl}/${type}/${address}${cluster}`
    
    window.open(url, '_blank')
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Участники DAO</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {totalCount} участников, {stats.activeMembers} активных
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Members */}
        <SimpleCard className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Всего участников</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalMembers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400/60" />
          </div>
        </SimpleCard>

        {/* Participation Rate */}
        <SimpleCard className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Участие в голосованиях</p>
              <p className="text-2xl font-bold text-green-400">{stats.participationRate}%</p>
            </div>
            <Vote className="w-8 h-8 text-green-400/60" />
          </div>
        </SimpleCard>

        {/* Total Voting Power */}
        <SimpleCard className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Общая сила голоса</p>
              <p className="text-2xl font-bold text-purple-400">
                {formatVotingPower(stats.totalVotingPower)} TNG
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400/60" />
          </div>
        </SimpleCard>
      </div>

      {/* Top Member Highlight */}
      {stats.topMember && (
        <SimpleCard className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-400">Топ участник</p>
                <p className="text-lg font-bold text-white">{stats.topMember.username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Сила голоса</p>
              <p className="text-lg font-bold text-yellow-400">
                {formatVotingPower(stats.topMember.votingPower)} TNG
              </p>
            </div>
          </div>
        </SimpleCard>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск участников..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="votingPower">По силе голоса</option>
          <option value="totalVotes">По голосам</option>
          <option value="reputation">По репутации</option>
          <option value="joinedAt">По дате присоединения</option>
        </select>
      </div>

      {/* Members List */}
      <SimpleCard className="p-6">
        <div className="space-y-3">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {member.username.substring(0, 2).toUpperCase()}
                  </div>
                  {member.isActive && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                  )}
                </div>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{member.username}</h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getReputationColor(member.reputation)}`}
                    >
                      {getReputationBadge(member.reputation)}
                    </Badge>
                    {index < 3 && (
                      <Star className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm text-gray-400 truncate">
                      {member.address}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openSolanaExplorer(member.address)
                      }}
                      className="h-5 px-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(member.joinedAt)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Activity className="w-3 h-3" />
                      <span>{formatDate(member.lastActivity)}</span>
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <div className="flex items-center justify-end space-x-2">
                      <div>
                        <p className="text-blue-400 font-semibold">
                          {formatVotingPower(member.votingPower)} TNG
                        </p>
                        <p className="text-gray-400 text-xs">Сила голоса</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // В реальной ситуации здесь был бы адрес TNG token account пользователя
                          // Пока используем основной адрес как заглушку
                          openSolanaExplorer(member.address)
                        }}
                        className="h-5 px-1 text-xs text-green-400 hover:text-green-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-xs text-gray-400">
                    <div className="text-center">
                      <p className="text-white font-medium">{member.totalVotes}</p>
                      <p>Голосов</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">{member.proposalsCreated}</p>
                      <p>Предложений</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-medium ${getReputationColor(member.reputation)}`}>
                        {member.reputation}
                      </p>
                      <p>Репутация</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  <span>Загрузка...</span>
                </div>
              ) : (
                'Показать еще'
              )}
            </Button>
          </div>
        )}
      </SimpleCard>

      {/* Empty state */}
      {members.length === 0 && !isLoading && (
        <SimpleCard className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Участники не найдены</h3>
          <p className="text-gray-400">
            {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Список участников DAO пуст'}
          </p>
        </SimpleCard>
      )}
    </div>
  )
}

