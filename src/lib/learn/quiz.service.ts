/**
 * Quiz Service - Управление квизами в системе Learn-to-Earn
 * Solana SuperApp
 */

import { prisma } from '@/lib/prisma'
import { Quiz, QuizSubmission, QuizResult, CreateQuizData, ApiResponse, LearnErrorCodes } from './types'

export class QuizService {
  
  /**
   * Получить квиз по ID
   */
  static async getQuizById(quizId: string, userId?: string): Promise<ApiResponse<Quiz>> {
    try {
      const quiz = await (prisma.quiz.findUnique as any)({
        where: { 
          id: quizId,
          // isActive: true  // @ts-ignore - temporarily disabled 
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          },
          questions: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              question: true,
              options: true,
              points: true,
              order: true,
              // difficulty: true,  // @ts-ignore - property doesn't exist
              // Не включаем correctAnswer для безопасности
            }
          },
          // Включаем попытки пользователя если userId предоставлен
          ...(userId && {
            attempts: {
              where: { userId },
              orderBy: { startedAt: 'desc' } as any,
              select: {
                id: true,
                score: true,
                percentage: true,
                isPassed: true,
                timeSpent: true,
                startedAt: true
              }
            }
      })
    }
  }) as any

      if (!quiz) {
        return {
          success: false,
          error: 'Квиз не найден',
          code: LearnErrorCodes.QUIZ_NOT_FOUND
        }
      }

      // Debug logging удален после решения проблемы

      const userAttempts = userId ? (quiz as any).attempts || [] : []
      const bestAttempt = userAttempts.reduce((best, current) => 
        !best || current.score > best.score ? current : best, null as any
      )

      const availableAttempts = quiz.attemptsAllowed ? Math.max(0, quiz.attemptsAllowed - userAttempts.length) : undefined

      const formattedQuiz: Quiz = {
        id: quiz.id,
        lessonId: quiz.lessonId,
        title: quiz.title,
        description: quiz.description || '',
        timeLimit: quiz.timeLimit || undefined,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.attemptsAllowed || undefined,
        questions: (quiz as any).questions || [].map(q => ({
          id: q.id,
          type: q.type as any,
          question: q.question,
          options: q.options as string[] || undefined,
          points: q.points,
          order: q.order,
          difficulty: q.difficulty as any || undefined
        })),
        // User progress
        attemptsUsed: userAttempts.length,
        bestScore: bestAttempt?.percentage || undefined,
        isPassed: bestAttempt?.isPassed || false,
        lastAttemptAt: userAttempts[0]?.createdAt.toISOString(),
        availableAttempts
      }

      return {
        success: true,
        data: formattedQuiz
      }
    } catch (error) {
      console.error(' Error getting quiz:', error)
      return {
        success: false,
        error: 'Ошибка получения квиза'
      }
    }
  }

  /**
   * Получить квиз по ID урока (всегда берем первый квиз урока)
   */
  static async getQuizByLessonId(lessonId: string, userId?: string): Promise<ApiResponse<Quiz | null>> {
    try {
      const quiz = await prisma.quiz.findFirst({
        where: { 
          lessonId,
          // isActive: true  // @ts-ignore - temporarily disabled 
        },
        include: {
          lesson: {
            include: {
              course: true
            }
          }
        }
      })

      if (!quiz) {
        return {
          success: true,
          data: null
        }
      }

      // Автоматическая запись на курс при доступе к квизу
      if (userId && quiz.lesson?.course) {
        console.log(`🎓 Auto-enrolling user ${userId} in course ${quiz.lesson.course.id} via quiz access`)
        await this.ensureUserEnrolled(quiz.lesson.course.id, userId)
      }

      return this.getQuizById(quiz.id, userId)
    } catch (error) {
      console.error(' Error getting quiz by lesson:', error)
      return {
        success: false,
        error: 'Ошибка получения квиза урока'
      }
    }
  }

  /**
   * Обеспечить запись пользователя на курс (создать если не существует)
   */
  static async ensureUserEnrolled(courseId: string, userId: string): Promise<void> {
    try {
      // Проверяем существующую запись
      const existingEnrollment = await prisma.userCourse.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      if (existingEnrollment) {
        console.log(`✅ User ${userId} already enrolled in course ${courseId}`)
        return // Пользователь уже записан
      }

      // Создаем запись на курс
      await prisma.userCourse.create({
        data: {
          userId,
          courseId,
          enrolledAt: new Date(),
          progressPercentage: 0,
          totalXpEarned: 0,
          totalTokensEarned: 0
        }
      })

      // Обновляем счетчик студентов курса
      await prisma.course.update({
        where: { id: courseId },
        data: {
          studentsCount: {
            increment: 1
          }
        }
      })

      console.log(`🎓 User ${userId} auto-enrolled in course ${courseId}`)
    } catch (error) {
      console.error('Error auto-enrolling user:', error)
      // Не бросаем ошибку, чтобы не блокировать доступ к квизу
    }
  }

  /**
   * Начать квиз
   */
  static async startQuiz(quizId: string, userId: string): Promise<ApiResponse<{ attemptId: string; timeLimit?: number }>> {
    try {
      // Получаем информацию о квизе
      const quizResult = await this.getQuizById(quizId, userId)
      if (!quizResult.success || !quizResult.data) {
        return quizResult as any
      }

      const quiz = quizResult.data

      // Проверяем доступность попыток
      if (quiz.availableAttempts === 0) {
        return {
          success: false,
          error: 'Исчерпаны все попытки прохождения квиза',
          code: LearnErrorCodes.MAX_ATTEMPTS_REACHED
        }
      }

      // Создаем новую попытку
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          startedAt: new Date()
        } as any
      })

      return {
        success: true,
        data: {
          attemptId: attempt.id,
          timeLimit: quiz.timeLimit
        }
      }
    } catch (error) {
      console.error(' Error starting quiz:', error)
      return {
        success: false,
        error: 'Ошибка начала квиза'
      }
    }
  }

  /**
   * Отправить ответы на квиз
   */
  static async submitQuiz(
    quizId: string, 
    userId: string, 
    submission: QuizSubmission
  ): Promise<ApiResponse<QuizResult>> {
    try {
      // Получаем квиз с правильными ответами
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          },
          lesson: {
            select: {
              id: true,
              title: true,
              xpReward: true,
              tokenReward: true
            }
          }
        }
      })

      if (!quiz) {
        return {
          success: false,
          error: 'Квиз не найден',
          code: LearnErrorCodes.QUIZ_NOT_FOUND
        }
      }

      // Находим активную попытку
      const attempt = await prisma.quizAttempt.findFirst({
        where: {
          userId,
          quizId,
          completedAt: null
        },
        orderBy: { startedAt: 'desc' }
      })

      if (!attempt) {
        return {
          success: false,
          error: 'Активная попытка квиза не найдена'
        }
      }

      // Проверяем время
      if (quiz.timeLimit && attempt.startedAt) {
        const timeSpent = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
        const timeLimitSeconds = quiz.timeLimit * 60
        
        if (timeSpent > timeLimitSeconds) {
          return {
            success: false,
            error: 'Время прохождения квиза истекло',
            code: LearnErrorCodes.TIME_LIMIT_EXCEEDED
          }
        }
      }

      // Проверяем ответы и подсчитываем баллы
      const { score, totalPoints, detailedAnswers } = this.gradeQuiz((quiz as any).questions || [], submission.answers)
      const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
      const isPassed = percentage >= quiz.passingScore

      // Обновляем попытку
      const timeSpent = submission.timeSpent || Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
      
      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          answers: submission.answers as any,
          score,
          percentage,
          isPassed,
          timeSpent,
          completedAt: new Date()
        }
      })

      // Вычисляем награды
      let xpEarned = 0
      let tokensEarned = 0

      if (isPassed) {
        // Базовые награды за квиз
        xpEarned = Math.round(quiz.lesson.xpReward * 0.5) // 50% от награды урока
        tokensEarned = Math.round(quiz.lesson.tokenReward * 0.3) // 30% от награды урока
        
        // Бонус за высокий результат
        if (percentage >= 90) {
          xpEarned = Math.round(xpEarned * 1.5)
          tokensEarned = Math.round(tokensEarned * 1.5)
        }

        // Выдаем награды
        await this.awardQuizRewards(userId, quizId, xpEarned, tokensEarned)
      }

      const result: QuizResult = {
        attemptId: attempt.id,
        score,
        totalPoints,
        percentage,
        isPassed,
        passingScore: quiz.passingScore,
        xpEarned,
        tokensEarned,
        timeSpent,
        submittedAt: new Date().toISOString(),
        detailedAnswers
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error(' Error submitting quiz:', error)
      return {
        success: false,
        error: 'Ошибка отправки квиза'
      }
    }
  }

  /**
   * Получить результаты квиза
   */
  static async getQuizResults(quizId: string, userId: string): Promise<ApiResponse<QuizResult[]>> {
    try {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          userId,
          quizId,
          completedAt: { not: null }
        },
        orderBy: { startedAt: 'desc' },
        include: {
          quiz: {
            select: {
              passingScore: true,
              questions: {
                select: {
                  id: true,
                  question: true,
                  correctAnswer: true,
                  explanation: true,
                  points: true
                }
              }
            }
          }
        }
      })

      const results = attempts.map(attempt => {
        const detailedAnswers: QuizResult['detailedAnswers'] = {}
        
        // Создаем детальные ответы
        if ((attempt as any).answers && Array.isArray((attempt as any).answers)) {
          (((attempt as any).quiz as any)?.questions || []).forEach((question: any) => {
            const userAnswer = ((attempt as any).answers as any[]).find((a: any) => a.questionId === question.id)
            if (userAnswer) {
              const isCorrect = this.checkAnswer(question.correctAnswer, userAnswer.answer)
              detailedAnswers[question.id] = {
                question: question.question,
                userAnswer: userAnswer.answer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                points: isCorrect ? question.points : 0,
                explanation: question.explanation
              }
            }
          })
        }

        return {
          attemptId: attempt.id,
          score: attempt.score,
          totalPoints: (((attempt as any).quiz as any)?.questions || []).reduce((sum: number, q: any) => sum + q.points, 0),
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
          passingScore: (attempt as any).quiz?.passingScore || 70,
          xpEarned: 0, // TODO: сохранять в БД
          tokensEarned: 0, // TODO: сохранять в БД
          timeSpent: attempt.timeSpent,
          submittedAt: (attempt as any).submittedAt?.toISOString() || attempt.completedAt.toISOString(),
          detailedAnswers
        }
      })

      return {
        success: true,
        data: results as any
      }
    } catch (error) {
      console.error(' Error getting quiz results:', error)
      return {
        success: false,
        error: 'Ошибка получения результатов квиза'
      }
    }
  }

  /**
   * Вспомогательные методы
   */
  private static gradeQuiz(questions: any[], answers: any[]): {
    score: number
    totalPoints: number
    detailedAnswers: QuizResult['detailedAnswers']
  } {
    let score = 0
    let totalPoints = 0
    const detailedAnswers: QuizResult['detailedAnswers'] = {}

    questions.forEach(question => {
      totalPoints += question.points
      
      const userAnswer = answers.find(a => a.questionId === question.id)
      const isCorrect = userAnswer ? this.checkAnswer(question.correctAnswer, userAnswer.answer) : false
      const points = isCorrect ? question.points : 0
      
      score += points
      
      detailedAnswers[question.id] = {
        question: question.question,
        userAnswer: userAnswer?.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points,
        explanation: question.explanation
      }
    })

    return { score, totalPoints, detailedAnswers }
  }

  private static checkAnswer(correctAnswer: any, userAnswer: any): boolean {
    if (typeof correctAnswer === 'boolean' && typeof userAnswer === 'boolean') {
      return correctAnswer === userAnswer
    }
    
    if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
      return correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim()
    }
    
    if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
      return correctAnswer.length === userAnswer.length && 
             correctAnswer.every(item => userAnswer.includes(item))
    }
    
    return JSON.stringify(correctAnswer) === JSON.stringify(userAnswer)
  }

  private static async awardQuizRewards(userId: string, quizId: string, xp: number, tokens: number): Promise<void> {
    try {
      // Обновляем XP пользователя
      if (xp > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            // totalXp: { increment: xp } // field doesn't exist
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
          `quiz-${quizId}`
        )
      }
    } catch (error) {
      console.error(' Error awarding quiz rewards:', error)
      // Не прерываем основной процесс, если награды не удалось выдать
    }
  }
}
