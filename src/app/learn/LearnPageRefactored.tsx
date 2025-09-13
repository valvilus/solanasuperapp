/**
 * Refactored Learn Page
 * Clean, modular Learn page using unified components and services
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { TabNavigation } from '@/components/learn/TabNavigation'
import { ExploreTab } from '@/components/learn/tabs/ExploreTab'
import { MyCoursesTab } from '@/components/learn/tabs/MyCoursesTab'
import { CertificatesView } from '@/components/learn/CertificatesView'
import { LeaderboardView } from '@/components/learn/LeaderboardView'
import { CourseDetailsModal } from '@/components/learn/CourseDetailsModal'
import { QuizModal } from '@/components/learn/QuizModal'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import ClientOnly from '@/components/common/ClientOnly'
import { useLearnState } from '@/features/learn/hooks/useLearnState'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { LearnTabType, Course, Quiz } from '@/types/learn.types'

// Mock stats - в реальном приложении будут приходить из unified service
const mockStats = {
  totalXP: 1250,
  totalTokens: 45.75,
  coursesCompleted: 3,
  currentStreak: 7,
  weeklyGoal: 5,
  weeklyProgress: 3
}

export default function LearnPageRefactored() {
  const router = useRouter()
  const { isAuthenticated } = useCompatibleAuth()
  
  // Learn state management
  const {
    state,
    setNotification,
    switchTab
  } = useLearnState()

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Handlers
  const handleBack = () => {
    router.push('/')
  }

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course)
    setShowCourseModal(true)
  }

  const handleQuizStart = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowQuizModal(true)
  }

  const handleModalClose = () => {
    setShowCourseModal(false)
    setShowQuizModal(false)
    setSelectedCourse(null)
    setSelectedQuiz(null)
  }

  // Tab content renderer
  const renderTabContent = () => {
    const handleCourseSelect = (course: Course) => {
      setSelectedCourse(course)
      setShowCourseModal(true)
    }
    
    const tabProps = { 
      isLoading,
      courses: [], // Empty array for now
      onCourseSelect: handleCourseSelect
    }
    
    switch (state.currentTab) {
      case 'explore':
        return <ExploreTab {...tabProps} />
      
      case 'my_courses':
        return <MyCoursesTab {...tabProps} userProgress={[]} />
      
      case 'certificates':
        return <CertificatesView certificates={[]} />
      
      case 'leaderboard':
        return <LeaderboardView entries={[]} />
      
      default:
        return <ExploreTab {...tabProps} />
    }
  }

  // Auto-refresh data when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true)
      // Simulate loading time
      setTimeout(() => setIsLoading(false), 1000)
    }
  }, [isAuthenticated])

  return (
    <ClientOnly fallback={<SolanaFullScreenLoader />}>
      <PageLayout
        title=""
        showBackButton={false}
        showBottomNav={true}
        className="pb-0"
      >
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LearnHeader
              totalXp={mockStats.totalXP}
              totalTokens={mockStats.totalTokens}
              completedCourses={mockStats.coursesCompleted}
              currentStreak={mockStats.currentStreak}
              onBack={handleBack}
              showBackButton={true}
            />
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="sticky top-0 bg-gray-900/95 backdrop-blur-md z-40 border-b border-white/5"
          >
            <div className="px-4 py-4">
              <TabNavigation
                activeTab={state.currentTab as LearnTabType}
                onTabChange={(tab: LearnTabType) => switchTab(tab)}
                tabs={[
                  { id: 'explore', label: 'Изучение' },
                  { id: 'my_courses', label: 'Мои курсы' },
                  { id: 'certificates', label: 'Сертификаты' },
                  { id: 'leaderboard', label: 'Рейтинг' }
                ]}
              />
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 pb-24 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Modals */}
          {selectedCourse && (
            <CourseDetailsModal
              course={selectedCourse}
              isOpen={showCourseModal}
              onClose={handleModalClose}
              onEnroll={async (courseId) => {
                try {
                  // Handle course enrollment using unified service
                  console.log('Enrolling in course:', courseId)
                  setNotification({
                    type: 'success',
                    message: 'Вы успешно записались на курс!'
                  })
                  handleModalClose()
                } catch (error) {
                  setNotification({
                    type: 'error',
                    message: 'Ошибка при записи на курс'
                  })
                }
              }}
              onStartLearning={async (course) => {
                try {
                  // Handle lesson start using unified service
                  console.log('Starting course:', course.id)
                  handleModalClose()
                  // Navigate to lesson
                } catch (error) {
                  setNotification({
                    type: 'error',
                    message: 'Ошибка при начале урока'
                  })
                }
              }}
            />
          )}

          {selectedQuiz && (
            <QuizModal
              quiz={selectedQuiz}
              isOpen={showQuizModal}
              onClose={handleModalClose}
              onComplete={async (result) => {
                try {
                  // Handle quiz submission using unified service
                  console.log('Submitting quiz:', selectedQuiz.id, result)
                  
                  // Simulate quiz result
                  const quizResult = {
                    score: 85,
                    percentage: 85,
                    isPassed: true,
                    xpEarned: 50,
                    tokensEarned: 25
                  }
                  
                  setNotification({
                    type: 'success',
                    message: `Квиз пройден! Заработано: ${quizResult.xpEarned} XP и ${quizResult.tokensEarned} токенов`
                  })
                  
                  handleModalClose()
                } catch (error) {
                  setNotification({
                    type: 'error',
                    message: 'Ошибка при прохождении квиза'
                  })
                  throw error
                }
              }}
            />
          )}
        </div>
      </PageLayout>
    </ClientOnly>
  )
}

// Export both as default and named export for flexibility
export { LearnPageRefactored }








