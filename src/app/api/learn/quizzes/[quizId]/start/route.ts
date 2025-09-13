/**
 * Quiz Start API - Начало квиза
 * POST /api/learn/quizzes/[quizId]/start
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { QuizService } from '@/lib/learn/quiz.service'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ quizId: string }> }
) => {
  try {
    const { quizId } = await params
    console.log(' Starting quiz:', quizId)

    const userId = auth.userId

    const result = await QuizService.startQuiz(quizId, userId)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          code: 'QUIZ_START_FAILED'
        },
        { status: 400 }
      )
    }

    console.log(' Quiz started successfully')

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Квиз успешно начат!'
    })

  } catch (error) {
    console.error(' Error starting quiz:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка начала квиза',
        code: 'QUIZ_START_ERROR'
      },
      { status: 500 }
    )
  }
})

