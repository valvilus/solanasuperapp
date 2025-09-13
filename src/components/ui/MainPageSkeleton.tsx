/**
 * Main Page Skeleton Loader - Pixel-perfect skeleton for home page
 * Matches exact structure and dimensions of the main page
 * Solana SuperApp - Main Page
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { PageLayout } from '@/components/layout/PageLayout'

// Base skeleton animation - matching Wallet style exactly
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

// Skeleton Bar Component - identical to WalletSkeleton
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

// Header Skeleton - Exact match: px-5 pt-4 pb-2
export const MainHeaderSkeleton: React.FC = () => (
  <motion.div
    className="px-5 pt-4 pb-2"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex items-center justify-between">
      <div>
        {/* Solana SuperApp title - text-xl font-bold */}
        <SkeletonBar width="w-44" height="h-6" className="mb-0.5" />
        {/* Web3 экосистема subtitle - text-sm mt-0.5 */}
        <SkeletonBar width="w-28" height="h-3.5" />
      </div>
      {/* Premium badge placeholder - conditional */}
      <SkeletonBar width="w-16" height="h-5" className="rounded-full" />
    </div>
  </motion.div>
)

// User Balance Card Skeleton - Exact match: SimpleCard p-5 border border-white/10
export const UserBalanceCardSkeleton: React.FC = () => (
  <SimpleCard className="p-5 border border-white/10">
    {/* User info section - flex items-center gap-3 mb-4 */}
    <div className="flex items-center gap-3 mb-4">
      {/* Avatar - w-10 h-10 ring-2 ring-solana-purple/30 */}
      <SkeletonBar width="w-10" height="h-10" className="rounded-full ring-2 ring-gray-600/30" />
      <div className="flex-1">
        {/* Greeting text - text-white font-medium text-sm */}
        <SkeletonBar width="w-32" height="h-4" className="mb-1" />
        {/* Portfolio subtitle - text-xs text-gray-400 */}
        <SkeletonBar width="w-36" height="h-3" />
      </div>
    </div>
    
    {/* Balance divider and section - border-t border-white/10 pt-4 */}
    <div className="border-t border-white/10 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Coins icon - w-5 h-5 text-solana-green */}
          <SkeletonBar width="w-5" height="h-5" className="rounded" />
          {/* Balance amount - text-2xl font-bold text-white */}
          <SkeletonBar width="w-20" height="h-8" />
          {/* SOL label - text-sm text-gray-400 font-medium */}
          <SkeletonBar width="w-8" height="h-4" />
        </div>
        <div className="text-right">
          {/* USD value - text-xs text-gray-500 */}
          <SkeletonBar width="w-20" height="h-3" className="mb-1" />
          {/* Wallet type - text-xs text-solana-cyan */}
          <SkeletonBar width="w-24" height="h-3" />
        </div>
      </div>
    </div>
  </SimpleCard>
)

// Primary Features Skeleton - Exact match: grid grid-cols-2 gap-3
export const PrimaryFeaturesSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-3">
    {[1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
      >
        {/* SimpleCard p-4 h-32 bg-gradient-to-br border border-white/10 */}
        <SimpleCard className={`p-4 h-32 bg-gradient-to-br ${i === 1 ? 'from-solana-purple/20 to-solana-purple/5' : 'from-solana-green/20 to-solana-green/5'} border border-white/10`}>
          {/* flex flex-col justify-between h-full */}
          <div className="flex flex-col justify-between h-full">
            {/* Top section: flex items-center justify-between */}
            <div className="flex items-center justify-between">
              {/* Feature icon - w-6 h-6 */}
              <SkeletonBar width="w-6" height="h-6" className="rounded" />
              {/* Arrow icon - w-4 h-4 */}
              <SkeletonBar width="w-4" height="h-4" className="rounded" />
            </div>
            {/* Bottom section */}
            <div>
              {/* Feature title - text-white font-semibold text-sm mb-1 */}
              <SkeletonBar width="w-16" height="h-4" className="mb-1" />
              {/* Feature subtitle - text-xs text-gray-400 mb-2 */}
              <SkeletonBar width="w-20" height="h-3" className="mb-2" />
              {/* Feature value - text-xs font-medium */}
              <SkeletonBar width="w-18" height="h-3" />
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    ))}
  </div>
)

// Secondary Features Skeleton - Exact match: h3 + grid grid-cols-4 gap-2
export const SecondaryFeaturesSkeleton: React.FC = () => (
  <div>
    {/* Section title - h3 text-sm font-medium text-gray-300 mb-3 "Сервисы" */}
    <SkeletonBar width="w-16" height="h-4" className="mb-3" />
    {/* Grid container - grid grid-cols-4 gap-2 */}
    <div className="grid grid-cols-4 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.05, duration: 0.2 }}
        >
          {/* SimpleCard p-3 h-18 border border-white/5 */}
          <SimpleCard className="p-3 h-18 border border-white/5">
            {/* flex flex-col items-center justify-center h-full text-center */}
            <div className="flex flex-col items-center justify-center h-full text-center">
              {/* Feature icon - w-5 h-5 mb-1.5 */}
              <SkeletonBar width="w-5" height="h-5" className="rounded mb-1.5" />
              {/* Feature title - text-xs text-white font-medium */}
              <SkeletonBar width="w-8" height="h-3" />
            </div>
          </SimpleCard>
        </motion.div>
      ))}
    </div>
  </div>
)

// Quick Action Card Skeleton - Exact match: SimpleCard p-4 border border-white/10
export const QuickActionCardSkeleton: React.FC = () => (
  <SimpleCard className="p-4 border border-white/10">
    {/* flex items-center justify-between */}
    <div className="flex items-center justify-between">
      {/* Left section - flex-1 pr-3 */}
      <div className="flex-1 pr-3">
        {/* Title - text-white font-medium text-sm mb-1 "Начать работу" */}
        <SkeletonBar width="w-24" height="h-4" className="mb-1" />
        {/* Subtitle - text-xs text-gray-400 leading-relaxed "Получите тестовые токены" */}
        <SkeletonBar width="w-36" height="h-3" />
      </div>
      {/* Button - SimpleButton gradient size="sm" flex items-center gap-2 */}
      <SkeletonBar width="w-16" height="h-8" className="rounded-lg" />
    </div>
  </SimpleCard>
)

// Full Main Page Skeleton - Exact match with real page structure
export const MainPageSkeleton: React.FC = () => (
  <>
    {/* 3D Background placeholder - matching fixed inset-0 opacity-20 */}
    <div className="fixed inset-0 opacity-20">
      <div className="w-full h-full bg-gradient-to-br from-solana-purple/5 to-solana-green/5" />
    </div>
    
    {/* PageLayout wrapper - exactly like real page */}
    <PageLayout showBottomNav={true}>
      {/* Main content container - space-y-5 pb-safe */}
      <div className="space-y-5 pb-safe">
        {/* Header Section - matching motion.div px-5 pt-4 pb-2 */}
        <MainHeaderSkeleton />

        {/* User Balance Card - matching motion.div px-5 */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <UserBalanceCardSkeleton />
        </motion.div>

        {/* Primary Features - matching motion.div px-5 */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <PrimaryFeaturesSkeleton />
        </motion.div>

        {/* Secondary Features - matching motion.div px-5 */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <SecondaryFeaturesSkeleton />
        </motion.div>

        {/* Quick Action Card - matching motion.div px-5 */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <QuickActionCardSkeleton />
        </motion.div>
      </div>
    </PageLayout>
  </>
)
