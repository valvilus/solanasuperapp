export interface EnhancedNFT {
  id: string;
  tokenId: string;
  mint: string;
  name: string;
  description?: string;
  image: string;
  imageUri: string;
  
  // Collection info
  collection?: {
    id: string;
    name: string;
    description?: string;
    imageUri: string;
    isVerified: boolean;
    slug: string;
    floorPrice?: number;
    totalSupply?: number;
    listedCount?: number;
  };
  
  // Owner and creator
  owner: {
    id: string;
    walletAddress: string;
    username?: string;
    firstName?: string;
  };
  
  creator: {
    id: string;
    walletAddress: string;
    username?: string;
    firstName?: string;
    royaltyPercentage?: number;
  };
  
  // Market data
  price?: number;
  currency: string;
  isListed: boolean;
  listingId?: string;
  marketplace?: string;
  
  // Metadata
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    rarity?: number;
  }>;
  
  // Activity
  _count: {
    likes: number;
    views: number;
    shares: number;
    transfers?: number;
    sales?: number;
  };
  
  // Rarity and scoring
  rarityRank?: number;
  rarityScore?: number;
  
  // Technical details
  standard: 'SPL' | 'Metaplex' | 'Other';
  network: 'mainnet' | 'devnet' | 'testnet';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  mintedAt?: Date;
  lastSaleAt?: Date;
  
  // Enhanced features
  isAnimated?: boolean;
  hasAudio?: boolean;
  fileSize?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  
  // Utility and gaming
  utility?: {
    type: 'Gaming' | 'Access' | 'Membership' | 'Staking' | 'Other';
    description?: string;
    benefits?: string[];
  };
  
  // Verification
  isVerified: boolean;
  verificationSource?: string;
  
  // Social features
  isLiked?: boolean;
  isBookmarked?: boolean;
  
  // Transaction history
  lastTransaction?: {
    type: 'mint' | 'transfer' | 'sale' | 'list' | 'delist';
    price?: number;
    from?: string;
    to?: string;
    signature: string;
    timestamp: Date;
  };
}

export interface NFTSearchFilters {
  collection?: string;
  priceMin?: number;
  priceMax?: number;
  attributes?: Record<string, string[]>;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isListed?: boolean;
  hasUtility?: boolean;
  sortBy?: 'price' | 'rarity' | 'recent' | 'popular';
  sortOrder?: 'asc' | 'desc';
}

export interface NFTMarketplaceMetrics {
  totalVolume: number;
  dailyVolume: number;
  floorPrice: number;
  averagePrice: number;
  totalSales: number;
  uniqueHolders: number;
  listedCount: number;
  totalSupply: number;
}

export interface NFTPortfolioSummary {
  totalValue: number;
  totalNFTs: number;
  collectionCount: number;
  topCollection: {
    name: string;
    count: number;
    value: number;
  };
  recentActivity: Array<{
    type: 'purchase' | 'sale' | 'transfer' | 'listing';
    nft: Partial<EnhancedNFT>;
    price?: number;
    timestamp: Date;
  }>;
}

export interface NFTTransactionHistory {
  id: string;
  nftId: string;
  type: 'mint' | 'transfer' | 'sale' | 'list' | 'delist' | 'offer';
  price?: number;
  currency: string;
  from?: string;
  to?: string;
  signature: string;
  blockNumber?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type NFTStatus = 'active' | 'pending' | 'sold' | 'unlisted' | 'transferred';
export type NFTCondition = 'mint' | 'excellent' | 'good' | 'fair' | 'poor';
export type NFTCategory = 'art' | 'collectibles' | 'gaming' | 'music' | 'photography' | 'sports' | 'utility' | 'other';
