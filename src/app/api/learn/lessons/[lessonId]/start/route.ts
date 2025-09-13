/**
 * Lesson Start API - Начало урока
 * POST /api/learn/lessons/[lessonId]/start
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { LessonService } from '@/lib/learn/lesson.service'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ lessonId: string }> }
) => {
  try {
    const { lessonId } = await params
    console.log(' Starting lesson:', lessonId)

    const result = await LessonService.startLesson(lessonId, auth.userId)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          code: 'LESSON_START_FAILED'
        },
        { status: 400 }
      )
    }

    console.log(' Lesson started successfully')

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Урок успешно начат!'
    })
  } catch (error) {
    console.error('Start lesson error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

