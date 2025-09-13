// Export unified NFT service
export * from './nft.service'
export * from './notification.service'

// Create enhanced NFT service instance for backward compatibility
import { createNFTService } from './nft.service'

// Enhanced NFT service will be created with proper apiCall when needed
// This is a temporary solution for import compatibility
export const enhancedNftService = {
  listNftForSale: async (data: any) => {
    throw new Error('enhancedNftService is deprecated. Use useOptimizedNFT hook instead.')
  },
  unlistNft: async (mintAddress: string) => {
    throw new Error('enhancedNftService is deprecated. Use useOptimizedNFT hook instead.')
  },
  transferNft: async (data: any) => {
    throw new Error('enhancedNftService is deprecated. Use useOptimizedNFT hook instead.')
  }
}