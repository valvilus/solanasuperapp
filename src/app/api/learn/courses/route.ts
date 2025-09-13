/**
 * Learn Courses API
 * GET /api/learn/courses - Список курсов с фильтрами
 * POST /api/learn/courses - Создание курса (admin/instructor)
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withOptionalAuth, withAuth } from '@/lib/auth'
import { CourseFilters, CreateCourseData, ApiResponse, Course } from '@/lib/learn/types'

export const GET = withOptionalAuth(async (request: NextRequest, auth: { userId: string; telegramId: string } | null): Promise<NextResponse<ApiResponse<Course[]>>> => {
    try {
      const url = new URL(request.url)
      
      const filters: CourseFilters = {
        category: url.searchParams.get('category') || undefined,
        level: url.searchParams.get('level') || undefined,
        search: url.searchParams.get('search') || undefined,
        featured: url.searchParams.get('featured') === 'true',
        limit: parseInt(url.searchParams.get('limit') || '20'),
        offset: parseInt(url.searchParams.get('offset') || '0')
      }

      const learnService = new LearnService()
      const courses = await learnService.getCourses({ ...filters, userId: auth?.userId })

    return NextResponse.json({
      success: true,
      data: courses
    } as ApiResponse<Course[]>)

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка получения курсов'
      }, { status: 500 })
    }
})

export const POST = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string }
): Promise<NextResponse<ApiResponse<{ courseId: string }>>> => {
  try {
    const data: any = await request.json()
    
    const learnService = new LearnService()
    const result = await learnService.createCourse({
      ...data,
      createdBy: auth.userId
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    const courseId = result.courseId!
    const creationSummary: { lessonsCreated: number; quizzesCreated: number; warnings: string[] } = {
      lessonsCreated: 0,
      quizzesCreated: 0,
      warnings: []
    }

    const incomingLessons = Array.isArray(data.lessons)
      ? data.lessons
      : Array.isArray(data.content?.lessons)
      ? data.content.lessons
      : Array.isArray(data.course?.lessons)
      ? data.course.lessons
      : []

    if (incomingLessons.length > 0) {
      for (const [index, lesson] of incomingLessons.entries()) {
        try {
          const lessonCreate = await learnService.createLesson({
            courseId,
            title: String(lesson.title ?? `Lesson ${index + 1}`),
            description: String(lesson.description ?? ''),
            type: String(lesson.type ?? 'text'),
            duration: Number(lesson.duration ?? 5),
            content: lesson.content ?? undefined,
            videoUrl: lesson.videoUrl ?? undefined,
            xpReward: Number(lesson.xpReward ?? 50),
            tokenReward: Number(lesson.tokenReward ?? 10),
            order: Number(lesson.order ?? index + 1),
            createdBy: auth.userId
          })

          if (lessonCreate.success && lessonCreate.lesson) {
            creationSummary.lessonsCreated += 1

            // Исправляем логику обработки квизов
            const incomingQuizzes = Array.isArray(lesson.quizzes)
              ? lesson.quizzes
              : Array.isArray(lesson.quiz)
              ? [lesson.quiz]
              : lesson.quiz && typeof lesson.quiz === 'object'
              ? [lesson.quiz]
              : []

            console.log(`🔍 Processing quizzes for lesson "${lesson.title}":`, {
              hasQuizzes: Array.isArray(lesson.quizzes),
              hasQuizArray: Array.isArray(lesson.quiz),
              hasQuizObject: lesson.quiz && typeof lesson.quiz === 'object',
              quizzesCount: incomingQuizzes.length,
              quizData: lesson.quiz ? JSON.stringify(lesson.quiz, null, 2) : 'none'
            })

            if (incomingQuizzes.length > 0) {
              console.log(`✅ Found ${incomingQuizzes.length} quiz(es) to create for lesson: ${lessonCreate.lesson.id}`)
              
              for (const quiz of incomingQuizzes) {
                try {
                  console.log(`🎯 Creating quiz:`, {
                    lessonId: lessonCreate.lesson.id,
                    title: quiz.title,
                    questionsCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
                    hasQuestions: !!quiz.questions
                  })

                  const quizCreate = await learnService.createQuiz({
                    lessonId: lessonCreate.lesson.id,
                    title: String(quiz.title ?? 'Quiz'),
                    description: String(quiz.description ?? ''),
                    timeLimit: quiz.timeLimit ?? undefined,
                    passingScore: Number(quiz.passingScore ?? 70),
                    attemptsAllowed: Number(quiz.maxAttempts ?? quiz.attemptsAllowed ?? 3),
                    questions: Array.isArray(quiz.questions) ? quiz.questions : [],
                    createdBy: auth.userId
                  })
                  
                  if (quizCreate.success) {
                    creationSummary.quizzesCreated += 1
                    console.log(`✅ Quiz created successfully for lesson ${lessonCreate.lesson.id}`)
                  } else if (quizCreate.error) {
                    console.log(`❌ Quiz creation failed for lesson ${lessonCreate.lesson.id}:`, quizCreate.error)
                    creationSummary.warnings.push(`Quiz not created for lesson ${lessonCreate.lesson.id}: ${quizCreate.error}`)
                  }
                } catch (e) {
                  console.log(`❌ Quiz creation exception for lesson ${lessonCreate.lesson.id}:`, e)
                  creationSummary.warnings.push(`Quiz creation error for lesson ${lessonCreate.lesson.id}: ${e}`)
                }
              }
            } else {
              console.log(`ℹ️ No quizzes found for lesson "${lesson.title}" (${lessonCreate.lesson.id})`)
            }
          } else if (lessonCreate.error) {
            creationSummary.warnings.push(`Lesson not created at index ${index}: ${lessonCreate.error}`)
          }
        } catch (e) {
          creationSummary.warnings.push(`Lesson creation error at index ${index}`)
        }
      }
    }

    console.log(`🎉 Course creation completed:`, {
      courseId,
      lessonsCreated: creationSummary.lessonsCreated,
      quizzesCreated: creationSummary.quizzesCreated,
      warnings: creationSummary.warnings
    })

    return NextResponse.json({
      success: true,
      data: { courseId },
      warnings: creationSummary.warnings,
      meta: {
        lessonsCreated: creationSummary.lessonsCreated,
        quizzesCreated: creationSummary.quizzesCreated
      }
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка создания курса'
    }, { status: 500 })
  }
})