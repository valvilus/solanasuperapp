/**
 * NFT Collection Details API - Get collection by slug with full analytics
 * GET /api/nft/collections/[slug]
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CollectionAnalytics {
  floorPrice: {
    current: number // in SOL
    change24h: number // percentage
    change7d: number // percentage
  }
  volume: {
    total: number // in SOL
    volume24h: number // in SOL
    change24h: number // percentage
  }
  activity: {
    sales24h: number
    listings24h: number
    holders: number
    avgPrice: number // in SOL
  }
  priceHistory: Array<{
    timestamp: string
    price: number
    volume: number
  }>
}

export const GET = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ slug: string }> }
) => {
  try {
    const { slug } = await params
    
    const userId = auth.userId

    // Import collections from data file for consistency
    const { mockNFTCollections } = await import('@/features/nft/data/collections.data')
    
    // Find collection by slug
    const collection = mockNFTCollections.find(col => col.slug === slug)

    if (!collection) {
      return NextResponse.json(
        { 
          error: 'Коллекция не найдена', 
          code: 'COLLECTION_NOT_FOUND' 
        },
        { status: 404 }
      )
    }

    // Generate mock analytics
    const analytics: CollectionAnalytics = {
      floorPrice: {
        current: collection.floorPrice || 0,
        change24h: (Math.random() - 0.5) * 40, // -20% to +20%
        change7d: (Math.random() - 0.5) * 60   // -30% to +30%
      },
      volume: {
        total: collection.totalVolume,
        volume24h: collection.totalVolume * 0.05, // 5% of total volume daily
        change24h: (Math.random() - 0.3) * 100 // Bias towards positive growth
      },
      activity: {
        sales24h: Math.floor(Math.random() * 20) + 5, // 5-25 sales
        listings24h: Math.floor(Math.random() * 30) + 10, // 10-40 listings
        holders: Math.floor(collection.totalSupply * (0.6 + Math.random() * 0.3)), // 60-90% unique holders
        avgPrice: collection.floorPrice * (1.2 + Math.random() * 0.8) // 120-200% of floor
      },
      priceHistory: Array.from({ length: 30 }, (_, i) => {
        const basePrice = collection.floorPrice
        const variation = (Math.random() - 0.5) * 0.4 // ±20% variation
        const trend = Math.sin(i * 0.2) * 0.1 // Slight upward trend
        
        return {
          timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          price: basePrice * (1 + variation + trend),
          volume: Math.random() * 50 + 10 // 10-60 SOL daily volume
        }
      })
    }

    // Track collection view
    try {
      // In production, would track in NFTCollectionView table
    } catch (error) {
      console.error('Error tracking collection view:', error)
    }

    console.log(` Collection ${slug} details retrieved successfully`)

    return NextResponse.json({
      success: true,
      data: {
        collection: {
          ...collection,
          isLiked: Math.random() > 0.5 // Random like status for demo
        },
        analytics: analytics,
        // Mock recent NFTs from this collection
        recentNFTs: Array.from({ length: 8 }, (_, i) => ({
          id: `nft_${collection.id}_${i + 1}`,
          name: `${collection.name} #${1000 + i}`,
          imageUri: `https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=%23${1000 + i}`,
          price: collection.floorPrice * (0.9 + Math.random() * 0.4), // 90-130% of floor
          isForSale: Math.random() > 0.3
        }))
      },
      message: 'Детали коллекции получены успешно',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Get collection details API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка получения деталей коллекции',
        code: 'COLLECTION_DETAILS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
