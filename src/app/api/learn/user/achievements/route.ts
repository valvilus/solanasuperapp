/**
 * User Achievements API - Получение достижений пользователя
 * GET /api/learn/user/achievements
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Получаем статистики пользователя для проверки достижений
    const userStats = await getUserStats(userId)
    
    // Определяем все возможные достижения
    const allAchievements = getAvailableAchievements()
    
    // Проверяем какие достижения пользователь заслужил
    const userAchievements = allAchievements.map(achievement => {
      const isUnlocked = checkAchievementUnlocked(achievement, userStats)
      const progress = calculateAchievementProgress(achievement, userStats)
      
      return {
        ...achievement,
        isUnlocked,
        progress,
        unlockedAt: isUnlocked ? new Date() : null // TODO: сохранять реальную дату разблокировки
      }
    })

    const unlockedCount = userAchievements.filter(a => a.isUnlocked).length
    const totalCount = allAchievements.length

    console.log(' User achievements retrieved:', { 
      userId, 
      unlocked: unlockedCount,
      total: totalCount 
    })

    return NextResponse.json({
      success: true,
      data: {
        achievements: userAchievements,
        summary: {
          unlockedCount,
          totalCount,
          completionRate: Math.round((unlockedCount / totalCount) * 100)
        }
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения достижений пользователя',
        code: 'ACHIEVEMENTS_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

// Получение статистик пользователя
async function getUserStats(userId: string) {
  const userCourses = await prisma.userCourse.findMany({
    where: { userId },
    include: { course: true }
  })

  const completedLessons = await prisma.lessonProgress.count({
    where: { userId, isCompleted: true }
  })

  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId }
  })

  const certificates = await prisma.certificate.count({
    where: { userId }
  })

  const totalXP = userCourses.reduce((sum, uc) => sum + Number(uc.totalXpEarned || 0), 0)
  const totalTokens = userCourses.reduce((sum, uc) => sum + Number(uc.totalTokensEarned || 0), 0)
  const completedCourses = userCourses.filter(uc => uc.isCompleted).length
  const perfectQuizzes = quizAttempts.filter(qa => Number(qa.percentage) >= 95).length

  return {
    totalXP,
    totalTokens,
    completedCourses,
    completedLessons,
    certificates,
    perfectQuizzes,
    enrolledCourses: userCourses.length,
    averageQuizScore: quizAttempts.length > 0 
      ? quizAttempts.reduce((sum, qa) => sum + Number(qa.percentage), 0) / quizAttempts.length 
      : 0
  }
}

// Все доступные достижения
function getAvailableAchievements() {
  return [
    {
      id: 'first-lesson',
      title: 'Первые шаги',
      description: 'Завершите свой первый урок',
      icon: '',
      category: 'learning',
      requirement: { type: 'lessons', value: 1 },
      reward: { xp: 50, tokens: 25 }
    },
    {
      id: 'first-course',
      title: 'Выпускник',
      description: 'Завершите свой первый курс',
      icon: '',
      category: 'learning',
      requirement: { type: 'courses', value: 1 },
      reward: { xp: 200, tokens: 100 }
    },
    {
      id: 'quiz-master',
      title: 'Мастер квизов',
      description: 'Наберите 95%+ в 5 квизах',
      icon: '',
      category: 'skill',
      requirement: { type: 'perfect_quizzes', value: 5 },
      reward: { xp: 300, tokens: 150 }
    },
    {
      id: 'knowledge-seeker',
      title: 'Искатель знаний',
      description: 'Завершите 10 уроков',
      icon: '',
      category: 'learning',
      requirement: { type: 'lessons', value: 10 },
      reward: { xp: 500, tokens: 250 }
    },
    {
      id: 'token-collector',
      title: 'Коллекционер токенов',
      description: 'Заработайте 1000 TNG токенов',
      icon: '',
      category: 'earning',
      requirement: { type: 'tokens', value: 1000 },
      reward: { xp: 100, tokens: 500 }
    },
    {
      id: 'xp-hunter',
      title: 'Охотник за опытом',
      description: 'Наберите 2000 XP',
      icon: '',
      category: 'progress',
      requirement: { type: 'xp', value: 2000 },
      reward: { xp: 0, tokens: 300 }
    },
    {
      id: 'course-champion',
      title: 'Чемпион курсов',
      description: 'Завершите 5 курсов',
      icon: '',
      category: 'learning',
      requirement: { type: 'courses', value: 5 },
      reward: { xp: 1000, tokens: 500 }
    },
    {
      id: 'certificate-holder',
      title: 'Обладатель сертификатов',
      description: 'Получите 3 сертификата',
      icon: '',
      category: 'achievement',
      requirement: { type: 'certificates', value: 3 },
      reward: { xp: 750, tokens: 400 }
    },
    {
      id: 'perfectionist',
      title: 'Перфекционист',
      description: 'Средний балл по квизам 90%+',
      icon: '',
      category: 'skill',
      requirement: { type: 'average_quiz_score', value: 90 },
      reward: { xp: 600, tokens: 350 }
    },
    {
      id: 'learning-machine',
      title: 'Машина обучения',
      description: 'Завершите 50 уроков',
      icon: '',
      category: 'learning',
      requirement: { type: 'lessons', value: 50 },
      reward: { xp: 2000, tokens: 1000 }
    }
  ]
}

// Проверка разблокировки достижения
function checkAchievementUnlocked(achievement: any, userStats: any): boolean {
  const { type, value } = achievement.requirement
  
  switch (type) {
    case 'lessons':
      return userStats.completedLessons >= value
    case 'courses':
      return userStats.completedCourses >= value
    case 'perfect_quizzes':
      return userStats.perfectQuizzes >= value
    case 'tokens':
      return userStats.totalTokens >= value
    case 'xp':
      return userStats.totalXP >= value
    case 'certificates':
      return userStats.certificates >= value
    case 'average_quiz_score':
      return userStats.averageQuizScore >= value
    default:
      return false
  }
}

// Расчет прогресса достижения
function calculateAchievementProgress(achievement: any, userStats: any): number {
  const { type, value } = achievement.requirement
  
  let current = 0
  
  switch (type) {
    case 'lessons':
      current = userStats.completedLessons
      break
    case 'courses':
      current = userStats.completedCourses
      break
    case 'perfect_quizzes':
      current = userStats.perfectQuizzes
      break
    case 'tokens':
      current = userStats.totalTokens
      break
    case 'xp':
      current = userStats.totalXP
      break
    case 'certificates':
      current = userStats.certificates
      break
    case 'average_quiz_score':
      current = userStats.averageQuizScore
      break
  }
  
  return Math.min(Math.round((current / value) * 100), 100)
}

