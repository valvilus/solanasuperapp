/**
 * Solana Quiz Submission API - Отправка результатов квиза курса по Solana
 * POST /api/learn/quizzes/solana/[quizId]/submit
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { SolanaCourseService } from '@/lib/learn/solana-course.service'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ quizId: string }> }
) => {
    const { quizId } = await params
    console.log(' Submitting Solana quiz:', quizId)

    // Парсим данные запроса
    const body = await request.json()
    const { answers = [], timeSpent = 0 } = body

    // Отправляем результаты через сервис Solana курса
    const result = await SolanaCourseService.submitQuizAttempt(
      auth.userId, 
      quizId, 
      answers, 
      timeSpent
    )

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Ошибка отправки результатов квиза',
          code: 'QUIZ_SUBMISSION_FAILED'
        },
        { status: 400 }
      )
    }

    console.log(' Solana quiz submitted successfully:', {
      percentage: result.percentage,
      isPassed: result.isPassed,
      tokensEarned: result.tokensEarned,
      xpEarned: result.xpEarned
    })

    return NextResponse.json({
      success: true,
      data: {
        percentage: result.percentage,
        isPassed: result.isPassed,
        tokensEarned: result.tokensEarned,
        xpEarned: result.xpEarned,
        message: result.isPassed 
          ? ` Квиз пройден! Результат: ${result.percentage}%. Получено: ${result.tokensEarned} TNG и ${result.xpEarned} XP!`
          : `Квиз не пройден. Результат: ${result.percentage}%. Попробуйте еще раз!`
      }
    })
})

