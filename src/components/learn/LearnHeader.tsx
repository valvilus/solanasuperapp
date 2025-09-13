'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Settings, GraduationCap, TrendingUp, Zap, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatXP, formatTokens } from '@/hooks/useLearn'

interface LearnHeaderProps {
  title?: string
  subtitle?: string
  totalXp?: number
  totalTokens?: number
  completedCourses?: number
  currentStreak?: number
  onOpenSettings?: () => void
  onBack?: () => void
  showBackButton?: boolean
}

export function LearnHeader({
  title = 'Learn to Earn',
  subtitle = 'Изучайте и зарабатывайте TNG',
  totalXp = 0,
  totalTokens = 0,
  completedCourses = 0,
  currentStreak = 0,
  onOpenSettings,
  onBack,
  showBackButton = false
}: LearnHeaderProps) {
  return (
    <motion.div
      className="px-5 pt-4 pb-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </motion.button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              <GraduationCap className="w-6 h-6 text-yellow-400 inline mr-2" />
              <span className="text-yellow-400">Learn</span> to Earn
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedCourses > 0 && (
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs">
              {completedCourses} завершено
            </Badge>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>
      </div>

      {/* Quick stats */}
      {(totalTokens > 0 || totalXp > 0) && (
        <motion.div
          className="flex items-center gap-4 text-xs text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            <span>{formatXP(totalXp)} заработано</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-yellow-400">
              {formatTokens(totalTokens)} TNG
            </span>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{currentStreak} дней streak</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}






