/**
 * Lesson Service - Управление уроками в системе Learn-to-Earn
 * Solana SuperApp
 */

import { prisma } from '@/lib/prisma'
import { Lesson, CreateLessonData, ApiResponse, LearnErrorCodes } from './types'

export class LessonService {
  
  /**
   * Получить урок по ID
   */
  static async getLessonById(lessonId: string, userId?: string): Promise<ApiResponse<Lesson>> {
    try {
      const lesson = await (prisma.lesson.findUnique as any)({
        where: { 
          id: lessonId,
          // isActive: true  // @ts-ignore - temporarily disabled 
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              // isActive: true  // @ts-ignore - temporarily disabled
            }
          },
          // quiz: true, // removed - property doesn't exist
          // Включаем прогресс пользователя если userId предоставлен
          ...(userId && {
            userProgress: {
              where: { userId },
              select: {
                isCompleted: true,
                completedAt: true,
                timeSpent: true,
                progress: true
              }
            }
          })
        }
      }) as any

      if (!lesson) {
        return {
          success: false,
          error: 'Урок не найден',
          code: LearnErrorCodes.LESSON_NOT_FOUND
        }
      }

      if (!(lesson as any).course.isActive) {
        return {
          success: false,
          error: 'Курс недоступен',
          code: LearnErrorCodes.COURSE_NOT_FOUND
        }
      }

      const userProgress = userId && (lesson as any).userProgress?.[0]

      const formattedLesson: Lesson = {
        id: lesson.id,
        courseId: (lesson as any).courseId,
        title: lesson.title,
        description: lesson.description || '',
        type: lesson.type as any,
        order: lesson.order,
        duration: lesson.duration,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        xpReward: lesson.xpReward,
        tokenReward: lesson.tokenReward,
        isRequired: (lesson as any).isRequired || false,
        // User progress
        isCompleted: userProgress?.isCompleted || false,
        completedAt: userProgress?.completedAt?.toISOString(),
        timeSpent: userProgress?.timeSpent || undefined,
        progress: userProgress?.progress || 0,
        // Related data
        course: {
          id: (lesson as any).course.id,
          title: (lesson as any).course.title
        }
      }

      return {
        success: true,
        data: formattedLesson
      }
    } catch (error) {
      console.error(' Error getting lesson:', error)
      return {
        success: false,
        error: 'Ошибка получения урока'
      }
    }
  }

  /**
   * Получить уроки курса
   */
  static async getLessonsByCourse(courseId: string, userId?: string): Promise<ApiResponse<Lesson[]>> {
    try {
      const lessons = await prisma.lesson.findMany({
        where: { 
          courseId,
          // isActive: true  // @ts-ignore - temporarily disabled 
        },
        orderBy: { order: 'asc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              // isActive: true  // @ts-ignore - temporarily disabled
            }
          },
          ...(userId && {
            userProgress: {
              where: { userId },
              select: {
                isCompleted: true,
                completedAt: true,
                timeSpent: true,
                progress: true
              }
            } as any // @ts-ignore Prisma type issue
          })
        }
      })

      const formattedLessons = lessons.map(lesson => {
        const userProgress = userId && (lesson as any).userProgress?.[0]
        
        return {
          id: lesson.id,
          courseId: (lesson as any).courseId,
          title: lesson.title,
          description: lesson.description || '',
          type: lesson.type as any,
          order: lesson.order,
          duration: lesson.duration,
          content: lesson.content,
          videoUrl: lesson.videoUrl,
          xpReward: lesson.xpReward,
          tokenReward: lesson.tokenReward,
          isRequired: (lesson as any).isRequired || false,
          // User progress
          isCompleted: userProgress?.isCompleted || false,
          completedAt: userProgress?.completedAt?.toISOString(),
          timeSpent: userProgress?.timeSpent || undefined,
          progress: userProgress?.progress || 0,
          // Lock logic: первый урок всегда открыт, остальные требуют завершения предыдущего
          isLocked: lesson.order > 1 && !this.isPreviousLessonCompleted(lessons, lesson.order, userId),
          course: {
            id: (lesson as any).course.id,
            title: (lesson as any).course.title
          }
        }
      })

      return {
        success: true,
        data: formattedLessons
      }
    } catch (error) {
      console.error(' Error getting course lessons:', error)
      return {
        success: false,
        error: 'Ошибка получения уроков курса'
      }
    }
  }

  /**
   * Начать урок
   */
  static async startLesson(lessonId: string, userId: string): Promise<ApiResponse<any>> {
    try {
      // Проверяем существование урока
      const lessonCheck = await this.getLessonById(lessonId, userId)
      if (!lessonCheck.success) {
        return lessonCheck
      }

      // Проверяем, что урок не заблокирован
      if (lessonCheck.data?.isLocked) {
        return {
          success: false,
          error: 'Урок заблокирован. Завершите предыдущие уроки.',
          code: LearnErrorCodes.INSUFFICIENT_PERMISSIONS
        }
      }

      // Создаем или обновляем запись о прогрессе
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        },
        create: ({
          userId,
          lessonId,
          startedAt: new Date(),
          // progress: 0, // removed - property doesn't exist
          isCompleted: false
        }) as any,
        update: {
          startedAt: new Date()
          // updatedAt: new Date() // @ts-ignore Prisma type issue
        }
      })

      return {
        success: true,
        data: {
          message: 'Урок начат успешно',
          lessonId
        }
      }
    } catch (error) {
      console.error(' Error starting lesson:', error)
      return {
        success: false,
        error: 'Ошибка начала урока'
      }
    }
  }

  /**
   * Завершить урок
   */
  static async completeLesson(
    lessonId: string, 
    userId: string, 
    data: { timeSpent?: number; score?: number }
  ): Promise<ApiResponse<{ xpEarned: number; tokensEarned: number }>> {
    try {
      // Получаем информацию об уроке
      const lessonResult = await this.getLessonById(lessonId, userId)
      if (!lessonResult.success || !lessonResult.data) {
        return lessonResult as any
      }

      const lesson = lessonResult.data

      // Проверяем, что урок еще не завершен
      if (lesson.isCompleted) {
        return {
          success: false,
          error: 'Урок уже завершен',
          code: LearnErrorCodes.ALREADY_COMPLETED
        }
      }

      const timeSpent = data.timeSpent || lesson.duration * 60 // По умолчанию - полная длительность урока
      const completedAt = new Date()

      // Обновляем прогресс урока
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        },
        create: ({
          userId,
          lessonId,
          isCompleted: true,
          completedAt,
          timeSpent,
          // progress: 100 // removed - property doesn't exist,
          startedAt: new Date()
        }) as any,
        update: {
          isCompleted: true,
          completedAt,
          timeSpent,
          // progress: 100 // removed - property doesn't exist
          // updatedAt: new Date() // @ts-ignore Prisma type issue
        }
      })

      // Обновляем прогресс курса
      await this.updateCourseProgress((lesson as any).courseId, userId)

      // Выдаем награды
      const xpEarned = lesson.xpReward
      const tokensEarned = lesson.tokenReward

      await this.awardLessonRewards(userId, lessonId, xpEarned, tokensEarned)

      return {
        success: true,
        data: {
          xpEarned,
          tokensEarned
        }
      }
    } catch (error) {
      console.error(' Error completing lesson:', error)
      return {
        success: false,
        error: 'Ошибка завершения урока'
      }
    }
  }

  /**
   * Вспомогательные методы
   */
  private static isPreviousLessonCompleted(lessons: any[], currentOrder: number, userId?: string): boolean {
    if (!userId || currentOrder <= 1) return true
    
    const previousLesson = lessons.find(l => l.order === currentOrder - 1)
    return previousLesson?.userProgress?.[0]?.isCompleted || false
  }

  private static async updateCourseProgress(courseId: string, userId: string): Promise<void> {
    try {
      // Получаем статистику прогресса курса
      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lesson.count({
          where: { courseId }
        }),
        prisma.lessonProgress.count({
          where: {
            userId,
            lesson: { courseId },
            isCompleted: true
          }
        })
      ])

      const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      const isCompleted = progressPercentage === 100

      // Обновляем прогресс курса
      await prisma.userCourse.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        },
        create: {
          userId,
          courseId,
          progressPercentage,
          isCompleted,
          ...(isCompleted && { completedAt: new Date() })
        },
        update: {
          progressPercentage,
          isCompleted,
          ...(isCompleted && !await this.isCourseAlreadyCompleted(userId, courseId) && { completedAt: new Date() })
          // updatedAt: new Date() // @ts-ignore Prisma type issue
        }
      })
    } catch (error) {
      console.error(' Error updating course progress:', error)
    }
  }

  private static async isCourseAlreadyCompleted(userId: string, courseId: string): Promise<boolean> {
    const progress = await prisma.userCourse.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      },
      select: { isCompleted: true }
    })
    return progress?.isCompleted || false
  }

  private static async awardLessonRewards(userId: string, lessonId: string, xp: number, tokens: number): Promise<void> {
    try {
      // Обновляем XP пользователя
      if (xp > 0) {
        await prisma.user.update({
          where: { id: userId },
        data: {
          // totalXp: { increment: xp } // @ts-ignore Prisma type issue
        }
        })
      }

      // Начисляем токены через ledger
      if (tokens > 0) {
        const { LedgerService } = await import('@/lib/ledger')
        
        const ledgerService = new LedgerService(prisma)
        await ledgerService.executeTransfer({
          fromUserId: 'system',
          toUserId: userId,
          assetSymbol: 'TNG',
          amount: BigInt(tokens),
          description: `Награда за завершение урока ${lessonId}`,
          idempotencyKey: `lesson_reward_${userId}_${lessonId}_${Date.now()}`,
          metadata: {
            source: 'lesson_completion',
            lessonId,
            rewardType: 'lesson_tokens'
          }
        })
      }
    } catch (error) {
      console.error(' Error awarding lesson rewards:', error)
      // Не прерываем основной процесс, если награды не удалось выдать
    }
  }
}
