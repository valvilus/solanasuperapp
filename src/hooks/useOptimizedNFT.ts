'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useMemo } from 'react'
import { createNFTService } from '@/features/nft/services'

/**
 * Unified NFT hook with proper authorization
 * Clean and consistent naming - main NFT operations
 */
export function useNFT() {
  const { apiCall } = useAuth()

  // Create unified NFT service with proper authorization
  const nftService = useMemo(() => {
    return createNFTService(apiCall)
  }, [apiCall])

  return {
    // Core NFT operations
    getUserNfts: () => nftService.getUserNfts(),
    getPortfolioSummary: () => nftService.getPortfolioSummary(),
    getMarketplaceNfts: () => nftService.getMarketplaceNfts(),
    
    // NFT actions
    createNft: (data: FormData) => nftService.createNft(data),
    transferNft: (data: any) => nftService.transferNft(data),
    sellNft: (data: any) => nftService.sellNft(data),
    unlistNft: (nftId: string) => nftService.unlistNft(nftId),
    buyNft: (nftId: string) => nftService.buyNft(nftId),
    useNft: (nftId: string) => nftService.useNft(nftId),
    
    // Utility methods
    filterAndSortNfts: (nfts: any[], filter: any, search: string, sortBy: any, sortOrder: any) => 
      nftService.filterAndSortNfts(nfts, filter, search, sortBy, sortOrder),
    getFilterCounts: (nfts: any[]) => nftService.getFilterCounts(nfts),
    
    // Service instance (renamed from enhancedService)
    nftService
  }
}

// Legacy alias for backward compatibility
export const useOptimizedNFT = useNFT

/**
 * Quick NFT data loader hook
 */
export function useNFTLoader() {
  const { getUserNfts, getPortfolioSummary, getMarketplaceNfts } = useOptimizedNFT()
  
  const loadUserData = async () => {
    const [nfts, portfolio, marketplace] = await Promise.all([
      getUserNfts(),
      getPortfolioSummary(),
      getMarketplaceNfts()
    ])
    
    return { nfts, portfolio, marketplace }
  }
  
  return { loadUserData }
}
