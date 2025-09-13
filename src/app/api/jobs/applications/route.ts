import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/applications
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let applications: any[] = []

    if (status === 'received') {
      applications = await prisma.jobApplication.findMany({
        where: {
          job: {
            userId: auth.userId
          }
        },
        include: {
          applicant: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              photoUrl: true
            }
          },
          job: {
            select: {
              id: true,
              title: true,
              paymentAmount: true,
              paymentToken: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })
    } else {
      const whereClause: any = { userId: auth.userId }
      
      if (status && status !== 'all' && status !== 'sent') {
        whereClause.status = status.toUpperCase()
      }

      applications = await prisma.jobApplication.findMany({
        where: whereClause,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              paymentAmount: true,
              paymentToken: true,
              status: true,
              employer: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  photoUrl: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })
    }

    const formattedApplications = applications.map(app => ({
      id: app.id,
      status: app.status,
      coverLetter: app.coverLetter,
      proposedRate: app.proposedRate ? Number(app.proposedRate) / 1e6 : null,
      estimatedTime: app.estimatedTime,
      portfolio: app.portfolio,
      feedback: app.feedback,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      job: {
        id: app.job.id,
        title: app.job.title,
        budget: Number(app.job.paymentAmount) / 1e6,
        currency: app.job.paymentToken,
        status: app.job.status,
        employer: status === 'received' ? undefined : {
          id: app.job.employer?.id,
          name: `${app.job.employer?.firstName} ${app.job.employer?.lastName || ''}`.trim(),
          username: app.job.employer?.username,
          avatar: app.job.employer?.photoUrl
        }
      },
      applicant: status === 'received' ? {
        id: (app as any).applicant.id,
        name: `${(app as any).applicant.firstName} ${(app as any).applicant.lastName || ''}`.trim(),
        username: (app as any).applicant.username,
        avatar: (app as any).applicant.photoUrl
      } : undefined
    }))

    const totalCount = await prisma.jobApplication.count({
      where: status === 'received' 
        ? { job: { userId: auth.userId } }
        : { userId: auth.userId }
    })

    return NextResponse.json({
      success: true,
      data: {
        applications: formattedApplications,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка получения заявок' 
    }, { status: 500 })
  }
})
