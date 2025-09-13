/**
 * Точный Skeleton для страницы History
 * Полностью соответствует структуре src/app/defi/history/page.tsx
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

export const HistoryPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      
      {/*  Header */}
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
              <SkeletonBar width="w-32" height="h-6" className="mb-1" />
              <SkeletonBar width="w-24" height="h-3" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
            <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
          </div>
        </div>
      </motion.div>

      {/*  Stats Overview */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <SkeletonBar width="w-12" height="h-8" className="mb-2 mx-auto" />
              <SkeletonBar width="w-20" height="h-3" className="mx-auto" />
            </div>
            <div className="text-center">
              <SkeletonBar width="w-16" height="h-8" className="mb-2 mx-auto" />
              <SkeletonBar width="w-16" height="h-3" className="mx-auto" />
            </div>
            <div className="text-center">
              <SkeletonBar width="w-10" height="h-8" className="mb-2 mx-auto" />
              <SkeletonBar width="w-14" height="h-3" className="mx-auto" />
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Search and Filters */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <SkeletonBar width="w-4" height="h-4" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
            <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
          </div>

          {/* Type Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <SkeletonBar key={i} width="w-20" height="h-8" className="flex-shrink-0 rounded-lg" />
            ))}
          </div>

          {/* Protocol Filter */}
          <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
        </div>
      </motion.div>

      {/*  Transactions List */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkeletonBar width="w-4" height="h-4" className="rounded" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <SkeletonBar width="w-16" height="h-4" />
                        <SkeletonBar width="w-12" height="h-4" className="rounded-full" />
                      </div>
                      <SkeletonBar width="w-24" height="h-3" className="mb-1" />
                      <SkeletonBar width="w-32" height="h-3" />
                    </div>
                  </div>
                  <div className="text-right">
                    <SkeletonBar width="w-12" height="h-4" className="mb-1" />
                    <SkeletonBar width="w-16" height="h-3" />
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

