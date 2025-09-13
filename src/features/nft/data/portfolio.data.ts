/**
 * NFT Portfolio Mock Data
 * Solana SuperApp
 */

import { MyNFT, PortfolioSummary, PortfolioStats } from '../types'

export const mockPortfolioSummary: PortfolioSummary = {
  totalNFTs: 15,
  activeTickets: 3,
  availableCoupons: 5,
  earnedBadges: 4,
  collections: 6,
  totalValue: '45.8 SOL'
}

export const mockUserNFTs: MyNFT[] = [
  { 
    id: '1',
    name: 'VIP Concert Ticket',
    type: 'TICKET',
    collection: 'Music Events',
    status: 'ACTIVE',
    expiresAt: '15 дек 2024',
    image: '',
    imageUri: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop&crop=center',
    qrCode: 'QR123456',
    viewCount: 47,
    likeCount: 12,
    isLiked: true,
    shareCount: 3,
    metadata: {
      venue: 'Arena Stadium',
      date: '15.12.2024',
      seat: 'VIP Section A-12'
    }
  },
  { 
    id: '2',
    name: '50% Restaurant Discount',
    type: 'COUPON',
    collection: 'Food & Drink',
    status: 'ACTIVE',
    expiresAt: '31 дек 2024',
    image: '',
    imageUri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=400&fit=crop&crop=center',
    value: '50% скидка',
    viewCount: 23,
    likeCount: 8,
    isLiked: false,
    shareCount: 5,
    metadata: {
      restaurant: 'Pizza Palace',
      maxDiscount: '1000 ₽',
      validUntil: '31.12.2024'
    }
  },
  { 
    id: '3',
    name: 'Early Adopter Badge',
    type: 'BADGE',
    collection: 'Achievement Badges',
    status: 'ACTIVE',
    earnedAt: '01 окт 2024',
    image: '',
    imageUri: 'https://images.unsplash.com/photo-1552252578-dc43b2f808cc?w=400&h=400&fit=crop&crop=center',
    rarity: 'Rare',
    viewCount: 156,
    likeCount: 89,
    isLiked: true,
    shareCount: 24,
    metadata: {
      achievement: 'First 1000 users',
      earnedDate: '01.10.2024',
      rank: '#342'
    }
  },
  { 
    id: '4',
    name: 'Solana Art #1337',
    type: 'COLLECTIBLE',
    collection: 'Digital Art',
    status: 'ACTIVE',
    image: '',
    lastPrice: '12.5 SOL',
    rarity: 'Epic',
    metadata: {
      artist: 'CryptoArtist',
      edition: '1337 of 10000',
      traits: 'Holographic, Animated'
    }
  },
  { 
    id: '5',
    name: 'Web3 Developer Certificate',
    type: 'CERTIFICATE',
    collection: 'Education',
    status: 'ACTIVE',
    earnedAt: '20 ноя 2024',
    image: '',
    metadata: {
      course: 'Solana Blockchain Development',
      grade: 'A+',
      institution: 'SuperApp Academy'
    }
  },
  { 
    id: '6',
    name: 'Used Movie Ticket',
    type: 'TICKET',
    collection: 'Entertainment',
    status: 'USED',
    image: '',
    metadata: {
      movie: 'Web3: The Future',
      usedDate: '10.11.2024',
      cinema: 'Blockchain Cinema'
    }
  }
]

export const mockPortfolioStats: PortfolioStats = {
  byType: [
    { name: 'Билеты', value: 3, color: '#8B5CF6' },
    { name: 'Купоны', value: 5, color: '#10B981' },
    { name: 'Значки', value: 4, color: '#F59E0B' },
    { name: 'Коллекционные', value: 3, color: '#3B82F6' }
  ],
  byCollection: [
    { name: 'Music Events', count: 2, color: '#EF4444' },
    { name: 'Food & Drink', count: 3, color: '#F97316' },
    { name: 'Achievement Badges', count: 4, color: '#EAB308' },
    { name: 'Digital Art', count: 3, color: '#22C55E' },
    { name: 'Education', count: 2, color: '#3B82F6' },
    { name: 'Entertainment', count: 1, color: '#A855F7' }
  ],
  monthlyActivity: [
    { month: 'Сен', created: 2, traded: 1 },
    { month: 'Окт', created: 5, traded: 3 },
    { month: 'Ноя', created: 8, traded: 2 },
    { month: 'Дек', created: 3, traded: 1 }
  ]
}

