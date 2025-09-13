/**
 * Lesson Details API
 * GET /api/learn/lessons/[lessonId] - Получить урок по ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withOptionalAuth } from '@/lib/auth'
import { ApiResponse, Lesson } from '@/lib/learn/types'

export const GET = withOptionalAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string } | null,
  { params }: { params: Promise<{ lessonId: string }> }
): Promise<NextResponse<ApiResponse<Lesson>>> => {
    try {
      const { lessonId } = await params
      
      const learnService = new LearnService()
      const lesson = await learnService.getLessonById(lessonId, auth?.userId)

      if (!lesson) {
        return NextResponse.json({
          success: false,
          error: 'Урок не найден',
          code: 'LESSON_NOT_FOUND'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: lesson
      } as ApiResponse<Lesson>)

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка получения урока'
      }, { status: 500 })
    }
})