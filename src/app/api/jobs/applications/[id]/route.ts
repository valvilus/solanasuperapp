import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/applications/[id] - получить детали заявки
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { id: applicationId } = await (request as any).params

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        applicant: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            createdAt: true
          }
        },
        job: {
          include: {
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
      }
    })

    if (!application) {
      return NextResponse.json({ 
        success: false, 
        error: 'Заявка не найдена' 
      }, { status: 404 })
    }

    // Проверяем права доступа (заявитель или работодатель)
    const hasAccess = application.userId === auth.userId || application.job.userId === auth.userId

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false, 
        error: 'Нет прав для просмотра заявки' 
      }, { status: 403 })
    }

    const response = {
      id: application.id,
      status: application.status,
      coverLetter: application.coverLetter,
      proposedRate: application.proposedRate ? Number(application.proposedRate) / 1e6 : null,
      estimatedTime: application.estimatedTime,
      portfolio: application.portfolio,
      feedback: application.feedback,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      applicant: {
        id: application.applicant.id,
        name: `${application.applicant.firstName} ${application.applicant.lastName || ''}`.trim(),
        username: application.applicant.username,
        avatar: application.applicant.photoUrl,
        memberSince: application.applicant.createdAt
      },
      job: {
        id: application.job.id,
        title: application.job.title,
        description: application.job.description,
        budget: Number(application.job.paymentAmount) / 1e6,
        currency: application.job.paymentToken,
        status: application.job.status,
        employer: {
          id: application.job.employer.id,
          name: `${application.job.employer.firstName} ${application.job.employer.lastName || ''}`.trim(),
          username: application.job.employer.username,
          avatar: application.job.employer.photoUrl
        }
      }
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error(' Application details error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка получения деталей заявки' 
    }, { status: 500 })
  }
})

// PUT /api/jobs/applications/[id] - обновить статус заявки
export const PUT = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { id: applicationId } = await (request as any).params
    const body = await request.json()
    const { status, feedback } = body

    // Проверяем заявку
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            userId: true,
            status: true,
            title: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json({ 
        success: false, 
        error: 'Заявка не найдена' 
      }, { status: 404 })
    }

    // Только работодатель может изменять статус заявки
    if (application.job.userId !== auth.userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Только работодатель может изменять статус заявки' 
      }, { status: 403 })
    }

    // Нельзя изменять заявки для закрытых работ
    if (application.job.status !== 'OPEN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Нельзя изменять заявки для закрытой работы' 
      }, { status: 400 })
    }

    // Валидация статуса
    const validStatuses = ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Неверный статус заявки' 
      }, { status: 400 })
    }

    const updatedApplication = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: status || application.status,
        feedback: feedback !== undefined ? feedback : application.feedback
      }
    })

    // Если заявка принята, можно закрыть работу и отклонить остальные заявки
    if (status === 'ACCEPTED') {
      await Promise.all([
        // Закрываем работу
        prisma.job.update({
          where: { id: application.jobId },
          data: { status: 'IN_PROGRESS' }
        }),
        // Отклоняем остальные заявки
        prisma.jobApplication.updateMany({
          where: { 
            jobId: application.jobId,
            id: { not: applicationId },
            status: { in: ['PENDING', 'REVIEWED'] }
          },
          data: { 
            status: 'REJECTED',
            feedback: 'Выбран другой кандидат'
          }
        })
      ])
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        applicationId: updatedApplication.id,
        status: updatedApplication.status 
      }
    })
  } catch (error) {
    console.error(' Application update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка обновления заявки' 
    }, { status: 500 })
  }
})

// DELETE /api/jobs/applications/[id] - отозвать заявку
export const DELETE = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { id: applicationId } = await (request as any).params

    // Проверяем заявку
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        userId: true,
        status: true,
        job: {
          select: { status: true }
        }
      }
    })

    if (!application) {
      return NextResponse.json({ 
        success: false, 
        error: 'Заявка не найдена' 
      }, { status: 404 })
    }

    // Только автор заявки может её отозвать
    if (application.userId !== auth.userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Можно отозвать только свою заявку' 
      }, { status: 403 })
    }

    // Нельзя отозвать принятую заявку
    if (application.status === 'ACCEPTED') {
      return NextResponse.json({ 
        success: false, 
        error: 'Нельзя отозвать принятую заявку' 
      }, { status: 400 })
    }

    await prisma.jobApplication.delete({
      where: { id: applicationId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Заявка отозвана' 
    })
  } catch (error) {
    console.error(' Application delete error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка отзыва заявки' 
    }, { status: 500 })
  }
})
