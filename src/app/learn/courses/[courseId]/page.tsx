'use client'

/**
 * Course Detail Page - Страница курса
 * /learn/courses/[courseId]
 * Solana SuperApp Learn-to-Earn System
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Play,
  CheckCircle,
  Clock,
  Users,
  Award,
  BookOpen,
  Star,
  Trophy
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useCourse, useCourseProgress } from '@/hooks/useLearn'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

export default function CoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params?.courseId as string
  const { isAuthenticated, user, apiCall } = useCompatibleAuth()
  
  const { course, loading: courseLoading, error: courseError } = useCourse(courseId)
  const { data: progress, loading: progressLoading, refetch: refetchProgress } = useCourseProgress(courseId)

  const [isStarting, setIsStarting] = useState(false)

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/learn')
  }

  const handleStartCourse = async () => {
    if (!isAuthenticated) return
    
    setIsStarting(true)
    hapticFeedback.impact('medium')

    try {
      // Find first lesson
      const firstLesson = course?.lessons?.[0]
      if (firstLesson) {
        router.push(`/learn/courses/${courseId}/lessons/${firstLesson.id}`)
      }
    } catch (error) {
      console.error('Error starting course:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handleContinueCourse = () => {
    hapticFeedback.impact('light')
    
    // Find next incomplete lesson or first lesson
    const nextLesson = course?.lessons?.find(lesson => 
      !progress?.completedLessons?.includes(lesson.id)
    ) || course?.lessons?.[0]
    
    if (nextLesson) {
      router.push(`/learn/courses/${courseId}/lessons/${nextLesson.id}`)
    }
  }

  if (courseLoading || progressLoading) {
    return (
      <PageLayout title="Загрузка..." showBackButton onBackPress={handleBack}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </PageLayout>
    )
  }

  if (courseError || !course) {
    return (
      <PageLayout title="Ошибка" showBackButton onBackPress={handleBack}>
        <SimpleCard className="p-6 text-center">
          <p className="text-gray-400 mb-4">Курс не найден</p>
          <SimpleButton onClick={handleBack}>Вернуться</SimpleButton>
        </SimpleCard>
      </PageLayout>
    )
  }

  const isEnrolled = !!progress
  const completedLessons = progress?.completedLessons?.length || 0
  const totalLessons = course.lessons?.length || 0
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  return (
    <PageLayout title="" showBackButton onBackPress={handleBack}>
      <div className="space-y-5">
        {/* Top Bar with Back and Title for symmetry */}
        <div className="flex items-center justify-between px-1">
          <SimpleButton onClick={handleBack} className="!px-3 text-gray-300 hover:text-white">
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </div>
          </SimpleButton>
          <h1 className="text-base font-semibold text-white opacity-90 truncate text-right max-w-[65%]">
            {course.title}
          </h1>
        </div>
 
        {/* Course Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <SimpleCard className="p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                    {course.category}
                  </Badge>
                  <Badge variant="outline" className="text-green-400 border-green-500/30">
                    {course.level}
                  </Badge>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2 leading-snug">
                  {course.title}
                </h2>
                
                <p className="text-gray-300 mb-3">
                  {course.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration} мин</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{totalLessons} уроков</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>{course.totalRewardTokens} TNG</span>
                  </div>
                </div>
              </div>

              <div className="text-6xl opacity-15 shrink-0 select-none">
                {course.coverImage || ''}
              </div>
            </div>

            {/* Progress Bar */}
            {isEnrolled && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-300">Прогресс</span>
                  <span className="text-sm text-yellow-400">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex gap-3">
              {!isEnrolled ? (
                <SimpleButton
                  onClick={handleStartCourse}
                  disabled={isStarting}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
                >
                  {isStarting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      <span>Начинаем...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      <span>Начать обучение</span>
                    </div>
                  )}
                </SimpleButton>
              ) : progressPercent < 100 ? (
                <SimpleButton
                  onClick={handleContinueCourse}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    <span>Продолжить</span>
                  </div>
                </SimpleButton>
              ) : (
                <SimpleButton
                  onClick={handleContinueCourse}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span>Курс завершен</span>
                  </div>
                </SimpleButton>
              )}
            </div>
          </SimpleCard>
        </motion.div>

        {/* Course Stats */}
        {isEnrolled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SimpleCard className="p-4">
              <h3 className="text-white font-semibold mb-3">Ваша статистика</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{completedLessons}</div>
                  <div className="text-xs text-gray-400">Уроков завершено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{progress?.totalXpEarned || 0}</div>
                  <div className="text-xs text-gray-400">XP получено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{progress?.totalTokensEarned || 0}</div>
                  <div className="text-xs text-gray-400">TNG заработано</div>
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        )}

        {/* Lessons List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SimpleCard className="p-4">
            <h3 className="text-white font-semibold mb-4">Уроки курса</h3>
            <div className="space-y-3">
              {course.lessons?.map((lesson, index) => {
                const isCompleted = progress?.completedLessons?.includes(lesson.id)
                const prevId = course.lessons && course.lessons[index - 1] ? course.lessons[index - 1].id : undefined
                const isAccessible = isEnrolled && (index === 0 || (prevId ? progress?.completedLessons?.includes(prevId) : false))
                
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`p-4 rounded-lg border transition-all ${
                      isCompleted 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : isAccessible
                        ? 'bg-white/5 border-white/10 hover:border-yellow-500/30 cursor-pointer'
                        : 'bg-gray-800/50 border-gray-700/50 opacity-50'
                    }`}
                    onClick={() => {
                      if (isAccessible) {
                        hapticFeedback.impact('light')
                        router.push(`/learn/courses/${courseId}/lessons/${lesson.id}`)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-green-500' 
                            : isAccessible 
                            ? 'bg-yellow-500/20 border border-yellow-500/30' 
                            : 'bg-gray-700'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-sm font-medium text-gray-300">{index + 1}</span>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-white font-medium">{lesson.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration} мин</span>
                            <Award className="w-3 h-3" />
                            <span>{lesson.tokenReward} TNG</span>
                          </div>
                        </div>
                      </div>
                      
                      {isAccessible && !isCompleted && (
                        <Play className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </SimpleCard>
        </motion.div>
      </div>
    </PageLayout>
  )
}
