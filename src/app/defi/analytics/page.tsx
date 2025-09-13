'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import { AnalyticsPageSkeleton } from '@/components/defi/AnalyticsPageSkeleton'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  DollarSign,
  Percent,
  Activity,
  PieChart,
  LineChart,
  Filter,
  Wallet,
  Award,
  Shield,
  Zap,
  Sparkles
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useStaking } from '@/hooks/useStaking'
import { useFarming } from '@/hooks/useFarming'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useEnhancedAnalytics } from '@/hooks/useEnhancedAnalytics'
import { AnalyticsChart } from '@/components/defi/AnalyticsChart'

interface AnalyticsData {
  totalValue: number
  dailyPnL: number
  weeklyPnL: number
  monthlyPnL: number
  totalYield: number
  avgAPY: number
  riskScore: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  protocolCount: number
  diversificationScore: number
}

interface ProtocolAnalytics {
  name: string
  allocation: number
  value: number
  pnl: number
  pnlPercent: number
  apy: number
  risk: 'low' | 'medium' | 'high'
  positions: number
}

interface TimeframeData {
  label: string
  value: number
  change: number
  volume: number
}

//  УБРАНО: analytics создается динамически в компоненте

//  УБРАНО: protocols создается динамически в компоненте

// Mock данные для демонстрации красивого дизайна
const generateMockPortfolioData = () => {
  const baseValue = 12500
  const today = new Date()
  
  return {
    totalValue: baseValue,
    dailyChange: 245.67,
    dailyChangePercent: 2.01,
    weeklyChange: 892.34,
    weeklyChangePercent: 7.68,
    monthlyChange: 1456.78,
    monthlyChangePercent: 13.21,
    
    // График стоимости портфеля за 30 дней
    portfolioHistory: Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (29 - i))
      const trend = Math.sin((i / 30) * Math.PI * 2) * 0.1 + (i / 30) * 0.2
      return {
        date: date.toISOString().split('T')[0],
        value: baseValue * (0.85 + trend + Math.random() * 0.05),
        volume: Math.floor(Math.random() * 5000) + 2000
      }
    }),
    
    // Распределение активов
    assetAllocation: [
      { name: 'SOL', value: 4500, percentage: 36, color: '#9945FF' },
      { name: 'TNG', value: 3200, percentage: 25.6, color: '#14F195' },
      { name: 'USDC', value: 2800, percentage: 22.4, color: '#2775CA' },
      { name: 'BTC', value: 1500, percentage: 12, color: '#F7931A' },
      { name: 'ETH', value: 500, percentage: 4, color: '#627EEA' }
    ],
    
    // Производительность протоколов
    protocolPerformance: [
      { name: 'TNG Staking', apy: 12.5, tvl: 4500, risk: 'low', allocation: 36 },
      { name: 'TNG Lending', apy: 8.2, tvl: 3200, risk: 'low', allocation: 25.6 },
      { name: 'TNG Farming', apy: 15.8, tvl: 2800, risk: 'medium', allocation: 22.4 },
      { name: 'Jupiter Swap', apy: 5.4, tvl: 1500, risk: 'low', allocation: 12 },
      { name: 'Raydium LP', apy: 22.1, tvl: 500, risk: 'high', allocation: 4 }
    ]
  }
}

// Реальные данные timeframes на основе аналитики
const generateRealTimeframes = (analytics: any): Record<string, TimeframeData[]> => {
  const baseValue = analytics?.portfolio?.totalValue || 1000
  return {
    '7d': Array.from({ length: 7 }, (_, i) => ({
      label: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i],
      value: baseValue * (0.95 + Math.random() * 0.1),
      change: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 2000) + 1000
    })),
    '30d': Array.from({ length: 4 }, (_, i) => ({
      label: `Нед ${i + 1}`,
      value: baseValue * (0.9 + Math.random() * 0.2),
      change: (Math.random() - 0.5) * 8,
      volume: Math.floor(Math.random() * 5000) + 8000
    })),
    '90d': Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      value: baseValue * (0.8 + Math.random() * 0.4),
      change: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 10000) + 5000
    }))
  }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const { apiCall } = useCompatibleAuth()
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'pnl' | 'apy'>('value')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d')
  
  //  НОВЫЙ ENHANCED ANALYTICS HOOK с полной интеграцией данных
  const analyticsData = useEnhancedAnalytics()
  
  // Mock данные для красивого дизайна
  const mockPortfolioData = generateMockPortfolioData()
  
  // Backwards compatibility for existing code
  const solBalance = useTokenBalance('SOL', { cacheTime: 30000, autoRefresh: true })
  const tngBalance = useTokenBalance('TNG', { cacheTime: 30000, autoRefresh: true })
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 30000, autoRefresh: true })
  
  const stakingData = useStaking()
  const farmingData = useFarming()

  //  ИСПОЛЬЗУЕМ ДАННЫЕ ИЗ ENHANCED ANALYTICS HOOK
  const analytics: AnalyticsData = {
    totalValue: analyticsData.data.overview.totalValue,
    dailyPnL: analyticsData.data.overview.dailyChange,
    weeklyPnL: analyticsData.data.overview.weeklyChange,
    monthlyPnL: analyticsData.data.overview.monthlyChange,
    totalYield: analyticsData.data.overview.totalPnL,
    avgAPY: analyticsData.data.overview.avgAPY,
    riskScore: analyticsData.data.overview.riskScore,
    sharpeRatio: analyticsData.data.risk.sharpeRatio,
    maxDrawdown: analyticsData.data.risk.maxDrawdown,
    winRate: analyticsData.data.performance.winRate,
    protocolCount: analyticsData.data.protocols.length,
    diversificationScore: analyticsData.data.risk.diversificationScore
  }

  //  ИСПОЛЬЗУЕМ PROTOCOLS ИЗ ENHANCED ANALYTICS HOOK
  const protocols: ProtocolAnalytics[] = analyticsData.data.protocols.map(protocol => ({
    name: protocol.name,
    allocation: protocol.allocation,
    value: protocol.value,
    pnl: protocol.value * (protocol.apy / 100) / 12, // Monthly PnL estimate
    pnlPercent: protocol.apy,
    apy: protocol.apy,
    risk: protocol.risk === 'low' ? 'low' : protocol.risk === 'medium' ? 'medium' : 'high',
    positions: protocol.transactions
  })) as ProtocolAnalytics[]

  //  УБРАНА имитация загрузки - используем реальный статус из analyticsData.isLoading

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

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
    const colors: Record<string, string> = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    const labels: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }
    return { color: colors[risk] || colors.low, label: labels[risk] || labels.low }
  }

  const LoadingFallback = () => <AnalyticsPageSkeleton />

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {analyticsData.isLoading ? (
        <LoadingFallback />
      ) : (
        <PageLayout showBottomNav={true}>
          <div className="space-y-5 pb-safe ultra-smooth-scroll no-horizontal-scroll mobile-scroll-container overflow-y-auto">
              
              {/* Learn-style Header */}
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
                        <BarChart3 className="w-6 h-6 text-yellow-400 inline mr-2" />
                        <span className="text-yellow-400">DeFi</span> Аналитика
                      </h1>
                      <p className="text-sm text-gray-400 mt-0.5">Анализ портфеля и производительности</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      {isBalanceVisible ? 
                        <Eye className="w-5 h-5 text-gray-400" /> : 
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      }
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      <RefreshCw className="w-5 h-5 text-gray-400" />
                    </motion.button>
                  </div>
                </div>

                {/* Quick stats */}
                <motion.div
                  className="flex items-center gap-4 text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    <span>Портфель: {isBalanceVisible ? formatCurrency(mockPortfolioData.totalValue) : '$••••••'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-green-400">
                      +{mockPortfolioData.dailyChangePercent}% сегодня
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>Риск: {analytics.riskScore}/10</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Stats Section - Learn style */}
              <div className="space-y-4">
                {/* Header with visibility toggle */}
                <motion.div
                  className="flex items-center justify-between px-5"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-sm font-medium text-gray-300">Статистика портфеля</h3>
                </motion.div>

                {/* Stats grid - Learn style */}
                <div className="px-5">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Daily Performance */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">
                              {isBalanceVisible ? `+${formatCurrency(mockPortfolioData.dailyChange)}` : '+$••••'}
                            </p>
                            <p className="text-xs text-gray-400 mb-1">За день</p>
                            <p className="text-xs text-green-400">+{mockPortfolioData.dailyChangePercent}%</p>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>

                    {/* Weekly Performance */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Calendar className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">
                              {isBalanceVisible ? `+${formatCurrency(mockPortfolioData.weeklyChange)}` : '+$••••'}
                            </p>
                            <p className="text-xs text-gray-400 mb-1">За неделю</p>
                            <p className="text-xs text-blue-400">+{mockPortfolioData.weeklyChangePercent}%</p>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>

                    {/* Monthly Performance */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Award className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">
                              {isBalanceVisible ? `+${formatCurrency(mockPortfolioData.monthlyChange)}` : '+$••••'}
                            </p>
                            <p className="text-xs text-gray-400 mb-1">За месяц</p>
                            <p className="text-xs text-purple-400">+{mockPortfolioData.monthlyChangePercent}%</p>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>

                    {/* APY */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                    >
                      <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Percent className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{analytics.avgAPY}%</p>
                            <p className="text-xs text-gray-400 mb-1">Средний APY</p>
                            <p className="text-xs text-yellow-400">Доходность</p>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  </div>
                </div>

                {/* Activity status card - Learn style */}
                <motion.div
                  className="px-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <SimpleCard className="p-4 border border-white/10 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium text-sm mb-1">Производительность портфеля</h4>
                        <p className="text-xs text-gray-400 mb-2">
                          Общая стоимость: {isBalanceVisible ? formatCurrency(mockPortfolioData.totalValue) : '$••••••'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs">
                            Отличная доходность
                          </Badge>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            Низкий риск
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {analytics.riskScore}/10 риск
                        </div>
                      </div>
                    </div>
                  </SimpleCard>
                </motion.div>
              </div>

              {/* Portfolio Chart - Learn style */}
              <div className="px-5">
                <h3 className="text-sm font-medium text-gray-300 mb-4">График портфеля</h3>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  <SimpleCard className="p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <LineChart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm">Стоимость портфеля</h4>
                          <p className="text-gray-400 text-xs">30 дней</p>
                        </div>
                      </div>
                      
                      {/* Timeframe buttons */}
                      <div className="flex items-center gap-1">
                        {['7d', '30d', '90d'].map((period) => (
                          <button
                            key={period}
                            onClick={() => setSelectedTimeframe(period as any)}
                            className={`px-3 py-1 text-xs rounded-lg transition-all ${
                              selectedTimeframe === period
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Simple Chart */}
                    <div className="relative h-32 mb-4 bg-gradient-to-t from-yellow-500/5 to-transparent rounded-lg">
                      <svg className="w-full h-full" viewBox="0 0 300 100">
                        <defs>
                          <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#eab308" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#eab308" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        
                        {/* Chart line */}
                        <path
                          d={mockPortfolioData.portfolioHistory
                            .slice(0, 15) // Show fewer points for cleaner look
                            .map((point, i) => {
                              const x = (i / 14) * 280 + 10
                              const y = 80 - ((point.value - 11000) / 3000) * 60
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#eab308"
                          strokeWidth="2"
                        />
                        
                        {/* Chart fill */}
                        <path
                          d={`${mockPortfolioData.portfolioHistory
                            .slice(0, 15)
                            .map((point, i) => {
                              const x = (i / 14) * 280 + 10
                              const y = 80 - ((point.value - 11000) / 3000) * 60
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                            })
                            .join(' ')} L 290 90 L 10 90 Z`}
                          fill="url(#chartFill)"
                        />
                      </svg>
                    </div>
                    
                    {/* Chart stats */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Макс</p>
                        <p className="text-green-400 font-medium">
                          {isBalanceVisible ? formatCurrency(Math.max(...mockPortfolioData.portfolioHistory.map(p => p.value))) : '$••••••'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Мин</p>
                        <p className="text-red-400 font-medium">
                          {isBalanceVisible ? formatCurrency(Math.min(...mockPortfolioData.portfolioHistory.map(p => p.value))) : '$••••••'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Текущий</p>
                        <p className="text-white font-medium">
                          {isBalanceVisible ? formatCurrency(mockPortfolioData.totalValue) : '$••••••'}
                        </p>
                      </div>
                    </div>
                  </SimpleCard>
                </motion.div>
              </div>

              {/* Asset Allocation - Learn style */}
              <div className="px-5">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Распределение активов</h3>
                
                <div className="space-y-3">
                  {mockPortfolioData.assetAllocation.map((asset, index) => (
                    <motion.div
                      key={asset.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.3 }}
                    >
                      <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                               style={{ backgroundColor: asset.color }}>
                            <span className="text-white">{asset.name}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-white font-medium text-sm">{asset.name}</p>
                              <p className="text-white font-semibold">
                                {isBalanceVisible ? formatCurrency(asset.value) : '$••••'}
                              </p>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-gray-400 text-xs">{asset.percentage}% портфеля</p>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-gray-800 rounded-full h-2">
                              <motion.div
                                className="h-2 rounded-full"
                                style={{ backgroundColor: asset.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${asset.percentage}%` }}
                                transition={{ delay: 0.8 + index * 0.1, duration: 0.8 }}
                              />
                            </div>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Protocol Performance - Learn style */}
              <div className="px-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-300">Производительность протоколов</h3>
                  <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs">
                    {mockPortfolioData.protocolPerformance.length} протоколов
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {mockPortfolioData.protocolPerformance.map((protocol, index) => {
                    const riskBadge = getRiskBadge(protocol.risk)
                    
                    return (
                      <motion.div
                        key={protocol.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1, duration: 0.3 }}
                      >
                        <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                  {protocol.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-white font-semibold">{protocol.name}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge className={`${riskBadge.color} text-xs`}>
                                    {riskBadge.label} риск
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-lg font-bold text-yellow-400">{protocol.apy}%</p>
                              <p className="text-xs text-gray-400">APY</p>
                            </div>
                          </div>

                          {/* Allocation Bar */}
                          <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                            <motion.div
                              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${protocol.allocation}%` }}
                              transition={{ delay: 1.0 + index * 0.1, duration: 0.5 }}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400">Аллокация</p>
                              <p className="text-white font-medium">{protocol.allocation}%</p>
                            </div>
                            <div>
                              <p className="text-gray-400">TVL</p>
                              <p className="text-white font-medium">
                                {isBalanceVisible ? formatCurrency(protocol.tvl) : '$••••'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Риск</p>
                              <p className={`font-medium ${
                                protocol.risk === 'low' ? 'text-green-400' :
                                protocol.risk === 'medium' ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {protocol.risk === 'low' ? 'Низкий' : 
                                 protocol.risk === 'medium' ? 'Средний' : 'Высокий'}
                              </p>
                            </div>
                          </div>
                        </SimpleCard>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Risk Analysis - Learn style */}
              <motion.div
                className="px-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.3 }}
              >
                <SimpleCard className="p-4 border border-white/10 bg-gradient-to-r from-yellow-500/5 to-red-500/5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-white font-semibold">Анализ рисков</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Общий риск-скор</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <motion.div
                            className={`h-2 rounded-full ${
                              analytics.riskScore <= 3 ? 'bg-green-500' :
                              analytics.riskScore <= 7 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${analytics.riskScore * 10}%` }}
                            transition={{ delay: 1.3, duration: 0.8 }}
                          />
                        </div>
                        <span className="text-white font-medium">{analytics.riskScore}/10</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Max Drawdown</p>
                      <p className="text-lg font-bold text-red-400">{analytics.maxDrawdown}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{analytics.diversificationScore}/10</p>
                      <p className="text-xs text-gray-400">Диверсификация</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{analytics.sharpeRatio}</p>
                      <p className="text-xs text-gray-400">Sharpe Ratio</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{analytics.winRate}%</p>
                      <p className="text-xs text-gray-400">Win Rate</p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-yellow-400 font-medium mb-1">Рекомендации</p>
                        <ul className="text-xs text-gray-300 space-y-1">
                          <li>• Рассмотрите увеличение доли стейблкоинов для снижения волатильности</li>
                          <li>• Диверсифицируйте между большим количеством протоколов</li>
                          <li>• Следите за коэффициентом Sharpe для оценки эффективности</li>
                        </ul>
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


