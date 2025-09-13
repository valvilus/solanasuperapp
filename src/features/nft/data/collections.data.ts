/**
 * NFT Collections Mock Data
 * Solana SuperApp
 */

import { NFTCollection } from '../types'

export const mockNFTCollections: NFTCollection[] = [
  {
    id: 'col_1',
    name: 'Қазақ Ханы',
    description: 'Коллекция исторических правителей Казахстана. Каждый NFT представляет великого хана с уникальными атрибутами и историческими фактами.',
    imageUri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
    bannerUri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=300&fit=crop&crop=center',
    slug: 'kazakh-khans',
    creatorId: 'user_creator_1',
    creator: {
      userId: 'user_creator_1',
      username: 'QazaqTarih',
      firstName: 'Арман'
    },
    isVerified: true,
    totalSupply: 777,
    totalVolume: 2850.5,
    floorPrice: 12.5,
    viewCount: 25420,
    likeCount: 1856,
    isLiked: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'col_2',
    name: 'Алтын Орда',
    description: 'Цифровые артефакты Золотой Орды. Уникальные предметы культуры и искусства средневекового Казахстана с исторической ценностью.',
    imageUri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'altyn-orda',
    creatorId: 'user_creator_2',
    creator: {
      userId: 'user_creator_2',
      username: 'AltynOrda',
      firstName: 'Айсулу'
    },
    isVerified: true,
    totalSupply: 1218,
    totalVolume: 1890.2,
    floorPrice: 8.8,
    viewCount: 18350,
    likeCount: 1124,
    isLiked: false,
    createdAt: '2024-01-10T12:00:00Z',
    updatedAt: '2024-01-18T16:45:00Z'
  },
  {
    id: 'col_3',
    name: 'Қазақстан Табиғаты',
    description: 'Великолепные пейзажи Казахстана: от степей до гор Алатау. Каждый NFT - это цифровое путешествие по родным просторам.',
    imageUri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'qazaqstan-tabigaty',
    creatorId: 'user_creator_3',
    creator: {
      userId: 'user_creator_3',
      username: 'TabigatKZ',
      firstName: 'Нурлан'
    },
    isVerified: true,
    totalSupply: 1991,
    totalVolume: 1245.8,
    floorPrice: 6.5,
    viewCount: 19945,
    likeCount: 1412,
    isLiked: true,
    createdAt: '2024-01-05T09:30:00Z',
    updatedAt: '2024-01-15T11:20:00Z'
  },
  {
    id: 'col_4',
    name: 'Домбыра Мелодии',
    description: 'Традиционная казахская музыка в цифровом формате. Каждый NFT содержит уникальную мелодию на домбыре с визуальным оформлением.',
    imageUri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'dombyra-melodies',
    creatorId: 'user_creator_4',
    creator: {
      userId: 'user_creator_4',
      username: 'DombyraKZ',
      firstName: 'Асель'
    },
    isVerified: true,
    totalSupply: 555,
    totalVolume: 1275.3,
    floorPrice: 15.1,
    viewCount: 14200,
    likeCount: 834,
    isLiked: false,
    createdAt: '2024-01-12T15:00:00Z',
    updatedAt: '2024-01-19T10:15:00Z'
  },
  {
    id: 'col_5',
    name: 'Қазақ Ұлттық Киімі',
    description: 'Цифровая коллекция традиционных казахских костюмов. От чапанов до тюбетеек - сохраняем культурное наследие в блокчейне.',
    imageUri: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'qazaq-ulttyk-kiimi',
    creatorId: 'user_creator_5',
    creator: {
      userId: 'user_creator_5',
      username: 'UlttykKiim',
      firstName: 'Гүлнар'
    },
    isVerified: true,
    totalSupply: 888,
    totalVolume: 734.7,
    floorPrice: 9.5,
    viewCount: 16780,
    likeCount: 1298,
    isLiked: true,
    createdAt: '2024-01-08T18:45:00Z',
    updatedAt: '2024-01-17T13:30:00Z'
  },
  {
    id: 'col_6',
    name: 'Алматы Метро',
    description: 'Уникальные билеты и пропуски метрополитена Алматы. Коллекционные NFT с историей развития городского транспорта.',
    imageUri: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'almaty-metro',
    creatorId: 'user_creator_6',
    creator: {
      userId: 'user_creator_6',
      username: 'AlmatyMetro',
      firstName: 'Ерлан'
    },
    isVerified: true,
    totalSupply: 2030,
    totalVolume: 1567.9,
    floorPrice: 4.8,
    viewCount: 12456,
    likeCount: 923,
    isLiked: false,
    createdAt: '2024-01-03T11:20:00Z',
    updatedAt: '2024-01-14T17:50:00Z'
  },
  {
    id: 'col_7',
    name: 'Байтерек NFT',
    description: 'Символы современного Казахстана. Архитектурные шедевры Нур-Султана в цифровом искусстве с интерактивными элементами.',
    imageUri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'baiterek-nft',
    creatorId: 'user_creator_7',
    creator: {
      userId: 'user_creator_7',
      username: 'NurSultanArt',
      firstName: 'Даулет'
    },
    isVerified: true,
    totalSupply: 1997,
    totalVolume: 2234.1,
    floorPrice: 18.5,
    viewCount: 28456,
    likeCount: 2123,
    isLiked: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-20T20:00:00Z'
  },
  {
    id: 'col_8',
    name: 'Қазақ Ас-Тағамы',
    description: 'Гастрономическая коллекция традиционных казахских блюд. От бешбармака до баурсаков - вкусы детства в NFT формате.',
    imageUri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop&crop=center&q=80',
    bannerUri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=300&fit=crop&crop=center&q=80',
    slug: 'qazaq-as-tagamy',
    creatorId: 'user_creator_8',
    creator: {
      userId: 'user_creator_8',
      username: 'QazaqAsi',
      firstName: 'Жанар'
    },
    isVerified: false,
    totalSupply: 365,
    totalVolume: 445.2,
    floorPrice: 3.2,
    viewCount: 8765,
    likeCount: 445,
    isLiked: false,
    createdAt: '2024-01-06T14:30:00Z',
    updatedAt: '2024-01-16T18:45:00Z'
  }
]

// Top collections by volume
export const getTopCollectionsByVolume = (limit: number = 3): NFTCollection[] => {
  return [...mockNFTCollections]
    .sort((a, b) => (b?.totalVolume || 0) - (a?.totalVolume || 0))
    .slice(0, limit)
}

// Top collections by floor price
export const getTopCollectionsByFloorPrice = (limit: number = 3): NFTCollection[] => {
  return [...mockNFTCollections]
    .filter(col => col.floorPrice)
    .sort((a, b) => (b.floorPrice || 0) - (a.floorPrice || 0))
    .slice(0, limit)
}

// Recently created collections
export const getRecentCollections = (limit: number = 3): NFTCollection[] => {
  return [...mockNFTCollections]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

// Trending collections (by likes)
export const getTrendingCollections = (limit: number = 3): NFTCollection[] => {
  return [...mockNFTCollections]
    .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    .slice(0, limit)
}