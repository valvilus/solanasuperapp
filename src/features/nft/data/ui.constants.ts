/**
 * NFT UI Constants and Configuration
 * Solana SuperApp
 */

import { Plus, QrCode, ShoppingCart, Layers } from 'lucide-react'
import { QuickAction } from '../types'

// Quick actions for NFT interface
export const nftQuickActions: QuickAction[] = [
  { 
    id: 'create', 
    title: 'Создать', 
    icon: Plus, 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/15 to-purple-500/5' 
  },
  { 
    id: 'scan', 
    title: 'Сканер', 
    icon: QrCode, 
    color: 'text-green-400', 
    bgColor: 'from-green-500/15 to-green-500/5' 
  },
  { 
    id: 'marketplace', 
    title: 'Маркет', 
    icon: ShoppingCart, 
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/15 to-blue-500/5' 
  },
  { 
    id: 'collections', 
    title: 'Коллекции', 
    icon: Layers, 
    color: 'text-orange-400', 
    bgColor: 'from-orange-500/15 to-orange-500/5' 
  }
]

// Pagination constants
export const INITIAL_DISPLAY_COUNT = 6
export const LOAD_MORE_COUNT = 3

// Filter configuration
export const FILTER_OPTIONS = [
  { id: 'all', label: 'Все' },
  { id: 'tickets', label: 'Билеты' },
  { id: 'coupons', label: 'Купоны' },
  { id: 'badges', label: 'Значки' },
  { id: 'collectibles', label: 'Коллекц.' }
] as const

// Sort configuration
export const SORT_OPTIONS = {
  'name': 'названию',
  'date': 'дате', 
  'rarity': 'редкости',
  'price': 'цене'
} as const

// Type mapping for filters
export const FILTER_TYPE_MAP = {
  'tickets': 'TICKET',
  'coupons': 'COUPON', 
  'badges': 'BADGE',
  'collectibles': 'COLLECTIBLE'
} as const

// Rarity ordering for sorting
export const RARITY_ORDER = {
  'Common': 1,
  'Rare': 2, 
  'Epic': 3,
  'Legendary': 4
} as const

// Cache configuration
export const CACHE_DURATIONS = {
  USER_NFTS: 30 * 1000,      // 30 seconds
  MARKETPLACE: 60 * 1000,     // 1 minute
  PORTFOLIO: 30 * 1000,       // 30 seconds
  COLLECTIONS: 5 * 60 * 1000  // 5 minutes
} as const

// API endpoints
export const NFT_ENDPOINTS = {
  USER_NFTS: '/user',
  MARKETPLACE: '/marketplace',
  CREATE: '/mint',
  TRANSFER: '/transfer',
  SELL: '/marketplace/list',
  BUY: '/buy'
} as const


















