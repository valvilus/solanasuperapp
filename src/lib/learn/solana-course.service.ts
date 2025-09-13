/**
 * Solana Course Service - Специализированный сервис для Solana курсов
 * Solana SuperApp Learn-to-Earn System
 */

import { QuizService } from './quiz.service'
import { LessonService } from './lesson.service'
import { ApiResponse, QuizAnswer } from './types'
import { solanaCourseQuizzes } from '@/features/learn/data/solana-course-data'

export class SolanaCourseService {
  
  /**
   * Отправить результаты квиза Solana курса
   */
  static async submitQuizAttempt(
    userId: string,
    quizId: string,
    answers: QuizAnswer[],
    timeSpent: number
  ): Promise<{
    success: boolean
    error?: string
    percentage?: number
    isPassed?: boolean
    tokensEarned?: number
    xpEarned?: number
  }> {
    try {
      // Находим квиз в данных Solana курса
      const solanaQuiz = solanaCourseQuizzes.find(q => q.id === quizId)
      
      if (!solanaQuiz) {
        // Пытаемся использовать стандартный QuizService
        const standardQuizResult = await QuizService.submitQuiz(quizId, userId, {
          quizId,
          answers,
          timeSpent
        })
        
        if (standardQuizResult.success && standardQuizResult.data) {
          return {
            success: true,
            percentage: standardQuizResult.data.percentage,
            isPassed: standardQuizResult.data.isPassed,
            tokensEarned: standardQuizResult.data.tokensEarned,
            xpEarned: standardQuizResult.data.xpEarned
          }
        }
        
        return {
          success: false,
          error: 'Квиз не найден'
        }
      }

      // Обрабатываем квиз используя данные Solana курса
      const result = this.processSolanaQuiz(solanaQuiz, answers, timeSpent)
      
      // Начисляем награды если квиз пройден
      if (result.isPassed && result.tokensEarned > 0) {
        await this.awardSolanaQuizRewards(userId, quizId, result.xpEarned, result.tokensEarned)
      }

      return {
        success: true,
        percentage: result.percentage,
        isPassed: result.isPassed,
        tokensEarned: result.tokensEarned,
        xpEarned: result.xpEarned
      }
    } catch (error) {
      console.error(' Error submitting Solana quiz:', error)
      return {
        success: false,
        error: 'Ошибка отправки результатов квиза'
      }
    }
  }

  /**
   * Обработка Solana квиза с использованием моковых данных
   */
  private static processSolanaQuiz(
    quiz: any,
    answers: QuizAnswer[],
    timeSpent: number
  ): {
    percentage: number
    isPassed: boolean
    tokensEarned: number
    xpEarned: number
  } {
    let correctAnswers = 0
    const totalQuestions = quiz.questions.length

    // Проверяем ответы
    quiz.questions.forEach((question: any) => {
      const userAnswer = answers.find(a => a.questionId === question.id)
      if (userAnswer && this.checkSolanaAnswer(question, userAnswer.answer)) {
        correctAnswers++
      }
    })

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const isPassed = percentage >= quiz.passingScore

    // Вычисляем награды
    let tokensEarned = 0
    let xpEarned = 0

    if (isPassed && quiz.rewards?.[0]) {
      tokensEarned = quiz.rewards[0].amount || 50
      xpEarned = quiz.rewards[0].xpPoints || 100
      
      // Бонус за отличный результат
      if (percentage >= 90) {
        tokensEarned = Math.round(tokensEarned * 1.5)
        xpEarned = Math.round(xpEarned * 1.5)
      }
    }

    return {
      percentage,
      isPassed,
      tokensEarned,
      xpEarned
    }
  }

  /**
   * Проверка ответа на вопрос Solana квиза
   */
  private static checkSolanaAnswer(question: any, userAnswer: any): boolean {
    if (!question.options || !Array.isArray(question.options)) {
      return false
    }

    // Находим правильный ответ
    const correctOption = question.options.find((option: any) => option.isCorrect)
    if (!correctOption) {
      return false
    }

    // Проверяем разные типы ответов
    if (typeof userAnswer === 'string') {
      return userAnswer === correctOption.text || userAnswer === correctOption.id
    }

    if (typeof userAnswer === 'boolean') {
      return userAnswer === correctOption.isCorrect
    }

    // Для множественного выбора
    if (Array.isArray(userAnswer)) {
      const correctAnswers = question.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.text)
      return userAnswer.length === correctAnswers.length && 
             userAnswer.every((answer: string) => correctAnswers.includes(answer))
    }

    return false
  }

  /**
   * Начисление наград за Solana квиз
   */
  private static async awardSolanaQuizRewards(
    userId: string,
    quizId: string,
    xp: number,
    tokens: number
  ): Promise<void> {
    try {
      // Используем существующий код из QuizService
      const { prisma } = await import('@/lib/prisma')

      // Обновляем XP пользователя
      if (xp > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            // totalXp: // removed - field doesn't exist { increment: xp }
          }
        })
      }

      // Начисляем токены через ledger
      if (tokens > 0) {
        const { LedgerService } = await import('@/lib/ledger')
        
        await LedgerService.credit(
          userId,
          'TNG',
          tokens,
          'REWARD',
          `solana-quiz-${quizId}` // txRef
        )
      }
    } catch (error) {
      console.error(' Error awarding Solana quiz rewards:', error)
      // Не прерываем основной процесс, если награды не удалось выдать
    }
  }

  /**
   * Получить информацию о Solana квизе
   */
  static async getSolanaQuiz(quizId: string, userId?: string): Promise<ApiResponse<any>> {
    try {
      // Сначала ищем в данных Solana курса
      const solanaQuiz = solanaCourseQuizzes.find(q => q.id === quizId)
      
      if (solanaQuiz) {
        return {
          success: true,
          data: {
            ...solanaQuiz,
            // Добавляем пользовательский прогресс если нужно
            attemptsUsed: 0,
            bestScore: undefined,
            isPassed: false,
            availableAttempts: solanaQuiz.attemptsAllowed
          }
        }
      }

      // Если не найден в Solana данных, используем стандартный сервис
      return await QuizService.getQuizById(quizId, userId)
    } catch (error) {
      console.error(' Error getting Solana quiz:', error)
      return {
        success: false,
        error: 'Ошибка получения Solana квиза'
      }
    }
  }
}
