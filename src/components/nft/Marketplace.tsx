/**
 * Premium Marketplace Component - NFT Trading Hub
 * Solana SuperApp - Premium Design System
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { NFTCard } from './NFTCard'
import { Store, TrendingUp, Sparkles } from 'lucide-react'
import type { NftItem, ViewMode } from '@/features/nft/types'

interface PremiumMarketplaceProps {
  nfts: NftItem[]
  viewMode: ViewMode
  isLoading: boolean
  onNftClick: (nft: NftItem) => void
  onNftAction: (action: string, nft: NftItem) => void
  className?: string
}

export function PremiumMarketplace({
  nfts,
  viewMode,
  isLoading,
  onNftClick,
  onNftAction,
  className = ''
}: PremiumMarketplaceProps) {
  
  if (isLoading) {
    return (
      <div className={`px-5 ${className}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <SimpleCard className="aspect-[4/5] p-4">
                <div className="w-full aspect-square bg-gray-700/50 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="w-3/4 h-4 bg-gray-700/50 rounded" />
                  <div className="w-1/2 h-3 bg-gray-700/50 rounded" />
                </div>
              </SimpleCard>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <motion.div
        className={`px-5 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SimpleCard className="p-12 text-center border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="mb-6"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <Store className="w-10 h-10 text-gray-400" />
              </div>
            </motion.div>
            
            <h3 className="text-xl font-bold text-white mb-3">
              Маркетплейс пуст
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Пока нет NFT для продажи. Станьте первым, кто выставит свой актив на маркетплейс!
            </p>
            
            <SimpleButton gradient className="px-8 py-3">
              Создать NFT для продажи
            </SimpleButton>
          </div>
        </SimpleCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`px-5 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Enhanced Marketplace Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <SimpleCard className="p-4 text-center border border-white/20 bg-gradient-to-br from-green-500/15 to-green-600/10 hover:border-green-500/30 transition-all backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-green-500/20 border border-green-500/30">
                  <Store className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{nfts.length}</p>
              <p className="text-xs text-gray-300">В продаже</p>
            </div>
          </SimpleCard>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <SimpleCard className="p-4 text-center border border-white/20 bg-gradient-to-br from-blue-500/15 to-blue-600/10 hover:border-blue-500/30 transition-all backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-white">24</p>
              <p className="text-xs text-gray-300">Продано</p>
            </div>
          </SimpleCard>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <SimpleCard className="p-4 text-center border border-white/20 bg-gradient-to-br from-purple-500/15 to-purple-600/10 hover:border-purple-500/30 transition-all backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-full bg-purple-500/20 border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-white">4.2</p>
              <p className="text-xs text-gray-300">Ср. цена</p>
            </div>
          </SimpleCard>
        </motion.div>
      </div>

      {/* Enhanced NFT Grid */}
      <div className={
        viewMode === 'GRID' 
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'space-y-3'
      }>
        {nfts.map((nft, index) => (
          <motion.div
            key={nft.mintAddress}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: index * 0.08,
              duration: 0.5,
              type: 'spring',
              stiffness: 120,
              damping: 20
            }}
            whileHover={{
              scale: viewMode === 'GRID' ? 1.05 : 1.02,
              y: viewMode === 'GRID' ? -5 : -2,
              transition: { duration: 0.3, ease: "easeOut" }
            }}
            className="group relative"
          >
            {/* Marketplace Glow Effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="absolute -inset-2 bg-gradient-to-r from-solana-purple/20 via-transparent to-solana-green/20 rounded-xl blur-lg -z-10"
            />
            
            <NFTCard
              nft={nft}
              viewMode={viewMode}
              index={index}
              onClick={() => onNftClick(nft)}
              onAction={(action) => onNftAction(action, nft)}
              className="relative z-10"
            />
            
            {/* Marketplace Badge */}
            {nft.status === 'FOR_SALE' && (
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: -12 }}
                transition={{ delay: index * 0.08 + 0.3, duration: 0.3 }}
                className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-solana-green to-green-400 text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg"
              >
                SALE
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
