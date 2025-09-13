'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Eye,
  EyeOff,
  RefreshCw,
  PieChart,
  BarChart3,
  Calendar,
  Star,
  Target,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface PortfolioAsset {
  token: string
  name: string
  balance: number
  usdValue: number
  change24h: number
  allocation: number
  type: 'staked' | 'farming' | 'lending' | 'liquid'
  apy?: number
  protocol?: string
}

interface PortfolioChart {
  timestamp: number
  value: number
  change: number
}

interface EnhancedPortfolioSectionProps {
  assets: PortfolioAsset[]
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  chartData: PortfolioChart[]
  isVisible: boolean
  onToggleVisibility: () => void
  onRefresh: () => void
  onAssetClick: (asset: PortfolioAsset) => void
}

//  Mock данные удалены - компонент теперь требует реальные данные через props

//  Mock chart данные удалены - компонент теперь требует реальные данные через props

const timeframes = [
  { id: '24H', label: '24ч', days: 1 },
  { id: '7D', label: '7д', days: 7 },
  { id: '30D', label: '30д', days: 30 },
  { id: '1Y', label: '1г', days: 365 }
]

export function EnhancedPortfolioSection({ 
  assets = [], //  Требует реальные данные
  totalValue = 0,
  dailyChange = 0,
  dailyChangePercent = 0,
  chartData = [], //  Требует реальные данные
  isVisible = true,
  onToggleVisibility,
  onRefresh,
  onAssetClick
}: EnhancedPortfolioSectionProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30D')
  const [showChart, setShowChart] = useState(true)

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'staked': return 'text-purple-400'
      case 'farming': return 'text-green-400'
      case 'lending': return 'text-blue-400'
      case 'liquid': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'staked': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'farming': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'lending': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'liquid': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'staked': return 'Стейкинг'
      case 'farming': return 'Фарминг'
      case 'lending': return 'Депозит'
      case 'liquid': return 'Ликвидность'
      default: return type
    }
  }

  return (
    <div className="px-5 space-y-6">
      
      {/* Portfolio Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-600/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-400" />
              <h3 className="text-white font-semibold">Портфель DeFi</h3>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  hapticFeedback.impact('light')
                  onRefresh()
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  hapticFeedback.impact('light')
                  onToggleVisibility()
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                {isVisible ? 
                  <Eye className="w-4 h-4 text-gray-400" /> : 
                  <EyeOff className="w-4 h-4 text-gray-400" />
                }
              </motion.button>
            </div>
          </div>

          {/* Total Value */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-1">Общая стоимость</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white">
                {isVisible ? `$${totalValue.toFixed(2)}` : '$••••'}
              </span>
              <Badge className={`${
                dailyChangePercent >= 0 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {isVisible ? (
                  <>
                    {dailyChangePercent >= 0 ? '+' : ''}
                    ${dailyChange.toFixed(2)} ({dailyChangePercent.toFixed(1)}%)
                  </>
                ) : '••••'}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4 text-green-400" />
                <p className="text-xs text-gray-400">Активные позиции</p>
              </div>
              <p className="text-lg font-bold text-white">{assets.filter(a => a.type !== 'liquid').length}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <p className="text-xs text-gray-400">Средний APY</p>
              </div>
              <p className="text-lg font-bold text-white">
                {(assets.filter(a => a.apy).reduce((sum, a) => sum + (a.apy || 0), 0) / assets.filter(a => a.apy).length).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-gray-400">Доходность</p>
              </div>
              <p className="text-lg font-bold text-white">
                {isVisible ? `$${(totalValue * 0.05).toFixed(0)}` : '$••'}
              </p>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold">График доходности</h4>
            <div className="flex gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.id}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedTimeframe === tf.id
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => {
                    hapticFeedback.impact('light')
                    setSelectedTimeframe(tf.id)
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Chart Visualization */}
          <div className="relative h-32 mb-4">
            <div className="absolute inset-0 flex items-end justify-between">
              {chartData.slice(-15).map((point, index) => (
                <div
                  key={index}
                  className={`w-2 rounded-t transition-all ${
                    point.change >= 0 ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  style={{
                    height: `${Math.max(10, (point.value / Math.max(...chartData.map(p => p.value))) * 100)}%`
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="text-gray-400">Прибыль</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full" />
                <span className="text-gray-400">Убыток</span>
              </div>
            </div>
            <span className="text-gray-400">За {selectedTimeframe}</span>
          </div>
        </SimpleCard>
      </motion.div>

      {/* Asset Allocation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Распределение активов
            </h4>
          </div>

          {/* Simple Pie Chart Visualization */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-green-400 to-blue-500 opacity-20" />
            <div className="absolute inset-2 rounded-full bg-gray-900" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-gray-400">Всего</p>
                <p className="text-lg font-bold text-white">
                  {isVisible ? `$${totalValue.toFixed(0)}` : '$••••'}
                </p>
              </div>
            </div>
          </div>

          {/* Asset List */}
          <div className="space-y-3">
            {assets.map((asset, index) => (
              <motion.div
                key={asset.token}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
              >
                <div 
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => {
                    hapticFeedback.impact('light')
                    onAssetClick(asset)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{asset.token}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-white font-medium text-sm">{asset.token}</h5>
                        <Badge className={`text-xs ${getTypeBadgeColor(asset.type)}`}>
                          {getTypeLabel(asset.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">
                          {isVisible ? `${asset.balance.toFixed(2)}` : '••••'} {asset.token}
                        </p>
                        {asset.apy && (
                          <>
                            <div className="w-1 h-1 bg-gray-500 rounded-full" />
                            <p className="text-xs text-green-400">{asset.apy}% APY</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {isVisible ? `$${asset.usdValue.toFixed(2)}` : '$••••'}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">{asset.allocation.toFixed(1)}%</span>
                      <span className={`text-xs ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </SimpleCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <SimpleButton
            gradient={true}
            onClick={() => {
              hapticFeedback.impact('medium')
              // Open rebalance modal
            }}
            className="flex items-center justify-center gap-2 h-14"
          >
            <BarChart3 className="w-5 h-5" />
            Ребалансировка
          </SimpleButton>
          
          <SimpleButton
            onClick={() => {
              hapticFeedback.impact('medium')
              // Open analysis modal
            }}
            className="flex items-center justify-center gap-2 h-14"
          >
            <TrendingUp className="w-5 h-5" />
            Анализ доходности
          </SimpleButton>
        </div>
      </motion.div>
    </div>
  )
}


