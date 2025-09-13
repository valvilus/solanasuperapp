/**
 * Lesson Quiz API - Получение квиза урока
 * GET /api/learn/lessons/[lessonId]/quiz - Получить квиз урока
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { QuizService } from '@/lib/learn/quiz.service'
import { optionalAuth } from '@/lib/auth'
import { ApiResponse, Quiz } from '@/lib/learn/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse<ApiResponse<Quiz | null>>> {
  try {
    const auth = await optionalAuth(request)
    const { lessonId } = await params
    
    console.log('🔍 Getting quiz for lesson:', lessonId)
    
    const quizResponse = await QuizService.getQuizByLessonId(lessonId, auth?.userId)

    // Debug logging удален после решения проблемы

    if (!quizResponse.success) {
      console.log('❌ Quiz not found for lesson:', lessonId)
      return NextResponse.json({
        success: false,
        error: quizResponse.error || 'Квиз не найден',
        code: 'QUIZ_NOT_FOUND'
      }, { status: 404 })
    }

    if (!quizResponse.data) {
      console.log('ℹ️ No quiz exists for lesson:', lessonId)
      return NextResponse.json({
        success: true,
        data: null,
        message: 'У этого урока нет квиза'
      })
    }

    const quiz = quizResponse.data
    const safeQuiz = {
      ...quiz,
      questions: quiz.questions?.map(q => ({
        ...q,
        correctAnswer: undefined // Скрываем правильные ответы
      })) || []
    }

    console.log('✅ Quiz found for lesson:', lessonId, 'Quiz ID:', quiz.id)

    return NextResponse.json({
      success: true,
      data: safeQuiz as Quiz
    })

  } catch (error) {
    console.error('❌ Error getting lesson quiz:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения квиза урока'
    }, { status: 500 })
  }
}
