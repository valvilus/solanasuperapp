/**
 * Точный Skeleton для страницы swap
 * Полностью соответствует структуре src/app/defi/swap/page.tsx
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { PageLayout } from '@/components/layout/PageLayout'

// Base skeleton animation
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

// Skeleton Bar Component
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

export const SwapPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      
      {/*  Header - Минималистичный */}
      <motion.div
        className="px-5 pt-5 pb-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <SkeletonBar width="w-6" height="h-6" className="rounded-full" />
            <div>
              <SkeletonBar width="w-24" height="h-6" className="mb-1" />
              <SkeletonBar width="w-32" height="h-3" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Settings button */}
            <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
            {/* Refresh button */}
            <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
          </div>
        </div>
      </motion.div>

      {/*  Main Swap Interface */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
          
          {/* From Token Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-16" height="h-4" />
              <SkeletonBar width="w-24" height="h-3" />
            </div>
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <SkeletonBar width="w-24" height="h-8" className="mb-2" />
                  <SkeletonBar width="w-16" height="h-3" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3 mb-2">
                    <SkeletonBar width="w-6" height="h-6" className="rounded-full" />
                    <div>
                      <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                      <SkeletonBar width="w-16" height="h-3" />
                    </div>
                    <SkeletonBar width="w-4" height="h-4" />
                  </div>
                  <SkeletonBar width="w-20" height="h-3" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Swap Arrow */}
          <div className="flex justify-center mb-6">
            <SkeletonBar width="w-12" height="h-12" className="rounded-full" />
          </div>
          
          {/* To Token Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-12" height="h-4" />
              <SkeletonBar width="w-20" height="h-3" />
            </div>
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <SkeletonBar width="w-28" height="h-8" className="mb-2" />
                  <SkeletonBar width="w-20" height="h-3" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3 mb-2">
                    <SkeletonBar width="w-6" height="h-6" className="rounded-full" />
                    <div>
                      <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                      <SkeletonBar width="w-16" height="h-3" />
                    </div>
                    <SkeletonBar width="w-4" height="h-4" />
                  </div>
                  <SkeletonBar width="w-20" height="h-3" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Rate Info */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-6">
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-20" height="h-4" />
              <SkeletonBar width="w-16" height="h-4" />
            </div>
          </div>
          
          {/* Swap Button */}
          <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
        </SimpleCard>
      </motion.div>

      {/*  TNG Faucet Card */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <SimpleCard className="p-4 border border-white/10 bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
              <div>
                <SkeletonBar width="w-20" height="h-4" className="mb-1" />
                <SkeletonBar width="w-32" height="h-3" />
              </div>
            </div>
            <SkeletonBar width="w-24" height="h-10" className="rounded-lg" />
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Market Info */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <SimpleCard className="p-4 border border-white/10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBar width="w-20" height="h-4" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <SkeletonBar width="w-12" height="h-3" className="mb-1 mx-auto" />
                  <SkeletonBar width="w-16" height="h-5" className="mb-1 mx-auto" />
                  <SkeletonBar width="w-10" height="h-3" className="mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Recent Activity */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <SkeletonBar width="w-28" height="h-5" />
          <SkeletonBar width="w-16" height="h-3" />
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
                    <div>
                      <SkeletonBar width="w-20" height="h-4" className="mb-1" />
                      <SkeletonBar width="w-16" height="h-3" />
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

    </div>
  </PageLayout>
)

