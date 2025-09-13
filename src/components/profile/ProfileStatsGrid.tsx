'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Calendar, 
  Zap, 
  Trophy, 
  Vote, 
  BookOpen,
  ArrowUpRight,
  Users,
  Coins,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { UserStats, UserRanking } from '@/features/profile/types'
import { formatLargeNumber, getStreakStatus, getChangeColor } from '@/features/profile/utils'

interface ProfileStatsGridProps {
  stats: UserStats
  ranking: UserRanking
  className?: string
}

export function ProfileStatsGrid({ stats, ranking, className = '' }: ProfileStatsGridProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const streakStatus = getStreakStatus(stats.currentStreak)
  
  const statCards = [
    {
      label: 'Активных дней',
      value: stats.totalActiveDays.toString(),
      change: `Страйк: ${stats.currentStreak} дн`,
      changeColor: streakStatus.color,
      icon: Calendar,
      color: 'text-blue-400',
      accent: streakStatus.icon
    },
    {
      label: 'Уровень',
      value: ranking.currentLevel.toString(),
      change: `+${ranking.weeklyXPGain} XP за неделю`,
      changeColor: 'text-green-400',
      icon: Trophy,
      color: 'text-yellow-400'
    },
    {
      label: 'DAO Активность',
      value: stats.votesSubmitted.toString(),
      change: `${stats.participationRate}% участие`,
      changeColor: 'text-solana-purple',
      icon: Vote,
      color: 'text-purple-400'
    },
    {
      label: 'Курсы пройдены',
      value: stats.coursesCompleted.toString(),
      change: `${stats.studyTimeHours}ч обучения`,
      changeColor: 'text-green-400',
      icon: BookOpen,
      color: 'text-green-400'
    },
    {
      label: 'NFT коллекция',
      value: stats.nftsOwned.toString(),
      change: `${stats.nftsCreated} создано`,
      changeColor: 'text-orange-400',
      icon: Target,
      color: 'text-orange-400'
    },
    {
      label: 'Социальная сеть',
      value: stats.friendsCount.toString(),
      change: `${stats.referralsCount} рефералов`,
      changeColor: 'text-cyan-400',
      icon: Users,
      color: 'text-cyan-400'
    }
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок */}
      <motion.div
        className="flex items-center justify-between px-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-sm font-medium text-gray-300">Статистика</h3>
        <Badge className="bg-gradient-to-r from-solana-purple/20 to-solana-green/20 text-white border-solana-purple/30 text-xs">
          Ранг #{ranking.rank}
        </Badge>
      </motion.div>

      {/* Основная статистика - всегда показана */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {statCards.slice(0, 2).map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <stat.icon className={`w-4 h-4 ${stat.color} group-hover:scale-110 transition-transform`} />
                    {stat.accent && (
                      <span className="text-lg">{stat.accent}</span>
                    )}
                    <TrendingUp className="w-3 h-3 text-green-400 opacity-60" />
                  </div>
                  
                  <div>
                    <p className="text-lg font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-xs ${stat.changeColor || 'text-gray-400'}`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Кнопка раскрытия */}
      <div className="px-5">
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer"
        >
          <SimpleCard className="p-3 border border-white/5 hover:border-white/10 transition-all duration-200 bg-white/5">
            <div className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors">
              <span className="text-sm font-medium">
                {isExpanded ? 'Скрыть статистику' : 'Показать всю статистику'}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </SimpleCard>
        </motion.div>
      </div>

      {/* Расширенная статистика */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {statCards.slice(2).map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200 group">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <stat.icon className={`w-4 h-4 ${stat.color} group-hover:scale-110 transition-transform`} />
                          <ArrowUpRight className="w-3 h-3 text-gray-500 opacity-60" />
                        </div>
                        
                        <div>
                          <p className="text-lg font-bold text-white">
                            {stat.value}
                          </p>
                          <p className="text-xs text-gray-400 mb-1">
                            {stat.label}
                          </p>
                          <p className={`text-xs ${stat.changeColor || 'text-gray-400'}`}>
                            {stat.change}
                          </p>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Сводная карточка */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <SimpleCard className="p-4 bg-gradient-to-r from-solana-purple/10 to-solana-green/5 border border-solana-purple/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Общий рейтинг
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                Топ {ranking.percentile.toFixed(1)}% пользователей
              </p>
              
              {/* Изменение ранга */}
              <div className="flex items-center gap-2">
                <Badge className="bg-solana-purple/20 text-solana-purple border-solana-purple/30 text-xs">
                  #{ranking.rank} место
                </Badge>
                
                {ranking.rankChange !== 0 && (
                  <Badge 
                    className={`text-xs ${
                      ranking.rankChange > 0 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {ranking.rankChange > 0 ? '+' : ''}{ranking.rankChange}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* XP информация */}
            <div className="text-right">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center mb-2">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-xs text-gray-400">
                {formatLargeNumber(ranking.totalXP)} XP
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}
