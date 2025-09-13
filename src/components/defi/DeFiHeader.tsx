'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Settings, BarChart3, TrendingUp, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DeFiHeaderProps {
  title?: string
  subtitle?: string
  totalValue?: number
  dailyChange?: number
  dailyChangePercent?: number
  activePositions?: number
  onOpenSettings?: () => void
  onBack?: () => void
  showBackButton?: boolean
}

export function DeFiHeader({
  title = 'DeFi SuperApp',
  subtitle = 'Децентрализованные финансы',
  totalValue = 0,
  dailyChange = 0,
  dailyChangePercent = 0,
  activePositions = 0,
  onOpenSettings,
  onBack,
  showBackButton = false
}: DeFiHeaderProps) {
  return (
    <motion.div
      className="px-5 pt-4 pb-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </motion.button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              DeFi <span className="text-solana-green">SuperApp</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activePositions > 0 && (
            <Badge className="bg-solana-green/20 text-solana-green border-solana-green/30 text-xs">
              {activePositions} позиций
            </Badge>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>
      </div>

      {/* Quick stats */}
      {totalValue > 0 && (
        <motion.div
          className="flex items-center gap-4 text-xs text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            <span>${totalValue.toLocaleString()} портфель</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span className={dailyChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
              {dailyChangePercent >= 0 ? '+' : ''}{dailyChangePercent.toFixed(1)}% сегодня
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Высокая доходность</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

