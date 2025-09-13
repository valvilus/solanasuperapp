/**
 * NFT Collections API
 * GET /api/nft/collections
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CollectionWithStats {
  id: string
  name: string
  description?: string
  imageUri?: string
  bannerUri?: string
  slug: string
  creatorId: string
  creator?: {
    userId: string
    username?: string
    firstName?: string
  }
  isVerified: boolean
  totalSupply: number
  totalVolume: number
  floorPrice?: number
  viewCount: number
  likeCount: number
  isLiked?: boolean
  createdAt: string
  updatedAt?: string
}

export const GET = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string }
) => {
  try {
    const url = new URL(request.url)
    const sortBy = url.searchParams.get('sortBy') || 'volume'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const verified = url.searchParams.get('verified')

    
    const userId = auth.userId

    // Import collections from data file for consistency
    const { mockNFTCollections } = await import('@/features/nft/data/collections.data')
    
    // Convert to API format
    const mockCollections = mockNFTCollections.map(col => ({
      ...col,
      isLiked: Math.random() > 0.5 // Random like status for demo
    }))

    // Apply filters
    let filteredCollections = [...mockCollections]

    if (verified !== null) {
      const isVerified = verified === 'true'
      filteredCollections = filteredCollections.filter(col => col.isVerified === isVerified)
    }

    // Apply sorting
    filteredCollections.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CollectionWithStats]
      let bValue: any = b[sortBy as keyof CollectionWithStats]
      
      // Handle nested values
      if (sortBy === 'created') {
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    // Apply pagination
    const paginatedCollections = filteredCollections.slice(offset, offset + limit)

    console.log(` Found ${paginatedCollections.length} collections (total: ${filteredCollections.length})`)

    return NextResponse.json({
      success: true,
      data: {
        collections: paginatedCollections,
        pagination: {
          total: filteredCollections.length,
          offset: offset,
          limit: limit,
          hasMore: offset + limit < filteredCollections.length
        },
        metadata: {
          totalVolume: filteredCollections.reduce((sum, col) => sum + col.totalVolume, 0),
          avgFloorPrice: filteredCollections.reduce((sum, col) => sum + (col.floorPrice || 0), 0) / filteredCollections.length,
          verifiedCount: filteredCollections.filter(col => col.isVerified).length
        }
      },
      message: 'Коллекции NFT получены успешно',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Get NFT collections API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка получения коллекций NFT',
        code: 'COLLECTIONS_FETCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
