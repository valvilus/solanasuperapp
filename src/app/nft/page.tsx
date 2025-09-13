/**
 * Premium NFT Page - Web3 Digital Assets Collection
 * Solana SuperApp - Production Ready
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import ClientOnly from '@/components/common/ClientOnly'
import { NFTPageSkeleton } from '@/components/nft/NFTPageSkeleton'

// NFT Components
import { 
  NFTPortfolio,
  NFTGrid,
  FilterPanel,
  QuickActions,
  CreateInterface,
  Marketplace,
  NFTDetailModal,
  TransferModal,
  SellModal,
  BuyModal,
  NFTReceiveModal,
  NFTHistory,
  NFTCollectionModal,
  NFTCollectionsGrid
} from '@/components/nft'
import { Web3QRScanner } from '@/components/common/Web3QRScanner'

// Hooks and Services
import { useAuth } from '../../contexts/AuthContext'
import { usePrices } from '@/hooks/usePrices'
import { useOnchainOperations } from '@/hooks/useOnchainOperations'
import { useOptimizedNFT } from '@/hooks/useOptimizedNFT'
import { NFTService } from '@/features/nft/services/nft.service'
import { useNotifications } from '@/contexts/NotificationContext'

// Types
import type { 
  NftItem, 
  PortfolioSummary, 
  NftFilter, 
  NftSortBy, 
  NftSortOrder,
  ViewMode,
  NFTCollection
} from '@/features/nft/types'

// Icons
import { 
  Palette,
  Store,
  Layers,
  PlusCircle,
  Search,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Camera,
  Share2,
  ExternalLink,
  Download
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

// Tab Configuration
type NFTTab = 'MY_NFTS' | 'MARKETPLACE' | 'COLLECTIONS' | 'CREATE'

interface TabConfig {
  id: NFTTab
  label: string
  icon: React.ComponentType<any>
  color: string
  bgGradient: string
  description: string
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'MY_NFTS',
    label: 'Мои NFT',
    icon: Sparkles, // Changed from Palette to Sparkles for better visual identity
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
    description: 'Ваша коллекция цифровых активов'
  },
  {
    id: 'MARKETPLACE',
    label: 'Маркетплейс', // Full name instead of "Маркет"
    icon: Store,
    color: 'text-emerald-400', // Changed to emerald for better contrast
    bgGradient: 'from-emerald-500/10 to-emerald-600/5',
    description: 'Покупайте и продавайте NFT'
  },
  {
    id: 'COLLECTIONS',
    label: 'Коллекции',
    icon: Layers,
    color: 'text-cyan-400', // Changed to cyan for better visual hierarchy
    bgGradient: 'from-cyan-500/10 to-cyan-600/5',
    description: 'Изучайте популярные коллекции'
  },
  {
    id: 'CREATE',
    label: 'Создать',
    icon: Zap, // Changed from PlusCircle to Zap for more dynamic feel
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/10 to-orange-600/5',
    description: 'Создайте собственный NFT'
  }
]

export default function NFTPage() {
  const router = useRouter()
  // Auth and Loading
  const { isAuthenticated, isLoading: authLoading, user, apiCall } = useAuth()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Notifications
  const { showSuccess, showError, showInfo } = useNotifications()
  
  // Unified NFT service with proper authorization
  const { nftService } = useOptimizedNFT()

  // Tab Management
  const [activeTab, setActiveTab] = useState<NFTTab>('MY_NFTS')
  
  // Data State
  const [myNfts, setMyNfts] = useState<NftItem[]>([])
  const [marketplaceNfts, setMarketplaceNfts] = useState<NftItem[]>([])
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null)
  const [filteredNfts, setFilteredNfts] = useState<NftItem[]>([])

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('GRID' as ViewMode)
  const [isPortfolioVisible, setIsPortfolioVisible] = useState(true)
  const [showPortfolioDetails, setShowPortfolioDetails] = useState(false)

  // Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<NftFilter>('ALL')
  const [sortBy, setSortBy] = useState<NftSortBy>('DATE')
  const [sortOrder, setSortOrder] = useState<NftSortOrder>('DESC')

  // Modal State
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  // Social State
  const [likedNfts, setLikedNfts] = useState<Set<string>>(new Set())
  const [loadingLikes, setLoadingLikes] = useState<Set<string>>(new Set())

  // Collections State
  const [collections, setCollections] = useState<NFTCollection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)


  // Load initial data
  useEffect(() => {
    if (authLoading) return
    
    const initializeData = async () => {
      try {
        setIsInitialLoading(true)
        await loadNftData()
      } catch (error) {
        showNotification('ERROR', 'Ошибка загрузки', 'Не удалось загрузить данные NFT')
      } finally {
        setIsInitialLoading(false)
      }
    }

    initializeData()
  }, [authLoading])

  // Filter NFTs when dependencies change
  useEffect(() => {
    const currentNfts = activeTab === 'MY_NFTS' ? myNfts : marketplaceNfts
    
    console.log('🔄 Filtering NFTs:', {
      activeTab,
      myNftsCount: myNfts.length,
      marketplaceNftsCount: marketplaceNfts.length,
      currentNftsCount: currentNfts.length,
      activeFilter,
      searchTerm,
      currentNftsSample: currentNfts.slice(0, 2).map(nft => ({
        name: nft.name,
        type: nft.type,
        mintAddress: nft.mintAddress
      }))
    })
    
    const filtered = currentNfts // Temporary simple filter, replace with actual service call
      .filter(nft => {
        if (activeFilter !== 'ALL') {
          // Map filter types to NFT types
          const typeMap: Record<NftFilter, string> = {
            'ALL': '',
            'TICKETS': 'TICKET',
            'COUPONS': 'COUPON', 
            'BADGES': 'BADGE',
            'COLLECTIBLES': 'COLLECTIBLE',
            'CERTIFICATES': 'CERTIFICATE'
          }
          if (nft.type !== typeMap[activeFilter]) return false
        }
        if (searchTerm && !nft.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') {
          return sortOrder === 'ASC' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        }
        if (sortBy === 'DATE') {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA
        }
        return 0
      })
      
    console.log('✅ Filtered NFTs result:', {
      filteredCount: filtered.length,
      filteredSample: filtered.slice(0, 2).map(nft => ({
        name: nft.name,
        type: nft.type,
        hasImageUri: !!nft.imageUri,
        hasImage: !!nft.image
      }))
    })
    
    setFilteredNfts(filtered)
  }, [myNfts, marketplaceNfts, activeTab, searchTerm, activeFilter, sortBy, sortOrder])

  // Load NFT data
  const loadNftData = async () => {
    try {
      // Очищаем кеш для принудительного обновления
      NFTService.clearCache()
      
      const [userNfts, portfolioData, marketplaceData, collectionsData] = await Promise.all([
        nftService.getUserNfts(),
        nftService.getPortfolioSummary(),
        nftService.getMarketplaceNfts(),
        loadCollections()
      ])

      console.log('📦 NFT data loaded:', {
        userNftsCount: userNfts.length,
        portfolioData: !!portfolioData,
        marketplaceNftsCount: marketplaceData.length,
        collectionsCount: collectionsData.length,
        userNftsSample: userNfts.slice(0, 2).map(nft => ({
          name: nft.name,
          type: nft.type,
          mintAddress: nft.mintAddress,
          hasImageUri: !!nft.imageUri,
          hasImage: !!nft.image
        }))
      })

      setMyNfts(userNfts)
      setPortfolioSummary(portfolioData as any)
      setMarketplaceNfts(marketplaceData)
      setCollections(collectionsData)

    } catch (error) {
      if (isAuthenticated) {
        showNotification('ERROR', 'Ошибка загрузки', 'Не удалось загрузить данные NFT')
      }
    }
  }

  // Load collections data
  const loadCollections = async (): Promise<NFTCollection[]> => {
    try {
      if (!apiCall) {
        // Fallback to local data if no API available
        const { mockNFTCollections } = await import('@/features/nft/data/collections.data')
        return mockNFTCollections
      }

      const response = await apiCall('/api/nft/collections?limit=20&sortBy=totalVolume&sortOrder=desc')
      const data = await response.json()
      
      if (data.success && data.data?.collections) {
        return data.data.collections
      } else {
        // Fallback to local data
        const { mockNFTCollections } = await import('@/features/nft/data/collections.data')
        return mockNFTCollections
      }
    } catch (error) {
      // Fallback to local data
      const { mockNFTCollections } = await import('@/features/nft/data/collections.data')
      return mockNFTCollections
    }
  }

  // Notification helper - использует глобальный контекст
  const showNotification = (type: 'SUCCESS' | 'ERROR' | 'INFO', title: string, message: string) => {
    if (type === 'SUCCESS') {
      showSuccess(title, message)
    } else if (type === 'ERROR') {
      showError(title, message)
    } else {
      showInfo(title, message)
    }
  }

  // Tab handlers
  const handleTabChange = useCallback((tab: NFTTab) => {
    if (tab === activeTab) return
    
    hapticFeedback.selection()
    setActiveTab(tab)
    
    // Reset filters when changing tabs
    setSearchTerm('')
    setActiveFilter('ALL')
    setSortBy('DATE')
    setSortOrder('DESC')
  }, [activeTab])

  // Action handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    hapticFeedback.impact('light')
    
    try {
      await loadNftData()
      showNotification('SUCCESS', 'Обновлено', 'Данные успешно обновлены')
    } catch (error) {
      showNotification('ERROR', 'Ошибка', 'Не удалось обновить данные')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleNftClick = (nft: NftItem) => {
    setSelectedNft(nft)
    setDetailModalOpen(true)
    hapticFeedback.impact('medium')
    
    // Track view when NFT detail is opened
    trackNFTView(nft)
  }

  const handleNftAction = async (action: string, nft: NftItem) => {
    setSelectedNft(nft)
    
    switch (action) {
      case 'VIEW':
        setDetailModalOpen(true)
        break
      case 'TRANSFER':
        if (nft.isForSale) {
          showNotification('ERROR', 'Действие заблокировано', 'Нельзя переводить NFT, который выставлен на продажу')
          return
        }
        setDetailModalOpen(false) // Close detail modal first
        setTransferModalOpen(true)
        break
      case 'SELL':
        setDetailModalOpen(false) // Close detail modal first
        setSellModalOpen(true)
        break
      case 'BUY':
        setDetailModalOpen(false) // Close detail modal first
        setBuyModalOpen(true)
        break
      case 'UNLIST':
        setDetailModalOpen(false) // Close detail modal first
        setSellModalOpen(true) // SellModal handles both list and unlist
        break
      case 'SHARE':
        // Share functionality
        try {
          if (navigator.share) {
            await navigator.share({
              title: nft.name,
              text: `Посмотрите на мой NFT: ${nft.name}`,
              url: window.location.href
            })
            showNotification('SUCCESS', 'Поделиться', 'NFT успешно поделен')
          } else {
            // Fallback - copy to clipboard
            await navigator.clipboard.writeText(window.location.href)
            showNotification('SUCCESS', 'Ссылка скопирована', 'Ссылка на NFT скопирована в буфер обмена')
          }
        } catch (error) {
          showNotification('ERROR', 'Ошибка', 'Не удалось поделиться NFT')
        }
        break
      case 'HISTORY':
        setDetailModalOpen(false) // Close detail modal first
        setHistoryModalOpen(true)
        break
      case 'SCANNER':
        setScannerOpen(true)
        break
      case 'LIKE':
        handleLike(nft)
        break
      case 'TELEGRAM_SHARE':
        handleTelegramShare(nft)
        break
      default:
        break
    }
    
    hapticFeedback.impact('light')
  }

  // Handle NFT like/unlike
  const handleLike = async (nft: NftItem) => {
    if (!nft.id || !user) return
    
    const isCurrentlyLiked = likedNfts.has(nft.id)
    if (nft.id) {
      setLoadingLikes(prev => new Set(prev).add(nft.id))
    }
    
    try {
      const response = await apiCall(`/api/nft/${nft.id}/like`, {
        method: 'POST',
        body: JSON.stringify({ action: isCurrentlyLiked ? 'unlike' : 'like' })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local state
        if (nft.id) {
          setLikedNfts(prev => {
            const newSet = new Set(prev)
            if (isCurrentlyLiked) {
              newSet.delete(nft.id)
            } else {
              newSet.add(nft.id)
            }
            return newSet
          })
        }

        // Update NFT data
        if (selectedNft?.id === nft.id) {
          setSelectedNft(prev => prev ? {
            ...prev,
            isLiked: !isCurrentlyLiked,
            likeCount: data.data?.likeCount || (prev.likeCount || 0) + (isCurrentlyLiked ? -1 : 1)
          } : null)
        }

        // Update in nfts arrays
        setMyNfts(prev => prev.map(item => 
          item.id === nft.id 
            ? { 
                ...item, 
                isLiked: !isCurrentlyLiked,
                likeCount: data.data?.likeCount || (item.likeCount || 0) + (isCurrentlyLiked ? -1 : 1)
              }
            : item
        ))
        
        setMarketplaceNfts(prev => prev.map(item => 
          item.id === nft.id 
            ? { 
                ...item, 
                isLiked: !isCurrentlyLiked,
                likeCount: data.data?.likeCount || (item.likeCount || 0) + (isCurrentlyLiked ? -1 : 1)
              }
            : item
        ))

        hapticFeedback.impact('light')
        
        showNotification(
          'SUCCESS', 
          isCurrentlyLiked ? 'Лайк убран' : 'Лайк поставлен',
          isCurrentlyLiked ? 'Вы убрали лайк с NFT' : 'Вы поставили лайк NFT'
        )
      } else {
        throw new Error('Ошибка при обновлении лайка')
      }
    } catch (error) {
      console.error('Error handling like:', error)
      showNotification('ERROR', 'Ошибка', 'Не удалось обновить лайк')
    } finally {
      setLoadingLikes(prev => {
        const newSet = new Set(prev)
        newSet.delete(nft.id)
        return newSet
      })
    }
  }

  // Handle Telegram share
  const handleTelegramShare = async (nft: NftItem) => {
    try {
      hapticFeedback.impact('medium')
      
      // Get Telegram WebApp instance
      const telegram = (window as any).Telegram?.WebApp
      
      if (telegram && telegram.openTelegramLink) {
        // Create share URL
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(
          ` Посмотрите на мой NFT "${nft.name}"!\n\n${nft.description || 'Уникальный цифровой актив из Solana SuperApp'}`
        )}`
        
        telegram.openTelegramLink(shareUrl)
        
        // Update share count
        await apiCall(`/api/nft/${nft.id}/share`, {
          method: 'POST'
        })
        
        showNotification('SUCCESS', 'Поделились', 'NFT успешно отправлен в Telegram')
      } else if (navigator.share) {
        // Fallback to Web Share API
        await navigator.share({
          title: `NFT: ${nft.name}`,
          text: `Посмотрите на мой NFT "${nft.name}"!`,
          url: window.location.href
        })
        
        showNotification('SUCCESS', 'Поделились', 'NFT успешно отправлен')
      } else {
        // Final fallback - copy to clipboard
        await navigator.clipboard.writeText(window.location.href)
        showNotification('SUCCESS', 'Ссылка скопирована', 'Ссылка на NFT скопирована в буфер обмена')
      }
    } catch (error) {
      console.error('Error sharing NFT:', error)
      showNotification('ERROR', 'Ошибка', 'Не удалось поделиться NFT')
    }
  }

  // Track NFT view when detail modal opens
  const trackNFTView = async (nft: NftItem) => {
    if (!nft.id) return
    
    try {
      await apiCall(`/api/nft/${nft.id}/view`, {
        method: 'POST'
      })
      
      // Update view count in local state
      setMyNfts(prev => prev.map(item => 
        item.id === nft.id 
          ? { ...item, viewCount: (item.viewCount || 0) + 1 }
          : item
      ))
      
      setMarketplaceNfts(prev => prev.map(item => 
        item.id === nft.id 
          ? { ...item, viewCount: (item.viewCount || 0) + 1 }
          : item
      ))
      
      if (selectedNft?.id === nft.id) {
        setSelectedNft(prev => prev ? {
          ...prev,
          viewCount: (prev.viewCount || 0) + 1
        } : null)
      }
    } catch (error) {
      console.error('Error tracking NFT view:', error)
      // Не показываем уведомление об ошибке для view tracking
    }
  }

  // Handle collection click
  const handleCollectionClick = (collection: NFTCollection) => {
    setSelectedCollection(collection)
    setCollectionModalOpen(true)
    hapticFeedback.impact('medium')
  }

  // Handle collection action
  const handleCollectionAction = async (action: string, collection: NFTCollection) => {
    switch (action) {
      case 'LIKE':
        // TODO: Implement collection like functionality
        showNotification('SUCCESS', 'Лайк коллекции', 'Функция будет добавлена позже')
        break
      case 'SHARE':
        // TODO: Implement collection share functionality
        showNotification('SUCCESS', 'Поделиться коллекцией', 'Функция будет добавлена позже')
        break
      case 'VIEW_NFTS':
        // Filter NFTs by collection and switch to marketplace
        setActiveTab('MARKETPLACE')
        setCollectionModalOpen(false)
        showNotification('INFO', 'Переход в маркетплейс', `Показаны NFT из коллекции ${collection.name}`)
        break
      default:
        break
    }
    hapticFeedback.impact('light')
  }

  // Quick Actions Configuration - Non-duplicate actions only
  const quickActions = useMemo(() => [
    {
      id: 'receive',
      title: 'Получить',
      description: 'QR код для получения NFT',
      icon: Download,
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/15 to-blue-600/5',
      handler: () => {
        setReceiveModalOpen(true)
        hapticFeedback.impact('medium')
      }
    },
    {
      id: 'analytics',
      title: 'Статистика',
      description: 'Аналитика вашей коллекции',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgGradient: 'from-emerald-500/15 to-emerald-600/5',
      handler: () => {
        setShowPortfolioDetails(!showPortfolioDetails)
        hapticFeedback.impact('medium')
      }
    },
    {
      id: 'share',
      title: 'Поделиться',
      description: 'Поделиться коллекцией',
      icon: Share2,
      color: 'text-indigo-400',
      bgGradient: 'from-indigo-500/15 to-indigo-600/5',
      handler: () => {
        if (navigator.share) {
          navigator.share({
            title: 'Моя NFT коллекция',
            text: 'Посмотрите на мою коллекцию NFT в Solana SuperApp!',
            url: window.location.href
          })
        } else {
          navigator.clipboard.writeText(window.location.href)
          showNotification('SUCCESS', 'Ссылка скопирована', 'Ссылка на коллекцию скопирована')
        }
        hapticFeedback.impact('medium')
      }
    },
    {
      id: 'scanner',
      title: 'Сканер',
      description: 'Сканировать QR код NFT',
      icon: Camera,
      color: 'text-orange-400', 
      bgGradient: 'from-orange-500/15 to-orange-600/5',
      handler: () => {
        setScannerOpen(true)
        hapticFeedback.impact('medium')
      }
    }
  ], [showPortfolioDetails])

  // Loading fallback
  if (authLoading || isInitialLoading) {
    return (
      <PageLayout showBottomNav={true}>
        <NFTPageSkeleton />
      </PageLayout>
    )
  }

  return (
    <ClientOnly fallback={
      <PageLayout showBottomNav={true}>
        <NFTPageSkeleton />
      </PageLayout>
    }>
      <PageLayout showBottomNav={true}>
        <div className="space-y-6 pb-safe overflow-hidden">
          
          {/* PREMIUM HEADER */}
          <motion.div
            className="px-5 pt-4 pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-300">
                    <path fillRule="evenodd" d="M9.53 4.47a.75.75 0 010 1.06L5.81 9.25H21a.75.75 0 010 1.5H5.81l3.72 3.72a.75.75 0 11-1.06 1.06l-5-5a.75.75 0 010-1.06l5-5a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                </motion.button>
                <h1 className="text-2xl font-bold text-white mb-1">
                  <span className="text-gradient">NFT Collection</span>
                </h1>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-solana-purple" />
                  Цифровые активы на Solana
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPortfolioVisible(!isPortfolioVisible)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {isPortfolioVisible ? 
                    <Eye className="w-5 h-5 text-gray-400" /> : 
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  }
                </motion.button>
              </div>
            </div>

            {/* COMPACT TAB NAVIGATION */}
            <div className="relative">
              <div className="bg-white/5 rounded-xl p-1 border border-white/10">
                <div className="grid grid-cols-4 gap-1">
                  {TAB_CONFIGS.map((tab, index) => (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        relative px-3 py-2 rounded-lg transition-all duration-300
                        ${activeTab === tab.id 
                          ? 'solana-active-bg text-white' 
                          : 'hover:bg-white/5 text-gray-400'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                        <span className="text-xs font-medium">{tab.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>



          {/* PORTFOLIO CARD */}
          <AnimatePresence>
            {isPortfolioVisible && portfolioSummary && activeTab === 'MY_NFTS' && (
              <motion.div
                className="px-5"
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <NFTPortfolio
                  portfolioSummary={portfolioSummary as any}
                  isVisible={isPortfolioVisible}
                  showDetails={showPortfolioDetails}
                  isRefreshing={isRefreshing}
                  onToggleVisibility={() => setIsPortfolioVisible(!isPortfolioVisible)}
                  onToggleDetails={() => setShowPortfolioDetails(!showPortfolioDetails)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* QUICK ACTIONS - Only on MY_NFTS tab */}
          {activeTab === 'MY_NFTS' && (
            <motion.div
              className="px-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <QuickActions actions={quickActions} />
            </motion.div>
          )}

          {/* FILTER PANEL - For MY_NFTS and MARKETPLACE */}
          {(activeTab === 'MY_NFTS' || activeTab === 'MARKETPLACE') && (
            <motion.div
              className="px-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <FilterPanel
                searchTerm={searchTerm}
                activeFilter={activeFilter}
                sortBy={sortBy}
                sortOrder={sortOrder}
                viewMode={viewMode}
                filterCounts={{
                  all: myNfts.length,
                  tickets: (portfolioSummary as any)?.breakdown?.tickets || 0,
                  coupons: (portfolioSummary as any)?.breakdown?.coupons || 0,
                  badges: (portfolioSummary as any)?.breakdown?.badges || 0,
                  collectibles: (portfolioSummary as any)?.breakdown?.collectibles || 0,
                  certificates: (portfolioSummary as any)?.breakdown?.certificates || 0,
                }}
                onSearchChange={setSearchTerm}
                onFilterChange={setActiveFilter}
                onSortChange={(newSortBy: NftSortBy, newSortOrder: NftSortOrder) => {
                  setSortBy(newSortBy)
                  setSortOrder(newSortOrder)
                }}
                onViewModeChange={setViewMode}
              />
            </motion.div>
          )}

          {/* MAIN CONTENT */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {activeTab === 'MY_NFTS' && (
              <NFTGrid
                nfts={filteredNfts}
                viewMode={viewMode}
                isLoading={isRefreshing}
                emptyState={{
                  icon: Palette,
                  title: 'Пока нет NFT',
                  description: 'Создайте свой первый NFT или купите на маркетплейсе',
                  actionLabel: 'Создать NFT',
                  onAction: () => setActiveTab('CREATE')
                }}
                onNftClick={handleNftClick}
                onNftAction={handleNftAction}
              />
            )}

            {activeTab === 'MARKETPLACE' && (
              <Marketplace
                nfts={filteredNfts}
                viewMode={viewMode}
                isLoading={isRefreshing}
                onNftClick={handleNftClick}
                onNftAction={handleNftAction}
              />
            )}

            {activeTab === 'COLLECTIONS' && (
              <div className="px-5">
                <NFTCollectionsGrid
                  collections={collections}
                  loading={isRefreshing}
                  onCollectionClick={handleCollectionClick}
                />
              </div>
            )}

            {activeTab === 'CREATE' && (
              <CreateInterface
                onNftCreated={(nft: NftItem) => {
                  showNotification('SUCCESS', 'NFT создан!', `${nft.name} успешно создан`)
                  // КРИТИЧЕСКИ ВАЖНО: Очищаем ВСЕ кеши
                  NFTService.clearCache()
                  // Принудительно перезагружаем данные
                  setTimeout(async () => {
                    await loadNftData()
                    // Переключаемся на MY_NFTS чтобы увидеть новый NFT
                    setActiveTab('MY_NFTS')
                  }, 1000)
                }}
                onError={(error: string) => {
                  showNotification('ERROR', 'Ошибка создания', error)
                }}
              />
            )}
          </motion.div>

        </div>

        {/* MODALS */}
        <NFTDetailModal
          nft={selectedNft}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false)
            setSelectedNft(null)
          }}
          onAction={handleNftAction}
        />

        <TransferModal
          nft={selectedNft}
          isOpen={transferModalOpen}
          onClose={() => {
            setTransferModalOpen(false)
            setSelectedNft(null)
          }}
          onSuccess={() => {
            showNotification('SUCCESS', 'NFT переведен', 'NFT успешно переведен')
            setTransferModalOpen(false)
            setSelectedNft(null)
            loadNftData()
          }}
          onError={(error: string) => {
            showNotification('ERROR', 'Ошибка перевода', error)
          }}
        />

        <SellModal
          nft={selectedNft}
          isOpen={sellModalOpen}
          onClose={() => {
            setSellModalOpen(false)
            setSelectedNft(null)
          }}
          onSuccess={() => {
            showNotification('SUCCESS', 'NFT выставлен на продажу', 'NFT успешно добавлен в маркетплейс')
            setSellModalOpen(false)
            setSelectedNft(null)
            // Force clear all caches and reload data
            NFTService.clearCache()
            loadNftData()
          }}
          onError={(error: string) => {
            showNotification('ERROR', 'Ошибка продажи', error)
          }}
        />

        <BuyModal
          nft={selectedNft}
          isOpen={buyModalOpen}
          onClose={() => {
            setBuyModalOpen(false)
            setSelectedNft(null)
          }}
          onSuccess={() => {
            showNotification('SUCCESS', 'NFT куплен', 'NFT успешно куплен и переведен в ваш кошелек')
            setBuyModalOpen(false)
            setSelectedNft(null)
            loadNftData()
          }}
          onError={(error: string) => {
            showNotification('ERROR', 'Ошибка покупки', error)
          }}
        />

        <NFTReceiveModal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
        />

        <NFTHistory
          nft={selectedNft}
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false)
            setSelectedNft(null)
          }}
        />

        <NFTCollectionModal
          collection={selectedCollection}
          isOpen={collectionModalOpen}
          onClose={() => {
            setCollectionModalOpen(false)
            setSelectedCollection(null)
          }}
          onAction={handleCollectionAction}
        />

        <Web3QRScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={(result) => {
            showNotification('SUCCESS', 'QR код отсканирован', `Тип: ${result.type}`)
            setScannerOpen(false)
          }}
          onScanError={(error) => {
            showNotification('ERROR', 'Ошибка сканирования', error)
          }}
          expectedTypes={['wallet', 'nft', 'transfer']}
          title="NFT QR Сканер"
          description="Сканируйте QR код для NFT операций"
        />


      </PageLayout>
    </ClientOnly>
  )
}