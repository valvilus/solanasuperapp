/**
 * Quiz Submission API - Отправка ответов квиза
 * POST /api/learn/quizzes/[quizId]/submit - Отправить ответы квиза
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withAuth } from '@/lib/auth'
import { ApiResponse, QuizAnswer, QuizResult } from '@/lib/learn/types'

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ quizId: string }> }
): Promise<NextResponse<ApiResponse<QuizResult>>> => {
  try {
    const { quizId } = await params
    const body = await request.json()
    
    const { answers, timeSpent } = body as {
      answers: QuizAnswer[]
      timeSpent?: number
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({
        success: false,
        error: 'Некорректные ответы'
      }, { status: 400 })
    }
    
    const learnService = new LearnService()
    const result = await learnService.submitQuiz(quizId, auth.userId, answers)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data as QuizResult
    })

  } catch (error) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка отправки квиза'
    }, { status: 500 })
  }
})