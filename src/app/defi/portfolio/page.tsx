'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import { PortfolioPageSkeleton } from '@/components/defi/DeFiSkeletons'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Minus,
  Share2,
  Download,
  Settings,
  Info,
  AlertTriangle
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useStaking } from '@/hooks/useStaking'
import { useFarming } from '@/hooks/useFarming'
import { useLending } from '@/hooks/useLending'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useHistory } from '@/hooks/useHistory'
import { useFarmingRealTimePrice } from '@/hooks/useFarmingRealTimePrice'

interface PortfolioAsset {
  token: string
  icon: string
  balance: number
  value: number
  allocation: number
  apy: number
  pnl: number
  pnlPercent: number
  protocol: string
  type: 'staking' | 'farming' | 'lending' | 'native'
  risk: 'low' | 'medium' | 'high'
}

interface PortfolioSummary {
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  totalYield: number
  totalAssets: number
  avgAPY: number
  bestPerformer: string
  worstPerformer: string
}

//  УБРАНО: Заменено на реальные данные из realAssets

//  УБРАНО: summary теперь создается динамически в компоненте

export default function PortfolioPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const { apiCall } = useCompatibleAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [selectedView, setSelectedView] = useState<'value' | 'allocation' | 'pnl'>('value')
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'apy' | 'allocation'>('value')
  
  //  Реальные балансы и позиции
  const solBalance = useTokenBalance('SOL', { cacheTime: 30000, autoRefresh: true })
  const tngBalance = useTokenBalance('TNG', { cacheTime: 30000, autoRefresh: true })
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 30000, autoRefresh: true })
  
  // Данные из других DeFi сервисов
  const stakingData = useStaking()
  const farmingData = useFarming()
  const historyData = useHistory({ limit: 5 }) // Последние 5 транзакций
  const priceData = useFarmingRealTimePrice() // Реальные цены токенов
  const lendingData = useLending()

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

  const handleSharePortfolio = () => {
    hapticFeedback.notification('success')
    
    // Создаем реальные данные для поделиться
    const shareText = `Мой DeFi портфель в TNG SuperApp:
 Общая стоимость: $${summary.totalValue.toFixed(2)}
 P&L: ${summary.totalPnLPercent >= 0 ? '+' : ''}${summary.totalPnLPercent.toFixed(1)}%
 Средний APY: ${summary.avgAPY.toFixed(1)}%
 Активов: ${summary.totalAssets}

Присоединяйтесь к DeFi революции!`

    if (navigator.share) {
      navigator.share({
        title: 'Мой DeFi портфель',
        text: shareText,
        url: window.location.href
      }).catch(() => {
        navigator.clipboard.writeText(shareText)
        alert('Данные портфеля скопированы!')
      })
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Данные портфеля скопированы!')
    }
  }

  const handleExportPortfolio = () => {
    hapticFeedback.notification('success')
    
    // Создаем реальный CSV экспорт
    const csvHeaders = ['Актив', 'Баланс', 'Стоимость USD', 'Доля %', 'APY %', 'P&L USD', 'Протокол', 'Тип', 'Риск']
    const csvRows = sortedAssets.map(asset => [
      asset.token,
      asset.balance.toFixed(6),
      asset.value.toFixed(2),
      asset.allocation.toFixed(1),
      asset.apy.toFixed(1),
      asset.pnl.toFixed(2),
      asset.protocol,
      asset.type,
      asset.risk
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    // Скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `tng-portfolio-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  //  Создаем реальные активы портфеля
  const realAssets: PortfolioAsset[] = []

  // Native SOL
  if ((solBalance.balance || 0) > 0) {
    const solPrice = priceData.prices?.SOL || 0 // Только реальная цена из CoinGecko
    realAssets.push({
      token: 'SOL',
      icon: '',
      balance: solBalance.balance || 0,
      value: (solBalance.balance || 0) * solPrice,
      allocation: 0, // Will be calculated below
      apy: 0,
      pnl: 0, // TODO: Calculate from transaction history
      pnlPercent: 0,
      protocol: 'Native',
      type: 'native',
      risk: 'medium'
    })
  }

  // TNG tokens
  if ((tngBalance.balance || 0) > 0) {
    const tngPrice = priceData.prices?.TNG || 0 // Только реальная цена из API
    realAssets.push({
      token: 'TNG',
      icon: '',
      balance: tngBalance.balance || 0,
      value: (tngBalance.balance || 0) * tngPrice,
      allocation: 0,
      apy: 0,
      pnl: 0,
      pnlPercent: 0,
      protocol: 'TNG SuperApp',
      type: 'native',
      risk: 'high'
    })
  }

  // USDC
  if ((usdcBalance.balance || 0) > 0) {
    realAssets.push({
      token: 'USDC',
      icon: '',
      balance: usdcBalance.balance || 0,
      value: usdcBalance.balance || 0, // 1:1 with USD
      allocation: 0,
      apy: 0,
      pnl: 0,
      pnlPercent: 0,
      protocol: 'Native',
      type: 'native',
      risk: 'low'
    })
  }

  // Добавляем staking позиции
  if ((stakingData as any).data?.summary?.totalStaked && (stakingData as any).data.summary.totalStaked > 0) {
    const tngPrice = priceData.prices?.TNG || 0
    const stakingRewards = (stakingData as any).data.summary.totalRewards || 0
    realAssets.push({
      token: 'TNG Staked',
      icon: '',
      balance: (stakingData as any).data.summary.totalStaked,
      value: (stakingData as any).data.summary.totalStaked * tngPrice,
      allocation: 0,
      apy: stakingData.data?.pools?.[0]?.apy || 0, // Реальный APY из staking данных
      pnl: stakingRewards * tngPrice,
      pnlPercent: stakingRewards && stakingData.data?.summary?.totalStaked ? (stakingRewards / parseFloat(stakingData.data.summary.totalStaked.toString())) * 100 : 0,
      protocol: 'TNG Staking',
      type: 'staking',
      risk: 'low'
    })
  }

  // Добавляем farming позиции
  if (farmingData.data?.summary?.totalValue && farmingData.data.summary.totalValue > 0) {
    realAssets.push({
      token: 'LP Positions',
      icon: '',
      balance: farmingData.data.summary.activePositions || 0,
      value: farmingData.data.summary.totalValue || 0,
      allocation: 0,
      apy: farmingData.data?.pools?.[0]?.apy || 0, // Реальный APY из farming данных
      pnl: farmingData.data.summary.totalRewards || 0,
      pnlPercent: farmingData.data?.summary?.totalRewards ? (parseFloat(farmingData.data.summary.totalRewards.toString()) / parseFloat(farmingData.data.summary.totalValue.toString())) * 100 : 0,
      protocol: 'TNG Farming',
      type: 'farming',
      risk: 'medium'
    })
  }

  // Добавляем lending позиции (нетто)
  if (lendingData?.data?.pools && lendingData.data.pools.length > 0) {
    const getPriceForAsset = (asset: string): number => {
      if (asset === 'SOL') return priceData.prices?.SOL || 0
      if (asset === 'USDC') return 1
      if (asset === 'TNG') return priceData.prices?.TNG || 0
      return 0
    }

    const suppliedUSD = lendingData.data.pools.reduce((sum, pool) => {
      return sum + (pool.userSupplied || 0) * getPriceForAsset(pool.asset)
    }, 0)

    const borrowedUSD = lendingData.data.pools.reduce((sum, pool) => {
      return sum + (pool.userBorrowed || 0) * getPriceForAsset(pool.asset)
    }, 0)

    const netUSD = Math.max(0, suppliedUSD - borrowedUSD)
    const avgSupplyAPY = (() => {
      const userPools = lendingData.data.pools.filter(p => (p.userSupplied || 0) > 0)
      if (userPools.length === 0) return lendingData.data.summary?.netAPY || 0
      return userPools.reduce((s, p) => s + (p.supplyAPY || 0), 0) / userPools.length
    })()

    if (netUSD > 0) {
      realAssets.push({
        token: 'Lending',
        icon: '',
        balance: netUSD,
        value: netUSD,
        allocation: 0,
        apy: lendingData.data.summary?.netAPY || avgSupplyAPY || 0,
        pnl: 0,
        pnlPercent: 0,
        protocol: 'TNG Lending',
        type: 'lending',
        risk: (lendingData.data.summary?.healthFactor || 3) >= 2 ? 'medium' : 'high'
      })
    }
  }

  //  Реальная сводка портфеля
  const totalValue = realAssets.reduce((sum, asset) => sum + asset.value, 0)
  
  // Рассчитываем allocation для каждого актива
  realAssets.forEach(asset => {
    asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0
  })

  const summary: PortfolioSummary = {
    totalValue: totalValue,
    totalPnL: realAssets.reduce((sum, asset) => sum + asset.pnl, 0),
    totalPnLPercent: totalValue > 0 ? (realAssets.reduce((sum, asset) => sum + asset.pnl, 0) / totalValue) * 100 : 0,
    totalYield: realAssets.reduce((sum, asset) => sum + (asset.value * asset.apy / 100), 0),
    totalAssets: realAssets.length,
    avgAPY: realAssets.length > 0 ? realAssets.reduce((sum, asset) => sum + asset.apy, 0) / realAssets.length : 0,
    bestPerformer: realAssets.length > 0 ? realAssets.reduce((best, asset) => asset.pnlPercent > best.pnlPercent ? asset : best, realAssets[0]).token : 'N/A',
    worstPerformer: realAssets.length > 0 ? realAssets.reduce((worst, asset) => asset.pnlPercent < worst.pnlPercent ? asset : worst, realAssets[0]).token : 'N/A'
  }

  const sortedAssets = [...realAssets].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.value - a.value
      case 'pnl':
        return b.pnl - a.pnl
      case 'apy':
        return b.apy - a.apy
      case 'allocation':
        return b.allocation - a.allocation
      default:
        return 0
    }
  })

  const formatCurrency = (value: number, hideValue: boolean = false) => {
    if (hideValue) return '$••••'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getRiskBadge = (risk: string) => {
    const colors = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    const labels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }
    return { color: colors[risk], label: labels[risk] }
  }

  const getTypeColor = (type: string) => {
    const colors = {
      native: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      staking: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      farming: 'bg-green-500/20 text-green-400 border-green-500/30',
      lending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
    const labels = {
      native: 'Нативный',
      staking: 'Стейкинг',
      farming: 'Фарминг',
      lending: 'Кредитование'
    }
    return { color: colors[type], label: labels[type] }
  }

  const LoadingFallback = () => <PortfolioPageSkeleton />

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {isLoading ? (
        <LoadingFallback />
      ) : (
        <PageLayout showBottomNav={true}>
          <div className="space-y-5 pb-safe">
            
            {/* Header */}
            <motion.div
              className="px-5 pt-4 pb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleBack}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                  </motion.button>
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      TNG <span className="text-indigo-400">Портфель</span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Анализ активов и позиций на devnet</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {isBalanceVisible ? 
                      <Eye className="w-4 h-4 text-gray-400" /> : 
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    }
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSharePortfolio}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-gray-400" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleExportPortfolio}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </motion.button>
                </div>
              </div>

              <motion.div
                className="flex items-center gap-4 text-xs text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  <span>{summary.totalAssets} активов</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span className={summary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercent(summary.totalPnLPercent)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>APY: {summary.avgAPY}%</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Portfolio Summary */}
            <motion.div
              className="px-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
                <div className="flex items-center gap-2 mb-6">
                  <Wallet className="w-6 h-6 text-indigo-400" />
                  <h3 className="text-white font-semibold">Обзор портфеля</h3>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(summary.totalValue, !isBalanceVisible)}
                    </p>
                    <p className="text-sm text-gray-400">Общая стоимость</p>
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${summary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {isBalanceVisible ? formatCurrency(summary.totalPnL) : '$••••'}
                    </p>
                    <p className="text-sm text-gray-400">Прибыль/Убыток</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{summary.avgAPY}%</p>
                    <p className="text-xs text-gray-400">Средний APY</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {isBalanceVisible ? formatCurrency(summary.totalYield) : '$••••'}
                    </p>
                    <p className="text-xs text-gray-400">Доходность</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">{summary.bestPerformer}</p>
                    <p className="text-xs text-gray-400">Лучший актив</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">{summary.worstPerformer}</p>
                    <p className="text-xs text-gray-400">Худший актив</p>
                  </div>
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
                  <h4 className="text-white font-semibold">Распределение активов</h4>
                  <PieChart className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-3">
                  {sortedAssets.map((asset, index) => (
                    <div key={asset.token} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <span className="text-lg">{asset.icon}</span>
                        </div>
                        <div>
                          <h5 className="text-white font-medium">{asset.token}</h5>
                          <p className="text-xs text-gray-400">{asset.protocol}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-white font-medium">{asset.allocation.toFixed(1)}%</p>
                        <div className="w-16 bg-gray-800 rounded-full h-1 mt-1">
                          <motion.div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${asset.allocation}%` }}
                            transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
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
                <h3 className="text-lg font-bold text-white">Мои активы</h3>
                <div className="flex bg-gray-900/50 rounded-lg p-1">
                  {[
                    { id: 'value', label: 'Стоимость' },
                    { id: 'pnl', label: 'P&L' },
                    { id: 'apy', label: 'APY' },
                    { id: 'allocation', label: 'Доля' }
                  ].map((sort) => (
                    <button
                      key={sort.id}
                      onClick={() => {
                        setSortBy(sort.id as any)
                        hapticFeedback.impact('light')
                      }}
                      className={`px-3 py-1 text-xs rounded transition-all ${
                        sortBy === sort.id
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Assets List */}
            <div className="px-5">
              <div className="space-y-3">
                {sortedAssets.map((asset, index) => {
                  const riskBadge = getRiskBadge(asset.risk)
                  const typeColor = getTypeColor(asset.type)
                  
                  return (
                    <motion.div
                      key={asset.token}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                    >
                      <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                              <span className="text-2xl">{asset.icon}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-semibold">{asset.token}</h4>
                                <Badge className={`${typeColor.color} text-xs`}>
                                  {typeColor.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400">{asset.protocol}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">
                              {isBalanceVisible ? formatCurrency(asset.value) : '$••••'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {isBalanceVisible ? `${asset.balance.toFixed(4)} ${asset.token}` : '••••'}
                            </p>
                          </div>
                        </div>

                        {/* Asset Details */}
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400">Доля</p>
                            <p className="text-white font-medium">{asset.allocation.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-400">APY</p>
                            <p className="text-green-400 font-medium">
                              {asset.apy > 0 ? `${asset.apy}%` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">P&L</p>
                            <p className={`font-medium ${asset.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {isBalanceVisible ? formatCurrency(asset.pnl) : '$••••'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">P&L %</p>
                            <p className={`font-medium ${asset.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercent(asset.pnlPercent)}
                            </p>
                          </div>
                        </div>

                        {/* Risk and Action Bar */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <Badge className={`${riskBadge.color} text-xs`}>
                              {riskBadge.label} риск
                            </Badge>
                            {asset.apy > 15 && (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                                Высокий доход
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-white" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                            >
                              <Minus className="w-3 h-3 text-white" />
                            </motion.button>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Recent Transactions History */}
            <motion.div
              className="px-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-white font-semibold">Последние операции</h4>
                  </div>
                  <SimpleButton
                    size="sm"
                    onClick={() => {
                      hapticFeedback.impact('light')
                      router.push('/defi/history')
                    }}
                    className="text-xs"
                  >
                    Все операции
                  </SimpleButton>
                </div>

                {historyData.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-700 rounded w-24 mb-1"></div>
                          <div className="h-2 bg-gray-800 rounded w-16"></div>
                        </div>
                        <div className="text-right">
                          <div className="h-3 bg-gray-700 rounded w-12 mb-1"></div>
                          <div className="h-2 bg-gray-800 rounded w-8"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : historyData.data?.transactions?.length ? (
                  <div className="space-y-3">
                    {historyData.data.transactions.slice(0, 5).map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => {
                          hapticFeedback.impact('light')
                          window.open(tx.explorerUrl, '_blank')
                        }}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.type === 'swap' ? 'bg-blue-500/20' :
                          tx.type === 'stake' || tx.type === 'unstake' ? 'bg-purple-500/20' :
                          tx.type === 'farm_add' || tx.type === 'farm_remove' ? 'bg-green-500/20' :
                          'bg-gray-500/20'
                        }`}>
                          {tx.type === 'swap' && ''}
                          {(tx.type === 'stake' || tx.type === 'unstake') && ''}
                          {(tx.type === 'farm_add' || tx.type === 'farm_remove') && ''}
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{tx.details.operation}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(tx.timestamp).toLocaleDateString()} • 
                            <span className={`ml-1 ${
                              tx.status === 'confirmed' ? 'text-green-400' :
                              tx.status === 'pending' ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {tx.status === 'confirmed' ? 'Завершена' :
                               tx.status === 'pending' ? 'В процессе' : 'Ошибка'}
                            </span>
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {tx.type === 'swap' ? 'Обмен' :
                             tx.type === 'stake' ? 'Стейк' :
                             tx.type === 'unstake' ? 'Анстейк' :
                             tx.type === 'farm_add' ? 'Добавить LP' :
                             tx.type === 'farm_remove' ? 'Убрать LP' : tx.type}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Пока нет операций</p>
                    <p className="text-gray-500 text-xs">Начните инвестировать в DeFi!</p>
                  </div>
                )}
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
                  <Info className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-semibold">Рекомендации портфеля</h4>
                </div>

                <div className="space-y-3">
                  {/* Диверсификация */}
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      summary.totalAssets >= 3 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-sm text-white font-medium">
                        {summary.totalAssets >= 3 ? 'Хорошая диверсификация' : 'Низкая диверсификация'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {summary.totalAssets >= 3 
                          ? `Ваш портфель распределен между ${summary.totalAssets} активами в разных протоколах`
                          : `У вас только ${summary.totalAssets} актива. Рассмотрите диверсификацию`
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Концентрация рисков */}
                  {sortedAssets.length > 0 && (
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        sortedAssets[0].allocation > 70 ? 'bg-red-500' : 
                        sortedAssets[0].allocation > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {sortedAssets[0].allocation > 70 ? 'Высокий риск концентрации' :
                           sortedAssets[0].allocation > 50 ? 'Средний риск концентрации' : 'Низкий риск концентрации'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sortedAssets[0].allocation.toFixed(1)}% портфеля в {sortedAssets[0].token}
                          {sortedAssets[0].allocation > 50 ? ' - рассмотрите диверсификацию' : ' - хорошее распределение'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* APY оптимизация */}
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      summary.avgAPY > 15 ? 'bg-green-500' : 
                      summary.avgAPY > 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm text-white font-medium">
                        {summary.avgAPY > 15 ? 'Отличная доходность' :
                         summary.avgAPY > 5 ? 'Средняя доходность' : 'Низкая доходность'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Средний APY: {summary.avgAPY.toFixed(1)}%
                        {summary.avgAPY < 10 ? ' - рассмотрите пулы с более высоким APY' : ' - отличные показатели!'}
                      </p>
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>

          </div>
        </PageLayout>
      )}
    </ClientOnly>
  )
}


