/**
 * Unified NFT Service - All NFT operations in one place
 * Solana SuperApp
 */

import type { 
  NftItem, 
  EnhancedPortfolioSummary,
  TransferNftFormData,
  SellNftFormData,
  CreateNftFormData,
  FilterCounts,
  NftFilter,
  NftSortBy,
  NftSortOrder
} from '../types'

// Simple cache implementation
class SimpleCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  static get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  static set<T>(key: string, data: T, ttl: number = 30000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }
  
  static invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

// Main NFT Service class
export class NFTService {
  private baseUrl = '/api/nft'
  private apiCall?: (endpoint: string, options?: RequestInit) => Promise<any>

  constructor(apiCall?: (endpoint: string, options?: RequestInit) => Promise<any>) {
    this.apiCall = apiCall
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Use apiCall for proper authorization
    if (this.apiCall) {
      try {
        const response = await this.apiCall(`${this.baseUrl}${endpoint}`, options)
        
        // If response is a Response object, parse it as JSON
        if (response instanceof Response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return await response.json()
        }
        
        // If response is already parsed JSON, return as is
        return response
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'API request failed')
      }
    }

    // Fallback - should not be used in production
    throw new Error('Direct API calls without apiCall are deprecated. Use createNFTService(apiCall)')
  }

  private async makeFormRequest(endpoint: string, formData: FormData) {
    if (this.apiCall) {
      try {
        // Don't set Content-Type for FormData - browser will set it automatically with boundary
        const headers: Record<string, string> = {}
        const response = await this.apiCall(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          body: formData,
          headers
        })
        
        // If response is a Response object, parse it as JSON
        if (response instanceof Response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return await response.json()
        }
        
        // If response is already parsed JSON, return as is
        return response
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'API request failed')
      }
    }

    throw new Error('Direct form API calls without apiCall are deprecated. Use createNFTService(apiCall)')
  }

  /**
   * Get user's NFTs with ownership validation
   */
  async getUserNfts(): Promise<NftItem[]> {
    try {
      // Check apiCall availability
      if (!this.apiCall) {
        console.warn('No apiCall provided, returning empty NFT list. Use createNFTService(apiCall)')
        return []
      }

      // Check cache first
      const cacheKey = 'user_nfts'
      const cached = SimpleCache.get<NftItem[]>(cacheKey)
      if (cached) {
        return cached
      }

      const response = await this.makeRequest('/user')
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch NFTs')
      }

      // Map API response to NftItem format with ownership logic
      const nfts = response.data.nfts.map((nft: any): NftItem => ({
          mintAddress: nft.mintAddress || '',
          name: nft.name,
          description: nft.description,
          type: nft.type,
          status: this.mapStatus(nft),
          imageUri: nft.imageUri || nft.image || '', // Поддержка обоих полей
          image: nft.image || nft.imageUri || '', // Дублируем для совместимости
          metadataUri: nft.metadataUri,
          attributes: Array.isArray(nft.attributes) ? nft.attributes : [],
        price: nft.price ? {
          amount: nft.price.amount || nft.price.toString(),
          formatted: nft.price.formatted || `${nft.price} SOL`,
          lamports: nft.price.lamports || parseInt(nft.price)
        } : undefined,
          owner: nft.owner,
          creator: nft.creator,
          isForSale: Boolean(nft.isForSale),
          isOwner: true, // User NFTs are always owned by user
          createdAt: nft.createdAt,
          updatedAt: nft.updatedAt,
          explorerUrl: nft.explorerUrl,
          collectionId: nft.collectionId,
          usageCount: nft.usageCount || 0,
          maxUsage: nft.maxUsage
      }))

      // Cache for 30 seconds
      SimpleCache.set(cacheKey, nfts, 30000)
      
      return nfts
    } catch (error) {
      console.error('Failed to fetch user NFTs:', error)
      throw error
    }
  }

  /**
   * Get marketplace NFTs (all for sale)
   */
  async getMarketplaceNfts(): Promise<NftItem[]> {
    try {
      // Check cache first
      const cacheKey = 'marketplace_nfts'
      const cached = SimpleCache.get<NftItem[]>(cacheKey)
      if (cached) {
        return cached
      }

      const response = await this.makeRequest('/marketplace')
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch marketplace NFTs')
      }

      const nfts = response.data.nfts.map((nft: any): NftItem => ({
        mintAddress: nft.mintAddress,
        name: nft.name,
        description: nft.description,
        type: nft.type,
        status: 'FOR_SALE',
        imageUri: nft.image || nft.imageUri,
        metadataUri: nft.metadataUri,
        attributes: nft.attributes || [],
        price: nft.price ? {
          amount: nft.price.amount || nft.price.toString(),
          formatted: nft.price.formatted || `${nft.price} SOL`,
          lamports: nft.price.lamports || parseInt(nft.price)
        } : undefined,
        owner: nft.owner,
        creator: nft.creator,
        isForSale: true,
        isOwner: false, // Marketplace NFTs are not owned by current user
        createdAt: nft.createdAt,
        updatedAt: nft.updatedAt,
        explorerUrl: nft.explorerUrl,
        collectionId: nft.collectionId,
        usageCount: nft.usageCount || 0,
        maxUsage: nft.maxUsage
      }))

      // Cache for 30 seconds
      SimpleCache.set(cacheKey, nfts, 30000)
      
      return nfts
    } catch (error) {
      console.error('Failed to fetch marketplace NFTs:', error)
      throw error
    }
  }

  /**
   * Get portfolio summary with analytics
   */
  async getPortfolioSummary(): Promise<EnhancedPortfolioSummary> {
    try {
      const userNfts = await this.getUserNfts()
      
      // Calculate portfolio summary (exclude NFTs for sale from portfolio value)
      const summary: EnhancedPortfolioSummary = {
        totalNFTs: userNfts.length,
        totalValueSOL: 0, // Don't include sale prices in portfolio value
        totalValueUSD: 0, // Portfolio value should be based on floor prices, not sale prices
        usdGrowthPercent: 0,
        tngBalance: 0, // Will be fetched separately
        usdChange24hPercent: 0,
        breakdown: {
          tickets: userNfts.filter(nft => nft.type === 'TICKET').length,
          coupons: userNfts.filter(nft => nft.type === 'COUPON').length,
          badges: userNfts.filter(nft => nft.type === 'BADGE').length,
          collectibles: userNfts.filter(nft => nft.type === 'COLLECTIBLE').length,
          certificates: userNfts.filter(nft => nft.type === 'CERTIFICATE').length,
          active: userNfts.filter(nft => nft.status === 'ACTIVE').length,
          rare: userNfts.filter(nft => {
            const attributes = Array.isArray(nft.attributes) ? nft.attributes : [];
            return attributes.some(attr => 
              attr.trait_type?.toLowerCase().includes('rarity') && 
              ['rare', 'epic', 'legendary'].includes(String(attr.value).toLowerCase())
            );
          }).length
        },
        recentActivity: {
          created: 0, // Would need API endpoint for recent activity
          traded: 0,
          used: userNfts.filter(nft => nft.status === 'USED').length
        }
      }
      
      return summary
    } catch (error) {
      console.error('Failed to get portfolio summary:', error)
      throw error
    }
  }

  /**
   * Create new NFT
   */
  async createNft(formData: FormData): Promise<NftItem> {
    try {
      const response = await this.makeFormRequest('/create', formData)
      
      if (!response.success || !response.data) {
        throw new Error('Failed to create NFT')
      }

      // Invalidate cache
      SimpleCache.invalidate('user_nfts')
      SimpleCache.invalidate('portfolio_summary')
      
      return response.data
    } catch (error) {
      console.error('Failed to create NFT:', error)
      throw error
    }
  }

  /**
   * Transfer NFT to another user
   */
  async transferNft(data: TransferNftFormData): Promise<void> {
    try {
      const response = await this.makeRequest(`/${data.nftId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to transfer NFT')
      }

      // Invalidate cache
      SimpleCache.invalidate('user_nfts')
      
    } catch (error) {
      console.error('Failed to transfer NFT:', error)
      throw error
    }
  }

  /**
   * List NFT for sale
   */
  async sellNft(data: SellNftFormData): Promise<void> {
    try {
      const response = await this.makeRequest(`/${data.nftId}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to list NFT for sale')
      }

      // Invalidate cache
      SimpleCache.invalidate('user_nfts')
      SimpleCache.invalidate('marketplace_nfts')
      
    } catch (error) {
      console.error('Failed to list NFT for sale:', error)
      throw error
    }
  }

  /**
   * Remove NFT from sale (unlist)
   */
  async unlistNft(nftId: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/${nftId}/sell`, {
        method: 'DELETE'
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Ошибка снятия NFT с продажи')
      }

      // Invalidate cache
      SimpleCache.invalidate('user_nfts')
      SimpleCache.invalidate('marketplace_nfts')
      
    } catch (error) {
      console.error('Failed to unlist NFT:', error)
      throw error
    }
  }

  /**
   * Buy NFT from marketplace
   */
  async buyNft(nftId: string): Promise<void> {
    try {
      const response = await this.makeRequest(`/${nftId}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nftId })
      })
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to buy NFT')
      }

      // Invalidate cache
      SimpleCache.invalidate('user_nfts')
      SimpleCache.invalidate('marketplace_nfts')
      
    } catch (error) {
      console.error('Failed to buy NFT:', error)
      throw error
    }
  }

  /**
   * Use NFT (for tickets/coupons)
   */
  async useNft(nftId: string): Promise<void> {
    try {
      // TODO: Implement use endpoint
      console.log('Using NFT:', nftId)
    } catch (error) {
      console.error('Failed to use NFT:', error)
      throw error
    }
  }

  /**
   * Filter and sort NFTs
   */
  filterAndSortNfts(
    nfts: NftItem[],
    filter: NftFilter,
    searchQuery: string,
    sortBy: NftSortBy,
    sortOrder: NftSortOrder
  ): NftItem[] {
    let filtered = [...nfts]

    // Apply filter
    if (filter !== 'ALL') {
      const filterMap: Record<NftFilter, string> = {
        'ALL': '',
        'TICKETS': 'TICKET',
        'COUPONS': 'COUPON',
        'BADGES': 'BADGE',
        'COLLECTIBLES': 'COLLECTIBLE',
        'CERTIFICATES': 'CERTIFICATE'
      }
      
      const typeFilter = filterMap[filter]
      if (typeFilter) {
        filtered = filtered.filter(nft => nft.type === typeFilter)
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(nft =>
        nft.name.toLowerCase().includes(query) ||
        (nft.description?.toLowerCase().includes(query)) ||
        nft.type.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'NAME':
          comparison = a.name.localeCompare(b.name)
          break
        case 'DATE':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'TYPE':
          comparison = a.type.localeCompare(b.type)
          break
        case 'VALUE':
          const aValue = a.price?.lamports || 0
          const bValue = b.price?.lamports || 0
          comparison = aValue - bValue
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'ASC' ? comparison : -comparison
    })

    return filtered
  }

  /**
   * Get filter counts for UI
   */
  getFilterCounts(nfts: NftItem[]): FilterCounts {
    return {
      all: nfts.length,
      tickets: nfts.filter(nft => nft.type === 'TICKET').length,
      coupons: nfts.filter(nft => nft.type === 'COUPON').length,
      badges: nfts.filter(nft => nft.type === 'BADGE').length,
      collectibles: nfts.filter(nft => nft.type === 'COLLECTIBLE').length,
      certificates: nfts.filter(nft => nft.type === 'CERTIFICATE').length
    }
  }

  /**
   * Clear all cache (for forced refresh)
   */
  static clearCache(): void {
    SimpleCache.invalidate('')
  }

  /**
   * Map API status to UI status
   */
  private mapStatus(nft: any): 'ACTIVE' | 'USED' | 'FOR_SALE' | 'EXPIRED' | undefined {
    if (nft.isForSale) return 'FOR_SALE'
    if (nft.isUsed || nft.status === 'USED') return 'USED'
    if (nft.isExpired || nft.status === 'EXPIRED') return 'EXPIRED'
    if (nft.type === 'TICKET' || nft.type === 'COUPON') return 'ACTIVE'
    return undefined
  }

  // ============================================================================
  // ADDITIONAL METHODS
  // ============================================================================

  static async scanQR(qrData: string): Promise<{ success: boolean; error?: string; nft?: NftItem }> {
    try {
      // Logic to scan QR and find NFT
      return { success: true }
    } catch (error) {
      console.error('Error scanning QR:', error)
      return { success: false, error: 'Failed to scan QR' }
    }
  }

  static async useNFT(nftId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Logic to use NFT
      return { success: true }
    } catch (error) {
      console.error('Error using NFT:', error)
      return { success: false, error: 'Failed to use NFT' }
    }
  }

  static async createNFT(nftData: any): Promise<{ success: boolean; error?: string; nftId?: string }> {
    try {
      // Logic to create NFT
      return { success: true, nftId: 'new-nft-id' }
    } catch (error) {
      console.error('Error creating NFT:', error)
      return { success: false, error: 'Failed to create NFT' }
    }
  }
}

/**
 * Factory function to create NFT Service with proper authorization
 */
export function createNFTService(apiCall: (endpoint: string, options?: RequestInit) => Promise<any>): NFTService {
  return new NFTService(apiCall)
}

// Legacy instance for backward compatibility - should not be used
export const nftService = new NFTService()
