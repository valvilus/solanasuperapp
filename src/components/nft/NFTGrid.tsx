/**
 * NFT Grid Component - Advanced Grid Layout with 3D Effects
 * Solana SuperApp - Optimized Design System
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { NFTCard } from './NFTCard'
import { Plus } from 'lucide-react'
import type { NftItem, ViewMode } from '@/features/nft/types'

interface EmptyState {
  icon: React.ComponentType<any>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

interface NFTGridProps {
  nfts: NftItem[]
  viewMode: ViewMode
  isLoading: boolean
  emptyState: EmptyState
  onNftClick: (nft: NftItem) => void
  onNftAction: (action: string, nft: NftItem) => void
  className?: string
}

export function NFTGrid({
  nfts,
  viewMode,
  isLoading,
  emptyState,
  onNftClick,
  onNftAction,
  className = ''
}: NFTGridProps) {
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`px-5 ${className}`}>
        <div className={
          viewMode === 'GRID' 
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        }>
          {Array.from({ length: viewMode === 'GRID' ? 8 : 6 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="animate-pulse"
            >
              <SimpleCard className={
                viewMode === 'GRID' 
                  ? 'aspect-[4/5] p-4'
                  : 'p-4 h-20'
              }>
                <div className="h-full flex flex-col justify-between">
                  {viewMode === 'GRID' ? (
                    <>
                      <div className="w-full aspect-square bg-gray-700/50 rounded-xl mb-3" />
                      <div className="space-y-2">
                        <div className="w-3/4 h-4 bg-gray-700/50 rounded" />
                        <div className="w-1/2 h-3 bg-gray-700/50 rounded" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-700/50 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 bg-gray-700/50 rounded" />
                        <div className="w-1/2 h-3 bg-gray-700/50 rounded" />
                      </div>
                      <div className="w-16 h-8 bg-gray-700/50 rounded-lg" />
                    </div>
                  )}
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (nfts.length === 0) {
    return (
      <motion.div
        className={`px-5 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SimpleCard className="p-12 text-center border border-white/10 relative overflow-hidden">
          {/* Gradient background - matching wallet style */}
          <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-solana-green/5 to-transparent" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="mb-6"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <emptyState.icon className="w-10 h-10 text-gray-400" />
              </div>
            </motion.div>
            
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-xl font-bold text-white mb-3"
            >
              {emptyState.title}
            </motion.h3>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed"
            >
              {emptyState.description}
            </motion.p>
            
            {emptyState.actionLabel && emptyState.onAction && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex justify-center"
              >
                <SimpleButton
                  gradient
                  onClick={emptyState.onAction}
                  className="px-8 py-3 flex items-center justify-center gap-2"
                >
                  <Plus className="w-7 h-7" />
                  {emptyState.actionLabel}
                </SimpleButton>
              </motion.div>
            )}
          </div>
        </SimpleCard>
      </motion.div>
    )
  }

  // NFT Grid rendering

  // NFT Grid
  return (
    <motion.div
      className={`px-5 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          className={
            viewMode === 'GRID' 
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          {nfts.map((nft, index) => (
            <motion.div
              key={`${nft.mintAddress}-${viewMode}`}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{
                delay: index * 0.05,
                duration: 0.4,
                type: 'spring',
                stiffness: 100,
                damping: 15
              }}
              whileHover={{
                scale: viewMode === 'GRID' ? 1.03 : 1.01,
                transition: { duration: 0.2 }
              }}
              className="group"
            >
              <NFTCard
                nft={nft}
                viewMode={viewMode}
                index={index}
                onClick={() => onNftClick(nft)}
                onAction={(action) => onNftAction(action, nft)}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Load More Indicator */}
      {nfts.length > 0 && nfts.length % 20 === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 text-center"
        >
          <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-solana-purple rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-solana-green rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-gray-400 text-sm mt-3">
              Загружено {nfts.length} NFT
            </p>
          </SimpleCard>
        </motion.div>
      )}
    </motion.div>
  )
}
