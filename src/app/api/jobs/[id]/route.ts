import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withOptionalAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/[id] - получить детали работы
export const GET = withOptionalAuth(async (request: NextRequest, auth: { userId: string; telegramId: string } | null) => {
  try {
    const { id: jobId } = await (request as any).params

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            createdAt: true
          }
        },
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ 
        success: false, 
        error: 'Работа не найдена' 
      }, { status: 404 })
    }

    // Увеличиваем счетчик просмотров (если нужно)
    await prisma.job.update({
      where: { id: jobId },
      data: {
        // TODO: добавить поле viewsCount в схему если нужно
      }
    })

    // Формируем ответ
    const response = {
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      skills: job.skills,
      paymentAmount: Number(job.paymentAmount) / 1e6, // Конвертируем из wei
      paymentToken: job.paymentToken,
      paymentType: job.paymentType,
      category: job.category,
      location: job.location,
      estimatedTime: job.estimatedTime,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      closedAt: job.closedAt,
      employer: {
        id: job.employer.id,
        name: `${job.employer.firstName} ${job.employer.lastName || ''}`.trim(),
        username: job.employer.username,
        avatar: job.employer.photoUrl,
        memberSince: job.employer.createdAt
      },
      applicationsCount: job._count.applications,
      applications: job.applications.map(app => ({
        id: app.id,
        status: app.status,
        appliedAt: app.createdAt
      }))
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error(' Job details error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка получения деталей работы' 
    }, { status: 500 })
  }
})

// PUT /api/jobs/[id] - обновить работу
export const PUT = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { id: jobId } = await (request as any).params
    const body = await request.json()

    // Проверяем, что пользователь - владелец работы
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { userId: true, status: true }
    })

    if (!existingJob) {
      return NextResponse.json({ 
        success: false, 
        error: 'Работа не найдена' 
      }, { status: 404 })
    }

    if (existingJob.userId !== auth.userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Нет прав для редактирования' 
      }, { status: 403 })
    }

    // Нельзя редактировать закрытые работы
    if (existingJob.status === 'COMPLETED' || existingJob.status === 'CANCELLED') {
      return NextResponse.json({ 
        success: false, 
        error: 'Нельзя редактировать завершенную работу' 
      }, { status: 400 })
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        title: body.title,
        description: body.description,
        requirements: body.requirements || [],
        skills: body.skills || [],
        paymentAmount: body.paymentAmount ? BigInt(body.paymentAmount * 1e6) : undefined,
        paymentToken: body.paymentToken,
        paymentType: body.paymentType,
        category: body.category,
        location: body.location,
        estimatedTime: body.estimatedTime,
        status: body.status
      }
    })

    return NextResponse.json({ success: true, data: { jobId: updatedJob.id } })
  } catch (error) {
    console.error(' Job update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка обновления работы' 
    }, { status: 500 })
  }
})

// DELETE /api/jobs/[id] - удалить работу
export const DELETE = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { id: jobId } = await (request as any).params

    // Проверяем, что пользователь - владелец работы
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { 
        userId: true, 
        status: true,
        _count: { select: { applications: true } }
      }
    })

    if (!existingJob) {
      return NextResponse.json({ 
        success: false, 
        error: 'Работа не найдена' 
      }, { status: 404 })
    }

    if (existingJob.userId !== auth.userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Нет прав для удаления' 
      }, { status: 403 })
    }

    // Нельзя удалять работы с заявками
    if (existingJob._count.applications > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Нельзя удалить работу с заявками. Отмените работу вместо удаления.' 
      }, { status: 400 })
    }

    await prisma.job.delete({
      where: { id: jobId }
    })

    return NextResponse.json({ success: true, message: 'Работа удалена' })
  } catch (error) {
    console.error(' Job delete error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка удаления работы' 
    }, { status: 500 })
  }
})
