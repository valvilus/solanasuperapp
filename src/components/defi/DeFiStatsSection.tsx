'use client'

import { motion } from 'framer-motion'
import { Wallet, TrendingUp, Coins, Target, Zap, Shield, Eye, EyeOff } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'

interface DeFiStatsData {
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  activePositions: number
  totalStaked: number
  totalRewards: number
  avgAPY: number
  riskScore: 'low' | 'medium' | 'high'
}

interface DeFiStatsSectionProps {
  stats: DeFiStatsData
  isVisible?: boolean
  onToggleVisibility?: () => void
  className?: string
}

const formatLargeNumber = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(2)
}

export function DeFiStatsSection({ 
  stats, 
  isVisible = true, 
  onToggleVisibility,
  className = '' 
}: DeFiStatsSectionProps) {
  
  const statCards = [
    {
      label: 'Общий портфель',
      value: isVisible ? `$${formatLargeNumber(stats.totalValue)}` : '$••••',
      change: `${stats.dailyChangePercent >= 0 ? '+' : ''}${stats.dailyChangePercent.toFixed(1)}% за день`,
      changeType: stats.dailyChangePercent >= 0 ? 'positive' : 'negative',
      icon: Wallet,
      color: 'text-blue-400'
    },
    {
      label: 'Активные позиции',
      value: stats.activePositions.toString(),
      change: 'DeFi протоколы',
      changeType: null,
      icon: Target,
      color: 'text-solana-purple'
    },
    {
      label: 'Застейкано',
      value: isVisible ? `$${formatLargeNumber(stats.totalStaked)}` : '$••••',
      change: 'Валидаторы SOL',
      changeType: null,
      icon: Coins,
      color: 'text-solana-green'
    },
    {
      label: 'Средний APY',
      value: `${stats.avgAPY.toFixed(1)}%`,
      change: 'Доходность',
      changeType: 'positive',
      icon: Zap,
      color: 'text-yellow-400'
    }
  ]

  const getRiskBadgeStyle = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Низкий риск'
      case 'medium': return 'Средний риск'
      case 'high': return 'Высокий риск'
      default: return 'Неизвестно'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with visibility toggle */}
      <motion.div
        className="flex items-center justify-between px-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-sm font-medium text-gray-300">DeFi Статистика</h3>
        {onToggleVisibility && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleVisibility}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            {isVisible && <Eye className="w-4 h-4 text-gray-400" />}
            {!isVisible && <EyeOff className="w-4 h-4 text-gray-400" />}
          </motion.button>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    {stat.changeType === 'positive' && (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    )}
                    {stat.changeType === 'negative' && (
                      <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-lg font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-xs ${
                      stat.changeType === 'positive' ? 'text-green-400' : 
                      stat.changeType === 'negative' ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* User DeFi activity status */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <SimpleCard className="p-4 border border-white/10 bg-gradient-to-r from-solana-green/5 to-solana-purple/5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Ваша DeFi активность
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                Общая доходность: {isVisible ? `+$${stats.totalRewards.toFixed(2)}` : '+$••••'}
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-solana-green/20 text-solana-green border-solana-green/30 text-xs">
                  Опытный DeFi-пользователь
                </Badge>
                <Badge className={`${getRiskBadgeStyle(stats.riskScore)} text-xs`}>
                  {getRiskLabel(stats.riskScore)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-solana-green to-solana-purple flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}


