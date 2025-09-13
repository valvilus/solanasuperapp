'use client'

import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  ArrowRight, 
  CheckCircle, 
  Play,
  Award,
  Zap
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Course } from '@/lib/learn/types'
import { formatDuration, formatTokens, COURSE_CATEGORIES, COURSE_LEVELS } from '@/lib/learn/utils'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface CourseCardProps {
  course: Course
  index?: number
  onEnroll?: (courseId: string) => void
  onContinue?: (courseId: string) => void
  onView?: (courseId: string) => void
  className?: string
}

export function CourseCard({ 
  course, 
  index = 0, 
  onEnroll, 
  onContinue, 
  onView,
  className = '' 
}: CourseCardProps) {

  const categoryInfo = COURSE_CATEGORIES[course.category as keyof typeof COURSE_CATEGORIES]
  const levelInfo = COURSE_LEVELS[course.level as keyof typeof COURSE_LEVELS]

  const handleAction = () => {
    hapticFeedback.impact('light')
    
    if (course.isCompleted) {
      onView?.(course.id)
    } else if (course.isEnrolled) {
      onContinue?.(course.id)
    } else {
      onEnroll?.(course.id)
    }
  }

  const getActionButton = () => {
    if (course.isCompleted) {
      return {
        label: 'Просмотреть',
        icon: BookOpen,
        className: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30'
      }
    } else if (course.isEnrolled) {
      return {
        label: 'Продолжить',
        icon: Play,
        className: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30'
      }
    } else {
      return {
        label: 'Записаться',
        icon: ArrowRight,
        className: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30'
      }
    }
  }

  const actionButton = getActionButton()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className={className}
    >
      <SimpleCard className="p-5 border border-white/10 hover:border-white/20 transition-all duration-200 bg-white/5 backdrop-blur-sm">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryInfo?.color || 'bg-gray-500'}`}>
              <span className="text-2xl">{categoryInfo?.icon || ''}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white text-lg leading-tight line-clamp-2">
                  {course.title}
                </h3>
                {course.isCompleted && (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0 ml-2" />
                )}
              </div>

              <p className="text-gray-300 text-sm mb-3 line-clamp-2 leading-relaxed">
                {course.shortDescription || course.description}
              </p>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${levelInfo?.color || 'bg-gray-500'} text-xs`}>
                  {levelInfo?.icon} {levelInfo?.label || course.level}
                </Badge>
                <Badge className="bg-gray-700/50 text-gray-300 text-xs">
                  {categoryInfo?.label || course.category}
                </Badge>
                {course.certificateAvailable && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    Сертификат
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.studentsCount} студентов</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(course.duration)}</span>
                  </div>
                  {course.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-yellow-400">{course.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-yellow-400 font-semibold">
                  <Zap className="w-4 h-4" />
                  <span>{formatTokens(course.totalRewardTokens)}</span>
                </div>
              </div>

              {/* Progress bar for enrolled courses */}
              {course.isEnrolled && course.progressPercentage !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Прогресс</span>
                    <span>{course.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${course.progressPercentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              )}

              {/* Action button */}
              <SimpleButton
                onClick={handleAction}
                className={`w-full ${actionButton.className}`}
                size="sm"
              >
                <actionButton.icon className="w-4 h-4 mr-2" />
                {actionButton.label}
              </SimpleButton>
            </div>
          </div>
        </div>
      </SimpleCard>
    </motion.div>
  )
}






