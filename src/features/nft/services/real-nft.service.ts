import type { 
  EnhancedNFT, 
  NFTSearchFilters, 
  NFTMarketplaceMetrics, 
  NFTPortfolioSummary,
  NFTTransactionHistory 
} from '../types/enhanced-nft.types';

export class RealNFTService {
  private static baseUrl = '/api/nft';

  /**
   * Получить NFT по ID
   */
  static async getNFTById(nftId: string): Promise<EnhancedNFT | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch NFT');
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('Error fetching NFT:', error);
      return null;
    }
  }

  /**
   * Поиск NFT с фильтрами
   */
  static async searchNFTs(filters: NFTSearchFilters, page = 1, limit = 20): Promise<{
    nfts: EnhancedNFT[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [key, JSON.stringify(value)])
        )
      });

      const response = await fetch(`${this.baseUrl}/search?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to search NFTs');
      }
      const data = await response.json();
      return {
        nfts: data.data || [],
        total: data.total || 0,
        hasMore: data.hasMore || false
      };
    } catch (error) {
      console.error('Error searching NFTs:', error);
      return { nfts: [], total: 0, hasMore: false };
    }
  }

  /**
   * Получить NFT пользователя
   */
  static async getUserNFTs(walletAddress: string, page = 1, limit = 20): Promise<{
    nfts: EnhancedNFT[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${walletAddress}?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user NFTs');
      }
      const data = await response.json();
      return {
        nfts: data.data || [],
        total: data.total || 0,
        hasMore: data.hasMore || false
      };
    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      return { nfts: [], total: 0, hasMore: false };
    }
  }

  /**
   * Получить метрики маркетплейса
   */
  static async getMarketplaceMetrics(): Promise<NFTMarketplaceMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/metrics`);
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace metrics');
      }
      const data = await response.json();
      return data.data || {
        totalVolume: 0,
        dailyVolume: 0,
        floorPrice: 0,
        averagePrice: 0,
        totalSales: 0,
        uniqueHolders: 0,
        listedCount: 0,
        totalSupply: 0
      };
    } catch (error) {
      console.error('Error fetching marketplace metrics:', error);
      return {
        totalVolume: 0,
        dailyVolume: 0,
        floorPrice: 0,
        averagePrice: 0,
        totalSales: 0,
        uniqueHolders: 0,
        listedCount: 0,
        totalSupply: 0
      };
    }
  }

  /**
   * Получить сводку портфолио
   */
  static async getPortfolioSummary(walletAddress: string): Promise<NFTPortfolioSummary> {
    try {
      const response = await fetch(`${this.baseUrl}/portfolio/${walletAddress}/summary`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio summary');
      }
      const data = await response.json();
      return data.data || {
        totalValue: 0,
        totalNFTs: 0,
        collectionCount: 0,
        topCollection: { name: '', count: 0, value: 0 },
        recentActivity: []
      };
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      return {
        totalValue: 0,
        totalNFTs: 0,
        collectionCount: 0,
        topCollection: { name: '', count: 0, value: 0 },
        recentActivity: []
      };
    }
  }

  /**
   * Получить историю транзакций NFT
   */
  static async getNFTHistory(nftId: string): Promise<NFTTransactionHistory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch NFT history');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching NFT history:', error);
      return [];
    }
  }

  /**
   * Выставить NFT на продажу
   */
  static async listNFT(nftId: string, price: number, currency = 'SOL'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price, currency }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error listing NFT:', error);
      return false;
    }
  }

  /**
   * Снять NFT с продажи
   */
  static async delistNFT(nftId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/delist`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error delisting NFT:', error);
      return false;
    }
  }

  /**
   * Купить NFT
   */
  static async buyNFT(nftId: string, maxPrice: number): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxPrice }),
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        signature: data.signature,
        error: data.error
      };
    } catch (error) {
      console.error('Error buying NFT:', error);
      return { success: false, error: 'Transaction failed' };
    }
  }

  /**
   * Передать NFT
   */
  static async transferNFT(nftId: string, toAddress: string): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toAddress }),
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        signature: data.signature,
        error: data.error
      };
    } catch (error) {
      console.error('Error transferring NFT:', error);
      return { success: false, error: 'Transfer failed' };
    }
  }

  /**
   * Лайкнуть/убрать лайк с NFT
   */
  static async toggleLike(nftId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/like`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  /**
   * Добавить/убрать из избранного
   */
  static async toggleBookmark(nftId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/bookmark`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    }
  }

  /**
   * Получить рекомендуемые NFT
   */
  static async getRecommendedNFTs(walletAddress: string, limit = 10): Promise<EnhancedNFT[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations/${walletAddress}?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommended NFTs');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching recommended NFTs:', error);
      return [];
    }
  }

  /**
   * Проверить подлинность NFT
   */
  static async verifyNFT(nftId: string): Promise<{
    isVerified: boolean;
    verificationSource?: string;
    metadata?: any;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${nftId}/verify`);
      if (!response.ok) {
        throw new Error('Failed to verify NFT');
      }
      const data = await response.json();
      return data.data || { isVerified: false };
    } catch (error) {
      console.error('Error verifying NFT:', error);
      return { isVerified: false };
    }
  }
}

export default RealNFTService;
