/**
 * NFT Collections Grid - Display collections with floor price info
 * Solana SuperApp - NFT Page
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { 
  Layers,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  CheckCircle,
  Coins
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import type { NFTCollection } from '@/features/nft/types'

interface NFTCollectionsGridProps {
  collections: NFTCollection[]
  loading?: boolean
  onCollectionClick?: (collection: NFTCollection) => void
}

export function NFTCollectionsGrid({ 
  collections, 
  loading = false,
  onCollectionClick 
}: NFTCollectionsGridProps) {

  const handleCollectionClick = (collection: NFTCollection) => {
    hapticFeedback.impact('medium')
    onCollectionClick?.(collection)
  }

  const formatSOL = (value: number) => {
    return `${value.toFixed(2)} SOL`
  }

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <SimpleCard className="p-4 border border-white/5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-16 h-16 bg-gray-700 rounded-xl" />
                <div className="flex-1">
                  <div className="w-24 h-4 bg-gray-700 rounded mb-2" />
                  <div className="w-16 h-3 bg-gray-700 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-700 rounded" />
                <div className="w-3/4 h-3 bg-gray-700 rounded" />
              </div>
            </SimpleCard>
          </div>
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Коллекции не найдены
        </h3>
        <p className="text-gray-400">
          Создайте свою первую коллекцию NFT
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection, index) => (
        <motion.div
          key={collection.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCollectionClick(collection)}
            className="cursor-pointer"
          >
            <SimpleCard className="p-5 border border-white/10 hover:border-white/20 transition-all duration-200 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5">
              {/* Collection Header */}
              <div className="flex items-start gap-4 mb-4">
                {/* Collection Avatar */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
                    {collection.imageUri ? (
                      <img
                        src={collection.imageUri}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Layers className="w-6 h-6 text-white/60" />
                    )}
                  </div>
                  {collection.isVerified && (
                    <div className="absolute -top-1 -right-1">
                      <CheckCircle className="w-5 h-5 text-blue-400 bg-black rounded-full" />
                    </div>
                  )}
                </div>
                
                {/* Collection Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white truncate max-w-full">
                      {collection.name}
                    </h3>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">
                    by {collection.creator?.username || 
                        collection.creator?.firstName || 
                        `${collection.creatorId.slice(0, 8)}...`}
                  </div>
                  
                  {collection.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 break-words">
                      {collection.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Collection Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-white">
                    {formatNumber(collection.totalSupply)}
                  </div>
                  <div className="text-xs text-gray-400">Общий тираж</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-green-400">
                    {collection.floorPrice ? formatSOL(collection.floorPrice) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">Floor Price</div>
                </div>
              </div>

              {/* Volume & Social Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">
                    {formatSOL(collection.totalVolume)}
                  </span>
                  <span className="text-xs text-gray-400">объем</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {formatNumber(collection.viewCount || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Heart className={cn(
                      "w-4 h-4",
                      collection.isLiked ? "text-red-400 fill-current" : "text-gray-400"
                    )} />
                    <span className="text-xs text-gray-400">
                      {formatNumber(collection.likeCount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Change Indicator */}
              <div className="flex items-center justify-between">
                <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {collection.totalSupply} NFTs
                </Badge>
                
                {/* Mock price change - in production would come from analytics */}
                <div className="flex items-center gap-1 text-sm">
                  {Math.random() > 0.5 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">+{(Math.random() * 20).toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <span className="text-red-400">-{(Math.random() * 10).toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}
