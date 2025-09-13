/**
 * NFT View API - Track NFT views
 * POST /api/nft/[nftId]/view
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
    
    const userId = auth.userId

    // Check if NFT exists
    const nft = await prisma.nFT.findUnique({
      where: { id: nftId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            views: true
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

    // Check if user already viewed this NFT recently (last 5 minutes)
    const recentView = await prisma.nFTView.findFirst({
      where: {
        userId: userId,
        nftId: nftId,
        viewedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      }
    })

    if (!recentView) {
      // Create new view record
      await prisma.nFTView.create({
        data: {
          userId: userId,
          nftId: nftId,
          viewedAt: new Date()
        }
      })
      
      console.log(' NFT view tracked successfully')
    } else {
    }

    // Get updated view count
    const updatedNft = await prisma.nFT.findUnique({
      where: { id: nftId },
      select: {
        _count: {
          select: {
            views: true
          }
        }
      }
    })

    const viewCount = updatedNft?._count.views || 0

    return NextResponse.json({
      success: true,
      data: {
        nftId: nftId,
        viewCount: viewCount,
        wasNewView: !recentView
      },
      message: 'Просмотр учтен',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' NFT view API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка отслеживания просмотра',
        code: 'VIEW_TRACKING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
