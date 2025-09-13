/**
 * NFT Marketplace API
 * GET /api/nft/marketplace
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string }
) => {
  try {
    
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const type = url.searchParams.get('type')
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')

    const whereClause: any = {
      isForSale: true,
      price: {
        gt: 0
      }
    }

    // Add type filter if specified
    if (type && type !== 'ALL') {
      whereClause.type = type
    }

    // Add price range filter if specified
    if (minPrice || maxPrice) {
      whereClause.price = {
        ...whereClause.price,
        ...(minPrice && { gte: BigInt(Math.floor(parseFloat(minPrice) * 1e9)) }),
        ...(maxPrice && { lte: BigInt(Math.floor(parseFloat(maxPrice) * 1e9)) })
      }
    }

    // Get marketplace NFTs
    const nfts = await prisma.nFT.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            walletAddress: true
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true
          }
        },
        collection: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUri: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            likes: true,
            views: true,
            shares: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc'
      },
      skip: offset,
      take: limit
    })

    // Add explorer URLs and format data for frontend
    const nftsWithMetadata = nfts.map(nft => ({
      id: nft.id,
      mintAddress: nft.mintAddress,
      name: nft.name,
      description: nft.description,
      type: nft.type,
      status: nft.status,
      imageUri: nft.imageUri,
      attributes: (nft as any).attributes || [],
      isForSale: nft.isForSale,
      isOwner: nft.ownerId === auth.userId, // Add owner flag for UI
      currency: nft.currency || 'SOL', // Include currency in response
      price: nft.price ? {
        amount: (Number(nft.price) / 1e9).toFixed(nft.currency === 'TNG' ? 0 : 3),
        formatted: `${(Number(nft.price) / 1e9).toFixed(nft.currency === 'TNG' ? 0 : 3)} ${nft.currency || 'SOL'}`,
        lamports: Number(nft.price)
      } : null,
      owner: {
        userId: nft.owner.id,
        username: nft.owner.username,
        firstName: nft.owner.firstName,
        walletAddress: nft.owner.walletAddress
      },
      creator: nft.creator ? {
        userId: nft.creator.id,
        username: nft.creator.username,
        firstName: nft.creator.firstName
      } : undefined,
      collection: nft.collection ? {
        id: nft.collection.id,
        name: nft.collection.name,
        slug: nft.collection.slug,
        imageUri: nft.collection.imageUri,
        isVerified: nft.collection.isVerified
      } : undefined,
      social: {
        likeCount: nft._count.likes,
        viewCount: nft._count.views,
        shareCount: nft._count.shares
      },
      usageCount: nft.usageCount,
      maxUsage: nft.maxUsage,
      createdAt: nft.createdAt.toISOString(),
      updatedAt: nft.updatedAt.toISOString(),
      explorerUrl: `https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`
    }))

    // Get total count for pagination
    const totalCount = await prisma.nFT.count({
      where: whereClause
    })

    // Calculate marketplace statistics
    const stats = {
      totalListings: totalCount,
      totalVolume: nfts.reduce((sum, nft) => sum + Number(nft.price || 0), 0) / 1e9,
      averagePrice: totalCount > 0 ? 
        (nfts.reduce((sum, nft) => sum + Number(nft.price || 0), 0) / 1e9) / totalCount : 0,
      byType: {
        COLLECTIBLE: await prisma.nFT.count({ where: { ...whereClause, type: 'COLLECTIBLE' } }),
        TICKET: await prisma.nFT.count({ where: { ...whereClause, type: 'TICKET' } }),
        COUPON: await prisma.nFT.count({ where: { ...whereClause, type: 'COUPON' } }),
        CERTIFICATE: await prisma.nFT.count({ where: { ...whereClause, type: 'CERTIFICATE' } }),
        BADGE: await prisma.nFT.count({ where: { ...whereClause, type: 'BADGE' } }),
        ART: await prisma.nFT.count({ where: { ...whereClause, type: 'ART' } })
      }
    }

    console.log(` Marketplace NFTs retrieved: ${nftsWithMetadata.length} of ${totalCount}`)

    return NextResponse.json({
      success: true,
      data: {
        nfts: nftsWithMetadata,
        stats: stats,
        pagination: {
          total: totalCount,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < totalCount
        },
        metadata: {
          filters: {
            type: type || 'ALL',
            minPrice: minPrice,
            maxPrice: maxPrice
          },
          sort: {
            by: sortBy,
            order: sortOrder
          },
          network: 'devnet',
          lastUpdated: new Date().toISOString()
        }
      },
      message: 'Marketplace NFTs получены успешно',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Get marketplace NFTs API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка получения marketplace NFTs',
        code: 'MARKETPLACE_FETCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

