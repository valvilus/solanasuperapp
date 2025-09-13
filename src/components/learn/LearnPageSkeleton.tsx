/**
 * Learn Page Skeleton Loader - Pixel-perfect skeleton for learn page
 * Matches exact structure and dimensions of the learn page
 * Solana SuperApp - Learn Page
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { PageLayout } from '@/components/layout/PageLayout'

// Base skeleton animation - matching Main style exactly
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

// Skeleton Bar Component - identical to MainPageSkeleton
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

// Learn Header Skeleton - Welcome section with stats
export const LearnHeaderSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <SimpleCard className="p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-3">
          {/* Welcome title */}
          <SkeletonBar width="w-48" height="h-6" className="mb-2" />
          {/* Subtitle */}
          <SkeletonBar width="w-56" height="h-4" className="mb-3" />
          
          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <SkeletonBar width="w-4" height="h-4" className="rounded" />
              <SkeletonBar width="w-12" height="h-3" />
            </div>
            <div className="flex items-center gap-1">
              <SkeletonBar width="w-4" height="h-4" className="rounded" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
            <div className="flex items-center gap-1">
              <SkeletonBar width="w-4" height="h-4" className="rounded" />
              <SkeletonBar width="w-14" height="h-3" />
            </div>
          </div>
        </div>
        
        {/* Icon placeholder */}
        <div className="text-6xl opacity-15 shrink-0 select-none">
          <SkeletonBar width="w-16" height="h-16" className="rounded-lg" />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <SkeletonBar width="w-20" height="h-3" />
          <SkeletonBar width="w-8" height="h-3" />
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <SkeletonBar width="w-2/3" height="h-2" className="rounded-full" />
        </div>
      </div>
    </SimpleCard>
  </motion.div>
)

// Learn Tabs Skeleton
export const LearnTabsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1, duration: 0.4 }}
  >
    <div className="flex space-x-2 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonBar 
          key={i}
          width="w-20" 
          height="h-8" 
          className="rounded-lg" 
        />
      ))}
    </div>
  </motion.div>
)

// Course Cards Skeleton
export const CourseCardsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
  >
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
        >
          <SimpleCard className="p-4 bg-white/5 border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-3">
                {/* Course badges */}
                <div className="flex items-center gap-2 mb-2">
                  <SkeletonBar width="w-16" height="h-5" className="rounded-full" />
                  <SkeletonBar width="w-14" height="h-5" className="rounded-full" />
                </div>
                
                {/* Course title */}
                <SkeletonBar width="w-48" height="h-5" className="mb-2" />
                
                {/* Course description */}
                <SkeletonBar width="w-full" height="h-4" className="mb-3" />
                
                {/* Course stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <SkeletonBar width="w-4" height="h-4" className="rounded" />
                    <SkeletonBar width="w-12" height="h-3" />
                  </div>
                  <div className="flex items-center gap-1">
                    <SkeletonBar width="w-4" height="h-4" className="rounded" />
                    <SkeletonBar width="w-16" height="h-3" />
                  </div>
                  <div className="flex items-center gap-1">
                    <SkeletonBar width="w-4" height="h-4" className="rounded" />
                    <SkeletonBar width="w-14" height="h-3" />
                  </div>
                </div>
              </div>
              
              {/* Course icon */}
              <SkeletonBar width="w-12" height="h-12" className="rounded-lg" />
            </div>
            
            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <SkeletonBar width="w-16" height="h-3" />
                <SkeletonBar width="w-8" height="h-3" />
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <SkeletonBar width={`w-${Math.floor(Math.random() * 8) + 1}/12`} height="h-2" className="rounded-full" />
              </div>
            </div>
            
            {/* Action button */}
            <SkeletonBar width="w-24" height="h-8" className="rounded-lg" />
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Quick Actions Skeleton
export const QuickActionsSkeleton: React.FC = () => (
  <motion.div
    className="px-5"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.4 }}
  >
    <SkeletonBar width="w-32" height="h-4" className="mb-3" />
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 0.2 }}
        >
          <SimpleCard className="p-4 h-24 border border-white/5">
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <SkeletonBar width="w-5" height="h-5" className="rounded" />
                <SkeletonBar width="w-4" height="h-4" className="rounded" />
              </div>
              <div>
                <SkeletonBar width="w-16" height="h-4" className="mb-1" />
                <SkeletonBar width="w-20" height="h-3" />
              </div>
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

// Full Learn Page Skeleton - Exact match with real page structure
export const LearnPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      {/* Learn Header */}
      <LearnHeaderSkeleton />
      
      {/* Learn Tabs */}
      <LearnTabsSkeleton />
      
      {/* Course Cards */}
      <CourseCardsSkeleton />
      
      {/* Quick Actions */}
      <QuickActionsSkeleton />
    </div>
  </PageLayout>
)

export default LearnPageSkeleton
