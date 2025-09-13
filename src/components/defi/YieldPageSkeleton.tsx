/**
 * Yield Page Skeleton - Consistent with DeFi design system
 * Matches the transparent glass style of other DeFi pages
 * Solana SuperApp
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

export function YieldPageSkeleton() {
  return (
    <PageLayout showBottomNav={true}>
      <div className="space-y-5 pb-safe">
        
        {/* Header Skeleton */}
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
            <div className="flex items-center gap-2">
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Yield Summary Skeleton */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <SimpleCard className="p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <SkeletonBar width="w-36" height="h-7" />
              <SkeletonBar width="w-20" height="h-6" className="rounded-full" />
            </div>
            
            {/* Total Yield */}
            <div className="mb-6">
              <SkeletonBar width="w-28" height="h-5" className="mb-2" />
              <SkeletonBar width="w-44" height="h-10" />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <SkeletonBar width="w-20" height="h-4" className="mb-2" />
                  <SkeletonBar width="w-16" height="h-6" />
                </div>
              ))}
            </div>
          </SimpleCard>
        </motion.div>

        {/* Risk Level Selector Skeleton */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <SkeletonBar width="w-32" height="h-5" className="mb-4" />
            <div className="flex space-x-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBar 
                  key={i}
                  width="flex-1"
                  height="h-10"
                  className="rounded-lg"
                />
              ))}
            </div>
          </SimpleCard>
        </motion.div>

        {/* Category Filters Skeleton */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBar 
                key={i}
                width="w-20"
                height="h-8"
                className="flex-shrink-0 rounded-full"
              />
            ))}
          </div>
        </motion.div>

        {/* Yield Strategies List Skeleton */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SimpleCard key={i} className="p-5 border border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <SkeletonBar width="w-12" height="h-12" className="rounded-xl" />
                    <div>
                      <SkeletonBar width="w-28" height="h-5" className="mb-2" />
                      <SkeletonBar width="w-20" height="h-4" />
                    </div>
                  </div>
                  <div className="text-right">
                    <SkeletonBar width="w-16" height="h-6" className="mb-1" />
                    <SkeletonBar width="w-12" height="h-4" />
                  </div>
                </div>
                
                <SkeletonBar width="w-full" height="h-4" className="mb-3" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <SkeletonBar width="w-12" height="h-3" className="mb-1" />
                      <SkeletonBar width="w-16" height="h-4" />
                    </div>
                    <div>
                      <SkeletonBar width="w-8" height="h-3" className="mb-1" />
                      <SkeletonBar width="w-12" height="h-4" />
                    </div>
                  </div>
                  <SkeletonBar width="w-24" height="h-8" className="rounded-lg" />
                </div>
              </SimpleCard>
            ))}
          </div>
        </motion.div>

        {/* Yield Optimizer Skeleton */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <SimpleCard className="p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-6">
              <SkeletonBar width="w-8" height="h-8" className="rounded-lg" />
              <SkeletonBar width="w-36" height="h-6" />
            </div>
            
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <SkeletonBar width="w-32" height="h-4" />
                  <SkeletonBar width="w-16" height="h-4" />
                </div>
              ))}
            </div>
            
            <SkeletonBar width="w-full" height="h-10" className="rounded-lg mt-6" />
          </SimpleCard>
        </motion.div>

      </div>
    </PageLayout>
  )
}
