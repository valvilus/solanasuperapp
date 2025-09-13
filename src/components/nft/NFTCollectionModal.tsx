/**
 * NFT Collection Modal - Display collection details and analytics
 * Solana SuperApp - NFT Page
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ExternalLink, 
  Copy, 
  Share2, 
  Heart,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  Layers,
  Star,
  BarChart3,
  Calendar,
  Coins,
  Activity,
  CheckCircle
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import type { NFTCollection, CollectionAnalytics } from '@/features/nft/types'

interface NFTCollectionModalProps {
  collection: NFTCollection | null
  isOpen: boolean
  onClose: () => void
  onAction?: (action: string, collection: NFTCollection) => void
}

export function NFTCollectionModal({ 
  collection, 
  isOpen, 
  onClose, 
  onAction 
}: NFTCollectionModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity'>('overview')
  const [copied, setCopied] = useState(false)
  const [analytics, setAnalytics] = useState<CollectionAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Load analytics when modal opens
  useEffect(() => {
    if (isOpen && collection) {
      loadAnalytics()
    }
  }, [isOpen, collection])

  const loadAnalytics = async () => {
    if (!collection) return
    
    setLoading(true)
    try {
      // Mock analytics data - in production would fetch from API
      const mockAnalytics: CollectionAnalytics = {
        floorPrice: {
          current: collection.floorPrice || 2.5,
          change24h: 12.5,
          change7d: -3.2
        },
        volume: {
          total: collection.totalVolume || 450.8,
          volume24h: 45.2,
          change24h: 28.7
        },
        activity: {
          sales24h: 8,
          listings24h: 15,
          holders: Math.floor(collection.totalSupply * 0.7),
          avgPrice: (collection.floorPrice || 2.5) * 1.3
        },
        priceHistory: [
          { timestamp: '2024-01-01', price: 2.1, volume: 30.5 },
          { timestamp: '2024-01-02', price: 2.3, volume: 45.2 },
          { timestamp: '2024-01-03', price: 2.5, volume: 38.9 },
          { timestamp: '2024-01-04', price: 2.4, volume: 52.1 },
          { timestamp: '2024-01-05', price: 2.5, volume: 45.2 }
        ]
      }
      
      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Error loading collection analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action: string) => {
    if (collection && onAction) {
      onAction(action, collection)
    }
    hapticFeedback.impact('light')
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  const handleCopyUrl = async () => {
    if (!collection) return
    
    try {
      const url = `${window.location.origin}/nft/collection/${collection.slug}`
      await navigator.clipboard.writeText(url)
      hapticFeedback.impact('light')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const formatSOL = (lamports: number) => {
    return `${(lamports / 1e9).toFixed(3)} SOL`
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (!collection) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" // Z-INDEX: Detail modal layer
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleCard className="flex flex-col h-full border border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden">
              {/* Header with better spacing */}
              <div className="relative">
                {/* Banner with overlay */}
                {collection.bannerUri && (
                  <div className="h-40 bg-gradient-to-r from-purple-600/20 to-blue-600/20 overflow-hidden relative">
                    <img
                      src={collection.bannerUri}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                )}
                
                {/* Close Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>

                {/* Collection Header - Clean layout */}
                <div className="p-6 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Collection Avatar */}
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {collection.imageUri ? (
                        <img
                          src={collection.imageUri}
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Layers className="w-8 h-8 text-white/60" />
                      )}
                    </div>
                    
                    {/* Collection Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-xl font-bold text-white truncate">{collection.name}</h1>
                        {collection.isVerified && (
                          <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      {collection.description && (
                        <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      
                      {/* Creator Info */}
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                        <span>Создатель:</span>
                        <span className="text-white">
                          {collection.creator?.username || 
                           collection.creator?.firstName || 
                           `${collection.creatorId.slice(0, 8)}...`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid - Better symmetry */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-lg font-bold text-white mb-1 break-words">
                        {collection.totalSupply?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-gray-400 leading-tight">Тираж</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-lg font-bold text-green-400 mb-1 break-words">
                        {collection.floorPrice ? `${collection.floorPrice.toFixed(1)}` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400 leading-tight">Мин. цена</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-lg font-bold text-blue-400 mb-1 break-words">
                        {collection.totalVolume?.toFixed(0) || 0}
                      </div>
                      <div className="text-xs text-gray-400 leading-tight">Объем</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-lg font-bold text-purple-400 mb-1 break-words">
                        {collection.likeCount?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-gray-400 leading-tight">Лайки</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between">
                    {/* Like Button */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction('LIKE')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium",
                        collection.isLiked 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : "bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", collection.isLiked && "fill-current")} />
                      {collection.isLiked ? 'Убрать лайк' : 'Лайк'}
                    </motion.button>
                    
                    <div className="flex items-center gap-2">
                      {/* Copy URL */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyUrl}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="Копировать ссылку"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </motion.button>
                      
                      {/* Share */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAction('SHARE')}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="Поделиться"
                      >
                        <Share2 className="w-4 h-4 text-gray-400" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs with horizontal scroll */}
              <div className="border-b border-white/10 flex-shrink-0">
                <div className="overflow-x-auto scrollbar-hide px-6">
                  <div className="flex gap-1 min-w-max">
                    {([
                      { id: 'overview', label: 'Обзор', icon: Layers },
                      { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
                      { id: 'activity', label: 'Активность', icon: Activity }
                    ] as const).map((tab) => {
                      const Icon = tab.icon
                      return (
                        <motion.button
                          key={tab.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap",
                            activeTab === tab.id
                              ? "text-blue-400"
                              : "text-gray-400 hover:text-gray-300"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                          {activeTab === tab.id && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Tab Content with proper scroll */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 pb-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Quick Stats Grid - Better responsive layout */}
                    <div className="grid grid-cols-2 gap-3">
                      <SimpleCard className="p-3 border border-white/10 text-center">
                        <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <div className="text-base font-bold text-white">
                          {(analytics?.activity.holders || Math.floor(collection.totalSupply * 0.7)).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">Владельцы</div>
                      </SimpleCard>
                      
                      <SimpleCard className="p-3 border border-white/10 text-center">
                        <Coins className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        <div className="text-base font-bold text-white">
                          {analytics?.activity.avgPrice.toFixed(1) || '2.8'} SOL
                        </div>
                        <div className="text-xs text-gray-400">Средняя цена</div>
                      </SimpleCard>
                      
                      <SimpleCard className="p-3 border border-white/10 text-center">
                        <Activity className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                        <div className="text-base font-bold text-white">
                          {analytics?.activity.sales24h || 8}
                        </div>
                        <div className="text-xs text-gray-400">Продаж за 24ч</div>
                      </SimpleCard>
                      
                      <SimpleCard className="p-3 border border-white/10 text-center">
                        <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                        <div className="text-base font-bold text-white">
                          {analytics?.activity.listings24h || 15}
                        </div>
                        <div className="text-xs text-gray-400">Листингов за 24ч</div>
                      </SimpleCard>
                    </div>

                    {/* Recent NFTs in Collection */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Последние NFT</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Mock NFTs - in production would show real collection NFTs */}
                        {[1, 2, 3, 4].map((i) => (
                          <SimpleCard key={i} className="p-3 border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                            <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg mb-3 flex items-center justify-center">
                              <span className="text-2xl"></span>
                            </div>
                            <div className="text-sm font-medium text-white mb-1">
                              {collection.name} #{i}
                            </div>
                            <div className="text-xs text-green-400">
                              {(collection.floorPrice || 2.5 + Math.random()).toFixed(2)} SOL
                            </div>
                          </SimpleCard>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && analytics && (
                  <div className="space-y-6">
                    {/* Price Analytics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SimpleCard className="p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Floor Price</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-white">
                              {analytics.floorPrice.current.toFixed(3)} SOL
                            </span>
                            <div className={cn(
                              "flex items-center gap-1 text-sm",
                              analytics.floorPrice.change24h >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {analytics.floorPrice.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {formatPercentage(analytics.floorPrice.change24h)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            7d: <span className={analytics.floorPrice.change7d >= 0 ? "text-green-400" : "text-red-400"}>
                              {formatPercentage(analytics.floorPrice.change7d)}
                            </span>
                          </div>
                        </div>
                      </SimpleCard>

                      <SimpleCard className="p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Объем торгов</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-white">
                              {analytics.volume.volume24h.toFixed(1)} SOL
                            </span>
                            <div className={cn(
                              "flex items-center gap-1 text-sm",
                              analytics.volume.change24h >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                              {analytics.volume.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {formatPercentage(analytics.volume.change24h)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            Всего: {analytics.volume.total.toFixed(1)} SOL
                          </div>
                        </div>
                      </SimpleCard>
                    </div>

                    {/* Price History Chart Placeholder */}
                    <SimpleCard className="p-6 border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4">История цен</h3>
                      <div className="h-40 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                          <div className="text-sm">График цен (Coming Soon)</div>
                        </div>
                      </div>
                    </SimpleCard>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Недавняя активность</h3>
                    
                    {/* Mock Activity Feed */}
                    {[
                      { type: 'sale', nft: `${collection.name} #123`, price: '2.5 SOL', time: '2 мин назад' },
                      { type: 'listing', nft: `${collection.name} #456`, price: '3.2 SOL', time: '15 мин назад' },
                      { type: 'sale', nft: `${collection.name} #789`, price: '2.8 SOL', time: '1 час назад' },
                      { type: 'listing', nft: `${collection.name} #321`, price: '2.9 SOL', time: '3 часа назад' }
                    ].map((activity, i) => (
                      <SimpleCard key={i} className="p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                              activity.type === 'sale' 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-blue-500/20 text-blue-400"
                            )}>
                              {activity.type === 'sale' ? '' : ''}
                            </div>
                            <div>
                              <div className="text-white font-medium">{activity.nft}</div>
                              <div className="text-sm text-gray-400">
                                {activity.type === 'sale' ? 'Продан за' : 'Выставлен за'} {activity.price}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">{activity.time}</div>
                        </div>
                      </SimpleCard>
                    ))}
                  </div>
                )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-white/10">
                <div className="flex gap-3">
                  <SimpleButton
                    onClick={() => handleAction('VIEW_NFTS')}
                    gradient
                    className="flex-1"
                  >
                    Просмотреть NFT коллекции
                  </SimpleButton>
                  <SimpleButton
                    onClick={handleClose}
                  >
                    Закрыть
                  </SimpleButton>
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
