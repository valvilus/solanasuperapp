/**
 * NFT History API - Get NFT transaction history
 * GET /api/nft/[nftId]/history
 * Solana SuperApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface NFTTransaction {
  id: string
  type: 'MINT' | 'TRANSFER' | 'LIST' | 'UNLIST' | 'SALE' | 'USE' | 'BURN'
  status: 'pending' | 'confirmed' | 'failed'
  fromAddress?: string
  toAddress?: string
  fromUsername?: string
  toUsername?: string
  price?: {
    amount: string
    formatted: string
    lamports: number
  }
  signature?: string
  timestamp: Date
  blockTime?: Date
  explorerUrl?: string
  memo?: string
  isOnchain?: boolean
}

export const GET = withAuth(async (
  request: NextRequest, 
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ nftId: string }> }
) => {
  try {
    const { nftId } = await params
    
    const userId = auth.userId

    // Check if NFT exists and user has access to it
    const nft = await prisma.nFT.findUnique({
      where: { 
        id: nftId 
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            walletAddress: true
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

    // For now, return mock transaction history
    // In production, this would query blockchain and database for real transactions
    const mockHistory: NFTTransaction[] = [
      {
        id: '1',
        type: 'MINT',
        status: 'confirmed',
        toAddress: nft.owner.walletAddress || 'Unknown',
        toUsername: nft.owner.username || nft.owner.firstName || 'SuperApp User',
        signature: generateMockSignature(),
        timestamp: nft.createdAt,
        explorerUrl: `https://explorer.solana.com/tx/${generateMockSignature()}?cluster=devnet`,
        memo: `NFT "${nft.name}" created`,
        isOnchain: true
      }
    ]

    // Add listing transaction if NFT is for sale
    if (nft.isForSale && nft.price) {
      mockHistory.push({
        id: '2',
        type: 'LIST',
        status: 'confirmed',
        fromAddress: nft.owner.walletAddress || 'Unknown',
        fromUsername: nft.owner.username || nft.owner.firstName || 'SuperApp User',
        price: {
          amount: (Number(nft.price) / 1e9).toString(),
          formatted: `${(Number(nft.price) / 1e9).toFixed(3)} SOL`,
          lamports: Number(nft.price)
        },
        signature: generateMockSignature(),
        timestamp: nft.updatedAt,
        explorerUrl: `https://explorer.solana.com/tx/${generateMockSignature()}?cluster=devnet`,
        memo: `Listed for sale at ${(Number(nft.price) / 1e9).toFixed(3)} SOL`,
        isOnchain: true
      })
    }

    // Add some mock transfer history if needed
    if (Math.random() > 0.5) {
      mockHistory.push({
        id: '3',
        type: 'TRANSFER',
        status: 'confirmed',
        fromAddress: 'Previous Owner Address',
        toAddress: nft.owner.walletAddress || 'Unknown',
        fromUsername: 'Previous Owner',
        toUsername: nft.owner.username || nft.owner.firstName || 'Current Owner',
        signature: generateMockSignature(),
        timestamp: new Date(nft.createdAt.getTime() + 24 * 60 * 60 * 1000), // 1 day after creation
        explorerUrl: `https://explorer.solana.com/tx/${generateMockSignature()}?cluster=devnet`,
        memo: 'Transferred to current owner',
        isOnchain: true
      })
    }

    // Sort by timestamp descending (newest first)
    mockHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    console.log(` Found ${mockHistory.length} transactions for NFT ${nftId}`)

    return NextResponse.json({
      success: true,
      data: {
        nft: {
          id: nft.id,
          name: nft.name,
          type: nft.type,
          mintAddress: nft.mintAddress
        },
        transactions: mockHistory,
        metadata: {
          totalTransactions: mockHistory.length,
          oldestTransaction: mockHistory[mockHistory.length - 1]?.timestamp,
          newestTransaction: mockHistory[0]?.timestamp,
          network: 'devnet'
        }
      },
      message: 'История транзакций NFT получена успешно',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Get NFT history API error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка получения истории NFT',
        code: 'HISTORY_FETCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

// Helper function to generate mock transaction signatures
function generateMockSignature(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// TODO: In production, implement real blockchain transaction history fetching
// This would involve:
// 1. Querying Solana blockchain for all transactions involving the NFT mint address
// 2. Parsing transaction logs to identify mint, transfer, and marketplace operations
// 3. Cross-referencing with database records for additional metadata
// 4. Caching results for performance
// 5. Handling pagination for NFTs with many transactions
