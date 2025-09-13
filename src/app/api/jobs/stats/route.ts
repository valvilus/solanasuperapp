import { NextRequest, NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/stats
export const GET = withOptionalAuth(async (request: NextRequest) => {
  try {
    const [
      totalJobs,
      activeJobs,
      completedJobs,
      totalApplications,
      totalUsers,
      averageBudgetResult
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: 'OPEN' } }),
      prisma.job.count({ where: { status: 'COMPLETED' } }),
      prisma.jobApplication.count(),
      prisma.user.count(),
      prisma.job.aggregate({
        _avg: { paymentAmount: true },
        where: { status: { not: 'CANCELLED' } }
      })
    ])

    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
    const averageBudget = Number(Number(averageBudgetResult._avg.paymentAmount) || 0) / 1e6
    const totalBudget = await prisma.job.aggregate({
      _sum: { paymentAmount: true },
      where: { status: { not: 'CANCELLED' } }
    })

    const categoryStats = await prisma.job.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'OPEN' },
      orderBy: { _count: { id: 'desc' } }
    })

    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    const recentActivity = {
      newJobs: await prisma.job.count({
        where: { createdAt: { gte: lastWeek } }
      }),
      newApplications: await prisma.jobApplication.count({
        where: { createdAt: { gte: lastWeek } }
      }),
      completedJobs: await prisma.job.count({
        where: { 
          status: 'COMPLETED',
          updatedAt: { gte: lastWeek }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        completedJobs,
        totalApplications,
        totalFreelancers: totalUsers,
        successRate: Math.round(successRate * 100) / 100,
        averageJobValue: Math.round(averageBudget),
        totalBudget: Number(totalBudget._sum.paymentAmount || 0) / 1e6,
        averageCompletionTime: 18.5,
        categoryStats: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.id
        })),
        recentActivity
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка получения статистики' 
    }, { status: 500 })
  }
})
