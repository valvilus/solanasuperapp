'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Lock, 
  Award, 
  Clock, 
  Users, 
  Star,
  BookOpen,
  Brain,
  Target,
  TrendingUp
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { QuizModal } from '@/components/learn/QuizModal'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'

// Data imports
import { solanaCompleteCourse, solanaCourseQuizzes } from '@/features/learn/data/solana-course-data'
import { Course, Lesson, Quiz, QuizAttempt } from '@/features/learn/types'
import { formatDuration, getLevelColor, getCategoryColor } from '@/features/learn/utils'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useAuth } from '../../../../contexts/AuthContext'

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useTelegram()
  const { apiCall, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [earnedTokens, setEarnedTokens] = useState(0)
  const [earnedXP, setEarnedXP] = useState(0)

  const courseId = params.courseId as string

  // Валидация courseId
  useEffect(() => {
    if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
      router.push('/learn')
      return
    }
  }, [courseId, router])

  // Загрузка курса
  useEffect(() => {
    const loadCourse = async () => {
      try {
        setIsLoading(true)
        
        // API endpoint для получения курса
        const apiEndpoint = `/api/learn/courses/${courseId}`
          
        const response = await apiCall(apiEndpoint)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setCourse(data.data)
            setIsEnrolled(data.data.isEnrolled)
          }
        }
      } catch (error) {
        console.error('Error loading course:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Загружаем курс только после авторизации
    if (courseId && !authLoading && isAuthenticated) {
      loadCourse()
    } else if (!authLoading && !isAuthenticated) {
      // Для неавторизованных пользователей показываем публичную информацию
      setIsLoading(false)
    }
  }, [courseId, apiCall, authLoading, isAuthenticated])

  // Запись на курс
  const handleEnroll = async () => {
    if (!course) return
    
    if (!isAuthenticated) {
      alert('Необходимо войти в систему для записи на курс')
      return
    }

    try {
      hapticFeedback.notification('success')
      
      // API запрос для записи на курс
      const apiEndpoint = `/api/learn/courses/${courseId}/enroll`
        
      const response = await apiCall(apiEndpoint, {
        method: 'POST'
      })

      if (response.ok) {
        setIsEnrolled(true)
        setCourse(prev => prev ? { ...prev, isEnrolled: true, studentsCount: prev.studentsCount + 1 } : null)
      }
    } catch (error) {
      console.error('Error enrolling in course:', error)
    }
  }

  // Начать урок
  const handleStartLesson = async (lesson: Lesson) => {
    if (!course || lesson.isLocked) return

    hapticFeedback.impact('medium')
    setCurrentLesson(lesson)

    // API запрос для начала урока
    try {
      await apiCall(`/api/learn/lessons/${lesson.id}/start`, {
        method: 'POST'
      })
      
      // Показываем уведомление что урок начат
      alert(`Урок "${lesson.title}" начат!\n\nСейчас вы можете изучать материал и затем завершить урок, нажав кнопку "Завершить".`)
      
    } catch (error) {
      console.error('Error starting lesson:', error)
      alert('Ошибка при запуске урока. Попробуйте еще раз.')
    }
  }

  // Завершить урок
  const handleCompleteLesson = async (lesson: Lesson) => {
    if (!course) return

    try {
      hapticFeedback.notification('success')
      
      // API запрос для завершения урока
      const apiEndpoint = `/api/learn/lessons/${lesson.id}/complete`
        
      const response = await apiCall(apiEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          timeSpent: lesson.duration * 60, // Конвертируем в секунды
          score: 100
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Обновляем статистику
        const tokensEarned = data.data?.tokensEarned || lesson.rewards?.[0]?.amount || 25
        const xpEarned = data.data?.xpEarned || lesson.xpReward || 50
        
        setEarnedTokens(prev => prev + tokensEarned)
        setEarnedXP(prev => prev + xpEarned)

        // Обновляем урок как завершенный
        setCourse(prev => {
          if (!prev) return null
          
          const updatedLessons = prev.lessons.map(l => 
            l.id === lesson.id ? { ...l, isCompleted: true } : l
          )
          
          const newProgressPercentage = Math.round((updatedLessons.filter(l => l.isCompleted).length / updatedLessons.length) * 100)
          
          return {
            ...prev,
            lessons: updatedLessons,
            progressPercentage: newProgressPercentage
          }
        })

        // Показываем успешное завершение
        alert(` Урок завершен!\n\n+${tokensEarned} TNG токенов\n+${xpEarned} XP\n\nОтличная работа!`)
        
        // Обновляем данные пользователя для синхронизации баланса
        if (typeof window !== 'undefined') {
          // Отправляем событие для обновления баланса в других компонентах
          window.dispatchEvent(new CustomEvent('tng-balance-updated', { 
            detail: { tokensEarned, source: 'lesson-completion' }
          }))
        }

        // Проверяем, есть ли квиз для этого урока
        const lessonQuiz = solanaCourseQuizzes.find(q => q.lessonId === lesson.id)
        if (lessonQuiz) {
          setCurrentQuiz(lessonQuiz)
          setShowQuizModal(true)
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error)
    }
  }

  // Завершение квиза
  // @ts-ignore
  const handleQuizComplete = async (attempt: QuizAttempt) => {
    if (!currentQuiz) return

    try {
      // API запрос для сохранения результатов квиза
      const apiEndpoint = `/api/learn/quizzes/${currentQuiz.id}/submit`
        
      const response = await apiCall(apiEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          answers: attempt.answers,
          timeSpent: attempt.timeSpent
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (attempt.isPassed) {
          // Обновляем статистику за квиз
          const tokensEarned = data.data?.tokensEarned || 25
          const xpEarned = data.data?.xpEarned || 50
          
          setEarnedTokens(prev => prev + tokensEarned)
          setEarnedXP(prev => prev + xpEarned)

          hapticFeedback.notification('success')
          alert(` Квиз пройден!\n\n+${tokensEarned} TNG токенов\n+${xpEarned} XP\n\nРезультат: ${attempt.score}%`)
          
          // Обновляем данные пользователя для синхронизации баланса
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tng-balance-updated', { 
              detail: { tokensEarned, source: 'quiz-completion' }
            }))
          }
        } else {
          alert(` Квиз не пройден\n\nРезультат: ${attempt.score}%\nНеобходимо набрать минимум ${currentQuiz?.passingScore || 70}%\n\nПопробуйте еще раз!`)
        }
      }

      setShowQuizModal(false)
      setCurrentQuiz(null)
    } catch (error) {
      console.error('Error submitting quiz:', error)
    }
  }

  if (authLoading || isLoading) {
    return (
      <SolanaFullScreenLoader 
        title="Загрузка курса"
        subtitle="Подготавливаем материалы..."
      />
    )
  }

  if (!course) {
    return (
      <PageLayout showBottomNav={true}>
        <div className="flex items-center justify-center min-h-[50vh] text-center">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Курс не найден</h2>
            <p className="text-gray-400 mb-4">Запрашиваемый курс не существует</p>
            <button
              onClick={() => router.push('/learn')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Вернуться к курсам
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout showBottomNav={true}>
      <div className="space-y-5 pb-safe">
        
        {/* Header */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h1 className="text-xl font-bold text-white">Курс</h1>
          </div>

          {/* Course Info */}
          <SimpleCard className="p-5 bg-gradient-to-r from-purple-500/10 to-blue-500/5 border-purple-500/20">
            <div className="space-y-4">
              {/* Title and badges */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {course.title}
                  </h2>
                  <span className="text-3xl ml-3">{course.coverImage}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={`${getCategoryColor(course.category)} bg-current/20 border-current/30`}>
                    {course.category}
                  </Badge>
                  <Badge className={`${getLevelColor(course.level)} bg-current/20 border-current/30`}>
                    {course.level}
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    {course.totalRewardTokens} TNG
                  </Badge>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{course.lessonsCount}</div>
                  <div className="text-xs text-gray-400">уроков</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{formatDuration(course.duration)}</div>
                  <div className="text-xs text-gray-400">время</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{course.studentsCount}</div>
                  <div className="text-xs text-gray-400">студентов</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{Number(course.rating).toFixed(1)}</div>
                  <div className="text-xs text-gray-400">рейтинг</div>
                </div>
              </div>

              {/* Progress or Enroll */}
              {isEnrolled ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Прогресс курса</span>
                    <span className="text-blue-400">{course.progressPercentage}%</span>
                  </div>
                  <Progress value={course.progressPercentage} className="h-2" />
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors touch-manipulation"
                >
                  Записаться на курс
                </button>
              )}
            </div>
          </SimpleCard>

          {/* Earned Stats */}
          {isEnrolled && (earnedTokens > 0 || earnedXP > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <SimpleCard className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/5 border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-medium">Заработано в этой сессии:</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-green-400 font-bold">+{earnedTokens}</span>
                      <span className="text-green-400 text-sm">TNG</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-blue-400 font-bold">+{earnedXP}</span>
                      <span className="text-blue-400 text-sm">XP</span>
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          )}
        </div>

        {/* Learning Objectives */}
        {isEnrolled && course.learningObjectives.length > 0 && (
          <div className="px-5">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Цели обучения:</h3>
            <SimpleCard className="p-4">
              <div className="space-y-2">
                {course.learningObjectives.map((objective, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{objective}</span>
                  </div>
                ))}
              </div>
            </SimpleCard>
          </div>
        )}

        {/* Lessons */}
        {isEnrolled && (
          <div className="px-5">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Уроки курса:</h3>
            <div className="space-y-3">
              {course.lessons.map((lesson, index) => (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <SimpleCard className={`p-4 border transition-all ${
                    lesson.isCompleted
                      ? 'border-green-500/30 bg-green-500/5'
                      : lesson.isLocked
                      ? 'border-white/5 bg-white/5'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}>
                    <div className="flex items-center space-x-4">
                      {/* Lesson Status Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                        lesson.isCompleted
                          ? 'bg-green-500/20 border-green-500/30'
                          : lesson.isLocked
                          ? 'bg-gray-500/20 border-gray-500/30'
                          : 'bg-blue-500/20 border-blue-500/30'
                      }`}>
                        {lesson.isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : lesson.isLocked ? (
                          <Lock className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Play className="w-5 h-5 text-blue-400" />
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white mb-1">{lesson.title}</h4>
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                          {lesson.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration} мин</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{lesson.xpReward} XP</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Award className="w-3 h-3" />
                            <span>+{lesson.rewards[0]?.amount || 0} TNG</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {!lesson.isLocked && (
                        <div className="flex flex-col space-y-2">
                          {lesson.isCompleted ? (
                            <button
                              onClick={() => handleStartLesson(lesson)}
                              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium touch-manipulation"
                            >
                              Повторить
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartLesson(lesson)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation"
                              >
                                {currentLesson?.id === lesson.id ? 'Продолжить' : 'Начать'}
                              </button>
                              {currentLesson?.id === lesson.id && (
                                <button
                                  onClick={() => handleCompleteLesson(lesson)}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation"
                                >
                                  Завершить
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </SimpleCard>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Course Not Enrolled Message */}
        {!isEnrolled && (
          <div className="px-5">
            <SimpleCard className="p-6 text-center border-dashed border-white/20">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">
                Запишитесь на курс
              </h3>
              <p className="text-gray-400 mb-4">
                Чтобы получить доступ к урокам и начать зарабатывать токены, необходимо записаться на курс
              </p>
              <button
                onClick={handleEnroll}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors touch-manipulation"
              >
                Записаться бесплатно
              </button>
            </SimpleCard>
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      <QuizModal
        quiz={currentQuiz}
        isOpen={showQuizModal}
        onClose={() => {
          setShowQuizModal(false)
          setCurrentQuiz(null)
        }}
        onComplete={handleQuizComplete}
      />
    </PageLayout>
  )
}