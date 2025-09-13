import { NextRequest, NextResponse } from 'next/server'
import { InsuranceService } from '@/lib/onchain/insurance.service'
import { CustodialWalletService } from '@/lib/wallet'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const purchasePolicySchema = z.object({
  poolId: z.string(),
  coverageAmount: z.number().positive(),
  duration: z.number().positive().max(365) // max 1 year
})

const fileClaimSchema = z.object({
  policyId: z.string(),
  claimAmount: z.number().positive(),
  evidence: z.array(z.any()).optional().default([])
})

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const insuranceService = new InsuranceService()
    const walletService = new CustodialWalletService(prisma)

    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'Кошелек пользователя не найден', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const userWallet = walletResult.data.publicKey

    switch (action) {
      case 'pools':
        const pools = await insuranceService.getInsurancePools()
        return NextResponse.json({
          success: true,
          data: { pools }
        })
      
      case 'policies':
        const policies = await insuranceService.getUserPolicies(userWallet)
        return NextResponse.json({
          success: true,
          data: { policies }
        })
      
      case 'claims':
        const claims = await insuranceService.getUserClaims(userWallet)
        return NextResponse.json({
          success: true,
          data: { claims }
        })
      
      case 'stats':
        const stats = await insuranceService.getInsuranceStats()
        return NextResponse.json({
          success: true,
          data: { stats }
        })
      
      case 'protocol-status':
        const protocol = searchParams.get('protocol')
        if (!protocol) {
          return NextResponse.json({ error: 'Protocol parameter required' }, { status: 400 })
        }
        const status = await insuranceService.getProtocolInsuranceStatus(protocol)
        return NextResponse.json({
          success: true,
          data: { status }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Insurance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const userId = auth.userId
    const body = await request.json()
    const { action } = body
    
    const insuranceService = new InsuranceService()
    const walletService = new CustodialWalletService(prisma)

    const walletResult = await walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return NextResponse.json(
        { error: 'Кошелек пользователя не найден', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const userWallet = walletResult.data.publicKey

    switch (action) {
      case 'purchase-policy':
        const validatedPolicyData = purchasePolicySchema.parse(body)
        const purchaseResult = await insuranceService.purchasePolicy(
          validatedPolicyData.poolId,
          validatedPolicyData.coverageAmount,
          validatedPolicyData.duration,
          userWallet
        )
        
        if (!purchaseResult.success) {
          return NextResponse.json(
            { success: false, error: purchaseResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            policyId: purchaseResult.policyId,
            message: 'Полис успешно приобретен'
          }
        })
      
      case 'file-claim':
        const validatedClaimData = fileClaimSchema.parse(body)
        const claimResult = await insuranceService.fileClaim(
          validatedClaimData.policyId,
          validatedClaimData.claimAmount,
          validatedClaimData.evidence,
          userWallet
        )
        
        if (!claimResult.success) {
          return NextResponse.json(
            { success: false, error: claimResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            claimId: claimResult.claimId,
            message: 'Претензия подана успешно'
          }
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Insurance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
