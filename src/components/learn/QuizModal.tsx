'use client'

/**
 * Quiz Modal Component - Модальное окно для прохождения квизов
 * Solana SuperApp Learn-to-Earn System
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Quiz, QuizAnswer } from '@/types/learn.types'
import { QuizResult } from '@/lib/learn/types'
import { QuizInterface } from './QuizInterface'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface QuizModalProps {
  quiz: Quiz | null
  isOpen: boolean
  onClose: () => void
  onComplete: (result: { answers: QuizAnswer[]; score: number; percentage: number; isPassed: boolean; timeSpent: number }) => Promise<void>
}

export function QuizModal({ quiz, isOpen, onClose, onComplete }: QuizModalProps) {
  if (!isOpen || !quiz) return null

  const handleSubmit = async (answers: QuizAnswer[]): Promise<{ success: boolean; result?: QuizResult; error?: string }> => {
    try {
      // Базовая обработка ответов без сервера
      const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0)
      let score = 0
      
      // Простая проверка ответов (в реальном приложении это делается на сервере)
      answers.forEach(answer => {
        const question = quiz.questions.find(q => q.id === answer.questionId)
        if (question && question.type === 'MULTIPLE_CHOICE') {
          // Для демонстрации, считаем первый вариант правильным
          if (question.options && (answer as any).answer === question.options[0]) {
            score += question.points
          }
        } else if (question && question.type === 'TRUE_FALSE') {
          // Для демонстрации, считаем true правильным
          if ((answer as any).answer === true) {
            score += question.points
          }
        }
      })

      const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
      const isPassed = percentage >= quiz.passingScore
      const timeSpent = quiz.timeLimit ? quiz.timeLimit * 60 : 300 // 5 минут по умолчанию

      const result: QuizResult = {
        attemptId: `attempt_${Date.now()}`,
        score,
        totalPoints,
        percentage,
        isPassed,
        passingScore: quiz.passingScore,
        xpEarned: isPassed ? 50 : 0,
        tokensEarned: isPassed ? 25 : 0,
        timeSpent,
        submittedAt: new Date().toISOString(),
        detailedAnswers: {}
      }

      // Вызываем обработчик завершения
      await onComplete({
        answers,
        score,
        percentage,
        isPassed,
        timeSpent
      })

      return {
        success: true,
        result
      }
    } catch (error) {
      console.error('Error processing quiz:', error)
      return {
        success: false,
        error: 'Ошибка обработки квиза'
      }
    }
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white">Квиз</h2>
              <p className="text-sm text-gray-400">{quiz.title}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <QuizInterface
              quiz={quiz}
              onSubmit={handleSubmit}
              onClose={handleClose}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Дополнительные типы для совместимости
export interface QuizAttempt {
  answers: QuizAnswer[]
  score: number
  percentage: number
  isPassed: boolean
  timeSpent: number
}
