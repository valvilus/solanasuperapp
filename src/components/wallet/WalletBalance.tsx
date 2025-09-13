/**
 * Enhanced Wallet Balance Component
 * Solana SuperApp - Wallet Page
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
// import { useLedgerOperations } from '@/hooks/useLedgerOperations' // Removed - using only on-chain
import { useOnchainOperations } from '@/hooks/useOnchainOperations'
import { usePrices } from '@/hooks/usePrices'
import { useAuth } from '../../contexts/AuthContext'
import { usePortfolioBalances } from '@/hooks/useTokenBalance'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { GlassLoader } from '@/components/ui/GlassLoader'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import { formatTokenBalance, formatUSDValue, formatPercentageChange } from '@/lib/formatters'
import { WalletBalanceSkeleton } from '@/components/wallet/WalletSkeleton'
import { 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle,
  Coins,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface WalletBalanceProps {
  className?: string
  isRefreshing?: boolean
}

export function WalletBalance({ className = '', isRefreshing = false }: WalletBalanceProps) {
  const { custodial, external, activeWallet, totalBalance } = useWallet()
  const { getSOLBalance: getOnchainSOLBalance, getTNGBalance: getOnchainTNGBalance } = useOnchainOperations()
  const { getPrices, calculatePortfolioValue } = usePrices()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  //  Используем оптимизированные хуки вместо локального состояния
  const {
    SOL,
    TNG,
    USDC,
    totalUSDValue,
    formattedTotalUSD,
    loading: portfolioLoading,
    refreshAll: refreshPortfolio
  } = usePortfolioBalances({
    cacheTime: 30 * 1000, // 30 секунд кеш
    autoRefresh: true, // Автообновление включено
    formatType: 'visual'
  })
  
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [isAddressExpanded, setIsAddressExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    totalChangePercent24h: 0,
    isPositive: true
  })

  // Get current wallet address
  const currentAddress = activeWallet === 'external' 
    ? external.address 
    : custodial.address

  // Update portfolio stats from hooks
  React.useEffect(() => {
    if (!portfolioLoading) {
      setPortfolioStats({
        totalValue: totalUSDValue,
        totalChangePercent24h: 0, // TODO: получать из analytics
        isPositive: true
      })
    }
  }, [totalUSDValue, portfolioLoading])

  // Reload data when isRefreshing changes to true
  React.useEffect(() => {
    if (isRefreshing && isAuthenticated) {
      console.log(' WalletBalance: isRefreshing=true, refreshing portfolio...')
      SOL.clearCache()
      TNG.clearCache()
      USDC.clearCache()
      refreshPortfolio()
    }
  }, [isRefreshing, isAuthenticated, SOL, TNG, USDC, refreshPortfolio])

  const toggleBalanceVisibility = () => {
    hapticFeedback.selection()
    setIsBalanceVisible(!isBalanceVisible)
  }

  const toggleAddressExpansion = () => {
    hapticFeedback.selection()
    setIsAddressExpanded(!isAddressExpanded)
  }

  const copyAddress = async () => {
    if (!currentAddress) return
    
    try {
      await navigator.clipboard.writeText(currentAddress)
      hapticFeedback.impact('light')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  const formatAddress = (address: string | null) => {
    if (!address) return 'Загрузка...'
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Use totalUSDValue from hooks instead of local calculation

  // Show skeleton when refreshing
  if (isRefreshing) {
    return <WalletBalanceSkeleton />
  }

  return (
    <motion.div
      className={`${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SimpleCard className="p-6 border border-white/10 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-solana-green/5 to-transparent" />
        
        <div className="relative">
          {/* Header with visibility toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-400">Общий баланс</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeWallet === 'external' ? 'Внешний кошелек' : 'Встроенный кошелек'}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleBalanceVisibility}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              {isBalanceVisible ? 
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
                  ${isBalanceVisible ? 
                    (portfolioLoading ? <GlassLoader size="sm" /> : formattedTotalUSD.replace('$', '')) : 
                    '••••••'}
                </span>
                {portfolioStats.totalChangePercent24h !== 0 && (
                  <Badge className={`text-xs ${
                    portfolioStats.isPositive 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {portfolioStats.isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {isBalanceVisible ? formatPercentageChange(portfolioStats.totalChangePercent24h) : '••••'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {isBalanceVisible ? '24ч' : '••••'}
              </p>
            </div>
          </div>

          {/* Token balances - horizontal layout */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* SOL Balance */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00FFA3]/20 to-[#DC1FFF]/20 flex items-center justify-center">
                  <TokenLogo token="SOL" size="sm" className="text-[#00FFA3]" />
                </div>
                <span className="text-xs font-medium text-gray-300">SOL</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">
                  {isBalanceVisible ? 
                    (SOL.loading ? <GlassLoader size="xs" /> : SOL.formattedBalance) : 
                    '••••'}
                </div>
                <div className="text-xs text-gray-400">
                  {isBalanceVisible ? 
                    (SOL.loading ? <GlassLoader size="xs" /> : SOL.formattedUSDValue) : 
                    '$••••'}
                </div>
              </div>
            </div>

            {/* TNG Balance */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
                  <TokenLogo token="TNG" size="sm" className="text-solana-green" />
                </div>
                <span className="text-xs font-medium text-gray-300">TNG (₸)</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">
                  {isBalanceVisible ? 
                    (TNG.loading ? <GlassLoader size="xs" /> : TNG.formattedBalance) : 
                    '••••'}
                </div>
                <div className="text-xs text-gray-400">
                  {isBalanceVisible ? 
                    (TNG.loading ? <GlassLoader size="xs" /> : TNG.formattedUSDValue) : 
                    '$••••'}
                </div>
              </div>
            </div>
          </div>

          {/* Wallet address */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">Адрес кошелька</p>
                <p className="text-sm text-white font-mono">
                  {formatAddress(currentAddress)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleAddressExpansion}
                  className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  disabled={!currentAddress}
                >
                  {isAddressExpanded ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={copyAddress}
                  className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  disabled={!currentAddress}
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Full address display (expandable) */}
            <AnimatePresence>
              {isAddressExpanded && currentAddress && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5 overflow-hidden"
                >
                  <p className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                    {currentAddress}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SimpleCard>
    </motion.div>
  )
}
