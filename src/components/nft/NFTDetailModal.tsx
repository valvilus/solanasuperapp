/**
 * Premium NFT Detail Modal Component - Full NFT Information Display
 * Solana SuperApp - Premium Design System
 */

'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ExternalLink, 
  Copy, 
  Share2, 
  Send, 
  ShoppingCart,
  Eye,
  Calendar,
  User,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  Heart,
  History,
  MessageCircle,
  ThumbsUp
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import type { NftItem } from '@/features/nft/types'

interface PremiumNFTDetailModalProps {
  nft: NftItem | null
  isOpen: boolean
  onClose: () => void
  onAction: (action: string, nft: NftItem) => void
  className?: string
}

export function PremiumNFTDetailModal({
  nft,
  isOpen,
  onClose,
  onAction,
  className = ''
}: PremiumNFTDetailModalProps) {

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

  const handleAction = (action: string) => {
    if (nft) {
      onAction(action, nft)
    }
  }

  const handleCopyAddress = async () => {
    if (nft?.mintAddress) {
      try {
        await navigator.clipboard.writeText(nft.mintAddress)
        hapticFeedback.impact('light')
        // Show success feedback
      } catch (error) {
        console.error('Failed to copy address:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'USED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'EXPIRED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'FOR_SALE':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />
      case 'USED':
        return <Eye className="w-4 h-4" />
      case 'EXPIRED':
        return <Clock className="w-4 h-4" />
      case 'FOR_SALE':
        return <ShoppingCart className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getTypeEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      'TICKET': '',
      'COUPON': '',
      'BADGE': '',
      'COLLECTIBLE': '',
      'CERTIFICATE': ''
    }
    return emojiMap[type] || ''
  }

  if (!nft) return null



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-2 sm:p-4" // Z-INDEX: Detail modal layer
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleCard className="flex flex-col h-full border border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">{nft.name}</h2>
                  <p className="text-sm text-gray-400">{nft.type} NFT</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Scrollable Main Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 pb-20">
              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Image */}
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-white/20 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                    {nft.imageUri ? (
                      <img
                        src={nft.imageUri}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        {getTypeEmoji(nft.type)}
                      </div>
                    )}
                    
                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3">
                      {nft.isOwner && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Владелец
                        </Badge>
                      )}
                    </div>
                    
                    <div className="absolute top-3 right-3">
                      <Badge className={cn('flex items-center gap-1', getStatusColor(nft.status))}>
                        {getStatusIcon(nft.status)}
                        <span className="text-xs">
                          {nft.status === 'FOR_SALE' ? 'Продается' : 
                           nft.status === 'ACTIVE' ? 'Активен' :
                           nft.status === 'USED' ? 'Использован' :
                           nft.status === 'EXPIRED' ? 'Истек' : nft.status}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopyAddress}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-gray-300"
                    >
                      <Copy className="w-4 h-4" />
                      Копировать адрес
                    </motion.button>
                    {nft.explorerUrl && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.open(nft.explorerUrl, '_blank')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-gray-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Эксплорер
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Описание</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {nft.description || 'Описание отсутствует'}
                    </p>
                  </div>

                  {/* Price */}
                  {nft.price && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Цена</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-solana-green">
                            {nft.price.amount}
                          </p>
                          <TokenLogo 
                            token={(nft.currency || 'SOL') as 'SOL' | 'TNG'} 
                            size="md" 
                            className="w-6 h-6"
                          />
                        </div>
                        {nft.price.usdValue && (
                          <p className="text-gray-400">
                            ≈ {nft.price.usdValue}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attributes */}
                  {nft.attributes && nft.attributes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Атрибуты</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {nft.attributes.map((attr, index) => (
                          <div 
                            key={index} 
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <p className="text-xs text-gray-400 mb-1">{attr.trait_type}</p>
                            <p className="text-sm text-white font-medium">{attr.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Информация</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Тип</span>
                        <span className="text-white font-medium">{nft.type}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Создан</span>
                        <span className="text-white font-medium">
                          {nft.createdAt ? new Date(nft.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/10">
                        <span className="text-gray-400">Адрес минта</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-sm">
                            {nft.mintAddress ? `${nft.mintAddress.slice(0, 6)}...${nft.mintAddress.slice(-6)}` : 'Неизвестно'}
                          </span>
                          {nft.mintAddress && (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => navigator.clipboard.writeText(nft.mintAddress!)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </motion.button>
                          )}
                        </div>
                      </div>
                      {nft.owner && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-400">Владелец</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {nft.owner.username || (nft.owner.userId ? `${nft.owner.userId.slice(0, 6)}...${nft.owner.userId.slice(-4)}` : 'Неизвестно')}
                            </span>
                            {nft.owner.userId && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigator.clipboard.writeText(nft.owner!.userId!)}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                              >
                                <Copy className="w-3 h-3 text-gray-400" />
                              </motion.button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Stats & Actions */}
              <div className="mt-6 space-y-4">
                {/* Social Statistics */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-4">
                    {/* Views Counter */}
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {nft.viewCount || 0}
                      </span>
                    </div>
                    
                    {/* Likes Counter */}
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {nft.likeCount || 0}
                      </span>
                    </div>
                  </div>
                  
                  {/* Social Actions - Compact for mobile */}
                  <div className="flex items-center gap-1.5">
                    {/* Like Button - More compact */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAction('LIKE')}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all text-xs sm:text-sm",
                        nft.isLiked 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : "bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20"
                      )}
                    >
                      <Heart className={cn("w-3 h-3 sm:w-4 sm:h-4", nft.isLiked && "fill-current")} />
                      <span className="hidden sm:inline">{nft.isLiked ? 'Убрать' : 'Лайк'}</span>
                    </motion.button>
                    
                    {/* Share Button - Icon only on mobile */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAction('SHARE')}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all text-xs sm:text-sm"
                    >
                      <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Поделиться</span>
                    </motion.button>
                    
                    {/* Copy Button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopyAddress}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Копировать адрес"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-8 pt-6 border-t border-white/10">
                {nft.isOwner ? (
                  <>
                    {nft.isForSale ? (
                      <>
                        {/* NFT is for sale - show unlist button */}
                        <SimpleButton
                          onClick={() => handleAction('UNLIST')}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                          Снять с продажи
                        </SimpleButton>
                      </>
                    ) : (
                      <>
                        {/* NFT is not for sale - show transfer and sell buttons */}
                        <SimpleButton
                          onClick={() => handleAction('TRANSFER')}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm"
                        >
                          <Send className="w-4 h-4" />
                          Перевести
                        </SimpleButton>
                        <SimpleButton
                          onClick={() => handleAction('SELL')}
                          gradient
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Продать
                        </SimpleButton>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Show buy button only if NFT is for sale and user is not the owner */}
                    {nft.status === 'FOR_SALE' && nft.price && !nft.isOwner && (
                      <SimpleButton
                        onClick={() => handleAction('BUY')}
                        gradient
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Купить за {nft.price.amount}</span>
                        <TokenLogo 
                          token={(nft.currency || 'SOL') as 'SOL' | 'TNG'} 
                          size="sm" 
                          className="w-3 h-3"
                        />
                      </SimpleButton>
                    )}
                    {/* If user owns the NFT but it's for sale, show unlist button */}
                    {nft.status === 'FOR_SALE' && nft.isOwner && (
                      <SimpleButton
                        onClick={() => handleAction('UNLIST')}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                        Снять с продажи
                      </SimpleButton>
                    )}
                    {/* Offer functionality not implemented yet */}
                    {/* <SimpleButton
                      onClick={() => handleAction('MAKE_OFFER')}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm"
                    >
                      <Zap className="w-4 h-4" />
                      Предложение
                    </SimpleButton> */}
                  </>
                )}
                
                {/* Universal History Button */}
                <SimpleButton
                  onClick={() => handleAction('HISTORY')}
                  className="w-full flex items-center justify-center gap-2 mt-3 text-sm"
                >
                  <History className="w-4 h-4" />
                  История
                </SimpleButton>
              </div>
              </div>
              </div>
            </SimpleCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
