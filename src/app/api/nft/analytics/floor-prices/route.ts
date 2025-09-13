/**
 * NFT Floor Price Analytics API - Get floor price trends and analytics
 * GET /api/nft/analytics/floor-prices
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

interface FloorPriceData {
  collectionId: string
  collectionName: string
  slug: string
  currentFloorPrice: number // in SOL
  change24h: number // percentage
  change7d: number // percentage
  change30d: number // percentage
  volume24h: number // in SOL
  marketCap: number // in SOL (floor price * total supply)
  totalSupply: number
  listedCount: number
  priceHistory: Array<{
    timestamp: string
    price: number
    volume: number
  }>
}

interface FloorPriceAnalytics {
  topGainers: FloorPriceData[]
  topLosers: FloorPriceData[]
  highestVolume: FloorPriceData[]
  trending: FloorPriceData[]
  summary: {
    totalCollections: number
    avgFloorPrice: number
    totalVolume24h: number
    totalMarketCap: number
    avgChange24h: number
  }
}

export const GET = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string }
) => {
  try {
    const url = new URL(request.url)
    const timeframe = url.searchParams.get('timeframe') || '24h' // 24h, 7d, 30d
    const limit = parseInt(url.searchParams.get('limit') || '10')

    
    // Mock floor price data for various collections
    const mockCollections: FloorPriceData[] = [
      {
        collectionId: 'col_1',
        collectionName: 'Solana Apes',
        slug: 'solana-apes',
        currentFloorPrice: 3.2,
        change24h: 15.8,
        change7d: -2.3,
        change30d: 45.2,
        volume24h: 125.7,
        marketCap: 32000, // 3.2 * 10000
        totalSupply: 10000,
        listedCount: 247,
        priceHistory: generatePriceHistory(3.2, 30)
      },
      {
        collectionId: 'col_2',
        collectionName: 'Crypto Punks SOL',
        slug: 'crypto-punks-sol',
        currentFloorPrice: 2.8,
        change24h: -8.4,
        change7d: 12.1,
        change30d: 23.7,
        volume24h: 89.3,
        marketCap: 14000, // 2.8 * 5000
        totalSupply: 5000,
        listedCount: 156,
        priceHistory: generatePriceHistory(2.8, 30)
      },
      {
        collectionId: 'col_3',
        collectionName: 'Solana Landscapes',
        slug: 'solana-landscapes',
        currentFloorPrice: 1.5,
        change24h: 22.3,
        change7d: 8.9,
        change30d: 67.8,
        volume24h: 45.2,
        marketCap: 3750, // 1.5 * 2500
        totalSupply: 2500,
        listedCount: 98,
        priceHistory: generatePriceHistory(1.5, 30)
      },
      {
        collectionId: 'col_4',
        collectionName: 'Gaming Heroes',
        slug: 'gaming-heroes',
        currentFloorPrice: 2.1,
        change24h: -12.5,
        change7d: -5.7,
        change30d: 18.9,
        volume24h: 67.8,
        marketCap: 15750, // 2.1 * 7500
        totalSupply: 7500,
        listedCount: 189,
        priceHistory: generatePriceHistory(2.1, 30)
      },
      {
        collectionId: 'col_5',
        collectionName: 'Abstract Dreams',
        slug: 'abstract-dreams',
        currentFloorPrice: 4.5,
        change24h: 8.7,
        change7d: 18.4,
        change30d: 89.2,
        volume24h: 34.6,
        marketCap: 4500, // 4.5 * 1000
        totalSupply: 1000,
        listedCount: 42,
        priceHistory: generatePriceHistory(4.5, 30)
      },
      {
        collectionId: 'col_6',
        collectionName: 'Music Vibes',
        slug: 'music-vibes',
        currentFloorPrice: 1.8,
        change24h: -3.2,
        change7d: 14.6,
        change30d: 34.8,
        volume24h: 56.9,
        marketCap: 5400, // 1.8 * 3000
        totalSupply: 3000,
        listedCount: 127,
        priceHistory: generatePriceHistory(1.8, 30)
      }
    ]

    // Sort collections for different categories
    const topGainers = [...mockCollections]
      .sort((a, b) => {
        const aChange = timeframe === '7d' ? a.change7d : timeframe === '30d' ? a.change30d : a.change24h
        const bChange = timeframe === '7d' ? b.change7d : timeframe === '30d' ? b.change30d : b.change24h
        return bChange - aChange
      })
      .slice(0, limit)

    const topLosers = [...mockCollections]
      .sort((a, b) => {
        const aChange = timeframe === '7d' ? a.change7d : timeframe === '30d' ? a.change30d : a.change24h
        const bChange = timeframe === '7d' ? b.change7d : timeframe === '30d' ? b.change30d : b.change24h
        return aChange - bChange
      })
      .slice(0, limit)

    const highestVolume = [...mockCollections]
      .sort((a, b) => (b?.volume24h || 0) - (a?.volume24h || 0))
      .slice(0, limit)

    const trending = [...mockCollections]
      .sort((a, b) => (b.volume24h * b.change24h) - (a.volume24h * a.change24h))
      .slice(0, limit)

    // Calculate summary statistics
    const summary = {
      totalCollections: mockCollections.length,
      avgFloorPrice: mockCollections.reduce((sum, col) => sum + col.currentFloorPrice, 0) / mockCollections.length,
      totalVolume24h: mockCollections.reduce((sum, col) => sum + col.volume24h, 0),
      totalMarketCap: mockCollections.reduce((sum, col) => sum + col.marketCap, 0),
      avgChange24h: mockCollections.reduce((sum, col) => sum + col.change24h, 0) / mockCollections.length
    }

    const analytics: FloorPriceAnalytics = {
      topGainers,
      topLosers,
      highestVolume,
      trending,
      summary
    }

    console.log(` Floor price analytics retrieved for timeframe ${timeframe}`)

    return NextResponse.json({
      success: true,
      data: analytics,
      metadata: {
        timeframe: timeframe,
        limit: limit,
        generatedAt: new Date().toISOString()
      },
      message: 'Аналитика floor price получена успешно',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Floor price analytics API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка получения аналитики floor price',
        code: 'FLOOR_PRICE_ANALYTICS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

// Helper function to generate mock price history
function generatePriceHistory(currentPrice: number, days: number) {
  const history: any[] = []
  const basePrice = currentPrice
  
  for (let i = days - 1; i >= 0; i--) {
    const dayAgo = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    
    // Generate realistic price movement
    const randomWalk = (Math.random() - 0.5) * 0.1 // ±5% random movement
    const trend = Math.sin(i * 0.1) * 0.05 // Slight cyclical trend
    const priceMultiplier = 1 + randomWalk + trend
    
    const price = basePrice * priceMultiplier * (0.85 + Math.random() * 0.3) // Price range around current
    const volume = Math.random() * 100 + 20 // 20-120 SOL volume
    
    history.push({
      timestamp: dayAgo.toISOString(),
      price: Math.max(0.1, price), // Minimum price of 0.1 SOL
      volume: volume
    })
  }
  
  return history
}
