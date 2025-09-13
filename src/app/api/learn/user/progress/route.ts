/**
 * User Progress API
 * GET /api/learn/user/progress - Получить прогресс пользователя
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withAuth } from '@/lib/auth'
import { ApiResponse, UserProgress } from '@/lib/learn/types'

export const GET = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string }
): Promise<NextResponse<ApiResponse<UserProgress>>> => {
  try {
    const learnService = new LearnService()
    const progress = await learnService.getUserProgress(auth.userId)

    return NextResponse.json({
      success: true,
      data: progress as any
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения прогресса'
    }, { status: 500 })
  }
})
