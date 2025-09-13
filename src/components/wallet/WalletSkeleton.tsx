/**
 * Wallet Skeleton Loaders - Beautiful loading states
 * Solana SuperApp - Wallet Page
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'

// Base skeleton animation
const shimmer = {
  initial: { opacity: 0.5 },
  animate: { opacity: 1 },
  transition: {
    duration: 1.2,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: "easeInOut"
  }
}

// Skeleton Bar Component
const SkeletonBar: React.FC<{ 
  width?: string 
  height?: string 
  className?: string 
}> = ({ width = "w-full", height = "h-4", className = "" }) => (
  <motion.div
    {...(shimmer as any)}
    className={`bg-gray-700 rounded ${width} ${height} ${className}`}
  />
)

// WalletBalance Skeleton
export const WalletBalanceSkeleton: React.FC = () => (
  <SimpleCard className="p-6 border border-white/10 relative overflow-hidden">
    {/* Gradient background */}
    <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-solana-green/5 to-transparent" />
    
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <SkeletonBar width="w-20" height="h-3" className="mb-2" />
          <SkeletonBar width="w-24" height="h-2" />
        </div>
        <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
      </div>

      {/* Main balance */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <SkeletonBar width="w-32" height="h-8" />
          <SkeletonBar width="w-16" height="h-6" className="rounded-full" />
        </div>
      </div>

      {/* Token balances */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[1, 2].map((i) => (
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

      {/* Wallet address */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <SkeletonBar width="w-20" height="h-3" className="mb-1" />
            <SkeletonBar width="w-24" height="h-4" />
          </div>
          <div className="flex gap-3">
            <SkeletonBar width="w-10" height="h-10" className="rounded-lg" />
            <SkeletonBar width="w-10" height="h-10" className="rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  </SimpleCard>
)

// Quick Actions Skeleton
export const QuickActionsSkeleton: React.FC = () => (
  <div className="grid grid-cols-4 gap-3">
    {[1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.05, duration: 0.3 }}
      >
        <SimpleCard className="p-4 h-20 border border-white/5">
          <div className="flex flex-col items-center justify-center h-full">
            <SkeletonBar width="w-5" height="h-5" className="rounded mb-2" />
            <SkeletonBar width="w-12" height="h-3" />
          </div>
        </SimpleCard>
      </motion.div>
    ))}
  </div>
)

// Portfolio Tokens Skeleton
export const PortfolioTokensSkeleton: React.FC = () => (
  <div className="space-y-2">
    {[1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1, duration: 0.3 }}
      >
        <SimpleCard className="p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
              <div>
                <SkeletonBar width="w-8" height="h-4" className="mb-1" />
                <SkeletonBar width="w-16" height="h-3" />
              </div>
            </div>
            <div className="text-right">
              <SkeletonBar width="w-16" height="h-4" className="mb-1" />
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
)

// Recent Transactions Skeleton
export const RecentTransactionsSkeleton: React.FC = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05, duration: 0.2 }}
      >
        <SimpleCard className="p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SkeletonBar width="w-16" height="h-4" />
                  <SkeletonBar width="w-4" height="h-3" className="rounded-full" />
                </div>
                <SkeletonBar width="w-20" height="h-3" />
              </div>
            </div>
            <div className="text-right">
              <SkeletonBar width="w-16" height="h-4" className="mb-1" />
              <div className="flex items-center gap-1 justify-end">
                <SkeletonBar width="w-8" height="h-3" />
                <SkeletonBar width="w-1" height="h-3" />
                <SkeletonBar width="w-12" height="h-3" />
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    ))}
  </div>
)

// Wallet Connect Skeleton
export const WalletConnectSkeleton: React.FC = () => (
  <SimpleCard className="p-4 border border-white/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
        <div>
          <SkeletonBar width="w-20" height="h-4" className="mb-1" />
          <SkeletonBar width="w-16" height="h-3" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBar width="w-16" height="h-8" className="rounded-lg" />
        <SkeletonBar width="w-8" height="h-8" className="rounded-lg" />
      </div>
    </div>
  </SimpleCard>
)

// Section Header Skeleton
export const SectionHeaderSkeleton: React.FC = () => (
  <div className="flex items-center justify-between">
    <SkeletonBar width="w-32" height="h-4" />
    <div className="flex items-center gap-2">
      <SkeletonBar width="w-12" height="h-3" />
      <SkeletonBar width="w-16" height="h-3" />
    </div>
  </div>
)

// Full Page Skeleton
export const WalletPageSkeleton: React.FC = () => (
  <div className="space-y-6 pb-safe">
    {/* Header */}
    <motion.div
      className="px-5 pt-4 pb-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBar width="w-24" height="h-6" className="mb-1" />
          <SkeletonBar width="w-32" height="h-3" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
          <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
        </div>
      </div>
    </motion.div>

    {/* Balance Card */}
    <div className="px-5">
      <WalletBalanceSkeleton />
    </div>

    {/* Quick Actions */}
    <div className="px-5">
      <QuickActionsSkeleton />
    </div>

    {/* Wallet Management */}
    <div className="px-5">
      <SectionHeaderSkeleton />
      <div className="mt-3">
        <WalletConnectSkeleton />
      </div>
    </div>

    {/* Portfolio Tokens */}
    <div className="px-5">
      <SectionHeaderSkeleton />
      <div className="mt-3">
        <PortfolioTokensSkeleton />
      </div>
    </div>

    {/* Recent Transactions */}
    <div className="px-5">
      <SectionHeaderSkeleton />
      <div className="mt-3">
        <RecentTransactionsSkeleton />
      </div>
    </div>
  </div>
)
