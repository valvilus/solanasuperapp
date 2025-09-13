/**
 * Premium NFT Portfolio Component - Wallet-style Portfolio Display
 * Solana SuperApp - Premium Design System
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import { formatTokenBalance, formatUSDValue, formatPercentageChange } from '@/lib/formatters'
import { usePrices } from '@/hooks/usePrices'
import { useOnchainOperations } from '@/hooks/useOnchainOperations'
import { 
  Eye, 
  EyeOff, 
  TrendingUp,
  TrendingDown,
  Coins,
  ImageIcon,
  Ticket,
  Gift,
  Trophy,
  Diamond,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Activity,
  Layers
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import type { NFTPortfolioSummary as PortfolioSummary } from '@/features/nft/types/enhanced-nft.types'

interface PremiumNFTPortfolioProps {
  portfolioSummary: PortfolioSummary | null
  isVisible: boolean
  showDetails: boolean
  isRefreshing?: boolean
  onToggleVisibility: () => void
  onToggleDetails: () => void
  className?: string
}

export function PremiumNFTPortfolio({
  portfolioSummary,
  isVisible,
  showDetails,
  isRefreshing = false,
  onToggleVisibility,
  onToggleDetails,
  className = ''
}: PremiumNFTPortfolioProps) {
  const { getPrices } = usePrices()
  const { getTNGBalance } = useOnchainOperations()
  
  const [prices, setPrices] = useState<Record<string, any>>({})
  const [tngBalance, setTngBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Load pricing data and TNG balance
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [priceData, tngBalanceData] = await Promise.all([
          getPrices(),
          getTNGBalance()
        ])
        
        if (isMounted) {
          setPrices(priceData)
          setTngBalance(tngBalanceData)
        }
      } catch (error) {
        console.error('Failed to load portfolio data:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleVisibility = () => {
    hapticFeedback.impact('light')
    onToggleVisibility()
  }

  const handleToggleDetails = () => {
    hapticFeedback.impact('light')
    onToggleDetails()
  }

  if (isLoading || isRefreshing || !portfolioSummary) {
    return (
      <SimpleCard className={`p-6 border border-white/10 animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-32 h-4 bg-gray-700 rounded" />
              <div className="w-24 h-3 bg-gray-700 rounded" />
            </div>
            <div className="w-10 h-10 bg-gray-700 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="w-40 h-8 bg-gray-700 rounded" />
            <div className="w-28 h-4 bg-gray-700 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-700/20 rounded-lg">
              <div className="w-16 h-4 bg-gray-700 rounded mb-2" />
              <div className="w-12 h-3 bg-gray-700 rounded" />
            </div>
            <div className="p-3 bg-gray-700/20 rounded-lg">
              <div className="w-16 h-4 bg-gray-700 rounded mb-2" />
              <div className="w-12 h-3 bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </SimpleCard>
    )
  }

  const typeIcons = {
    tickets: Ticket,
    coupons: Gift,
    badges: Trophy,
    collectibles: Diamond,
    certificates: FileText
  }

  const typeColors = {
    tickets: 'text-purple-400',
    coupons: 'text-green-400',
    badges: 'text-yellow-400',
    collectibles: 'text-blue-400',
    certificates: 'text-orange-400'
  }

  const typeLabels = {
    tickets: 'Билеты',
    coupons: 'Купоны',
    badges: 'Значки',
    collectibles: 'Коллекционные',
    certificates: 'Сертификаты'
  }

  // Get USD rate and percentage change from prices
  const solPrice = (prices as any).SOL || { price: 211.34, changePercent24h: 0 }
  const tngPrice = (prices as any).TNG || { price: 0.001857, changePercent24h: 0 }
  
  const totalValueUSD = ((portfolioSummary as any).totalValueSOL || portfolioSummary.totalValue || 0) * solPrice.price + tngBalance * tngPrice.price
  const usdChangePercent = (portfolioSummary as any).usdChange24hPercent || solPrice.changePercent24h || 0
  const isPositiveChange = usdChangePercent > 0

  return (
    <motion.div
      className={`${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SimpleCard className="p-6 border border-white/10 relative overflow-hidden">
        {/* Gradient background - matching wallet style */}
        <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-solana-green/5 to-transparent" />
        
        <div className="relative z-10">
          {/* Header with visibility toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-400">NFT Портфель</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Цифровые активы на Solana
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleVisibility}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              {isVisible ? 
                <Eye className="w-4 h-4 text-gray-400" /> : 
                <EyeOff className="w-4 h-4 text-gray-400" />
              }
            </motion.button>
          </div>

          {/* Main balance display - more compact */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  {isVisible ? portfolioSummary.totalNFTs : '••••'}
                </span>
                <span className="text-sm text-gray-400">NFT</span>
                <span className="text-2xl font-bold text-white">
                  ${isVisible ? formatUSDValue(totalValueUSD).replace('$', '') : '••••••'}
                </span>
                {usdChangePercent !== 0 && (
                  <Badge className={`text-xs ${
                    isPositiveChange 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {isPositiveChange ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {isVisible ? formatPercentageChange(usdChangePercent) : '••••'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Token balances */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <TokenLogo token="SOL" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">
                    {isVisible ? formatTokenBalance((portfolioSummary as any).totalValueSOL || portfolioSummary.totalValue || 0, 'SOL', 'visual') : '••••'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {isVisible ? formatUSDValue(((portfolioSummary as any).totalValueSOL || portfolioSummary.totalValue || 0) * solPrice.price) : '$••••'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <TokenLogo token="TNG" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">
                    {isVisible ? formatTokenBalance(tngBalance, 'TNG', 'visual') : '••••'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {isVisible ? formatUSDValue(tngBalance * tngPrice.price) : '$••••'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* NFT Type Breakdown - Always Visible */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-solana-purple" />
                Типы NFT
              </h4>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleDetails}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {showDetails ? 
                  <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries((portfolioSummary as any).breakdown || {}).slice(0, 4).map(([type, count]) => {
                const IconComponent = typeIcons[type as keyof typeof typeIcons]
                const color = typeColors[type as keyof typeof typeColors]
                const label = typeLabels[type as keyof typeof typeLabels]
                
                if (!IconComponent) return null
                
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                  >
                    <IconComponent className={`w-4 h-4 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{label}</p>
                      <p className="text-sm font-medium text-white">
                        {isVisible ? (count as any) : '••'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Extended Details */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-white/10"
              >
                <div className="grid grid-cols-3 gap-3 text-center min-w-0">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 min-w-0">
                    <Zap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 truncate">Активные</p>
                    <p className="text-sm font-semibold text-white">
                      {isVisible ? (portfolioSummary as any).breakdown?.active || 0 : '••'}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 min-w-0">
                    <Diamond className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 truncate">Редкие</p>
                    <p className="text-sm font-semibold text-white">
                      {isVisible ? (portfolioSummary as any).breakdown?.rare || 0 : '••'}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 min-w-0">
                    <Activity className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 truncate">Активно</p>
                    <p className="text-sm font-semibold text-white">
                      {isVisible ? (portfolioSummary as any).recentActivity?.used || 0 : '••'}
                    </p>
                  </div>
                </div>

                {/* Recent Activity Summary */}
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-solana-purple/5 to-solana-green/5 border border-white/5">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Активность за месяц
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Создано:</span>
                    <span className="text-white font-medium">
                      {isVisible ? (portfolioSummary as any).recentActivity?.created || 0 : '••'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Продано:</span>
                    <span className="text-white font-medium">
                      {isVisible ? (portfolioSummary as any).recentActivity?.traded || 0 : '••'}
                    </span>
                  </div>
                </div>

                {/* Top Collections Section */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-medium text-white">Топ коллекции</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {/* Mock top collections data */}
                    {[
                      { name: 'Solana Apes', floorPrice: '3.2 SOL', change: '+15.8%', positive: true },
                      { name: 'Crypto Punks SOL', floorPrice: '2.8 SOL', change: '-8.4%', positive: false },
                      { name: 'Gaming Heroes', floorPrice: '2.1 SOL', change: '+22.3%', positive: true }
                    ].map((collection, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs">
                            
                          </div>
                          <span className="text-xs text-white font-medium truncate">
                            {collection.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-300">{collection.floorPrice}</div>
                          <div className={`text-xs ${collection.positive ? 'text-green-400' : 'text-red-400'}`}>
                            {collection.change}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SimpleCard>
    </motion.div>
  )
}
