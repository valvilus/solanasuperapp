/**
 * Leaderboard API
 * GET /api/learn/leaderboard - Получить таблицу лидеров
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOptionalAuth } from '@/lib/auth'
import { ApiResponse, Leaderboard, LeaderboardEntry } from '@/lib/learn/types'

export const GET = withOptionalAuth(async (request: NextRequest, auth: { userId: string; telegramId: string } | null): Promise<NextResponse<ApiResponse<Leaderboard>>> => {
    try {
      const url = new URL(request.url)
      const timeframe = url.searchParams.get('timeframe') || 'all_time' as 'weekly' | 'monthly' | 'all_time'
      const limit = parseInt(url.searchParams.get('limit') || '50')

      const usersWithProgress = await prisma.user.findMany({
        include: {
          courses: {
            select: {
              totalXpEarned: true,
              totalTokensEarned: true,
              isCompleted: true
            }
          }
        },
        take: limit * 2
      })

      const topUsers = usersWithProgress
        .map(user => {
          const totalXp = user.courses.reduce((sum, course) => sum + course.totalXpEarned, 0)
          const totalTokens = user.courses.reduce((sum, course) => sum + course.totalTokensEarned, 0)
          const completedCourses = user.courses.filter(course => course.isCompleted).length
          
          return {
            userId: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
            totalXp,
            totalTokens,
            completedCourses
          }
        })
        .filter(user => user.totalXp > 0)
        .sort((a, b) => (b?.totalXp || 0) - (a?.totalXp || 0))
        .slice(0, limit)
        .map((user, index) => ({ ...user, rank: index + 1 }))

      const entries = topUsers.map(user => ({
        rank: Number(user.rank),
        userId: user.userId,
        username: user.username || 'user',
        displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Пользователь',
        avatar: user.photoUrl || undefined,
        totalXp: Number(user.totalXp),
        totalTokens: Number(user.totalTokens),
        completedCourses: Number(user.completedCourses),
        achievements: 0, // TODO: Calculate achievements
        isCurrentUser: user.userId === auth?.userId
      }))

      // Find current user if not in top
      let currentUser: LeaderboardEntry | undefined
      if (auth?.userId && !entries.find(e => e.userId === auth.userId)) {
        const user = await prisma.user.findUnique({
          where: { id: auth.userId },
          include: {
            courses: {
              select: {
                totalXpEarned: true,
                totalTokensEarned: true,
                isCompleted: true
              }
            }
          }
        })

        if (user) {
          const totalXp = user.courses.reduce((sum, course) => sum + course.totalXpEarned, 0)
          const totalTokens = user.courses.reduce((sum, course) => sum + course.totalTokensEarned, 0)
          const completedCourses = user.courses.filter(course => course.isCompleted).length
          
          // Calculate rank by counting users with higher XP
          const higherXpCount = usersWithProgress
            .map(u => u.courses.reduce((sum, course) => sum + course.totalXpEarned, 0))
            .filter(xp => xp > totalXp).length
          
          currentUser = {
            rank: higherXpCount + 1,
            userId: user.id,
            username: user.username || 'user',
            displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Пользователь',
            avatar: user.photoUrl,
            totalXp,
            totalTokens,
            completedCourses,
            achievements: 0,
            isCurrentUser: true
          }
        }
      }

      const leaderboard: Leaderboard = {
        timeframe: timeframe as any,
        entries,
        currentUser,
        totalUsers: await prisma.user.count(),
        lastUpdated: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: leaderboard
      })

    } catch (error) {
      console.error('Error getting leaderboard:', error)
      return NextResponse.json({
        success: false,
        error: 'Ошибка получения таблицы лидеров'
      }, { status: 500 })
    }
})