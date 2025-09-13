/**
 * NFT Like API - Handle NFT likes/unlikes
 * POST /api/nft/[nftId]/like
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
    const { action } = await request.json()
    
    
    const userId = auth.userId

    // Check if NFT exists
    const nft = await prisma.nFT.findUnique({
      where: { id: nftId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            likes: true
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

    if (action === 'unlike') {
      // Remove like
      const existingLike = await prisma.nFTLike.findUnique({
        where: {
          userId_nftId: {
            userId: userId,
            nftId: nftId
          }
        }
      })

      if (existingLike) {
        await prisma.nFTLike.delete({
          where: {
            userId_nftId: {
              userId: userId,
              nftId: nftId
            }
          }
        })
        
        console.log(' NFT unliked successfully')
      }
    } else {
      // Add like (upsert to handle duplicates)
      await prisma.nFTLike.upsert({
        where: {
          userId_nftId: {
            userId: userId,
            nftId: nftId
          }
        },
        update: {
          createdAt: new Date()
        },
        create: {
          userId: userId,
          nftId: nftId
        }
      })
      
      console.log(' NFT liked successfully')
    }

    // Get updated like count
    const updatedNft = await prisma.nFT.findUnique({
      where: { id: nftId },
      select: {
        _count: {
          select: {
            likes: true
          }
        }
      }
    })

    // Check if current user likes this NFT
    const userLike = await prisma.nFTLike.findUnique({
      where: {
        userId_nftId: {
          userId: userId,
          nftId: nftId
        }
      }
    })

    const likeCount = updatedNft?._count.likes || 0
    const isLiked = !!userLike

    return NextResponse.json({
      success: true,
      data: {
        nftId: nftId,
        likeCount: likeCount,
        isLiked: isLiked,
        action: action || 'like'
      },
      message: action === 'unlike' ? 'Лайк убран' : 'Лайк поставлен',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' NFT like API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка обработки лайка',
        code: 'LIKE_PROCESSING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
