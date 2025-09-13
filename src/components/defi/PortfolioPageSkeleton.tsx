'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'

// Компонент SkeletonBar для создания анимированных скелетонов
interface SkeletonBarProps {
  width: string
  height: string
  className?: string
}

const SkeletonBar: React.FC<SkeletonBarProps> = ({ width, height, className = '' }) => (
  <div 
    className={`${width} ${height} bg-gradient-to-r from-gray-700 to-gray-600 rounded animate-pulse ${className}`}
  />
)

// КРАСИВЫЙ Portfolio Page Skeleton
export const PortfolioPageSkeleton: React.FC = () => (
  <PageLayout showBottomNav={true}>
    <div className="space-y-5 pb-safe">
      
      {/* Header with beautiful gradient skeleton */}
      <motion.div
        className="px-5 pt-4 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <SkeletonBar width="w-8" height="h-8" className="rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
            <div>
              <SkeletonBar width="w-28" height="h-6" className="mb-1 bg-gradient-to-r from-white/20 to-white/10" />
              <SkeletonBar width="w-36" height="h-4" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBar width="w-10" height="h-10" className="rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20" />
            <SkeletonBar width="w-10" height="h-10" className="rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20" />
          </div>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <SkeletonBar width="w-3" height="h-3" className="rounded-full bg-gradient-to-r from-indigo-400/30 to-purple-400/30" />
            <SkeletonBar width="w-12" height="h-3" className="bg-gradient-to-r from-gray-300/20 to-gray-400/20" />
          </div>
          <div className="flex items-center gap-1">
            <SkeletonBar width="w-3" height="h-3" className="rounded-full bg-gradient-to-r from-green-400/30 to-emerald-400/30" />
            <SkeletonBar width="w-16" height="h-3" className="bg-gradient-to-r from-green-300/20 to-green-400/20" />
          </div>
          <div className="flex items-center gap-1">
            <SkeletonBar width="w-3" height="h-3" className="rounded-full bg-gradient-to-r from-yellow-400/30 to-orange-400/30" />
            <SkeletonBar width="w-14" height="h-3" className="bg-gradient-to-r from-yellow-300/20 to-yellow-400/20" />
          </div>
        </div>
      </motion.div>

      {/* Portfolio Summary Card - красивый главный блок */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
          <div className="flex items-center gap-2 mb-6">
            <SkeletonBar width="w-6" height="h-6" className="rounded-full bg-gradient-to-r from-indigo-400/30 to-purple-400/30" />
            <SkeletonBar width="w-32" height="h-5" className="bg-gradient-to-r from-white/30 to-white/20" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <SkeletonBar width="w-40" height="h-8" className="mb-2 bg-gradient-to-r from-white/40 to-white/20 animate-pulse" />
              <SkeletonBar width="w-24" height="h-4" className="bg-gradient-to-r from-gray-400/30 to-gray-500/20" />
            </div>
            <div>
              <SkeletonBar width="w-36" height="h-8" className="mb-2 bg-gradient-to-r from-green-400/40 to-emerald-400/20 animate-pulse" />
              <SkeletonBar width="w-20" height="h-4" className="bg-gradient-to-r from-gray-400/30 to-gray-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <SkeletonBar width="w-12" height="h-5" className={`mb-1 bg-gradient-to-r ${
                  i === 1 ? 'from-blue-400/30 to-indigo-400/30' :
                  i === 2 ? 'from-green-400/30 to-emerald-400/30' :
                  i === 3 ? 'from-purple-400/30 to-pink-400/30' :
                  'from-yellow-400/30 to-orange-400/30'
                } animate-pulse`} />
                <SkeletonBar width="w-16" height="h-3" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20 mx-auto" />
              </div>
            ))}
          </div>
        </SimpleCard>
      </motion.div>

      {/* Allocation Chart */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <SimpleCard className="p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBar width="w-40" height="h-5" className="bg-gradient-to-r from-white/30 to-white/20" />
            <SkeletonBar width="w-5" height="h-5" className="rounded bg-gradient-to-r from-gray-400/30 to-gray-500/30" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBar width="w-8" height="h-8" className={`rounded-full bg-gradient-to-r ${
                    i === 1 ? 'from-indigo-500/30 to-purple-500/30' :
                    i === 2 ? 'from-green-500/30 to-emerald-500/30' :
                    i === 3 ? 'from-blue-500/30 to-cyan-500/30' :
                    'from-yellow-500/30 to-orange-500/30'
                  } animate-pulse`} />
                  <div>
                    <SkeletonBar width="w-16" height="h-4" className="mb-1 bg-gradient-to-r from-white/30 to-white/20" />
                    <SkeletonBar width="w-20" height="h-3" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20" />
                  </div>
                </div>
                
                <div className="text-right">
                  <SkeletonBar width="w-12" height="h-4" className="mb-1 bg-gradient-to-r from-white/30 to-white/20" />
                  <div className="w-16 bg-gray-800 rounded-full h-1 mt-1">
                    <motion.div
                      className={`bg-gradient-to-r ${
                        i === 1 ? 'from-indigo-500 to-purple-500' :
                        i === 2 ? 'from-green-500 to-emerald-500' :
                        i === 3 ? 'from-blue-500 to-cyan-500' :
                        'from-yellow-500 to-orange-500'
                      } h-1 rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.random() * 70 + 10}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SimpleCard>
      </motion.div>

      {/* Sort Controls */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <SkeletonBar width="w-24" height="h-6" className="bg-gradient-to-r from-white/30 to-white/20" />
          <div className="flex bg-gray-900/50 rounded-lg p-1 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBar key={i} width="w-16" height="h-7" className="rounded bg-gradient-to-r from-white/10 to-white/5" />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Assets List */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkeletonBar width="w-12" height="h-12" className={`rounded-full bg-gradient-to-r ${
                      i === 1 ? 'from-indigo-500/30 to-purple-500/30' :
                      i === 2 ? 'from-green-500/30 to-emerald-500/30' :
                      i === 3 ? 'from-blue-500/30 to-cyan-500/30' :
                      i === 4 ? 'from-yellow-500/30 to-orange-500/30' :
                      'from-pink-500/30 to-red-500/30'
                    } animate-pulse`} />
                    <div>
                      <SkeletonBar width="w-20" height="h-5" className="mb-2 bg-gradient-to-r from-white/30 to-white/20" />
                      <SkeletonBar width="w-24" height="h-3" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20" />
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <SkeletonBar width="w-24" height="h-5" className="mb-2 bg-gradient-to-r from-white/30 to-white/20" />
                    <div className="flex items-center gap-2 justify-end">
                      <SkeletonBar width="w-12" height="h-3" className="bg-gradient-to-r from-green-400/30 to-emerald-400/30" />
                      <SkeletonBar width="w-8" height="h-3" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20" />
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <SimpleCard className="p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SkeletonBar width="w-5" height="h-5" className="rounded bg-gradient-to-r from-indigo-400/30 to-purple-400/30" />
              <SkeletonBar width="w-32" height="h-5" className="bg-gradient-to-r from-white/30 to-white/20" />
            </div>
            <SkeletonBar width="w-20" height="h-6" className="rounded bg-gradient-to-r from-white/10 to-white/5" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <SkeletonBar width="w-8" height="h-8" className={`rounded-full bg-gradient-to-r ${
                  i === 1 ? 'from-blue-500/30 to-cyan-500/30' :
                  i === 2 ? 'from-purple-500/30 to-pink-500/30' :
                  'from-green-500/30 to-emerald-500/30'
                } animate-pulse`} />
                
                <div className="flex-1">
                  <SkeletonBar width="w-32" height="h-4" className="mb-1 bg-gradient-to-r from-white/30 to-white/20" />
                  <SkeletonBar width="w-24" height="h-3" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20" />
                </div>
                
                <div className="text-right">
                  <SkeletonBar width="w-16" height="h-6" className="rounded bg-gradient-to-r from-white/20 to-white/10" />
                </div>
              </motion.div>
            ))}
          </div>
        </SimpleCard>
      </motion.div>

      {/* Portfolio Insights */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <SimpleCard className="p-4 border border-white/10 bg-gradient-to-br from-blue-500/10 to-green-500/5">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBar width="w-5" height="h-5" className="rounded bg-gradient-to-r from-blue-400/30 to-cyan-400/30" />
            <SkeletonBar width="w-36" height="h-5" className="bg-gradient-to-r from-white/30 to-white/20" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <SkeletonBar width="w-2" height="h-2" className={`rounded-full mt-2 bg-gradient-to-r ${
                  i === 1 ? 'from-green-500/50 to-emerald-500/50' :
                  i === 2 ? 'from-yellow-500/50 to-orange-500/50' :
                  'from-blue-500/50 to-cyan-500/50'
                } animate-pulse`} />
                <div className="flex-1">
                  <SkeletonBar width="w-40" height="h-4" className="mb-1 bg-gradient-to-r from-white/30 to-white/20" />
                  <SkeletonBar width="w-56" height="h-3" className="bg-gradient-to-r from-gray-400/20 to-gray-500/20" />
                </div>
              </div>
            ))}
          </div>
        </SimpleCard>
      </motion.div>

    </div>
  </PageLayout>
)
