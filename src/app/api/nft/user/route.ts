/**
 * User NFTs API - Get user's NFT collection
 * GET /api/nft/user
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { NFTIntegrationService } from '@/lib/wallet/nft-integration.service'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/nft/user - получить все NFT пользователя
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    
    const userId = auth.userId

    // Проверяем что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection not available')
    }

    // Инициализируем NFT service
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    const nftIntegrationService = new NFTIntegrationService(connection, prisma)

    // Получаем NFT пользователя
    const nftsResult = await nftIntegrationService.getUserNFTs(userId)

    if (!nftsResult.success || !nftsResult.data) {
      return NextResponse.json(
        {
          error: nftsResult.error?.message || 'Ошибка получения NFT',
          code: nftsResult.error?.code || 'GET_NFTS_FAILED',
          details: nftsResult.error,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    const nfts = nftsResult.data

    // Добавляем explorer URLs к NFT
    const nftsWithExplorer = nfts.map(nft => ({
      ...nft,
      explorerUrl: `https://explorer.solana.com/address/${nft.mintAddress}?cluster=devnet`,
      currency: (nft as any).currency || 'SOL', // Include currency in response
      // Форматируем price для frontend - конвертируем из smallest units
      price: nft.price ? {
        amount: (Number(nft.price) / 1e9).toFixed((nft as any).currency === 'TNG' ? 0 : 3),
        formatted: `${(Number(nft.price) / 1e9).toFixed((nft as any).currency === 'TNG' ? 0 : 3)} ${(nft as any).currency || 'SOL'}`,
        lamports: Number(nft.price)
      } : null
    }))

    // Статистика портфолио
    const portfolio = {
      totalNFTs: nfts.length,
      forSale: nfts.filter(nft => nft.isForSale).length,
      byType: {
        COLLECTIBLE: nfts.filter(nft => nft.type === 'COLLECTIBLE').length,
        TICKET: nfts.filter(nft => nft.type === 'TICKET').length,
        COUPON: nfts.filter(nft => nft.type === 'COUPON').length,
        CERTIFICATE: nfts.filter(nft => nft.type === 'CERTIFICATE').length,
        BADGE: nfts.filter(nft => nft.type === 'BADGE').length
      },
      totalValue: nfts
        .filter(nft => nft.price)
        .reduce((sum, nft) => sum + (nft.price || 0), 0)
    }

    console.log(' User NFTs retrieved:', {
      userId,
      totalNFTs: nfts.length,
      forSale: portfolio.forSale
    })

    return NextResponse.json({
      success: true,
      data: {
        nfts: nftsWithExplorer,
        portfolio,
        metadata: {
          userId,
          totalCount: nfts.length,
          network: 'devnet',
          lastUpdated: new Date().toISOString()
        }
      },
      message: 'NFT коллекция получена успешно',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Get user NFTs API error:', error)
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера при получении NFT',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    )
  }
})
