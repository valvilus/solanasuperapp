/**
 * Analytics Page Skeleton - Beautiful loading animation
 * Matches the actual Analytics page structure with smooth animations
 * Solana SuperApp
 */

'use client'

import { motion } from 'framer-motion'

const shimmer = {
  hidden: { opacity: 0.3 },
  visible: {
    opacity: [0.3, 0.8, 0.3],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
} as any

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
} as any

const slideUp = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
} as any

export function AnalyticsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="space-y-5 pb-safe">
        
        {/* Header Skeleton */}
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50"
          initial="hidden"
          animate="visible"
          variants={slideUp}
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-8 h-8 bg-white/10 rounded-lg"
                variants={shimmer}
              />
              <motion.div 
                className="w-32 h-6 bg-gradient-to-r from-gray-600/50 to-gray-500/50 rounded-lg"
                variants={shimmer}
              />
            </div>
            <div className="flex items-center space-x-3">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-r from-gray-600/30 to-gray-500/30 rounded-full"
                variants={shimmer}
              />
              <motion.div 
                className="w-8 h-8 bg-gradient-to-r from-gray-600/30 to-gray-500/30 rounded-full"
                variants={shimmer}
              />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="px-5 space-y-5"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          
          {/* Portfolio Overview Skeleton */}
          <motion.div 
            className="bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6"
            variants={slideUp}
          >
            <div className="flex items-center justify-between mb-6">
              <motion.div 
                className="w-40 h-7 bg-gradient-to-r from-white/20 to-white/10 rounded-lg"
                variants={shimmer}
              />
              <motion.div 
                className="w-16 h-6 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-full"
                variants={shimmer}
              />
            </div>
            
            {/* Total Value */}
            <div className="mb-6">
              <motion.div 
                className="w-24 h-5 bg-gradient-to-r from-gray-500/50 to-gray-400/50 rounded mb-2"
                variants={shimmer}
              />
              <motion.div 
                className="w-48 h-10 bg-gradient-to-r from-white/30 to-white/20 rounded-lg"
                variants={shimmer}
              />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div key={i} variants={slideUp}>
                  <motion.div 
                    className="w-20 h-4 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded mb-2"
                    variants={shimmer}
                  />
                  <motion.div 
                    className="w-16 h-6 bg-gradient-to-r from-white/25 to-white/15 rounded"
                    variants={shimmer}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Timeframe Tabs Skeleton */}
          <motion.div 
            className="flex space-x-2 p-1 bg-gray-800/30 rounded-xl border border-gray-700/30"
            variants={slideUp}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div 
                key={i}
                className={`flex-1 h-10 rounded-lg ${i === 1 ? 'bg-white/10' : 'bg-gray-700/30'}`}
                variants={shimmer}
              />
            ))}
          </motion.div>

          {/* Chart Skeleton */}
          <motion.div 
            className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6"
            variants={slideUp}
          >
            <div className="flex items-center justify-between mb-6">
              <motion.div 
                className="w-32 h-6 bg-gradient-to-r from-white/20 to-white/10 rounded-lg"
                variants={shimmer}
              />
              <motion.div 
                className="w-24 h-6 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded-lg"
                variants={shimmer}
              />
            </div>
            
            {/* Mock Chart */}
            <div className="h-64 relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-700/20 to-gray-600/20">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              
              {/* Mock chart lines */}
              <div className="absolute inset-4">
                <motion.div 
                  className="w-full h-0.5 bg-white/10 absolute top-1/4 rounded-full"
                  variants={shimmer}
                />
                <motion.div 
                  className="w-full h-0.5 bg-gradient-to-r from-green-500/30 to-emerald-500/30 absolute top-2/4 rounded-full"
                  variants={shimmer}
                />
                <motion.div 
                  className="w-full h-0.5 bg-gradient-to-r from-orange-500/30 to-red-500/30 absolute top-3/4 rounded-full"
                  variants={shimmer}
                />
              </div>
            </div>
          </motion.div>

          {/* Breakdown Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div 
                key={i}
                className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-xl border border-gray-700/30 p-5"
                variants={slideUp}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <motion.div 
                      className="w-10 h-10 bg-white/10 rounded-xl"
                      variants={shimmer}
                    />
                    <motion.div 
                      className="w-20 h-5 bg-gradient-to-r from-white/20 to-white/10 rounded"
                      variants={shimmer}
                    />
                  </div>
                  <motion.div 
                    className="w-12 h-6 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-full"
                    variants={shimmer}
                  />
                </div>
                
                <motion.div 
                  className="w-32 h-8 bg-gradient-to-r from-white/25 to-white/15 rounded-lg mb-3"
                  variants={shimmer}
                />
                
                <div className="space-y-2">
                  <motion.div 
                    className="w-full h-2 bg-gradient-to-r from-gray-600/30 to-gray-500/30 rounded-full"
                    variants={shimmer}
                  />
                  <div className="flex justify-between">
                    <motion.div 
                      className="w-16 h-4 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded"
                      variants={shimmer}
                    />
                    <motion.div 
                      className="w-12 h-4 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded"
                      variants={shimmer}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Performance & Risk Section */}
          <motion.div 
            className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6"
            variants={slideUp}
          >
            <motion.div 
              className="w-40 h-6 bg-gradient-to-r from-white/20 to-white/10 rounded-lg mb-6"
              variants={shimmer}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Performance */}
              <div>
                <motion.div 
                  className="w-24 h-5 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded mb-4"
                  variants={shimmer}
                />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <motion.div 
                        className="w-16 h-4 bg-gradient-to-r from-gray-500/30 to-gray-400/30 rounded"
                        variants={shimmer}
                      />
                      <motion.div 
                        className="w-12 h-4 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded"
                        variants={shimmer}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk */}
              <div>
                <motion.div 
                  className="w-16 h-5 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded mb-4"
                  variants={shimmer}
                />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <motion.div 
                        className="w-20 h-4 bg-gradient-to-r from-gray-500/30 to-gray-400/30 rounded"
                        variants={shimmer}
                      />
                      <motion.div 
                        className="w-8 h-4 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded"
                        variants={shimmer}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Protocols */}
              <div>
                <motion.div 
                  className="w-20 h-5 bg-gradient-to-r from-gray-500/40 to-gray-400/40 rounded mb-4"
                  variants={shimmer}
                />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <motion.div 
                        className="w-6 h-6 bg-white/10 rounded-full"
                        variants={shimmer}
                      />
                      <motion.div 
                        className="w-16 h-4 bg-gradient-to-r from-gray-500/30 to-gray-400/30 rounded"
                        variants={shimmer}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
