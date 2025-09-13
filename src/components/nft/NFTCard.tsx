/**
 * NFT Card Component - 3D Card with Advanced Animations
 * Solana SuperApp - Optimized Design System
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { NFTPlaceholderService } from '@/lib/storage/nft-placeholder.service'
import { 
  User, 
  MoreVertical, 
  Eye, 
  Send, 
  ShoppingCart, 
  Share2, 
  ExternalLink,
  Copy,
  Heart,
  Star,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  Ticket,
  Gift,
  Award,
  FileText,
  XCircle,
  AlertCircle,
  X,
  Camera
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import type { NftItem, ViewMode } from '@/features/nft/types'

interface NFTCardProps {
  nft: NftItem
  viewMode: ViewMode
  index: number
  onClick: () => void
  onAction: (action: string) => void
  className?: string
}

export function NFTCard({
  nft,
  viewMode,
  index,
  onClick,
  onAction,
  className = ''
}: NFTCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showFloatingActions, setShowFloatingActions] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback.impact('light')
    onAction(action)
    setShowActions(false)
    setShowFloatingActions(false)
  }

  // Long press handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      hapticFeedback.impact('medium')
      setShowFloatingActions(true)
    }, 500) // 500ms long press
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const timer = setTimeout(() => {
      setShowFloatingActions(true)
    }, 700) // 700ms for mouse
    setLongPressTimer(timer)
  }

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Helper function for type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TICKET': return Ticket
      case 'COUPON': return Gift
      case 'BADGE': return Award
      case 'CERTIFICATE': return FileText
      case 'COLLECTIBLE': return Star
      default: return Eye
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
        return <CheckCircle className="w-3 h-3" />
      case 'USED':
        return <XCircle className="w-3 h-3" />
      case 'EXPIRED':
        return <Clock className="w-3 h-3" />
      case 'FOR_SALE':
        return <ShoppingCart className="w-3 h-3" />
      default:
        return <AlertCircle className="w-3 h-3" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  // List View - Mobile-First Design
  if (viewMode === 'LIST') {
    return (
      <motion.div
        className={cn('group cursor-pointer', className)}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
      >
        <SimpleCard className="p-4 border border-white/10 hover:border-purple-400/30 transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-gray-900/80 to-gray-800/60 backdrop-blur-sm">
          {/* Premium gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
          
          <div className="relative z-10 flex items-center gap-4">
            {/* Enhanced NFT Image */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20">
              {(nft.imageUri || nft.image) && !imageError ? (
                  <img
                  src={nft.imageUri || nft.image}
                  alt={nft.name}
                  onError={handleImageError}
                    className="w-full h-full object-cover"
                />
              ) : (
                  <img
                    src={NFTPlaceholderService.generateErrorPlaceholder(nft.name, 80, 80)}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {/* Type icon overlay */}
              <div className="absolute -top-1 -left-1">
                <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg">
                  {React.createElement(getTypeIcon(nft.type), { 
                    className: "w-3 h-3 text-gray-700" 
                  })}
                </div>
              </div>
              
              {/* Owner indicator */}
              {nft.isOwner && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Enhanced NFT Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h4 className="text-white font-bold text-base line-clamp-1 leading-tight flex-1">
                  {nft.name}
                </h4>
                  <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 shadow-lg flex-shrink-0">
                    {React.createElement(getTypeIcon(nft.type), { 
                      className: "w-3 h-3 text-gray-700" 
                    })}
                  </div>
                </div>
                {nft.price && (
                  <div className="ml-3 flex-shrink-0 px-2 py-1 bg-gradient-to-r from-solana-purple/30 to-blue-500/30 rounded-lg border border-purple-400/50">
                    <div className="flex items-center gap-1">
                      <p className="text-white font-bold text-sm">{nft.price.amount}</p>
                      <TokenLogo 
                        token={(() => {
                          // Debug: log currency
                          console.log('NFT Currency Debug:', { nftId: nft.mintAddress, currency: nft.currency, price: nft.price })
                          return (nft.currency || 'SOL') as 'SOL' | 'TNG'
                        })()} 
                        size="sm" 
                        className="w-3 h-3"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs px-2 py-1', getStatusColor(nft.status || 'ACTIVE'))}>
                  {getStatusIcon(nft.status || 'ACTIVE')}
                  <span className="ml-1 font-medium">
                    {nft.status === 'FOR_SALE' ? 'Продается' : 
                     nft.status === 'ACTIVE' ? 'Активен' :
                     nft.status === 'USED' ? 'Использован' :
                     nft.status === 'EXPIRED' ? 'Истек' : (nft.status || 'Активен')}
                  </span>
                </Badge>
                
                {(nft.likeCount || nft.viewCount) && (
                  <div className="flex items-center gap-1">
                    {nft.likeCount && nft.likeCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-black/40 rounded-md">
                        <Heart className={cn("w-3 h-3", nft.isLiked ? "text-red-400 fill-red-400" : "text-gray-400")} />
                        <span className="text-xs text-white">{nft.likeCount}</span>
                      </div>
                    )}
                    {nft.viewCount && nft.viewCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-black/40 rounded-md">
                        <Eye className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-white">{nft.viewCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-400 line-clamp-1">
                {nft.description || `${nft.type} NFT • ${formatDate(nft.createdAt)}`}
              </p>
            </div>

            {/* Always-Visible Action Buttons */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleAction('VIEW', e)}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200"
              >
                <Eye className="w-4 h-4 text-purple-300" />
              </motion.button>

                    {nft.isOwner && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => handleAction('TRANSFER', e)}
                  disabled={nft.isForSale}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    nft.isForSale 
                      ? "bg-gray-500/20 border border-gray-500/30 cursor-not-allowed opacity-50"
                      : "bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 hover:from-emerald-500/30 hover:to-green-500/30"
                  )}
                >
                  <Send className={cn("w-4 h-4", nft.isForSale ? "text-gray-500" : "text-emerald-300")} />
                </motion.button>
              )}
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleAction('SHARE', e)}
                className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200"
              >
                <Share2 className="w-4 h-4 text-cyan-300" />
              </motion.button>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    )
  }

  // Grid View - Clean Card with Floating Actions
  return (
    <motion.div
      className={cn('group cursor-pointer relative', className)}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <SimpleCard className="aspect-[3/4] p-0 border-0 rounded-xl relative bg-gray-900/95 shadow-lg flex flex-col">
        {/* NFT Image - Takes most of the space */}
        <div className="relative w-full flex-1 rounded-t-xl overflow-hidden">
            {(nft.imageUri || nft.image) && !imageError ? (
                <img
                  src={nft.imageUri || nft.image}
                  alt={nft.name}
                  onError={handleImageError}
              className="w-full h-full object-cover"
                />
            ) : (
                <img
                  src={NFTPlaceholderService.generateErrorPlaceholder(nft.name)}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
          )}
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          

          

        </div>

        {/* Bottom Info Section - Simplified */}
        <div className="flex-shrink-0 bg-gray-900/95 p-3">
          {/* NFT Name with Type */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-white font-bold text-sm line-clamp-1 leading-tight flex-1">
              {nft.name}
            </h4>
            <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 shadow-lg flex-shrink-0">
              {React.createElement(getTypeIcon(nft.type), { 
                className: "w-3 h-3 text-gray-700" 
              })}
            </div>
          </div>

          {/* Price or Date */}
          <div className="flex items-center justify-between">
            {nft.price ? (
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white">{nft.price.amount}</span>
                <TokenLogo 
                  token={(() => {
                    // Debug: log currency
                    console.log('NFT Currency Debug (List):', { nftId: nft.mintAddress, currency: nft.currency, price: nft.price })
                    return (nft.currency || 'SOL') as 'SOL' | 'TNG'
                  })()} 
                  size="sm" 
                  className="w-3 h-3"
                />
                {nft.isOwner && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {nft.isOwner && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                <span className="text-[10px] text-gray-400">{formatDate(nft.createdAt)}</span>
              </div>
            )}
            
            {/* Hint for long press */}
            <motion.div
              animate={{ opacity: showFloatingActions ? 0 : [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[8px] text-gray-500"
            >
              Удерживай
            </motion.div>
          </div>
        </div>
        
        {/* Floating Action Panel */}
        <AnimatePresence>
          {showFloatingActions && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={() => setShowFloatingActions(false)}
              />
              
              {/* Compact Bottom Action Bar */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 z-[101]"
              >
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-t-xl border-t border-white/20 shadow-2xl p-2">
                  {/* Close button */}
                  <div className="flex justify-end mb-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowFloatingActions(false)
                      }}
                      className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 max-w-[140px] mx-auto">
                    {/* View Action */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleAction('VIEW', e)}
                      className="p-2 rounded-md bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-purple-300" />
                    </motion.button>
                    
                    {/* Scanner Action */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleAction('SCANNER', e)}
                      className="p-2 rounded-md bg-orange-500/20 border border-orange-400/30 hover:bg-orange-500/30 transition-colors flex items-center justify-center"
                    >
                      <Camera className="w-4 h-4 text-orange-300" />
                </motion.button>
                
                                        {/* Transfer or Share Action */}
                    {nft.isOwner ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleAction('TRANSFER', e)}
                        disabled={nft.isForSale}
                        className={cn(
                          "p-2 rounded-md transition-colors flex items-center justify-center",
                          nft.isForSale 
                            ? "bg-gray-500/20 border border-gray-500/30 cursor-not-allowed opacity-50"
                            : "bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30"
                        )}
                      >
                        <Send className={cn("w-4 h-4", nft.isForSale ? "text-gray-500" : "text-emerald-300")} />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleAction('SHARE', e)}
                        className="p-2 rounded-md bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30 transition-colors flex items-center justify-center"
                      >
                        <Share2 className="w-4 h-4 text-cyan-300" />
                  </motion.button>
                )}
                
                    {/* Sell or Share Action */}
                    {nft.isOwner ? (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleAction(nft.isForSale ? 'UNLIST' : 'SELL', e)}
                        className={cn(
                          "p-2 rounded-md transition-colors flex items-center justify-center",
                          nft.isForSale 
                            ? "bg-red-500/20 border border-red-400/30 hover:bg-red-500/30"
                            : "bg-orange-500/20 border border-orange-400/30 hover:bg-orange-500/30"
                        )}
                      >
                        <ShoppingCart className={cn("w-4 h-4", nft.isForSale ? "text-red-300" : "text-orange-300")} />
                      </motion.button>
                    ) : (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleAction('SHARE', e)}
                        className="p-2 rounded-md bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30 transition-colors flex items-center justify-center"
                >
                        <Share2 className="w-4 h-4 text-cyan-300" />
                </motion.button>
                )}
              </div>
            </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </SimpleCard>
    </motion.div>
  )
}

// Action Menu Item Component
function ActionMenuItem({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: React.ComponentType<any>
  label: string
  onClick: (e: React.MouseEvent) => void 
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-left"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </motion.button>
  )
}
