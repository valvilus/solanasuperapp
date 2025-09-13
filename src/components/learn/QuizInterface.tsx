'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle,
  AlertTriangle,
  Trophy,
  Star
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Quiz, QuizAnswer } from '@/types/learn.types'
import { QuizResult } from '@/lib/learn/types'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface QuizInterfaceProps {
  quiz: Quiz
  onSubmit: (answers: QuizAnswer[]) => Promise<{ success: boolean; result?: QuizResult; error?: string }>
  onClose?: () => void
}

export function QuizInterface({ quiz, onSubmit, onClose }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.timeLimit ? quiz.timeLimit * 60 : null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1
  const canGoNext = answers[currentQuestion?.id] !== undefined
  const allQuestionsAnswered = quiz.questions.every(q => answers[q.id] !== undefined)

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResult) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleSubmit() // Auto-submit when time runs out
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, showResult])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = (questionId: string, answer: any) => {
    hapticFeedback.selection()
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      hapticFeedback.impact('light')
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      hapticFeedback.impact('light')
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!allQuestionsAnswered && timeLeft !== 0) {
      hapticFeedback.notification('error')
      return
    }

    setIsSubmitting(true)
    hapticFeedback.impact('heavy')

    try {
      const quizAnswers = quiz.questions.map(question => ({
        questionId: question.id,
        answer: answers[question.id] || '',
        timeSpent: 0 // Could track per question if needed
      })) as any

      const response = await onSubmit(quizAnswers)
      
      if (response.success && response.result) {
        setResult(response.result)
        setShowResult(true)
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestion = (question: any) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option: string, index: number) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  answers[question.id] === option
                    ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    answers[question.id] === option
                      ? 'border-yellow-500 bg-yellow-500'
                      : 'border-gray-400'
                  }`}>
                    {answers[question.id] === option && (
                      <div className="w-full h-full rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )

      case 'true_false':
        return (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((value) => (
              <motion.button
                key={value.toString()}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(question.id, value)}
                className={`p-4 rounded-lg border text-center transition-all ${
                  answers[question.id] === value
                    ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {value ? (
                  <>
                    <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                    <span>Верно</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 mx-auto mb-2" />
                    <span>Неверно</span>
                  </>
                )}
              </motion.button>
            ))}
          </div>
        )

      case 'text':
        return (
          <div>
            <textarea
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              placeholder="Введите ваш ответ..."
              className="w-full p-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-yellow-500/50 focus:outline-none resize-none"
              rows={4}
            />
          </div>
        )

      default:
        return null
    }
  }

  if (showResult && result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <SimpleCard className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            result.isPassed 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            {result.isPassed ? (
              <Trophy className="w-8 h-8 text-green-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            {result.isPassed ? 'Поздравляем!' : 'Попробуйте еще раз'}
          </h3>
          
          <p className="text-gray-300 mb-4">
            Ваш результат: {result.percentage}% ({result.score}/{result.totalPoints} баллов)
          </p>

          {result.isPassed && (
            <div className="space-y-2 mb-4">
              {result.xpEarned > 0 && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Star className="w-4 h-4 mr-1" />
                  +{result.xpEarned} XP
                </Badge>
              )}
              {result.tokensEarned > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Trophy className="w-4 h-4 mr-1" />
                  +{result.tokensEarned} TNG
                </Badge>
              )}
            </div>
          )}

          <SimpleButton
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            Продолжить
          </SimpleButton>
        </SimpleCard>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{quiz.title}</h2>
          <p className="text-sm text-gray-400">
            Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}
          </p>
        </div>
        
        {timeLeft !== null && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className={`text-sm font-mono ${
              timeLeft < 60 ? 'text-red-400' : 'text-gray-300'
            }`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <SimpleCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-3 leading-relaxed">
                {currentQuestion?.question}
              </h3>
              
              {currentQuestion && renderQuestion(currentQuestion)}
              
              {currentQuestion?.explanation && answers[currentQuestion.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                >
                  <p className="text-sm text-blue-300">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    {currentQuestion.explanation}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </SimpleCard>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <SimpleButton
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className="text-gray-400 hover:text-white disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </SimpleButton>

        <div className="flex items-center gap-2">
          {!isLastQuestion ? (
            <SimpleButton
              onClick={handleNext}
              disabled={!canGoNext}
              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30 disabled:opacity-50"
            >
              Далее
              <ArrowRight className="w-4 h-4 ml-2" />
            </SimpleButton>
          ) : (
            <SimpleButton
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered || isSubmitting}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Завершить
            </SimpleButton>
          )}
        </div>
      </div>

      {/* Quiz info */}
      <div className="text-center text-xs text-gray-400">
        <p>Проходной балл: {quiz.passingScore}%</p>
        {quiz.attemptsAllowed && (
          <p>Попытки: {quiz.attemptsUsed || 0} из {quiz.attemptsAllowed}</p>
        )}
      </div>
    </div>
  )
}






