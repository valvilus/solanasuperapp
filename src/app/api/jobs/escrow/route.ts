import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HoldService } from '@/lib/ledger/hold.service'
import { BalanceService } from '@/lib/ledger/balance.service'

// GET /api/jobs/escrow - list user escrow contracts (as employer or freelancer)
export const GET = withAuth(async (request: NextRequest, auth: { userId: string }) => {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // employer | freelancer | all
    const status = searchParams.get('status') // CREATED | FUNDED | ...

    const where: any = {
      OR: [
        { employerId: auth.userId },
        { freelancerId: auth.userId }
      ]
    }

    if (role === 'employer') where.OR = [{ employerId: auth.userId }]
    if (role === 'freelancer') where.OR = [{ freelancerId: auth.userId }]
    if (status) where.status = status

    const escrows = await prisma.escrowContract.findMany({
      where,
      include: {
        job: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: escrows })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка получения эскроу' }, { status: 500 })
  }
})

// POST /api/jobs/escrow - create escrow (off-chain)
export const POST = withAuth(async (request: NextRequest, auth: { userId: string }) => {
  try {
    const body = await request.json()
    const { jobId, freelancerId, amount, token = 'USDC', terms, milestones } = body

    if (!jobId || !freelancerId || !amount) {
      return NextResponse.json({ success: false, error: 'jobId, freelancerId, amount обязательны' }, { status: 400 })
    }

    // Validate job ownership
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, userId: true } })
    if (!job) return NextResponse.json({ success: false, error: 'Работа не найдена' }, { status: 404 })
    if (job.userId !== auth.userId) return NextResponse.json({ success: false, error: 'Нет прав создавать эскроу' }, { status: 403 })

    // Create escrow contract record
    const escrow = await prisma.escrowContract.create({
      data: {
        jobId,
        employerId: auth.userId,
        freelancerId,
        amount: BigInt(Math.round(Number(amount) * 1e6)),
        token,
        terms: terms || 'Off-chain escrow for job',
        milestones: milestones || undefined,
        status: 'CREATED'
      }
    })

    return NextResponse.json({ success: true, data: { escrowId: escrow.id } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка создания эскроу' }, { status: 500 })
  }
})
