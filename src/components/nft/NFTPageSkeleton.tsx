/**
 * NFT Page Skeleton Component - Unified Loading State
 * Solana SuperApp - Premium Design System
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'

export function NFTPageSkeleton() {
  return (
    <div className="space-y-6 pb-safe overflow-hidden">
      {/* NFT Header Skeleton */}
      <motion.div
        className="px-5 pt-4 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4 animate-pulse">
          <div>
            <div className="w-40 h-8 bg-gray-700 rounded mb-2" />
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-700 rounded" />
              <div className="w-32 h-4 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-700 rounded-full" />
            <div className="w-9 h-9 bg-gray-700 rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* Portfolio Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="px-5"
      >
        <SimpleCard className="p-6 border border-white/10 animate-pulse">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="w-32 h-4 bg-gray-700 rounded" />
                <div className="w-24 h-3 bg-gray-700 rounded" />
              </div>
              <div className="w-10 h-10 bg-gray-700 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="w-40 h-8 bg-gray-700 rounded mx-auto" />
              <div className="w-28 h-4 bg-gray-700 rounded mx-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-700/20 rounded-lg">
                <div className="w-16 h-4 bg-gray-700 rounded mb-2 mx-auto" />
                <div className="w-12 h-3 bg-gray-700 rounded mx-auto" />
              </div>
              <div className="p-3 bg-gray-700/20 rounded-lg">
                <div className="w-16 h-4 bg-gray-700 rounded mb-2 mx-auto" />
                <div className="w-12 h-3 bg-gray-700 rounded mx-auto" />
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/* Quick Actions Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="px-5"
      >
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
              className="animate-pulse"
            >
              <SimpleCard className="p-4 text-center">
                <div className="w-7 h-7 bg-gray-700 rounded-full mx-auto mb-2" />
                <div className="w-12 h-3 bg-gray-700 rounded mx-auto" />
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tabs Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="px-5"
      >
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.03, duration: 0.3 }}
              className="flex-1 p-3 bg-gray-700/20 rounded-lg animate-pulse"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 bg-gray-700 rounded" />
                <div className="w-16 h-3 bg-gray-700 rounded" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filter Panel Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="px-5"
      >
        <SimpleCard className="p-4 border border-white/10 animate-pulse">
          <div className="space-y-4">
            <div className="w-full h-10 bg-gray-700/50 rounded-lg" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-700 rounded" />
                <div className="w-20 h-4 bg-gray-700 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-6 bg-gray-700 rounded" />
                <div className="w-8 h-6 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/* NFT Grid Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="px-5"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
              className="animate-pulse"
            >
              <SimpleCard className="aspect-[3/4] p-0 rounded-xl">
                <div className="h-full flex flex-col">
                  <div className="flex-1 bg-gray-700/50 rounded-t-xl" />
                  <div className="flex-shrink-0 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-4 bg-gray-700/50 rounded" />
                      <div className="w-6 h-6 bg-gray-700/50 rounded-lg" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-3 bg-gray-700/50 rounded" />
                      <div className="w-12 h-3 bg-gray-700/50 rounded" />
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
