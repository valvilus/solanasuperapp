/**
 * Точный Skeleton для страницы стейкинга
 * Полностью соответствует структуре src/app/defi/staking/page.tsx
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

export const StakingPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      
      {/*  Header - Минималистичный и симметричный */}
      <motion.div
        className="px-5 pt-5 pb-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
            <div>
              <SkeletonBar width="w-32" height="h-6" className="mb-1" />
              <SkeletonBar width="w-40" height="h-3" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Smart Contract Toggle */}
            <div className="flex items-center gap-2">
              <SkeletonBar width="w-12" height="h-3" />
              <SkeletonBar width="w-11" height="h-6" className="rounded-full" />
            </div>
          </div>
        </div>

        {/* Status bar - компактная статистика */}
        <div className="grid grid-cols-3 gap-4 py-3 px-6 bg-white/5 rounded-lg border border-white/10 mx-4">
          <div className="flex items-center justify-center gap-2">
            <SkeletonBar width="w-2" height="h-2" className="rounded-full" />
            <SkeletonBar width="w-12" height="h-3" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <SkeletonBar width="w-3" height="h-3" />
            <SkeletonBar width="w-16" height="h-3" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <SkeletonBar width="w-2" height="h-2" className="rounded-full" />
            <SkeletonBar width="w-10" height="h-3" />
          </div>
        </div>
      </motion.div>

      {/*  Portfolio Overview - Главная статистика */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/10 via-transparent to-solana-green/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
              <div>
                <SkeletonBar width="w-24" height="h-5" className="mb-1" />
                <SkeletonBar width="w-20" height="h-3" />
              </div>
            </div>
            <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
          </div>

          {/*  Main Stats - Симметричная сетка */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <SkeletonBar width="w-20" height="h-8" className="mb-1 mx-auto" />
              <SkeletonBar width="w-16" height="h-3" className="mb-2 mx-auto" />
              <SkeletonBar width="w-full" height="h-1" className="rounded-full" />
            </div>
            <div className="text-center">
              <SkeletonBar width="w-16" height="h-8" className="mb-1 mx-auto" />
              <SkeletonBar width="w-14" height="h-3" className="mb-2 mx-auto" />
              <SkeletonBar width="w-full" height="h-1" className="rounded-full" />
            </div>
          </div>

          {/*  Balance Grid - Чистая симметричная раскладка */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <SkeletonBar width="w-12" height="h-5" className="mb-1 mx-auto" />
              <SkeletonBar width="w-16" height="h-3" className="mx-auto" />
            </div>
            <div className="text-center">
              <SkeletonBar width="w-10" height="h-5" className="mb-1 mx-auto" />
              <SkeletonBar width="w-18" height="h-3" className="mx-auto" />
            </div>
            <div className="text-center">
              <SkeletonBar width="w-8" height="h-5" className="mb-1 mx-auto" />
              <SkeletonBar width="w-16" height="h-3" className="mx-auto" />
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Action Center - Единая секция для действий */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/5 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
            <div>
              <SkeletonBar width="w-16" height="h-5" className="mb-1" />
              <SkeletonBar width="w-24" height="h-3" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center py-2">
              <SkeletonBar width="w-32" height="h-4" className="mb-2 mx-auto" />
              <SkeletonBar width="w-48" height="h-3" className="mx-auto" />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
              <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
              <SkeletonBar width="w-full" height="h-12" className="rounded-lg" />
            </div>
            
            <div className="flex items-center justify-center gap-4 text-xs">
              <SkeletonBar width="w-24" height="h-3" />
              <SkeletonBar width="w-1" height="h-3" />
              <SkeletonBar width="w-20" height="h-3" />
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Smart Contract Info - Компактная версия */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <SimpleCard className="p-4 bg-gradient-to-r from-solana-purple/10 to-blue-500/10 border border-solana-purple/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
              <div>
                <SkeletonBar width="w-24" height="h-4" className="mb-1" />
                <SkeletonBar width="w-20" height="h-3" />
              </div>
            </div>
            
            <div className="text-right">
              <SkeletonBar width="w-12" height="h-5" className="mb-1" />
              <SkeletonBar width="w-8" height="h-3" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <SkeletonBar width="w-full" height="h-8" className="rounded-lg" />
            <SkeletonBar width="w-full" height="h-8" className="rounded-lg" />
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Active Staking Positions */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/5 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
            <div>
              <SkeletonBar width="w-28" height="h-5" className="mb-1" />
              <SkeletonBar width="w-32" height="h-3" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
                    <div>
                      <SkeletonBar width="w-24" height="h-4" className="mb-1" />
                      <SkeletonBar width="w-16" height="h-3" />
                    </div>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <SkeletonBar width="w-16" height="h-3" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-12" height="h-4" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-8" height="h-3" className="mx-auto" />
                  </div>
                  <div className="text-center">
                    <SkeletonBar width="w-12" height="h-3" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-10" height="h-4" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-6" height="h-3" className="mx-auto" />
                  </div>
                  <div className="text-center">
                    <SkeletonBar width="w-20" height="h-3" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-8" height="h-4" className="mb-1 mx-auto" />
                    <SkeletonBar width="w-6" height="h-3" className="mx-auto" />
                  </div>
                </div>
                
                {/* Actions */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <SkeletonBar width="w-full" height="h-8" className="rounded-lg" />
                  <div className="grid grid-cols-2 gap-3">
                    <SkeletonBar width="w-full" height="h-8" className="rounded-lg" />
                    <SkeletonBar width="w-full" height="h-8" className="rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/*  Staking Pools - Красивая минималистичная секция */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
            <div>
              <SkeletonBar width="w-28" height="h-5" className="mb-1" />
              <SkeletonBar width="w-24" height="h-3" />
            </div>
          </div>
          <SkeletonBar width="w-8" height="h-8" className="rounded-full" />
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/10 hover:border-solana-purple/30 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <SkeletonBar width="w-20" height="h-4" className="mb-1" />
                          <SkeletonBar width="w-10" height="h-4" className="rounded-full" />
                        </div>
                        <SkeletonBar width="w-32" height="h-3" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <SkeletonBar width="w-8" height="h-3" className="mb-1 mx-auto" />
                        <SkeletonBar width="w-12" height="h-5" className="mx-auto" />
                      </div>
                      <div className="text-center">
                        <SkeletonBar width="w-12" height="h-3" className="mb-1 mx-auto" />
                        <SkeletonBar width="w-8" height="h-5" className="mx-auto" />
                      </div>
                      <div className="text-center">
                        <SkeletonBar width="w-6" height="h-3" className="mb-1 mx-auto" />
                        <SkeletonBar width="w-10" height="h-5" className="mx-auto" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <SkeletonBar width="w-16" height="h-8" className="rounded-lg" />
                    <SkeletonBar width="w-4" height="h-4" />
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

