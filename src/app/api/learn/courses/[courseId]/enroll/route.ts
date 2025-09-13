/**
 * Course Enrollment API
 * POST /api/learn/courses/[courseId]/enroll - Записаться на курс
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withAuth } from '@/lib/auth'
import { ApiResponse } from '@/lib/learn/types'

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { courseId } = await params
    
    const learnService = new LearnService()
    const result = await learnService.enrollUser(courseId, auth.userId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Успешно записаны на курс' }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка записи на курс'
    }, { status: 500 })
  }
})