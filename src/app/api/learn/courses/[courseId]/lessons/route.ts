/**
 * Course Lessons API - Управление уроками курса
 * GET /api/learn/courses/[courseId]/lessons - Получить уроки курса
 * POST /api/learn/courses/[courseId]/lessons - Создать урок
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withAuth, withOptionalAuth } from '@/lib/auth'
import { ApiResponse } from '@/lib/learn/types'

export const GET = withOptionalAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string } | null,
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { courseId } = await params
    
    const learnService = new LearnService()
    const course = await learnService.getCourseById(courseId, auth?.userId)

    if (!course) {
      return NextResponse.json({
        success: false,
        error: 'Курс не найден'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: course.lessons
    })

  } catch (error) {
    console.error('Error fetching course lessons:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения уроков'
    }, { status: 500 })
  }
})

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { courseId } = await params
    const body = await request.json()
    
    const {
      title,
      description,
      type,
      duration,
      content,
      videoUrl,
      xpReward,
      tokenReward,
      order
    } = body

    if (!title || !description || !type || !duration) {
      return NextResponse.json({
        success: false,
        error: 'Заполните все обязательные поля'
      }, { status: 400 })
    }

    const learnService = new LearnService()
    const result = await learnService.createLesson({
      courseId,
      title,
      description,
      type,
      duration,
      content,
      videoUrl,
      xpReward: xpReward || 50,
      tokenReward: tokenReward || 5,
      order: order || 1,
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
      data: result.lesson
    })

  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка создания урока'
    }, { status: 500 })
  }
})






