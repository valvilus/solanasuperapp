'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Vote, 
  Target,
  Activity,
  DollarSign,
  Calendar,
  Award,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface DAOAnalytics {
  overview: {
    totalProposals: number
    activeProposals: number
    totalVotes: number
    participationRate: number
    proposalSuccessRate: number
    quorumReachedRate: number
    treasuryValue: string
    treasurySOL: string
    treasuryTNG: string
  }
  metrics: {
    proposalSuccessRate: number
    participationRate: number
    averageVotesPerProposal: number
    averageVotingPower: number
    quorumReachedRate: number
  }
  proposalStats: {
    byStatus: {
      active: number
      passed: number
      rejected: number
      executed: number
      total: number
    }
    byTimeframe: {
      thisWeek: number
      thisMonth: number
      allTime: number
    }
  }
  topProposals: Array<{
    id: string
    title: string
    totalVotes: number
    votesFor: number
    status: string
    createdAt: number
  }>
  recentActivity: {
    weeklyProposals: number
    monthlyProposals: number
    weeklyVotes: number
    lastProposal: {
      title: string
      createdAt: number
      status: string
    } | null
  }
  treasury: {
    solBalance: number
    tngBalance: number
    totalValueUSD: number
    address: string
  }
  userStats: {
    userVotingPower: string
    userTotalVotes: number
    userProposalsCreated: number
    userParticipationRate: number
  }
}

interface AnalyticsSectionProps {
  isLoading?: boolean
  className?: string
}

export function AnalyticsSection({
  isLoading = false,
  className = ''
}: AnalyticsSectionProps) {
  const { apiCall } = useCompatibleAuth()
  const [analytics, setAnalytics] = useState<DAOAnalytics | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Загрузка данных аналитики
  const loadAnalytics = async () => {
    try {
      setDataLoading(true)
      console.log(' Loading DAO analytics...')
      
      const response = await apiCall('/api/dao/analytics')
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
        setLastUpdated(new Date())
        console.log(' DAO analytics loaded:', result.data)
      } else {
        console.error(' Failed to load analytics:', result.error)
      }
    } catch (error) {
      console.error(' Error loading DAO analytics:', error)
    } finally {
      setDataLoading(false)
    }
  }

  // Загрузка при монтировании
  useEffect(() => {
    loadAnalytics()
  }, [])

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString()

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400'
    if (rate >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getParticipationColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400'
    if (rate >= 50) return 'text-yellow-400'
    return 'text-orange-400'
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

  if (isLoading || dataLoading || !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
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
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span>Аналитика DAO</span>
          </h2>
          {lastUpdated && (
            <p className="text-sm text-gray-400 mt-1">
              Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
            </p>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          disabled={dataLoading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </Button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Proposal Success Rate */}
        <SimpleCard className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Успешность предложений</p>
              <p className={`text-2xl font-bold ${getSuccessRateColor(analytics.metrics.proposalSuccessRate)}`}>
                {formatPercentage(analytics.metrics.proposalSuccessRate)}
              </p>
            </div>
            <Target className="w-8 h-8 text-green-400/60" />
          </div>
        </SimpleCard>

        {/* Participation Rate */}
        <SimpleCard className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Участие в голосованиях</p>
              <p className={`text-2xl font-bold ${getParticipationColor(analytics.metrics.participationRate)}`}>
                {formatPercentage(analytics.metrics.participationRate)}
              </p>
            </div>
            <Vote className="w-8 h-8 text-blue-400/60" />
          </div>
        </SimpleCard>

        {/* Quorum Rate */}
        <SimpleCard className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Достижение кворума</p>
              <p className="text-2xl font-bold text-purple-400">
                {formatPercentage(analytics.metrics.quorumReachedRate)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400/60" />
          </div>
        </SimpleCard>

        {/* Total Proposals */}
        <SimpleCard className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Всего предложений</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatNumber(analytics.overview.totalProposals)}
              </p>
            </div>
            <Activity className="w-8 h-8 text-yellow-400/60" />
          </div>
        </SimpleCard>

        {/* Treasury Value */}
        <SimpleCard className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-400">Стоимость казны</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openSolanaExplorer(analytics.treasury.address)}
                  className="h-5 px-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                ${formatNumber(analytics.treasury.totalValueUSD)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400/60" />
          </div>
        </SimpleCard>

        {/* Average Votes */}
        <SimpleCard className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/5 border-pink-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Голосов на предложение</p>
              <p className="text-2xl font-bold text-pink-400">
                {formatNumber(analytics.metrics.averageVotesPerProposal)}
              </p>
            </div>
            <Zap className="w-8 h-8 text-pink-400/60" />
          </div>
        </SimpleCard>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Proposal Statistics */}
        <SimpleCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Статистика предложений</span>
          </h3>

          <div className="space-y-4">
            {/* By Status */}
            <div>
              <p className="text-sm text-gray-400 mb-3">По статусам:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                  <span className="text-green-400"> Принято</span>
                  <Badge variant="outline" className="text-green-400">
                    {analytics.proposalStats.byStatus.passed}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                  <span className="text-blue-400"> Активные</span>
                  <Badge variant="outline" className="text-blue-400">
                    {analytics.proposalStats.byStatus.active}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                  <span className="text-purple-400"> Выполнено</span>
                  <Badge variant="outline" className="text-purple-400">
                    {analytics.proposalStats.byStatus.executed}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                  <span className="text-red-400"> Отклонено</span>
                  <Badge variant="outline" className="text-red-400">
                    {analytics.proposalStats.byStatus.rejected}
                  </Badge>
                </div>
              </div>
            </div>

            {/* By Timeframe */}
            <div>
              <p className="text-sm text-gray-400 mb-3">По периодам:</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white">За эту неделю</span>
                  <Badge variant="outline">
                    {analytics.proposalStats.byTimeframe.thisWeek}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">За этот месяц</span>
                  <Badge variant="outline">
                    {analytics.proposalStats.byTimeframe.thisMonth}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">За все время</span>
                  <Badge variant="outline">
                    {analytics.proposalStats.byTimeframe.allTime}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </SimpleCard>

        {/* Top Proposals */}
        <SimpleCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span>Топ предложения</span>
          </h3>

          <div className="space-y-3">
            {analytics.topProposals.map((proposal, index) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <Badge variant={index === 0 ? "default" : "outline"} className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {proposal.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant={proposal.status === 'Executed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {proposal.status}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {proposal.totalVotes} голосов
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-400">
                      {proposal.votesFor}/{proposal.totalVotes}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round((proposal.votesFor / proposal.totalVotes) * 100)}% за
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      // В реальной ситуации здесь был бы реальный PDA предложения
                      // Пока используем program address DAO как заглушку
                      openSolanaExplorer('HbDYHpNrayUvx5z4m81QRaQR7iLapK5Co7eW27Zn2ZYh')
                    }}
                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    DAO Program
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {analytics.topProposals.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Предложения для анализа не найдены</p>
            </div>
          )}
        </SimpleCard>

      </div>

      {/* User Analytics */}
      <SimpleCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span>Ваша активность</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-indigo-400">
              {Math.round(parseFloat(analytics.userStats.userVotingPower) / 1e9)}
            </p>
            <p className="text-sm text-gray-400">TNG для голосования</p>
          </div>
          
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-blue-400">
              {analytics.userStats.userTotalVotes}
            </p>
            <p className="text-sm text-gray-400">Участие в голосованиях</p>
          </div>
          
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-green-400">
              {analytics.userStats.userProposalsCreated}
            </p>
            <p className="text-sm text-gray-400">Создано предложений</p>
          </div>
          
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-purple-400">
              {formatPercentage(analytics.userStats.userParticipationRate)}
            </p>
            <p className="text-sm text-gray-400">Процент участия</p>
          </div>
        </div>
      </SimpleCard>

      {/* Recent Activity */}
      <SimpleCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-orange-400" />
          <span>Недавняя активность</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 rounded-lg">
            <p className="text-2xl font-bold text-orange-400">
              {analytics.recentActivity.weeklyProposals}
            </p>
            <p className="text-sm text-gray-400">Предложений за неделю</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-lg">
            <p className="text-2xl font-bold text-cyan-400">
              {analytics.recentActivity.weeklyVotes}
            </p>
            <p className="text-sm text-gray-400">Голосов за неделю</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-lg">
            <p className="text-2xl font-bold text-violet-400">
              {analytics.recentActivity.monthlyProposals}
            </p>
            <p className="text-sm text-gray-400">Предложений за месяц</p>
          </div>
        </div>

        {analytics.recentActivity.lastProposal && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Последнее предложение:</p>
            <p className="text-white font-medium">
              {analytics.recentActivity.lastProposal.title}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {analytics.recentActivity.lastProposal.status}
              </Badge>
              <span className="text-xs text-gray-400">
                {new Date(analytics.recentActivity.lastProposal.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        )}
      </SimpleCard>

    </div>
  )
}
