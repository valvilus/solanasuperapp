/**
 * Jobs Page Skeleton Loader
 * Solana SuperApp - Jobs Page
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { PageLayout } from '@/components/layout/PageLayout'

// Base skeleton animation matching Wallet style
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

// Skeleton Bar Component (same as Wallet)
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

export const JobsPageSkeleton: React.FC = () => {
  return (
    <PageLayout showBottomNav={true}>
      <div className="space-y-6 pb-safe">
        {/* Header */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <SkeletonBar width="w-32" height="h-8" className="mb-2" />
              <SkeletonBar width="w-48" height="h-4" />
            </div>
            <SkeletonBar width="w-20" height="h-10" className="rounded-lg" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <SimpleCard key={item} className="p-4 border border-white/10">
                <SkeletonBar width="w-16" height="h-4" className="mb-2" />
                <SkeletonBar width="w-8" height="h-6" />
              </SimpleCard>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-5">
          <SimpleCard className="p-4 border border-white/10">
            <div className="flex gap-3">
              <SkeletonBar width="flex-1" height="h-12" className="rounded-lg" />
              <SkeletonBar width="w-20" height="h-12" className="rounded-lg" />
            </div>
          </SimpleCard>
        </div>

        {/* Job Cards */}
        <div className="px-5">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <SimpleCard key={item} className="p-4 border border-white/10">
                <div className="flex items-start gap-4">
                  <SkeletonBar width="w-12" height="h-12" className="rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <SkeletonBar width="w-3/4" height="h-5" className="mb-2" />
                      <SkeletonBar width="w-1/2" height="h-4" />
                    </div>
                    <div className="flex gap-2">
                      <SkeletonBar width="w-16" height="h-6" className="rounded" />
                      <SkeletonBar width="w-20" height="h-6" className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <SkeletonBar width="w-24" height="h-4" />
                      <SkeletonBar width="w-20" height="h-8" className="rounded" />
                    </div>
                  </div>
                </div>
              </SimpleCard>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}