/**
 * User Category Ranks API - Получение рейтингов пользователя по категориям
 * GET /api/learn/user/category-ranks
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting user category ranks...')

    const userId = auth.userId

    // Получаем статистики пользователя по категориям
    const userCoursesByCategory = await prisma.userCourse.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            category: true
          }
        }
      }
    })

    // Группируем по категориям
    const categoryStats: Record<string, { xp: number; tokens: number; courses: number }> = {}
    
    for (const userCourse of userCoursesByCategory) {
      const category = userCourse.course.category.toLowerCase()
      
      if (!categoryStats[category]) {
        categoryStats[category] = { xp: 0, tokens: 0, courses: 0 }
      }
      
      categoryStats[category].xp += Number(userCourse.totalXpEarned || 0)
      categoryStats[category].tokens += Number(userCourse.totalTokensEarned || 0)
      if (userCourse.isCompleted) {
        categoryStats[category].courses += 1
      }
    }

    // Получаем рейтинги для каждой категории
    const categoryRanks: Record<string, number> = {}
    
    const categories = ['blockchain', 'defi', 'nft', 'trading', 'development', 'security']
    
    for (const category of categories) {
      if (!categoryStats[category]) {
        categoryRanks[category] = 0
        continue
      }

      // Получаем всех пользователей в этой категории для сравнения
      const allUsersInCategory = await prisma.userCourse.findMany({
        where: {
          course: {
            category: category.toUpperCase() as any
          }
        },
        include: {
          course: {
            select: { category: true }
          }
        }
      })

      // Группируем по пользователям
      const userScores: Record<string, number> = {}
      
      for (const uc of allUsersInCategory) {
        if (!userScores[uc.userId]) {
          userScores[uc.userId] = 0
        }
        
        // Комбинированный счет: XP + tokens/10 + courses*50
        const score = Number(uc.totalXpEarned || 0) + 
                     Number(uc.totalTokensEarned || 0) / 10 + 
                     (uc.isCompleted ? 50 : 0)
        
        userScores[uc.userId] += score
      }
      
      const currentUserScore = userScores[userId] || 0
      
      // Считаем количество пользователей с лучшим счетом
      const betterUsers = Object.values(userScores).filter(score => score > currentUserScore).length
      
      categoryRanks[category] = betterUsers + 1
    }

    // Дополнительная статистика по категориям
    const categoryDetails = await Promise.all(
      categories.map(async (category) => ({
        category,
        rank: categoryRanks[category],
        stats: categoryStats[category] || { xp: 0, tokens: 0, courses: 0 },
        totalParticipants: await prisma.userCourse.groupBy({
          by: ['userId'],
          where: {
            course: {
              category: category.toUpperCase() as any
            }
          },
          _count: true
        }).then(groups => groups.length)
      }))
    )

    console.log(' Category ranks retrieved:', { 
      userId, 
      categories: categories.length,
      ranks: categoryRanks
    })

    return NextResponse.json({
      success: true,
      data: {
        categoryRanks,
        categoryDetails,
        totalCategories: categories.length,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error(' Error getting category ranks:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения рейтингов по категориям',
        code: 'CATEGORY_RANKS_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

