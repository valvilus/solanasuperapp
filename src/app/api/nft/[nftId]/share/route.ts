/**
 * NFT Share API - Track NFT shares
 * POST /api/nft/[nftId]/share
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ nftId: string }> }
) => {
  try {
    const { nftId } = await params
    console.log(' Tracking NFT share:', nftId, 'by user:', auth.userId)
    
    const userId = auth.userId

    // Check if NFT exists
    const nft = await prisma.nFT.findUnique({
      where: { id: nftId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            shares: true
          }
        }
      }
    })

    if (!nft) {
      return NextResponse.json(
        { 
          error: 'NFT не найден', 
          code: 'NFT_NOT_FOUND' 
        },
        { status: 404 }
      )
    }

    // Create new share record
    await prisma.nFTShare.create({
      data: {
        userId: userId,
        nftId: nftId,
        sharedAt: new Date(),
        platform: 'telegram' // Could be extended to track different platforms
      }
    })
    
    console.log(' NFT share tracked successfully')

    // Get updated share count
    const updatedNft = await prisma.nFT.findUnique({
      where: { id: nftId },
      select: {
        _count: {
          select: {
            shares: true
          }
        }
      }
    })

    const shareCount = updatedNft?._count.shares || 0

    return NextResponse.json({
      success: true,
      data: {
        nftId: nftId,
        shareCount: shareCount,
        platform: 'telegram'
      },
      message: 'Поделились NFT',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' NFT share API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка отслеживания поделились',
        code: 'SHARE_TRACKING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
