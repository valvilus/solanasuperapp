import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { FlashLoanService } from '@/lib/onchain/flash-loan.service'
import { z } from 'zod'

const flashLoanSchema = z.object({
  action: z.enum(['execute', 'repay']).default('execute'),
  amount: z.string().optional(),
  poolAddress: z.string(),
  callbackProgram: z.string().optional(),
})

const flashLoanService = new FlashLoanService()

// GET /api/defi/flash-loans - Get available flash loan pools
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const pools = await flashLoanService.getAvailableFlashLoanPools()
    
    return NextResponse.json({
      success: true,
      data: {
        pools,
        user: auth.telegramId
      }
    })
  } catch (error) {
    console.error('Flash loan pools fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flash loan pools' },
      { status: 500 }
    )
  }
})

// POST /api/defi/flash-loans - Execute flash loan
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const body = await request.json()
    const { action, amount, poolAddress, callbackProgram } = flashLoanSchema.parse(body)

    // Get user wallet
    const userWallet = await flashLoanService.getUserWallet(auth.userId)
    if (!userWallet) {
      return NextResponse.json(
        { success: false, error: 'User wallet not found' },
        { status: 404 }
      )
    }

    let result
    if (action === 'repay') {
      result = await flashLoanService.repayFlashLoan({
        poolAddress,
        userWallet: userWallet.publicKey,
        userId: auth.userId
      })
    } else {
      if (!amount) {
        return NextResponse.json(
          { success: false, error: 'amount is required for execute action' },
          { status: 400 }
        )
      }
      result = await flashLoanService.executeFlashLoan({
        amount,
        poolAddress,
        userWallet: userWallet.publicKey,
        callbackProgram,
        userId: auth.userId
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        signature: result.signature,
        flashLoanId: result.flashLoanId,
        amount,
        fee: result.fee,
        action
      }
    })
  } catch (error) {
    console.error('Flash loan execution error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute flash loan' },
      { status: 500 }
    )
  }
})
