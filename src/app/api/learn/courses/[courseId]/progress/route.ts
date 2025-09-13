/**
 * Course Progress API - Прогресс пользователя по курсу
 * GET /api/learn/courses/[courseId]/progress - Получить прогресс пользователя по курсу
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { ApiResponse } from '@/lib/learn/types'

export const GET = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { courseId } = await params
    
    // Get user's enrollment and progress
    const userCourse = await prisma.userCourse.findUnique({
      where: {
        userId_courseId: {
          userId: auth.userId,
          courseId
        }
      },
      include: {
        course: {
          include: {
            lessons: {
              include: {
                userProgress: {
                  where: { userId: auth.userId }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    })

    if (!userCourse) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не записан на курс'
      }, { status: 404 })
    }

    // Calculate progress
    const lessons = userCourse.course.lessons
    const completedLessons = lessons
      .filter(lesson => lesson.userProgress.length > 0 && lesson.userProgress[0].isCompleted)
      .map(lesson => lesson.id)

    const progress = {
      courseId,
      userId: auth.userId,
      isEnrolled: true,
      progressPercentage: userCourse.progressPercentage,
      totalXpEarned: userCourse.totalXpEarned,
      totalTokensEarned: userCourse.totalTokensEarned,
      completedLessons,
      totalLessons: lessons.length,
      currentLessonId: userCourse.currentLessonId,
      enrolledAt: userCourse.enrolledAt,
      lastAccessedAt: userCourse.lastAccessedAt,
      completedAt: userCourse.completedAt
    }

    return NextResponse.json({
      success: true,
      data: progress
    })

  } catch (error) {
    console.error('Error getting course progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения прогресса курса'
    }, { status: 500 })
  }
})






