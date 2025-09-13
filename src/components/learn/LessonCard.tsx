'use client'

import { motion } from 'framer-motion'
import { 
  Play, 
  Clock, 
  CheckCircle, 
  Lock, 
  BookOpen, 
  Video, 
  FileText, 
  Gamepad2,
  HelpCircle,
  Star,
  Zap
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Lesson } from '@/lib/learn/types'
import { formatDuration, formatTokens, LESSON_TYPES } from '@/lib/learn/utils'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface LessonCardProps {
  lesson: Lesson
  index?: number
  onStart?: (lessonId: string) => void
  onContinue?: (lessonId: string) => void
  className?: string
}

export function LessonCard({ 
  lesson, 
  index = 0, 
  onStart, 
  onContinue,
  className = '' 
}: LessonCardProps) {

  const typeInfo = LESSON_TYPES[lesson.type as keyof typeof LESSON_TYPES]

  const handleAction = () => {
    hapticFeedback.impact('light')
    
    if (lesson.isCompleted) {
      // Already completed, maybe show review option
      return
    } else if (lesson.progress && lesson.progress > 0) {
      onContinue?.(lesson.id)
    } else {
      onStart?.(lesson.id)
    }
  }

  const getActionButton = () => {
    if (lesson.isLocked) {
      return {
        label: 'Заблокирован',
        icon: Lock,
        className: 'bg-gray-700/50 text-gray-400 cursor-not-allowed',
        disabled: true
      }
    } else if (lesson.isCompleted) {
      return {
        label: 'Завершен',
        icon: CheckCircle,
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        disabled: false
      }
    } else if (lesson.progress && lesson.progress > 0) {
      return {
        label: 'Продолжить',
        icon: Play,
        className: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30',
        disabled: false
      }
    } else {
      return {
        label: 'Начать',
        icon: Play,
        className: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30',
        disabled: false
      }
    }
  }

  const actionButton = getActionButton()

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={className}
    >
      <SimpleCard className={`p-4 border transition-all duration-200 ${
        lesson.isLocked 
          ? 'border-gray-700/50 bg-gray-800/30' 
          : lesson.isCompleted
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-white/10 hover:border-white/20 bg-white/5'
      } backdrop-blur-sm`}>
        <div className="flex items-center gap-4">
          {/* Lesson number and type icon */}
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center relative ${
              lesson.isCompleted 
                ? 'bg-green-500/20 border border-green-500/30' 
                : lesson.isLocked
                ? 'bg-gray-700/50 border border-gray-600/50'
                : typeInfo?.color || 'bg-gray-800/50 border border-gray-700/50'
            }`}>
              {lesson.isLocked ? (
                <Lock className="w-5 h-5 text-gray-400" />
              ) : lesson.isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                (() => {
                  const IconComponent = typeInfo.icon === 'Video' ? Video :
                                      typeInfo.icon === 'FileText' ? FileText :
                                      typeInfo.icon === 'Gamepad2' ? Gamepad2 :
                                      typeInfo.icon === 'HelpCircle' ? HelpCircle : FileText;
                  return <IconComponent className={`w-5 h-5 ${lesson.isLocked ? 'text-gray-400' : 'text-white'}`} />;
                })()
              )}
              
              {/* Lesson number */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-gray-300">
                  {lesson.order}
                </span>
              </div>
            </div>
          </div>

          {/* Lesson content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className={`font-semibold leading-tight line-clamp-1 ${
                lesson.isLocked ? 'text-gray-400' : 'text-white'
              }`}>
                {lesson.title}
              </h4>
              
              {/* Rewards */}
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {lesson.xpReward > 0 && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    {lesson.xpReward} XP
                  </Badge>
                )}
                {lesson.tokenReward > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {formatTokens(lesson.tokenReward)}
                  </Badge>
                )}
              </div>
            </div>

            <p className={`text-sm mb-3 line-clamp-2 ${
              lesson.isLocked ? 'text-gray-500' : 'text-gray-300'
            }`}>
              {lesson.description}
            </p>

            {/* Progress bar for started lessons */}
            {lesson.progress !== undefined && lesson.progress > 0 && !lesson.isCompleted && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Прогресс</span>
                  <span>{lesson.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${lesson.progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
              </div>
            )}

            {/* Bottom row - Improved responsive layout */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(() => {
                    const IconComponent = typeInfo.icon === 'Video' ? Video :
                                        typeInfo.icon === 'FileText' ? FileText :
                                        typeInfo.icon === 'Gamepad2' ? Gamepad2 :
                                        typeInfo.icon === 'HelpCircle' ? HelpCircle : FileText;
                    return <IconComponent className="w-3 h-3" />;
                  })()}
                  <span className="hidden sm:inline">{typeInfo.label}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(lesson.duration)}</span>
                </div>
                {lesson.quiz && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <HelpCircle className="w-3 h-3" />
                    <span className="hidden sm:inline">Квиз</span>
                  </div>
                )}
              </div>

              <SimpleButton
                onClick={handleAction}
                disabled={actionButton.disabled}
                className={`${actionButton.className} px-2 py-1 text-xs flex-shrink-0`}
                size="sm"
              >
                <actionButton.icon className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">{actionButton.label}</span>
              </SimpleButton>
            </div>
          </div>
        </div>
      </SimpleCard>
    </motion.div>
  )
}






