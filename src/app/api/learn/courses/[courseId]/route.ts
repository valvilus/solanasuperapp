/**
 * Learn Course Details API
 * GET /api/learn/courses/[courseId] - Получить курс по ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withOptionalAuth } from '@/lib/auth'
import { ApiResponse, Course } from '@/lib/learn/types'

export const GET = withOptionalAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string } | null,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse<Course>>> => {
    try {
      const { courseId } = await params
      
      const learnService = new LearnService()
      const course = await learnService.getCourseById(courseId, auth?.userId)

      if (!course) {
        return NextResponse.json({
          success: false,
          error: 'Курс не найден',
          code: 'COURSE_NOT_FOUND'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: course
      } as ApiResponse<Course>)

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка получения курса'
      }, { status: 500 })
    }
})