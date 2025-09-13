/**
 * DAO Skeleton Loaders - Beautiful loading states for DAO pages
 * Matches exact structure and design system from DeFi pages
 * Solana SuperApp - DAO Section
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { PageLayout } from '@/components/layout/PageLayout'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'

// Base skeleton animation - matching DeFi style
// @ts-ignore
const shimmer = {
  initial: { opacity: 0.5 },
  animate: { opacity: 1 },
  transition: {
    duration: 1.2,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut" as any
  }
}

// Skeleton Bar Component - identical to DeFi style
const SkeletonBar: React.FC<{ 
  width?: string 
  height?: string 
  className?: string 
}> = ({ width = "w-full", height = "h-4", className = "" }) => (
  <motion.div
    {...shimmer}
    className={`bg-gray-700 rounded ${width} ${height} ${className}`}
  />
)

// DAO Header Skeleton
export const DAOHeaderSkeleton: React.FC = () => (
  <motion.div
    className="px-5 pt-4 pb-2"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
        <div>
          <SkeletonBar width="w-32" height="h-6" className="mb-1" />
          <SkeletonBar width="w-40" height="h-3" />
        </div>
      </div>
      <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
    </div>
    
    {/* Quick stats */}
    <div className="flex items-center gap-4 mt-4">
      <div className="flex items-center gap-2">
        <SkeletonBar width="w-4" height="h-4" className="rounded" />
        <SkeletonBar width="w-16" height="h-3" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBar width="w-4" height="h-4" className="rounded" />
        <SkeletonBar width="w-20" height="h-3" />
      </div>
    </div>
  </motion.div>
)

// DAO Stats Skeleton
export const DAOStatsSkeleton: React.FC = () => (
  <motion.div
    className="px-5 mb-4"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.1, duration: 0.4 }}
  >
    <SimpleCard className="p-6 border border-white/10 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-solana-green/5 to-transparent" />
      
      <div className="relative">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <SkeletonBar width="w-12" height="h-8" className="mb-2 mx-auto" />
              <SkeletonBar width="w-20" height="h-3" className="mx-auto" />
            </div>
          ))}
        </div>
        
        {/* User stats */}
        <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <SkeletonBar width="w-16" height="h-5" className="mb-1 mx-auto" />
            <SkeletonBar width="w-12" height="h-3" className="mx-auto" />
          </div>
          <div className="text-center">
            <SkeletonBar width="w-14" height="h-5" className="mb-1 mx-auto" />
            <SkeletonBar width="w-10" height="h-3" className="mx-auto" />
          </div>
        </div>
      </div>
    </SimpleCard>
  </motion.div>
)

// Quick Actions Skeleton
export const QuickActionsSkeleton: React.FC = () => (
  <motion.div
    className="px-5 mb-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <SkeletonBar width="w-6" height="h-6" className="rounded-full mb-2 mx-auto" />
          <SkeletonBar width="w-12" height="h-3" className="mx-auto" />
        </div>
      ))}
    </div>
  </motion.div>
)

// DAO Tabs Skeleton
export const DAOTabsSkeleton: React.FC = () => (
  <motion.div
    className="px-4 mb-3"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.4 }}
  >
    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-1 px-4 py-2.5 text-center">
          <SkeletonBar width="w-16" height="h-4" className="mx-auto" />
        </div>
      ))}
    </div>
  </motion.div>
)

// Proposal Card Skeleton
export const ProposalCardSkeleton: React.FC = () => (
  <motion.div
    className="mb-3"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <SimpleCard className="p-4 border border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <SkeletonBar width="w-16" height="h-5" className="rounded-full" />
            <SkeletonBar width="w-20" height="h-4" />
          </div>
          <SkeletonBar width="w-full" height="h-5" className="mb-2" />
          <SkeletonBar width="w-3/4" height="h-4" />
        </div>
        <SkeletonBar width="w-16" height="h-6" className="rounded-full" />
      </div>
      
      {/* Progress bars */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <SkeletonBar width="w-8" height="h-3" />
          <SkeletonBar width="w-12" height="h-3" />
        </div>
        <SkeletonBar width="w-full" height="h-2" className="rounded-full" />
        
        <div className="flex items-center justify-between">
          <SkeletonBar width="w-12" height="h-3" />
          <SkeletonBar width="w-16" height="h-3" />
        </div>
        <SkeletonBar width="w-full" height="h-2" className="rounded-full" />
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <SkeletonBar width="w-4" height="h-4" className="rounded" />
          <SkeletonBar width="w-20" height="h-3" />
        </div>
        <SkeletonBar width="w-16" height="h-7" className="rounded-lg" />
      </div>
    </SimpleCard>
  </motion.div>
)

// Proposals List Skeleton
export const ProposalsListSkeleton: React.FC = () => (
  <motion.div
    className="px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 0.4 }}
  >
    {[1, 2, 3].map((i) => (
      <ProposalCardSkeleton key={i} />
    ))}
  </motion.div>
)

// Treasury Section Skeleton
export const TreasurySkeleton: React.FC = () => (
  <motion.div
    className="px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 0.4 }}
  >
    <SimpleCard className="p-6 border border-white/10 mb-4">
      <div className="text-center mb-6">
        <SkeletonBar width="w-20" height="h-4" className="mb-2 mx-auto" />
        <SkeletonBar width="w-32" height="h-8" className="mb-1 mx-auto" />
        <SkeletonBar width="w-24" height="h-4" className="mx-auto" />
      </div>
      
      {/* Assets grid */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
              <div>
                <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                <SkeletonBar width="w-16" height="h-3" />
              </div>
            </div>
            <div className="text-right">
              <SkeletonBar width="w-20" height="h-4" className="mb-1" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
          </div>
        ))}
      </div>
    </SimpleCard>
  </motion.div>
)

// Members Section Skeleton
export const MembersSkeleton: React.FC = () => (
  <motion.div
    className="px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4, duration: 0.4 }}
  >
    {[1, 2, 3, 4].map((i) => (
      <SimpleCard key={i} className="p-4 border border-white/10 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
            <div>
              <SkeletonBar width="w-24" height="h-4" className="mb-1" />
              <SkeletonBar width="w-32" height="h-3" />
            </div>
          </div>
          <div className="text-right">
            <SkeletonBar width="w-16" height="h-4" className="mb-1" />
            <SkeletonBar width="w-12" height="h-3" />
          </div>
        </div>
      </SimpleCard>
    ))}
  </motion.div>
)

// Main DAO Page Skeleton
export const MainDAOPageSkeleton: React.FC = () => {
  return (
    <PageLayout className="pb-20">
      <Scene3DBackground />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <DAOHeaderSkeleton />
        
        {/* Stats */}
        <DAOStatsSkeleton />
        
        {/* Quick Actions */}
        <QuickActionsSkeleton />
        
        {/* Tabs */}
        <DAOTabsSkeleton />
        
        {/* Content - Default to proposals */}
        <ProposalsListSkeleton />
      </div>
    </PageLayout>
  )
}

export default MainDAOPageSkeleton










