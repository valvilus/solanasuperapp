import { NextRequest, NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/search
export const GET = withOptionalAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url)
    
    const query = url.searchParams.get('q') || ''
    const category = url.searchParams.get('category')
    const minBudget = url.searchParams.get('minBudget')
    const maxBudget = url.searchParams.get('maxBudget')
    const paymentType = url.searchParams.get('paymentType')
    const experienceLevel = url.searchParams.get('experienceLevel')
    const isRemote = url.searchParams.get('remote')
    const isUrgent = url.searchParams.get('urgent')
    const skills = url.searchParams.get('skills')?.split(',').filter(Boolean) || []
    
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const whereConditions: any = {
      status: 'OPEN'
    }

    if (query) {
      whereConditions.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { skills: { hasSome: [query] } }
      ]
    }

    if (category) {
      whereConditions.category = category
    }

    if (minBudget || maxBudget) {
      whereConditions.paymentAmount = {}
      if (minBudget) {
        whereConditions.paymentAmount.gte = BigInt(parseFloat(minBudget) * 1e6)
      }
      if (maxBudget) {
        whereConditions.paymentAmount.lte = BigInt(parseFloat(maxBudget) * 1e6)
      }
    }

    if (paymentType) {
      whereConditions.paymentType = paymentType
    }

    if (skills.length > 0) {
      whereConditions.skills = {
        hasSome: skills
      }
    }


    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'budget') {
      orderBy = { paymentAmount: sortOrder }
    } else if (sortBy === 'deadline') {
      orderBy = { updatedAt: sortOrder }
    } else if (sortBy === 'applications') {
      orderBy = { createdAt: sortOrder }
    }

    const [jobs, totalCount] = await Promise.all([
      prisma.job.findMany({
        where: whereConditions,
        include: {
          employer: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              photoUrl: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.job.count({ where: whereConditions })
    ])

    const formattedJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      category: job.category,
      budget: Number(job.paymentAmount) / 1e6,
      currency: job.paymentToken,
      paymentType: job.paymentType,
      skills: job.skills,
      requirements: job.requirements,
      location: job.location,
      estimatedTime: job.estimatedTime,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      employer: {
        id: job.employer.id,
        name: `${job.employer.firstName} ${job.employer.lastName || ''}`.trim(),
        username: job.employer.username,
        avatar: job.employer.photoUrl
      },
      applicationsCount: job._count.applications,
      // Дополнительные поля (требуют добавления в схему)
      // isRemote: job.isRemote,
      // isUrgent: job.isUrgent,
      // isFeatured: job.isFeatured,
      // experienceLevel: job.experienceLevel
    }))

    // Статистика поиска
    const searchStats = {
      totalResults: totalCount,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: offset + limit < totalCount
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: formattedJobs,
        pagination: searchStats,
        filters: {
          query,
          category,
          minBudget: minBudget ? parseFloat(minBudget) : null,
          maxBudget: maxBudget ? parseFloat(maxBudget) : null,
          paymentType,
          experienceLevel,
          skills,
          isRemote: isRemote === 'true',
          isUrgent: isUrgent === 'true'
        }
      }
    })
  } catch (error) {
    console.error(' Job search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка поиска работ' 
    }, { status: 500 })
  }
})
