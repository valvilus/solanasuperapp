/**
 * KMS Repair API
 * POST /api/admin/repair-kms
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { MockKMSService } from '@/lib/wallet/mock-kms.service'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {

    const usersWithWallets = await prisma.user.findMany({
      where: {
        walletAddress: { not: null }
      },
      select: {
        id: true,
        walletAddress: true,
        telegramId: true
      }
    })


    const kmsService = new MockKMSService()
    let repairedCount = 0
    let alreadyExistsCount = 0
    const repairResults: Array<{
      userId: string
      status: string
      keyId?: string
      originalPublicKey?: string | null
      newPublicKey?: string
      note?: string
      error?: string
    }> = []

    for (let i = 0; i < usersWithWallets.length; i++) {
      const user = usersWithWallets[i]
      

      const existingKeyId = kmsService.findKeyIdByPublicKey(user.walletAddress!)

      if (existingKeyId) {
        alreadyExistsCount++
        repairResults.push({
          userId: user.id,
          status: 'already_exists',
          keyId: existingKeyId
        })
        continue
      }

      try {
        const derivationPath = `m/44'/501'/${i}'/0'`
        
        const keyResult = await kmsService.generateKey(derivationPath, {
          userId: user.id,
          purpose: 'emergency_recovery',
          telegramId: user.telegramId.toString(),
          originalPublicKey: user.walletAddress,
          recoveredAt: new Date().toISOString(),
          note: 'Generated for existing wallet address compatibility'
        })

        if (keyResult.success && keyResult.data) {
          repairedCount++
          
          repairResults.push({
            userId: user.id,
            status: 'repaired',
            keyId: keyResult.data.keyId,
            originalPublicKey: user.walletAddress,
            newPublicKey: keyResult.data.publicKey,
            note: 'Emergency recovery - may need wallet recreation'
          })
        }

      } catch (error) {
        repairResults.push({
          userId: user.id,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const summary = {
      totalUsers: usersWithWallets.length,
      alreadyExisting: alreadyExistsCount,
      repaired: repairedCount,
      failed: repairResults.filter(r => r.status === 'failed').length
    }


    return NextResponse.json({
      success: true,
      data: {
        summary,
        results: repairResults
      },
      message: 'KMS repair completed'
    })

  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: 'KMS repair failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
