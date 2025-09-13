'use client'

/**
 * Quiz Page - Standalone страница квиза
 * /learn/courses/[courseId]/lessons/[lessonId]/quiz
 * Solana SuperApp Learn-to-Earn System
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Clock,
  Award,
  Brain,
  Target,
  TrendingUp,
  RefreshCw,
  Trophy,
  Star
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLesson as useLessonHook, useQuizByLesson } from '@/hooks/useLearn'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { QuizAnswer } from '@/lib/learn/types'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useCompatibleAuth()
  
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string

  const { lesson, loading: lessonLoading } = useLessonHook(lessonId)
  const { quiz, loading: quizLoading, error: quizError, submitQuiz } = useQuizByLesson(lessonId)

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)

  // Используем quiz из нового хука, но fallback на lesson.quiz для совместимости
  const activeQuiz = quiz || lesson?.quiz
  const currentQuestion = activeQuiz?.questions[currentQuestionIndex]
  const totalQuestions = activeQuiz?.questions.length || 0
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0

  // Debug logging удален после решения проблемы

  // Initialize quiz
  useEffect(() => {
    if (activeQuiz && !quizStartTime) {
      setQuizStartTime(new Date())
      if (activeQuiz.timeLimit) {
        setTimeLeft(activeQuiz.timeLimit * 60) // Convert minutes to seconds
      }
    }
  }, [activeQuiz, quizStartTime])

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeLeft > 0 && !showResults) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeLeft, showResults])

  const handleAnswerSelect = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
    hapticFeedback?.impact?.('light')
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      hapticFeedback?.impact?.('medium')
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      hapticFeedback?.impact?.('light')
    }
  }

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || isSubmitting) return

    setIsSubmitting(true)
    hapticFeedback?.impact?.('heavy')

    try {
      const quizAnswers: QuizAnswer[] = activeQuiz.questions.map(question => ({
        questionId: question.id,
        answer: answers[question.id] || '',
        timeSpent: quizStartTime ? Math.floor((Date.now() - quizStartTime.getTime()) / 1000) : 0
      }))

      const totalTimeSpent = quizStartTime ? Math.floor((Date.now() - quizStartTime.getTime()) / 1000) : 0
      const result = await submitQuiz(quizAnswers, totalTimeSpent)

      if (result.success) {
        setQuizResult(result.result)
        setShowResults(true)
      } else {
        console.error('Quiz submission failed:', result.error)
        // Можно показать ошибку пользователю
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setQuizStartTime(new Date())
    setQuizResult(null)
    setShowResults(false)
    if (activeQuiz?.timeLimit) {
      setTimeLeft(activeQuiz.timeLimit * 60)
    }
    (hapticFeedback as any)?.('medium')
  }

  const handleBackToLesson = () => {
    hapticFeedback?.impact?.('light')
    router.push(`/learn/courses/${courseId}/lessons/${lessonId}`)
  }

  const handleBackToCourse = () => {
    hapticFeedback?.impact?.('light')
    router.push(`/learn/courses/${courseId}`)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const isAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false
  const canProceed = isAnswered || currentQuestionIndex === totalQuestions - 1
  const allQuestionsAnswered = activeQuiz?.questions.every(q => answers[q.id] !== undefined) || false

  if (lessonLoading || quizLoading) {
    return (
      <PageLayout title="Загрузка квиза..." showBackButton onBack={handleBackToLesson}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    )
  }

  if (quizError) {
    return (
      <PageLayout title="Ошибка" showBackButton onBack={handleBackToLesson}>
        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Ошибка загрузки квиза</h2>
          <p className="text-gray-400 mb-4">{quizError}</p>
          <SimpleButton onClick={() => router.push(`/learn/courses/${courseId}/lessons/${lessonId}`)}>
            Вернуться к уроку
          </SimpleButton>
        </div>
      </PageLayout>
    )
  }

  if (!lesson || !activeQuiz) {
    return (
      <PageLayout title="Квиз не найден" showBackButton onBack={handleBackToLesson}>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">Квиз не найден</div>
          <SimpleButton onClick={handleBackToLesson}>
            Вернуться к уроку
          </SimpleButton>
        </div>
      </PageLayout>
    )
  }

  if (showResults) {
    return (
      <PageLayout 
        title=""
        showBackButton
        onBack={handleBackToCourse}
        className="bg-gray-900"
      >
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 p-4">
          
          {/* Results Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">
              {quizResult?.isPassed ? '' : ''}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {quizResult?.isPassed ? 'Поздравляем!' : 'Попробуйте еще раз'}
            </h1>
            <p className="text-gray-300">
              {quizResult?.isPassed 
                ? 'Вы успешно прошли квиз!'
                : 'Изучите материал и попробуйте снова'
              }
            </p>
          </motion.div>

          {/* Results Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <SimpleCard className="p-4 bg-white/5 border-white/10 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {quizResult?.percentage || 0}%
              </div>
              <div className="text-sm text-gray-400">Результат</div>
            </SimpleCard>

            <SimpleCard className="p-4 bg-white/5 border-white/10 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {quizResult?.tokensEarned || 0}
              </div>
              <div className="text-sm text-gray-400">TNG заработано</div>
            </SimpleCard>

            <SimpleCard className="p-4 bg-white/5 border-white/10 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {quizResult?.xpEarned || 0}
              </div>
              <div className="text-sm text-gray-400">XP получено</div>
            </SimpleCard>

            <SimpleCard className="p-4 bg-white/5 border-white/10 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                {activeQuiz?.passingScore}%
              </div>
              <div className="text-sm text-gray-400">Проходной балл</div>
            </SimpleCard>
          </div>

          {/* Progress Bar */}
          <SimpleCard className="p-4 bg-white/5 border-white/10 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Прогресс</span>
              <span className="text-sm text-blue-400">{quizResult?.percentage || 0}%</span>
            </div>
            <Progress value={quizResult?.percentage || 0} className="mb-2" />
            <div className="text-xs text-gray-400 text-center">
              {quizResult?.isPassed ? 'Квиз пройден успешно!' : `Необходимо ${activeQuiz?.passingScore}% для прохождения`}
            </div>
          </SimpleCard>

          {/* Actions */}
          <div className="space-y-4">
            {quizResult?.isPassed ? (
              <SimpleButton
                onClick={handleBackToCourse}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Trophy className="w-5 h-5" />
                  <span>Продолжить курс</span>
                </div>
              </SimpleButton>
            ) : (
              <SimpleButton
                onClick={handleRetakeQuiz}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-5 h-5" />
                  <span>Пройти повторно</span>
                </div>
              </SimpleButton>
            )}

            <SimpleButton
              onClick={handleBackToLesson}
              className="w-full"
            >
              Вернуться к уроку
            </SimpleButton>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout 
      title=""
      showBackButton
      onBack={handleBackToLesson}
      className="bg-gray-900"
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
        
        {/* Quiz Header */}
        <div className="px-4 py-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                <Brain className="w-3 h-3 mr-1" />
                Квиз
              </Badge>
              {activeQuiz?.timeLimit && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-gray-400">
              {currentQuestionIndex + 1} / {totalQuestions}
            </div>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">{activeQuiz?.title}</h1>
          <p className="text-gray-300 text-sm">{activeQuiz?.description}</p>
          
          {/* Progress */}
          <div className="mt-4">
            <Progress value={progress} className="mb-2" />
            <div className="text-xs text-gray-400 text-center">
              Проходной балл: {activeQuiz?.passingScore}%
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SimpleCard className="p-6 bg-white/5 border-white/10 mb-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="bg-blue-500/20 rounded-full p-2 flex-shrink-0">
                    <span className="text-blue-400 font-semibold text-sm">
                      {currentQuestionIndex + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {currentQuestion?.question}
                    </h3>
                    <div className="text-xs text-gray-400">
                      {currentQuestion?.points} балл{currentQuestion?.points === 1 ? '' : currentQuestion?.points && currentQuestion.points < 5 ? 'а' : 'ов'}
                    </div>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="space-y-3">
                  {/* Debug logging удален после решения проблемы */}
                  {(currentQuestion?.type === 'multiple_choice' || (currentQuestion?.type as string) === 'MULTIPLE_CHOICE') && currentQuestion.options?.map((option, index) => (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        answers[currentQuestion.id] === option
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-white/10 bg-white/5 hover:border-white/20 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion.id] === option
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-400'
                        }`}>
                          {answers[currentQuestion.id] === option && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span>{option}</span>
                      </div>
                    </motion.button>
                  ))}

                  {(currentQuestion?.type === 'true_false' || (currentQuestion?.type as string) === 'TRUE_FALSE') && (
                    <div className="grid grid-cols-2 gap-4">
                      {[true, false].map((value) => (
                        <motion.button
                          key={value.toString()}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswerSelect(currentQuestion.id, value)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            answers[currentQuestion.id] === value
                              ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                              : 'border-white/10 bg-white/5 hover:border-white/20 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-center space-x-2">
                            {value ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                            <span>{value ? 'Верно' : 'Неверно'}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Debug предупреждения удалены после решения проблемы */}

                  {(currentQuestion?.type === 'text' || (currentQuestion?.type as string) === 'TEXT') && (
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                      placeholder="Введите ваш ответ..."
                      className="w-full p-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                      rows={4}
                    />
                  )}
                </div>
              </SimpleCard>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <SimpleButton
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              ← Назад
            </SimpleButton>

            <div className="flex items-center space-x-2">
              {currentQuestionIndex < totalQuestions - 1 ? (
                <SimpleButton
                  onClick={handleNextQuestion}
                  disabled={!isAnswered}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Далее →
                </SimpleButton>
              ) : (
                <SimpleButton
                  onClick={handleSubmitQuiz}
                  disabled={!allQuestionsAnswered || isSubmitting}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Отправка...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4" />
                      <span>Завершить квиз</span>
                    </div>
                  )}
                </SimpleButton>
              )}
            </div>
          </div>
        </div>

        {/* Quiz Info Footer */}
        <div className="px-4 pb-6">
          <SimpleCard className="p-4 bg-white/5 border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-blue-400">{activeQuiz?.passingScore}%</div>
                <div className="text-xs text-gray-400">Проходной балл</div>
              </div>
              <div>
                <div className="text-sm font-medium text-green-400">
                  {activeQuiz?.maxAttempts || '∞'}
                </div>
                <div className="text-xs text-gray-400">Попыток</div>
              </div>
              <div>
                <div className="text-sm font-medium text-purple-400">
                  {activeQuiz?.attemptsUsed || 0}
                </div>
                <div className="text-xs text-gray-400">Использовано</div>
              </div>
            </div>
          </SimpleCard>
        </div>
      </div>
    </PageLayout>
  )
}

