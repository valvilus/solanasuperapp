/**
 * Lesson Quizzes API - Управление квизами урока
 * POST /api/learn/lessons/[lessonId]/quizzes - Создать квиз для урока
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withAuth } from '@/lib/auth'
import { ApiResponse } from '@/lib/learn/types'

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { lessonId } = await params
    const body = await request.json()
    
    const {
      title,
      description,
      timeLimit,
      passingScore,
      maxAttempts,
      questions
    } = body

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Заполните все обязательные поля и добавьте вопросы'
      }, { status: 400 })
    }

    const learnService = new LearnService()
    const result = await learnService.createQuiz({
      lessonId,
      title,
      description,
      timeLimit,
      passingScore: passingScore || 70,
      attemptsAllowed: maxAttempts,
      questions,
      createdBy: auth.userId
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.quiz
    })

  } catch (error) {
    console.error('Error creating quiz:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка создания квиза'
    }, { status: 500 })
  }
})






