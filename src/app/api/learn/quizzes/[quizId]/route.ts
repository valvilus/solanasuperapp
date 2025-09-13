/**
 * Quiz Details API
 * GET /api/learn/quizzes/[quizId] - Получить квиз по ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { QuizService } from '@/lib/learn/quiz.service'
import { optionalAuth } from '@/lib/auth'
import { ApiResponse, Quiz } from '@/lib/learn/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
): Promise<NextResponse<ApiResponse<Quiz>>> {
  try {
    const auth = await optionalAuth(request)
    const { quizId } = await params
    
    const quizResponse = await QuizService.getQuizById(quizId, auth?.userId)

      if (!quizResponse.success || !quizResponse.data) {
        return NextResponse.json({
          success: false,
          error: 'Квиз не найден',
          code: 'QUIZ_NOT_FOUND'
        }, { status: 404 })
      }

      const quiz = quizResponse.data
      const safeQuiz = {
        ...quiz,
        questions: quiz.questions?.map(q => ({
          ...q,
          correctAnswer: undefined
        })) || []
      }

      return NextResponse.json({
        success: true,
        data: safeQuiz as Quiz
      })

  } catch (error) {
    console.error('Error getting quiz details:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения квиза'
    }, { status: 500 })
  }
}