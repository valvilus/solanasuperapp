/**
 * DeFi Skeleton Loaders - Beautiful loading states for DeFi pages
 * Matches exact structure and TMA design system
 * Solana SuperApp - DeFi Section
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { PageLayout } from '@/components/layout/PageLayout'

// Base skeleton animation - matching existing style
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

// Skeleton Bar Component - identical to existing style
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

// DeFi Header Skeleton - common for all DeFi pages
export const DeFiHeaderSkeleton: React.FC = () => (
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

// Balance Overview Skeleton - for balance display sections
export const BalanceOverviewSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.1, duration: 0.4 }}
  >
    <SimpleCard className="p-6 border border-white/10 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-solana-green/5 to-transparent" />
      
      <div className="relative space-y-4">
        {/* Main balance */}
        <div className="text-center">
          <SkeletonBar width="w-20" height="h-3" className="mb-2 mx-auto" />
          <SkeletonBar width="w-40" height="h-8" className="mb-1 mx-auto" />
          <SkeletonBar width="w-24" height="h-4" className="mx-auto" />
        </div>
        
        {/* Token balances grid */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <SkeletonBar width="w-6" height="h-6" className="rounded-full" />
                <SkeletonBar width="w-8" height="h-3" />
              </div>
              <SkeletonBar width="w-16" height="h-4" className="mb-1" />
              <SkeletonBar width="w-12" height="h-3" />
            </div>
          ))}
        </div>
      </div>
    </SimpleCard>
  </motion.div>
)

// Staking Pools Skeleton
export const StakingPoolsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <SkeletonBar width="w-32" height="h-5" />
        <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
      </div>
      
      {/* Pool cards */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBar width="w-12" height="h-12" className="rounded-full" />
                <div>
                  <SkeletonBar width="w-24" height="h-4" className="mb-1" />
                  <SkeletonBar width="w-16" height="h-3" />
                </div>
              </div>
              <div className="text-right">
                <SkeletonBar width="w-16" height="h-4" className="mb-1" />
                <SkeletonBar width="w-12" height="h-3" />
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <SkeletonBar width="w-20" height="h-3" />
                <SkeletonBar width="w-12" height="h-3" />
              </div>
              <SkeletonBar width="w-full" height="h-2" className="rounded-full" />
            </div>
            
            {/* Action button */}
            <div className="mt-4">
              <SkeletonBar width="w-full" height="h-10" className="rounded-lg" />
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Swap Interface Skeleton
export const SwapInterfaceSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <SimpleCard className="p-6 border border-white/10">
      {/* From token */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonBar width="w-16" height="h-4" />
          <SkeletonBar width="w-20" height="h-3" />
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
              <div>
                <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                <SkeletonBar width="w-16" height="h-3" />
              </div>
            </div>
            <div className="text-right">
              <SkeletonBar width="w-20" height="h-6" className="mb-1" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
          </div>
        </div>
        
        {/* Swap arrow */}
        <div className="flex justify-center">
          <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
        </div>
        
        {/* To token */}
        <div className="flex items-center justify-between">
          <SkeletonBar width="w-16" height="h-4" />
          <SkeletonBar width="w-20" height="h-3" />
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
              <div>
                <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                <SkeletonBar width="w-16" height="h-3" />
              </div>
            </div>
            <div className="text-right">
              <SkeletonBar width="w-20" height="h-6" className="mb-1" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
          </div>
        </div>
        
        {/* Swap details */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-16" height="h-3" />
              <SkeletonBar width="w-12" height="h-3" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-20" height="h-3" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-14" height="h-3" />
              <SkeletonBar width="w-10" height="h-3" />
            </div>
          </div>
        </div>
        
        {/* Swap button */}
        <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
      </div>
    </SimpleCard>
  </motion.div>
)

// Farming Pools Skeleton
export const FarmingPoolsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <SkeletonBar width="w-28" height="h-5" />
        <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
      </div>
      
      {/* Pool cards */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <div className="space-y-4">
              {/* Pool header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
                    <SkeletonBar width="w-8" height="h-8" className="rounded-full -ml-2" />
                  </div>
                  <div>
                    <SkeletonBar width="w-20" height="h-4" className="mb-1" />
                    <SkeletonBar width="w-16" height="h-3" />
                  </div>
                </div>
                <div className="text-right">
                  <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                  <SkeletonBar width="w-8" height="h-3" />
                </div>
              </div>
              
              {/* Pool stats */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="text-center">
                    <SkeletonBar width="w-16" height="h-4" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-12" height="h-3" className="mx-auto" />
                  </div>
                ))}
              </div>
              
              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <SkeletonBar width="w-full" height="h-10" className="rounded-lg" />
                <SkeletonBar width="w-full" height="h-10" className="rounded-lg" />
              </div>
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Portfolio Assets Skeleton
export const PortfolioAssetsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <SkeletonBar width="w-24" height="h-5" />
        <div className="flex items-center gap-2">
          <SkeletonBar width="w-16" height="h-8" className="rounded-lg" />
          <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
        </div>
      </div>
      
      {/* Asset cards */}
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
                <div>
                  <SkeletonBar width="w-16" height="h-4" className="mb-1" />
                  <SkeletonBar width="w-20" height="h-3" />
                </div>
              </div>
              <div className="text-right">
                <SkeletonBar width="w-20" height="h-4" className="mb-1" />
                <div className="flex items-center gap-1 justify-end">
                  <SkeletonBar width="w-12" height="h-3" />
                  <SkeletonBar width="w-8" height="h-3" />
                </div>
              </div>
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Analytics Charts Skeleton
export const AnalyticsChartsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-4">
      {/* Chart card */}
      <SimpleCard className="p-6 border border-white/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBar width="w-28" height="h-5" />
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <SkeletonBar key={i} width="w-12" height="h-6" className="rounded-lg" />
              ))}
            </div>
          </div>
          
          {/* Chart area */}
          <div className="h-48 bg-gradient-to-br from-gray-700/20 to-gray-700/10 rounded-lg flex items-end justify-center p-4">
            <div className="flex items-end gap-2 w-full">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <SkeletonBar 
                  key={i} 
                  width="w-full" 
                  height={`h-${Math.floor(Math.random() * 20) + 10}`} 
                  className="rounded-t" 
                />
              ))}
            </div>
          </div>
        </div>
      </SimpleCard>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SimpleCard key={i} className="p-4 border border-white/10">
            <SkeletonBar width="w-16" height="h-3" className="mb-2" />
            <SkeletonBar width="w-20" height="h-6" className="mb-1" />
            <SkeletonBar width="w-14" height="h-3" />
          </SimpleCard>
        ))}
      </div>
    </div>
  </motion.div>
)

// Transaction History Skeleton
export const TransactionHistorySkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <SkeletonBar key={i} width="w-16" height="h-8" className="rounded-lg" />
        ))}
      </div>
      
      {/* Transaction cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <SkeletonBar width="w-20" height="h-4" />
                    <SkeletonBar width="w-12" height="h-3" className="rounded-full" />
                  </div>
                  <SkeletonBar width="w-24" height="h-3" />
                </div>
              </div>
              <div className="text-right">
                <SkeletonBar width="w-16" height="h-4" className="mb-1" />
                <SkeletonBar width="w-12" height="h-3" />
              </div>
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Lending Pools Skeleton
export const LendingPoolsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[1, 2].map((i) => (
          <SkeletonBar key={i} width="w-20" height="h-10" className="rounded-lg" />
        ))}
      </div>
      
      {/* Pool cards */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <div className="space-y-4">
              {/* Pool header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
                  <div>
                    <SkeletonBar width="w-16" height="h-4" className="mb-1" />
                    <SkeletonBar width="w-12" height="h-3" />
                  </div>
                </div>
                <SkeletonBar width="w-12" height="h-6" className="rounded-full" />
              </div>
              
              {/* APY and utilization */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SkeletonBar width="w-16" height="h-3" className="mb-1" />
                  <SkeletonBar width="w-12" height="h-5" />
                </div>
                <div>
                  <SkeletonBar width="w-20" height="h-3" className="mb-1" />
                  <SkeletonBar width="w-16" height="h-5" />
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <SkeletonBar width="w-full" height="h-10" className="rounded-lg" />
                <SkeletonBar width="w-full" height="h-10" className="rounded-lg" />
              </div>
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Yield Strategies Skeleton
export const YieldStrategiesSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBar key={i} width="w-16" height="h-8" className="rounded-lg" />
        ))}
      </div>
      
      {/* Strategy cards */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <div className="space-y-4">
              {/* Strategy header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
                  <div>
                    <SkeletonBar width="w-24" height="h-4" className="mb-1" />
                    <SkeletonBar width="w-16" height="h-3" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonBar width="w-12" height="h-6" className="rounded-full" />
                  <SkeletonBar width="w-8" height="h-6" className="rounded-full" />
                </div>
              </div>
              
              {/* Strategy stats */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="text-center">
                    <SkeletonBar width="w-12" height="h-3" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-16" height="h-4" className="mx-auto" />
                  </div>
                ))}
              </div>
              
              {/* Join button */}
              <SkeletonBar width="w-full" height="h-10" className="rounded-lg" />
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// DeFi Stats Overview Skeleton
export const DeFiStatsOverviewSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.1, duration: 0.4 }}
  >
    <SimpleCard className="p-6 border border-white/10">
      <div className="space-y-4">
        {/* Main stats */}
        <div className="text-center">
          <SkeletonBar width="w-20" height="h-3" className="mb-2 mx-auto" />
          <SkeletonBar width="w-32" height="h-8" className="mb-1 mx-auto" />
          <SkeletonBar width="w-24" height="h-4" className="mx-auto" />
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <SkeletonBar width="w-16" height="h-3" className="mb-1 mx-auto" />
              <SkeletonBar width="w-20" height="h-5" className="mb-1 mx-auto" />
              <SkeletonBar width="w-12" height="h-3" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </SimpleCard>
  </motion.div>
)

// Quick Actions Skeleton for DeFi
export const DeFiQuickActionsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.4 }}
  >
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
        >
          <SimpleCard className="p-4 h-24 border border-white/5">
            <div className="flex flex-col items-center justify-center h-full">
              <SkeletonBar width="w-6" height="h-6" className="rounded mb-2" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Full DeFi Page Skeletons for each specific page

// Staking Page Skeleton - переместился в отдельный файл
export { StakingPageSkeleton } from './StakingPageSkeleton'

// Swap Page Skeleton - переместился в отдельный файл
export { SwapPageSkeleton } from './SwapPageSkeleton'

// Farming Page Skeleton
export const FarmingPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      <DeFiHeaderSkeleton />
      <BalanceOverviewSkeleton />
      <FarmingPoolsSkeleton />
    </div>
  </PageLayout>
)

// Portfolio Page Skeleton - переместился в отдельный файл
export { PortfolioPageSkeleton } from './PortfolioPageSkeleton'
export { AnalyticsPageSkeleton } from './AnalyticsPageSkeleton'
export { YieldPageSkeleton } from './YieldPageSkeleton'


// History Page Skeleton - переместился в отдельный файл
export { HistoryPageSkeleton } from './HistoryPageSkeleton'

// Lending Page Skeleton
export const LendingPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      <DeFiHeaderSkeleton />
      <BalanceOverviewSkeleton />
      <LendingPoolsSkeleton />
    </div>
  </PageLayout>
)


// Main DeFi Page Skeleton
export const MainDeFiPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      {/* 3D Background placeholder */}
      <div className="fixed inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-br from-solana-purple/5 to-solana-green/5" />
      </div>
      
      <DeFiHeaderSkeleton />
      <DeFiStatsOverviewSkeleton />
      <DeFiQuickActionsSkeleton />
      
      {/* Tabs skeleton */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBar key={i} width="w-20" height="h-10" className="rounded-lg" />
          ))}
        </div>
      </motion.div>
      
      {/* Content area */}
      <PortfolioAssetsSkeleton />
    </div>
  </PageLayout>
)
