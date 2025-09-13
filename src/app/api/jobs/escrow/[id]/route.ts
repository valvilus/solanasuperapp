import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HoldService } from '@/lib/ledger/hold.service'
import { BalanceService } from '@/lib/ledger/balance.service'

// GET /api/jobs/escrow/[id] - details
export const GET = withAuth(async (request: NextRequest, auth: { userId: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const escrow = await prisma.escrowContract.findUnique({ where: { id }, include: { job: true } })
    if (!escrow) return NextResponse.json({ success: false, error: 'Эскроу не найден' }, { status: 404 })

    if (escrow.employerId !== auth.userId && escrow.freelancerId !== auth.userId) {
      return NextResponse.json({ success: false, error: 'Нет доступа' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: escrow })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка получения эскроу' }, { status: 500 })
  }
})

// POST /api/jobs/escrow/[id] - actions: fund|release|cancel
export const POST = withAuth(async (request: NextRequest, auth: { userId: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const escrow = await prisma.escrowContract.findUnique({ where: { id } })
    if (!escrow) return NextResponse.json({ success: false, error: 'Эскроу не найден' }, { status: 404 })

    const body = await request.json()
    const { action, releaseAmount } = body

    const holdService = new HoldService(prisma)
    const balanceService = new BalanceService(prisma)

    switch (action) {
      case 'fund': {
        // Only employer can fund
        if (escrow.employerId !== auth.userId) return NextResponse.json({ success: false, error: 'Нет прав' }, { status: 403 })
        if (escrow.status !== 'CREATED') return NextResponse.json({ success: false, error: 'Неверный статус' }, { status: 400 })

        // Create hold for employer's balance
        const holdResult = await holdService.createHold({
          userId: auth.userId,
          assetSymbol: escrow.token,
          amount: escrow.amount,
          purpose: 'ESCROW_FUND',
          referenceId: escrow.id,
          description: `Фондирование эскроу ${escrow.id}`
        } as any)

        if (!holdResult.success || !holdResult.data) return NextResponse.json({ success: false, error: holdResult.error?.message || 'Ошибка фондирования' }, { status: 400 })

        await prisma.escrowContract.update({ where: { id: escrow.id }, data: { status: 'FUNDED', metadata: { holdId: holdResult.data.id } as any } as any })

        return NextResponse.json({ success: true, data: { status: 'FUNDED', holdId: holdResult.data.id } })
      }
      case 'release': {
        // Only employer can release
        if (escrow.employerId !== auth.userId) return NextResponse.json({ success: false, error: 'Нет прав' }, { status: 403 })
        if (!(escrow as any).holdId) return NextResponse.json({ success: false, error: 'Эскроу не фондирован' }, { status: 400 })

        const holdId = (escrow as any).holdId as string
        const releaseResult = await holdService.releaseHold({ holdId, reason: 'Escrow release', releaseAmount: releaseAmount ? BigInt(Math.round(Number(releaseAmount) * 1e6)) : undefined } as any)
        if (!releaseResult.success || !releaseResult.data) return NextResponse.json({ success: false, error: releaseResult.error?.message || 'Ошибка release' }, { status: 400 })

        // Credit freelancer balance
        // TODO: Implement balance crediting
        console.log('Would credit balance:', escrow.freelancerId, escrow.token, releaseResult.data.amount)

        // Update status
        await prisma.escrowContract.update({ where: { id: escrow.id }, data: { status: releaseAmount ? 'IN_PROGRESS' : 'RELEASEED' } as any })

        return NextResponse.json({ success: true, data: { status: releaseAmount ? 'IN_PROGRESS' : 'RELEASED' } })
      }
      case 'cancel': {
        // Employer can cancel only if not funded
        if (escrow.employerId !== auth.userId) return NextResponse.json({ success: false, error: 'Нет прав' }, { status: 403 })
        if (escrow.status !== 'CREATED') return NextResponse.json({ success: false, error: 'Нельзя отменить' }, { status: 400 })
        await prisma.escrowContract.update({ where: { id: escrow.id }, data: { status: 'CANCELLED' } })
        return NextResponse.json({ success: true, data: { status: 'CANCELLED' } })
      }
      default:
        return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка эскроу операции' }, { status: 500 })
  }
})
