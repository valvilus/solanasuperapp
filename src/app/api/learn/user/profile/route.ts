/**
 * User Profile API
 * GET /api/learn/user/profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        courses: {
          include: {
            course: true
          }
        },
        certificates: {
          include: {
            course: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Считаем статистики
    const enrolledCourses = user.courses
    const completedCourses = enrolledCourses.filter(uc => uc.isCompleted)
    const certificates = user.certificates

    const totalXP = enrolledCourses.reduce((sum, uc) => sum + Number(uc.totalXpEarned || 0), 0)
    const totalTokens = enrolledCourses.reduce((sum, uc) => sum + Number(uc.totalTokensEarned || 0), 0)

    // Считаем streak (дни подряд активности)
    const currentStreak = await calculateUserStreak(userId)

    // Получаем последнюю активность
    const lastActivity = await getLastUserActivity(userId)

    // Считаем уровень пользователя
    const userLevel = calculateUserLevel(totalXP)

    const profile = {
      id: user.id,
      name: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
      username: user.username,
      walletAddress: user.walletAddress,
      avatarUrl: user.photoUrl,
      
      stats: {
        totalXP,
        tokensEarned: totalTokens,
        currentStreak,
        totalCoursesEnrolled: enrolledCourses.length,
        totalCoursesCompleted: completedCourses.length,
        totalCertificates: certificates.length,
        completionRate: enrolledCourses.length > 0 
          ? Math.round((completedCourses.length / enrolledCourses.length) * 100)
          : 0,
        userLevel: userLevel.level,
        userTitle: userLevel.title,
        xpToNextLevel: userLevel.xpToNext,
        lastActivity
      },

      recentCourses: enrolledCourses
        .sort((a, b) => new Date((b as any).updatedAt || (b as any).createdAt || new Date()).getTime() - new Date((a as any).updatedAt || (a as any).createdAt || new Date()).getTime())
        .slice(0, 3)
        .map(uc => ({
          id: uc.course.id,
          title: uc.course.title,
          progress: uc.progressPercentage,
          isCompleted: uc.isCompleted,
          lastAccessed: (uc as any).updatedAt || (uc as any).createdAt || new Date(),
          xpEarned: uc.totalXpEarned,
          tokensEarned: uc.totalTokensEarned
        })),

              certificates: certificates.map(cert => ({
        id: cert.id,
        title: cert.title,
        courseName: cert.course.title,
        issuedAt: cert.issueDate,
        isVerified: cert.isVerified,
        skills: cert.skills
      }))
    }

    console.log(' User profile retrieved:', { 
      userId, 
      courses: enrolledCourses.length,
      xp: totalXP,
      tokens: totalTokens 
    })

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error) {
    console.error(' Error getting user profile:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения профиля пользователя',
        code: 'PROFILE_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

// Расчет streak пользователя (дни подряд активности)
async function calculateUserStreak(userId: string): Promise<number> {
  try {
    // Получаем последние активности пользователя
    const activities = await prisma.lessonProgress.findMany({
      where: { 
        userId,
        isCompleted: true 
      },
      orderBy: { completedAt: 'desc' },
      take: 30, // последние 30 записей
      select: { completedAt: true }
    })

    if (activities.length === 0) return 0

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const activity of activities) {
      if (!activity.completedAt) continue

      const activityDate = new Date(activity.completedAt)
      activityDate.setHours(0, 0, 0, 0)

      const diffDays = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === streak) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else if (diffDays > streak) {
        break
      }
    }

    return streak

  } catch (error) {
    console.error('Error calculating user streak:', error)
    return 0
  }
}

// Получение последней активности пользователя
async function getLastUserActivity(userId: string): Promise<Date | null> {
  try {
    const lastLesson = await prisma.lessonProgress.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    })

    const lastQuiz = await prisma.quizAttempt.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    })

    const dates = [
      (lastLesson as any)?.startedAt,
      (lastQuiz as any)?.startedAt
    ].filter(Boolean) as Date[]

    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

  } catch (error) {
    console.error('Error getting last activity:', error)
    return null
  }
}

// Расчет уровня пользователя
function calculateUserLevel(totalXP: number): { level: number; title: string; xpToNext: number } {
  const levels = [
    { level: 1, xp: 0, title: 'Новичок', xpToNext: 100 },
    { level: 2, xp: 100, title: 'Ученик', xpToNext: 200 },
    { level: 3, xp: 300, title: 'Студент', xpToNext: 300 },
    { level: 4, xp: 600, title: 'Практик', xpToNext: 400 },
    { level: 5, xp: 1000, title: 'Знаток', xpToNext: 500 },
    { level: 6, xp: 1500, title: 'Эксперт', xpToNext: 1000 },
    { level: 7, xp: 2500, title: 'Мастер', xpToNext: 1500 },
    { level: 8, xp: 4000, title: 'Гуру', xpToNext: 2000 },
    { level: 9, xp: 6000, title: 'Легенда', xpToNext: 4000 },
    { level: 10, xp: 10000, title: 'Мудрец', xpToNext: 0 }
  ]

  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].xp) {
      const nextLevel = levels[i + 1]
      return {
        level: levels[i].level,
        title: levels[i].title,
        xpToNext: nextLevel ? nextLevel.xp - totalXP : 0
      }
    }
  }

  return levels[0]
}

