/**
 * User Progress Stats API - Получение статистики прогресса пользователя
 * GET /api/learn/user/progress-stats
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting user progress stats...')

    const userId = auth.userId

    // Получаем статистику прогресса пользователя
    const userCourses = await prisma.userCourse.findMany({
      where: { userId },
      include: {
        course: true
      }
    })

    const lessonProgress = await prisma.lessonProgress.findMany({
      where: { userId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            duration: true,
            xpReward: true,
            tokenReward: true
          }
        }
      }
    })

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            xpReward: true,
            tokenReward: true
          }
        }
      }
    })

    // Подсчитываем статистику
    const totalCoursesEnrolled = userCourses.length
    const totalCoursesCompleted = userCourses.filter(uc => uc.isCompleted).length
    const totalLessonsCompleted = lessonProgress.filter(lp => lp.isCompleted).length
    const totalQuizzesCompleted = quizAttempts.filter(qa => qa.isPassed).length

    // Подсчитываем заработанные XP и токены
    const totalXpEarned = lessonProgress
      .filter(lp => lp.isCompleted)
      .reduce((sum, lp) => sum + (lp.lesson.xpReward || 0), 0) +
      quizAttempts
        .filter(qa => qa.isPassed)
        .reduce((sum, qa) => sum + (qa.quiz.xpReward || 0), 0)

    const totalTokensEarned = lessonProgress
      .filter(lp => lp.isCompleted)
      .reduce((sum, lp) => sum + (lp.lesson.tokenReward || 0), 0) +
      quizAttempts
        .filter(qa => qa.isPassed)
        .reduce((sum, qa) => sum + (qa.quiz.tokenReward || 0), 0)

    // Подсчитываем время обучения (примерно)
    const totalTimeSpent = lessonProgress
      .filter(lp => lp.isCompleted)
      .reduce((sum, lp) => sum + (lp.timeSpent || lp.lesson.duration * 60), 0)

    // Средний балл по квизам
    const passedQuizzes = quizAttempts.filter(qa => qa.isPassed)
    const averageQuizScore = passedQuizzes.length > 0
      ? passedQuizzes.reduce((sum, qa) => sum + Number(qa.percentage), 0) / passedQuizzes.length
      : 0

    // Процент завершения курсов
    const averageCourseCompletion = totalCoursesEnrolled > 0
      ? (totalCoursesCompleted / totalCoursesEnrolled) * 100
      : 0

    // Текущая серия (streak) - упрощенная версия
    const recentActivity = await prisma.lessonProgress.findMany({
      where: {
        userId,
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // последние 30 дней
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // Подсчитываем streak (упрощенно)
    let currentStreak = 0
    const today = new Date()
    const streakDays = new Set()
    
    recentActivity.forEach(activity => {
      if (activity.completedAt) {
        const activityDate = new Date(activity.completedAt)
        const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff <= 7) { // активность за последнюю неделю
          streakDays.add(daysDiff)
        }
      }
    })

    currentStreak = streakDays.size

    // Прогресс по неделям (последние 8 недель)
    const weeklyProgress: any[] = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const weekLessons = lessonProgress.filter(lp => 
        lp.completedAt && lp.completedAt >= weekStart && lp.completedAt < weekEnd
      ).length

      const weekXP = lessonProgress
        .filter(lp => lp.completedAt && lp.completedAt >= weekStart && lp.completedAt < weekEnd)
        .reduce((sum, lp) => sum + (lp.lesson.xpReward || 0), 0)

      weeklyProgress.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        lessons: weekLessons,
        xp: weekXP,
        tokens: Math.floor(weekXP / 10) // примерно 1 токен за 10 XP
      })
    }

    // Прогресс по месяцам (последние 6 месяцев)
    const monthlyProgress: any[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
      
      const monthLessons = lessonProgress.filter(lp => 
        lp.completedAt && lp.completedAt >= monthStart && lp.completedAt <= monthEnd
      ).length

      const monthXP = lessonProgress
        .filter(lp => lp.completedAt && lp.completedAt >= monthStart && lp.completedAt <= monthEnd)
        .reduce((sum, lp) => sum + (lp.lesson.xpReward || 0), 0)

      monthlyProgress.push({
        month: monthStart.toLocaleDateString('ru', { month: 'short' }),
        lessons: monthLessons,
        xp: monthXP,
        tokens: Math.floor(monthXP / 10)
      })
    }

    const progressStats = {
      totalCoursesEnrolled,
      totalCoursesCompleted,
      totalLessonsCompleted,
      totalQuizzesCompleted,
      totalTimeSpent: Math.floor(totalTimeSpent / 60), // в минутах
      totalXpEarned,
      totalTokensEarned,
      averageQuizScore: Math.round(averageQuizScore * 100) / 100,
      averageCourseCompletion: Math.round(averageCourseCompletion * 100) / 100,
      currentStreak,
      longestStreak: currentStreak, // упрощенно
      weeklyProgress,
      monthlyProgress,
      categoryRanks: {
        blockchain: 0, // TODO: реализовать рейтинги по категориям
        defi: 0,
        nft: 0,
        trading: 0,
        development: 0,
        security: 0
      }
    }

    console.log(' User progress stats retrieved successfully')

    return NextResponse.json({
      success: true,
      data: progressStats
    })

  } catch (error) {
    console.error(' Error getting progress stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения статистики прогресса',
        code: 'PROGRESS_STATS_ERROR'
      },
      { status: 500 }
    )
  }
})