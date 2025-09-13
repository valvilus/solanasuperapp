/**
 * Unified NFT Types - Clean and consistent naming
 * Solana SuperApp
 */

// Core NFT types
export type NFTType = 'TICKET' | 'COUPON' | 'BADGE' | 'COLLECTIBLE' | 'CERTIFICATE'
export type NFTStatus = 'ACTIVE' | 'USED' | 'FOR_SALE' | 'EXPIRED'
export type NFTRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'

// UI types
export type ViewMode = 'GRID' | 'LIST'
export type SortBy = 'NAME' | 'DATE' | 'TYPE' | 'VALUE'
export type SortOrder = 'ASC' | 'DESC'
export type FilterType = 'ALL' | 'TICKETS' | 'COUPONS' | 'BADGES' | 'COLLECTIBLES' | 'CERTIFICATES'
export type TabType = 'MY_NFTS' | 'MARKETPLACE' | 'COLLECTIONS' | 'CREATE'
export type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING'

// Aliases for backward compatibility
export type NftFilter = FilterType
export type NftSortBy = SortBy
export type NftSortOrder = SortOrder

// Main NFT item interface (unified from enhanced types)
export interface NftItem {
  id?: string // Database ID for API operations
  mintAddress: string
  name: string
  description?: string
  type: NFTType
  status?: NFTStatus
  imageUri?: string
  image?: string // Поддержка альтернативного поля для изображения
  metadataUri?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  price?: {
    amount: string
    formatted: string
    lamports: number
    usdValue?: string
  }
  currency?: string // SOL or TNG
  owner?: {
    userId: string
    username?: string
    firstName?: string
  }
  creator?: {
    userId: string
    username?: string
    firstName?: string
  }
  isForSale: boolean
  isOwner: boolean // Critical for ownership logic
  createdAt: string
  updatedAt?: string
  explorerUrl?: string
  collectionId?: string
  usageCount?: number
  maxUsage?: number
  // Social features
  viewCount?: number
  likeCount?: number
  isLiked?: boolean // Whether current user liked this NFT
  shareCount?: number
  // Collection info
  collection?: {
    id: string
    name: string
    slug: string
    imageUri?: string
    floorPrice?: number // in SOL
    totalSupply?: number
    isVerified?: boolean
  }
}

// NFT Collection types
export interface NFTCollection {
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
  
  // Collection stats
  totalSupply: number
  totalVolume: number // in SOL
  floorPrice?: number // in SOL
  
  // Social stats
  viewCount?: number
  likeCount?: number
  isLiked?: boolean
  
  // NFTs in collection
  nfts?: NftItem[]
  
  // Metadata
  createdAt: string
  updatedAt?: string
}

// Collection analytics
export interface CollectionAnalytics {
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

// Portfolio summary with enhanced data
export interface EnhancedPortfolioSummary {
  totalNFTs: number
  totalValueSOL: number
  totalValueUSD: number
  usdGrowthPercent: number
  tngBalance: number
  usdChange24hPercent?: number
  breakdown: {
    tickets: number
    coupons: number
    badges: number
    collectibles: number
    certificates: number
    active: number
    rare: number
  }
  recentActivity?: {
    created: number
    traded: number
    used: number
  }
}

// Legacy interfaces for backward compatibility
export interface NFTMetadata {
  [key: string]: string | number | string[]
}

export interface BaseNFT {
  id: string
  name: string
  type: NFTType
  collection: string
  status: NFTStatus
  image: string
  imageUri?: string // Alias for image
  metadata?: NFTMetadata
  description?: string
}

export interface MyNFT extends BaseNFT {
  expiresAt?: string
  earnedAt?: string
  qrCode?: string
  value?: string
  lastPrice?: string
  rarity?: NFTRarity
  viewCount?: number
  likeCount?: number
  isLiked?: boolean
  shareCount?: number
}

export interface MarketplaceNFT {
  id: string
  name: string
  type: string
  price: string
  priceUSD: string
  creator: string
  description: string
  category: string
  image: string
  rarity: NFTRarity
  likes: number
  views: number
}

export interface Collection {
  id: string
  name: string
  creator: string
  itemCount: number
  floorPrice: string
  volume: string
  image: string
  verified: boolean
}

export interface QuickAction {
  id: string
  title: string
  icon: any
  color: string
  bgColor: string
}

export interface PortfolioSummary {
  totalNFTs: number
  activeTickets: number
  availableCoupons: number
  earnedBadges: number
  collections: number
  totalValue: string
}

export interface PortfolioStats {
  byType: { name: string; value: number; color: string }[]
  byCollection: { name: string; count: number; color: string }[]
  monthlyActivity: { month: string; created: number; traded: number }[]
}

export interface NotificationState {
  type: NotificationType
  message: string
}

export interface NFTPageState {
  isNFTVisible: boolean
  activeTab: TabType
  viewMode: ViewMode
  searchQuery: string
  selectedFilter: FilterType
  selectedNFT: MyNFT | MarketplaceNFT | null
  sortBy: SortBy
  sortOrder: SortOrder
  showPortfolioDetails: boolean
  showFilterPanel: boolean
  isLoading: boolean
  notification: NotificationState | null
  displayedNFTs: number
  hasMoreNFTs: boolean
  isLoadingMore: boolean
}

// Form data interfaces
export interface CreateNftFormData {
  name: string
  description: string
  type: NFTType
  image: File | null
  attributes: Array<{
    trait_type: string
    value: string
  }>
}

export interface TransferNftFormData {
  nftId: string
  mintAddress: string
  recipient: string
  recipientType: 'username' | 'wallet' | 'telegramId'
  message?: string
}

export interface SellNftFormData {
  nftId: string
  mintAddress: string
  price: string
  currency: 'SOL' | 'TNG'
  description?: string
}

// Filter counts for UI
export interface FilterCounts {
  all: number
  tickets: number
  coupons: number
  badges: number
  collectibles: number
  certificates: number
}

// Notification interface
export interface NftNotification {
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING'
  title: string
  message: string
}
