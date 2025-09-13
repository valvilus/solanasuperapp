/**
 * Wallet Migration Status API
 * GET /api/admin/check-migration-status
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {

    const stats = {
      noWallet: await prisma.user.count({
        where: { walletAddress: null }
      }),

      legacyWallets: await prisma.user.count({
        where: {
          walletAddress: { not: null },
          encryptedPrivateKey: null
        }
      }),

      modernWallets: await prisma.user.count({
        where: {
          walletAddress: { not: null },
          encryptedPrivateKey: { not: null }
        }
      }),

      totalUsers: await prisma.user.count()
    }

    const legacyUsers = await prisma.user.findMany({
      where: {
        walletAddress: { not: null },
        encryptedPrivateKey: null
      },
      select: {
        id: true,
        walletAddress: true,
        firstName: true,
        telegramId: true,
        createdAt: true
      },
      take: 5
    })

    const migrationRequired = stats.legacyWallets > 0


    return NextResponse.json({
      success: true,
      data: {
        migrationRequired,
        stats,
        legacyUsers: legacyUsers.map(user => ({
          id: user.id,
          walletAddress: user.walletAddress,
          firstName: user.firstName,
          telegramId: user.telegramId.toString(),
          createdAt: user.createdAt
        })),
        recommendations: migrationRequired ? [
          'Run migration API: POST /api/admin/migrate-existing-wallets',
          'Backup database before migration',
          'Inform users about potential address changes',
          'Consider airdropping tokens to new addresses'
        ] : [
          'No migration needed - all wallets are modern',
          'System is ready for production'
        ]
      },
      message: migrationRequired 
        ? `${stats.legacyWallets} legacy wallets need migration`
        : 'All wallets are up to date'
    })

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
