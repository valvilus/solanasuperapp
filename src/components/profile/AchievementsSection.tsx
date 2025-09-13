'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Lock, Sparkles, Award, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Achievement } from '@/features/profile/types'
import { 
  getAchievementTierColor, 
  getAchievementTierGradient,
  isRecentAchievement 
} from '@/features/profile/utils'

interface AchievementsSectionProps {
  achievements: Achievement[]
  onAchievementClick?: (achievement: Achievement) => void
  showAll?: boolean
  className?: string
}

interface AchievementCardProps {
  achievement: Achievement
  index: number
  onClick?: (achievement: Achievement) => void
}

function AchievementCard({ achievement, index, onClick }: AchievementCardProps) {
  const tierColor = getAchievementTierColor(achievement.tier)
  const tierGradient = getAchievementTierGradient(achievement.tier)
  const isNew = isRecentAchievement(achievement.unlockedAt)
  const isCompleted = !achievement.isLocked
  const progress = achievement.progress && achievement.maxProgress 
    ? (achievement.progress / achievement.maxProgress) * 100 
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.4,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
              <SimpleCard 
        className={`p-3 cursor-pointer relative overflow-hidden bg-gradient-to-br ${tierGradient} ${
          achievement.isLocked ? 'opacity-75' : ''
        } border border-white/10 hover:border-white/20 transition-all duration-300 h-full`}
        onClick={() => onClick?.(achievement)}
      >
        {/* Новое достижение - сияние */}
        {isNew && isCompleted && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20"
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Заблокированный overlay */}
        {achievement.isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        )}

        <div className="relative z-10">
          {/* Заголовок */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="text-lg flex-shrink-0">{achievement.icon}</div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-semibold text-xs leading-tight ${isCompleted ? 'text-white' : 'text-gray-400'} line-clamp-1`}>
                  {achievement.title}
                </h4>
                <Badge 
                  className={`text-xs mt-1 ${tierColor} bg-transparent border-current px-1 py-0.5`}
                  variant="outline"
                >
                  {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
                </Badge>
              </div>
            </div>
            
            {/* Индикаторы */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {isNew && isCompleted && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                </motion.div>
              )}
              
              {isCompleted && (
                <Trophy className={`w-3 h-3 ${tierColor}`} />
              )}
            </div>
          </div>

          {/* Описание */}
          <p className="text-xs text-gray-400 mb-2 leading-tight line-clamp-2">
            {achievement.description}
          </p>

          {/* Прогресс */}
          {achievement.progress !== undefined && achievement.maxProgress && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Прогресс</span>
                <span>{achievement.progress} / {achievement.maxProgress}</span>
              </div>
              <Progress 
                value={progress} 
                className="h-1.5"
              />
            </div>
          )}

          {/* Награда - компактно */}
          {achievement.reward && isCompleted && (
            <div className="flex items-center gap-1 p-1.5 rounded-md bg-white/5">
              <Award className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />
              <span className="text-xs text-yellow-400 truncate">
                {achievement.reward.type === 'token' && `+${achievement.reward.amount} ${achievement.reward.tokenSymbol}`}
                {achievement.reward.type === 'nft' && 'NFT'}
                {achievement.reward.type === 'badge' && achievement.reward.title}
                {achievement.reward.type === 'title' && achievement.reward.title}
              </span>
            </div>
          )}

          {/* Дата получения - компактно */}
          {achievement.unlockedAt && isCompleted && (
            <div className="mt-1 text-xs text-gray-500 truncate">
              {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
            </div>
          )}
        </div>
      </SimpleCard>
    </motion.div>
  )
}

export function AchievementsSection({ 
  achievements, 
  onAchievementClick, 
  showAll = false,
  className = '' 
}: AchievementsSectionProps) {
  
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Сортируем достижения: сначала новые и разблокированные, потом заблокированные
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.isLocked && !b.isLocked) return 1
    if (!a.isLocked && b.isLocked) return -1
    if (a.isNew && !b.isNew) return -1
    if (!a.isNew && b.isNew) return 1
    return 0
  })

  const displayedAchievements = isExpanded ? sortedAchievements : sortedAchievements.slice(0, 4)
  const unlockedCount = achievements.filter(a => !a.isLocked).length
  const totalCount = achievements.length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок секции */}
      <motion.div
        className="flex items-center justify-between px-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-300">Достижения</h3>
          <Badge className="bg-solana-purple/20 text-solana-purple border-solana-purple/30 text-xs">
            {unlockedCount}/{totalCount}
          </Badge>
        </div>
        
        {/* Общий прогресс */}
        <div className="flex items-center gap-2">
          <div className="w-16 bg-white/10 rounded-full h-1">
            <motion.div
              className="h-full bg-gradient-to-r from-solana-purple to-solana-green rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {Math.round((unlockedCount / totalCount) * 100)}%
          </span>
        </div>
      </motion.div>

      {/* Сетка достижений - первые 4 */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {sortedAchievements.slice(0, 4).map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              index={index}
              onClick={onAchievementClick}
            />
          ))}
        </div>
      </div>

      {/* Кнопка раскрытия достижений */}
      {achievements.length > 4 && (
        <div className="px-5">
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer"
          >
            <SimpleCard className="p-3 border border-white/5 hover:border-white/10 transition-all duration-200 bg-white/5">
              <div className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isExpanded ? 'Скрыть достижения' : 'Показать все достижения'}
                </span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                  {isExpanded ? '-' : '+'}{achievements.length - 4}
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
      )}

      {/* Дополнительные достижения */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5">
              <div className="grid grid-cols-2 gap-3">
                {sortedAchievements.slice(4).map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <AchievementCard
                      achievement={achievement}
                      index={index + 4}
                      onClick={onAchievementClick}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Статистика */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <SimpleCard className="p-4 bg-gradient-to-r from-white/5 to-white/2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">{unlockedCount}</div>
              <div className="text-xs text-gray-400">Получено</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">
                {achievements.filter(a => a.tier === 'gold' || a.tier === 'platinum' || a.tier === 'diamond').filter(a => !a.isLocked).length}
              </div>
              <div className="text-xs text-gray-400">Редких</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">
                {achievements.filter(a => isRecentAchievement(a.unlockedAt)).length}
              </div>
              <div className="text-xs text-gray-400">Недавних</div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}
