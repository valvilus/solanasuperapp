import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/jobs/apply - apply to a job
export const POST = withAuth(async (request: NextRequest, auth: { userId: string }) => {
  try {
    const body = await request.json()
    const { jobId, coverLetter, proposedRate, estimatedTime, portfolio } = body

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ success: false, error: 'Вакансия не найдена' }, { status: 404 })
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: auth.userId,
        jobId,
        coverLetter,
        proposedRate: proposedRate ? BigInt(proposedRate) : null,
        estimatedTime: estimatedTime || null,
        portfolio: Array.isArray(portfolio) ? portfolio : []
      }
    })

    return NextResponse.json({ success: true, data: { applicationId: application.id } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка подачи заявки' }, { status: 500 })
  }
})



