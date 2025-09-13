/**
 * Categories API
 * GET /api/learn/categories - Получить список категорий с статистикой
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, CategoryStats } from '@/lib/learn/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<CategoryStats[]>>> {
  try {
    const coursesData = await prisma.course.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
      _sum: {
        studentsCount: true,
        duration: true,
        totalRewardTokens: true
      },
      _avg: {
        rating: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    const categoryStats = coursesData.map(cat => ({
      category: cat.category.toLowerCase(),
      coursesCount: cat._count.id,
      studentsCount: cat._sum.studentsCount || 0,
      averageRating: Number(cat._avg.rating) || 0,
      totalDuration: cat._sum.duration || 0,
      totalRewards: cat._sum.totalRewardTokens || 0
    }))

    return NextResponse.json({
      success: true,
      data: categoryStats
    })

  } catch (error) {
    console.error('Error getting categories:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения категорий'
    }, { status: 500 })
  }
}
