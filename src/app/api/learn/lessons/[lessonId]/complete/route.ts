/**
 * Lesson Completion API - Завершение урока
 * POST /api/learn/lessons/[lessonId]/complete - Завершить урок
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
    const body = await request.json().catch(() => ({}))
    const timeSpent = body.timeSpent || 0
    
    const learnService = new LearnService()
    const result = await learnService.completeLesson(lessonId, auth.userId, timeSpent)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('Error completing lesson:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка завершения урока'
    }, { status: 500 })
  }
})