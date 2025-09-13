'use client'

import { motion } from 'framer-motion'
import { GraduationCap, TrendingUp, Trophy, Target, Zap, BookOpen, Eye, EyeOff } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { formatXP, formatTokens, getUserLevel } from '@/hooks/useLearn'

interface LearnStatsData {
  totalXp: number
  totalTokens: number
  completedCourses: number
  completedLessons: number
  currentStreak: number
  achievements: number
  avgScore: number
  learningTime: number // minutes
}

interface LearnStatsSectionProps {
  stats: LearnStatsData
  isVisible?: boolean
  onToggleVisibility?: () => void
  className?: string
}

const formatLearningTime = (minutes: number) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours} ч`
  }
  return `${minutes} мин`
}

export function LearnStatsSection({ 
  stats, 
  isVisible = true, 
  onToggleVisibility,
  className = '' 
}: LearnStatsSectionProps) {
  
  const userLevel = getUserLevel(stats.totalXp)
  
  const statCards = [
    {
      label: 'Общий опыт',
      value: isVisible ? formatXP(stats.totalXp) : '•••••',
      change: `Уровень ${userLevel.level}`,
      changeType: 'neutral',
      icon: GraduationCap,
      color: 'text-yellow-400'
    },
    {
      label: 'Заработано',
      value: isVisible ? formatTokens(stats.totalTokens) : '••••• TNG',
      change: 'За обучение',
      changeType: 'positive',
      icon: Trophy,
      color: 'text-green-400'
    },
    {
      label: 'Курсы завершено',
      value: stats.completedCourses.toString(),
      change: `${stats.completedLessons} уроков`,
      changeType: null,
      icon: BookOpen,
      color: 'text-blue-400'
    },
    {
      label: 'Средний балл',
      value: `${stats.avgScore}%`,
      change: 'За квизы',
      changeType: stats.avgScore >= 80 ? 'positive' : stats.avgScore >= 60 ? 'neutral' : 'negative',
      icon: Target,
      color: 'text-purple-400'
    }
  ]

  const getStreakBadgeStyle = (streak: number) => {
    if (streak >= 30) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (streak >= 14) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (streak >= 7) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const getStreakLabel = (streak: number) => {
    if (streak >= 30) return 'Легенда обучения!'
    if (streak >= 14) return 'Постоянный ученик'
    if (streak >= 7) return 'Активный ученик'
    if (streak >= 3) return 'Начинающий ученик'
    return 'Изредка учится'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with visibility toggle */}
      <motion.div
        className="flex items-center justify-between px-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-sm font-medium text-gray-300">Статистика обучения</h3>
        {onToggleVisibility && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleVisibility}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            {isVisible && <Eye className="w-4 h-4 text-gray-400" />}
            {!isVisible && <EyeOff className="w-4 h-4 text-gray-400" />}
          </motion.button>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    {stat.changeType === 'positive' && (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    )}
                    {stat.changeType === 'negative' && (
                      <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-lg font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-xs ${
                      stat.changeType === 'positive' ? 'text-green-400' : 
                      stat.changeType === 'negative' ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* User learning activity status */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <SimpleCard className="p-4 border border-white/10 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Ваша активность
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                Время обучения: {isVisible ? formatLearningTime(stats.learningTime) : '••••'}
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  {userLevel.title}
                </Badge>
                <Badge className={`${getStreakBadgeStyle(stats.currentStreak)} text-xs`}>
                  {getStreakLabel(stats.currentStreak)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {stats.currentStreak} дней
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}






