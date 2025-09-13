'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'
import ClientOnly from '@/components/common/ClientOnly'
import { useBottomNavigation } from '@/components/navigation/BottomTabBar'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useRouter } from 'next/navigation'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { BookOpen, GraduationCap } from 'lucide-react'

// Learn Components
import {
  LearnHeader,
  LearnTabs,
  LearnStatsSection,
  LearnQuickActions,
  CourseCard,
  LessonCard,
  QuizInterface
} from '@/components/learn'
import { LearnPageSkeleton } from '@/components/learn/LearnPageSkeleton'

// Business Logic & Data
import { 
  useCourses, 
  useUserProgress, 
  useLeaderboard, 
  useCategories,
  formatXP,
  formatTokens
} from '@/hooks/useLearn'
import { CourseFilters } from '@/lib/learn/types'
import { LearnTabType } from '@/components/learn/LearnTabs'

export default function LearnPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<LearnTabType>('courses')
  const [courseFilters, setCourseFilters] = useState<CourseFilters>({})
  const [showStatsDetails, setShowStatsDetails] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  
  const { navigateTo } = useBottomNavigation()
  const { isAuthenticated, user, apiCall } = useCompatibleAuth()
  const router = useRouter()
  
  // Data hooks
  const coursesData = useCourses(courseFilters)
  const userProgress = useUserProgress()
  const leaderboard = useLeaderboard()
  const categories = useCategories()

  // Loading state based on real data
  useEffect(() => {
    const allDataLoaded = (
      !coursesData.loading &&
      !userProgress.loading &&
      !leaderboard.loading &&
      !categories.loading
    )

    if (allDataLoaded) {
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    } else {
      setIsLoading(true)
    }
  }, [
    coursesData.loading,
    userProgress.loading,
    leaderboard.loading,
    categories.loading
  ])

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // Handle back navigation
  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    hapticFeedback.impact('light')
    
    switch (action) {
      case 'explore':
        setActiveTab('explore')
        break
      case 'search':
        showNotification('info', 'Поиск курсов...')
        break
      case 'achievements':
        setActiveTab('achievements')
        break
      case 'leaderboard':
        setActiveTab('leaderboard')
        break
      case 'progress':
        setActiveTab('progress')
        break
      case 'create':
        router.push('/learn/create')
        break
      default:
        break
    }
  }

  // Handle course actions
  const handleCourseEnroll = async (courseId: string) => {
    hapticFeedback.impact('medium')
    
    if (!isAuthenticated) {
      showNotification('error', 'Необходимо войти в систему')
      return
    }
    
    try {
      // Записываемся на курс через API
      const response = await apiCall(`/api/learn/courses/${courseId}/enroll`, {
        method: 'POST'
      })

      if (response.ok) {
        showNotification('success', 'Вы записались на курс!')
        await coursesData.refetch()
        
        // Перенаправляем на страницу курса для начала обучения
        router.push(`/learn/courses/${courseId}`)
      } else {
        showNotification('error', 'Ошибка записи на курс')
      }
    } catch (error) {
      console.error('Error enrolling in course:', error)
      showNotification('error', 'Ошибка записи на курс')
    }
  }

  const handleCourseContinue = (courseId: string) => {
    hapticFeedback.impact('light')
    router.push(`/learn/courses/${courseId}`)
  }

  const handleCourseView = (courseId: string) => {
    hapticFeedback.impact('light')
    router.push(`/learn/courses/${courseId}`)
  }

  const LoadingFallback = () => <LearnPageSkeleton />

  // Error handling
  const hasErrors = (
    coursesData.error ||
    userProgress.error ||
    leaderboard.error ||
    categories.error
  )

  // silent error collection for production

  // Get user stats for header
  const userStats = userProgress.progress ? {
    totalXp: userProgress.progress.totalXp,
    totalTokens: userProgress.progress.totalTokens,
    completedCourses: userProgress.progress.completedCourses,
    currentStreak: userProgress.progress.currentStreak
  } : {
    totalXp: 0,
    totalTokens: 0,
    completedCourses: 0,
    currentStreak: 0
  }

  const learnStats = userProgress.progress ? {
    totalXp: userProgress.progress.totalXp,
    totalTokens: userProgress.progress.totalTokens,
    completedCourses: userProgress.progress.completedCourses,
    completedLessons: userProgress.progress.completedLessons,
    currentStreak: userProgress.progress.currentStreak,
    achievements: userProgress.progress.achievements.length,
    avgScore: 85, // TODO: Calculate from quiz results
    learningTime: 240 // TODO: Calculate from lesson progress
  } : {
    totalXp: 0,
    totalTokens: 0,
    completedCourses: 0,
    completedLessons: 0,
    currentStreak: 0,
    achievements: 0,
    avgScore: 0,
    learningTime: 0
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'courses':
        return (
          <div className="space-y-4">
            <div className="px-5">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Популярные курсы</h3>
              
              {coursesData.loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <SimpleCard className="p-5 border border-white/10">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-gray-700/50 rounded-xl" />
                          <div className="flex-1 space-y-3">
                            <div className="h-5 bg-gray-700/50 rounded w-3/4" />
                            <div className="h-4 bg-gray-700/50 rounded w-full" />
                            <div className="h-4 bg-gray-700/50 rounded w-1/2" />
                          </div>
                        </div>
                      </SimpleCard>
                    </div>
                  ))}
                </div>
              ) : coursesData.courses.length > 0 ? (
                <div className="space-y-4">
                  {coursesData.courses.map((course, index) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      index={index}
                      onEnroll={handleCourseEnroll}
                      onContinue={handleCourseContinue}
                      onView={handleCourseView}
                    />
                  ))}
                </div>
              ) : (
                <SimpleCard className="p-8 text-center border-dashed border-white/20">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Курсы скоро появятся!</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Мы готовим для вас интересные курсы по блокчейну и DeFi
                  </p>
                  <SimpleButton
                    onClick={() => handleQuickAction('explore')}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
                  >
                    Узнать больше
                  </SimpleButton>
                </SimpleCard>
              )}
            </div>
          </div>
        )

      case 'my-learning':
        return (
          <div className="px-5">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Мое обучение</h3>
            
            {isAuthenticated ? (
              <div className="space-y-4">
                {userProgress.progress?.completedCourses ? (
                  <SimpleCard className="p-5">
                    <h4 className="text-white font-medium mb-3">Ваш прогресс</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Курсы завершено</span>
                        <span className="text-white">{userProgress.progress.completedCourses}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Общий опыт</span>
                        <span className="text-yellow-400">{formatXP(userProgress.progress.totalXp)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Заработано токенов</span>
                        <span className="text-green-400">{formatTokens(userProgress.progress.totalTokens)}</span>
                      </div>
                    </div>
                  </SimpleCard>
                ) : (
                  <SimpleCard className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      
                    </div>
                    <h4 className="text-white font-semibold mb-2">Начните обучение</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Выберите курс и начните зарабатывать токены
                    </p>
                    <SimpleButton
                      onClick={() => setActiveTab('courses')}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
                    >
                      Выбрать курс
                    </SimpleButton>
                  </SimpleCard>
                )}
              </div>
            ) : (
              <SimpleCard className="p-8 text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  
                </div>
                <h4 className="text-white font-semibold mb-2">Войдите в аккаунт</h4>
                <p className="text-gray-400 text-sm">
                  Для отслеживания прогресса необходима авторизация
                </p>
              </SimpleCard>
            )}
          </div>
        )

      case 'explore':
        return (
          <div className="px-5">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Категории</h3>
            
            {categories.loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <SimpleCard className="p-4">
                      <div className="w-8 h-8 bg-gray-700 rounded-lg mb-3" />
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </SimpleCard>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories.categories.map((category, index) => (
                  <motion.button
                    key={category.category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setCourseFilters({ category: category.category })
                      setActiveTab('courses')
                    }}
                    className="text-left"
                  >
                    <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all">
                      <div className="space-y-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {category.category.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm mb-1 capitalize">
                            {category.category}
                          </h4>
                          <p className="text-gray-400 text-xs">
                            {category.coursesCount} курсов
                          </p>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )

      case 'leaderboard':
        return (
          <div className="px-5">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Топ учеников</h3>
            
            {leaderboard.loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <SimpleCard className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-700 rounded w-1/2 mb-1" />
                          <div className="h-3 bg-gray-700 rounded w-1/4" />
                        </div>
                        <div className="h-4 bg-gray-700 rounded w-16" />
                      </div>
                    </SimpleCard>
                  </div>
                ))}
              </div>
            ) : leaderboard.leaderboard ? (
              <div className="space-y-3">
                {leaderboard.leaderboard.entries.slice(0, 10).map((entry, index) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <SimpleCard className={`p-4 ${
                      entry.isCurrentUser 
                        ? 'border-yellow-500/30 bg-yellow-500/5' 
                        : 'border-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          entry.rank === 1 ? 'bg-yellow-500 text-black' :
                          entry.rank === 2 ? 'bg-gray-300 text-black' :
                          entry.rank === 3 ? 'bg-orange-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {entry.rank}
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">
                            {entry.displayName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {entry.completedCourses} курсов • {formatXP(entry.totalXp)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-yellow-400 font-semibold text-sm">
                            {formatTokens(entry.totalTokens)}
                          </p>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <SimpleCard className="p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  
                </div>
                <h4 className="text-white font-semibold mb-2">Рейтинг пуст</h4>
                <p className="text-gray-400 text-sm">
                  Станьте первым в таблице лидеров!
                </p>
              </SimpleCard>
            )}
          </div>
        )

      default:
        return (
          <div className="px-5">
            <SimpleCard className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                
              </div>
              <h4 className="text-white font-semibold mb-2">В разработке</h4>
              <p className="text-gray-400 text-sm">
                Эта функция скоро будет доступна
              </p>
            </SimpleCard>
          </div>
        )
    }
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {isLoading ? (
        <LoadingFallback />
      ) : (
        <>
          {/* 3D Background */}
          <div className="fixed inset-0 opacity-10">
            <Scene3DBackground />
          </div>
          
          <PageLayout showBottomNav={true}>
            <div className="space-y-5 pb-safe ultra-smooth-scroll no-horizontal-scroll mobile-scroll-container overflow-y-auto">
            
              {/* HEADER */}
              <LearnHeader
                {...userStats}
                onOpenSettings={() => handleQuickAction('progress')}
                showBackButton={true}
                onBack={handleBack}
              />

              {/* STATS SECTION - только для вкладки courses */}
              {activeTab === 'courses' && isAuthenticated && (
                <LearnStatsSection 
                  stats={learnStats}
                  isVisible={showStatsDetails}
                  onToggleVisibility={() => setShowStatsDetails(!showStatsDetails)}
                />
              )}

              {/* QUICK ACTIONS - только для вкладки courses */}
              {activeTab === 'courses' && (
                <LearnQuickActions onAction={handleQuickAction} />
              )}

              {/* TABS */}
              <LearnTabs activeTab={activeTab} onChange={setActiveTab} />
              
              {/* MAIN CONTENT */}
              <div className="px-0">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {renderTabContent()}
                </motion.div>
              </div>

            </div>
          </PageLayout>
          
          {/* Notification Toast */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className={`
                  fixed top-4 left-4 right-4 p-4 rounded-xl backdrop-blur-sm z-[110]
                  ${notification.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                    notification.type === 'error' ? 'bg-red-500/20 border border-red-500/30' :
                    'bg-blue-500/20 border border-blue-500/30'
                  }
                `}
              >
                <p className="text-white font-medium">{notification.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </ClientOnly>
  )
}