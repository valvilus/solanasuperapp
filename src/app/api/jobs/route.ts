import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withOptionalAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs - list jobs with simple filters
export const GET = withOptionalAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url)
    const search = url.searchParams.get('search') || undefined
    const category = url.searchParams.get('category') || undefined
    const status = url.searchParams.get('status') || undefined

    const jobs = await prisma.job.findMany({
      where: {
        ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] } : {}),
        ...(category ? { category } as any : {}),
        ...(status ? { status } as any : {})
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: jobs })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка получения вакансий' }, { status: 500 })
  }
})

// POST /api/jobs - create job
export const POST = withAuth(async (request: NextRequest, auth: { userId: string }) => {
  try {
    const body = await request.json()
    
    if (!body.title || !body.description) {
      return NextResponse.json({ 
        success: false, 
        error: 'Название и описание работы обязательны' 
      }, { status: 400 })
    }

    if (!body.budget || body.budget <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Бюджет должен быть больше 0' 
      }, { status: 400 })
    }

    const paymentTypeUpper = (body.paymentType || 'FIXED').toUpperCase();
    const validPaymentTypes = ['FIXED', 'HOURLY', 'MILESTONE'];
    if (!validPaymentTypes.includes(paymentTypeUpper)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Недопустимый тип оплаты. Допустимые: FIXED, HOURLY, MILESTONE' 
      }, { status: 400 });
    }

    // Transform and validate category
    const categoryUpper = (body.category || 'OTHER').toUpperCase();
    const validCategories = ['DEVELOPMENT', 'DESIGN', 'MARKETING', 'WRITING', 'CONSULTING', 'OTHER'];
    if (!validCategories.includes(categoryUpper)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Недопустимая категория. Допустимые: DEVELOPMENT, DESIGN, MARKETING, WRITING, CONSULTING, OTHER' 
      }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: {
        userId: auth.userId,
        title: body.title,
        description: body.description,
        requirements: body.requirements || [],
        skills: body.skills || [],
        paymentAmount: BigInt(Math.round(body.budget * 1e6)), // Конвертируем в wei
        paymentToken: body.currency || 'USDC',
        paymentType: paymentTypeUpper,
        category: categoryUpper,
        location: body.location || null,
        estimatedTime: body.estimatedTime || null,
        status: 'OPEN'
      },
      include: {
        employer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        jobId: job.id,
        job: {
          id: job.id,
          title: job.title,
          budget: body.budget,
          currency: job.paymentToken,
          status: job.status
        }
      } 
    }, { status: 201 })
  } catch (error) {
    console.error(' Job creation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка создания вакансии' 
    }, { status: 500 })
  }
})



