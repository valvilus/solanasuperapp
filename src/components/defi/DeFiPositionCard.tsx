'use client'

import { motion } from 'framer-motion'
import { Clock, TrendingUp, TrendingDown, ExternalLink, Share2, MoreHorizontal } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface DeFiPosition {
  id: string
  type: 'staking' | 'farming' | 'lending' | 'borrowing'
  protocol: string
  token: string
  amount: number
  usdValue: number
  apy: number
  rewards: number
  startDate: Date
  status: 'active' | 'completed' | 'unstaking'
  lockPeriod?: number
  unlockDate?: Date
  healthFactor?: number
  category: string
}

interface DeFiPositionCardProps {
  position: DeFiPosition
  index?: number
  onClaim?: (position: DeFiPosition) => void
  onManage?: (position: DeFiPosition) => void
  onViewDetails?: (position: DeFiPosition) => void
  onShare?: (position: DeFiPosition) => void
  className?: string
  isVisible?: boolean
}

const getPositionTypeColor = (type: string) => {
  switch (type) {
    case 'staking':
      return 'bg-gradient-to-r from-purple-500 to-purple-600'
    case 'farming':
      return 'bg-gradient-to-r from-green-500 to-green-600'
    case 'lending':
      return 'bg-gradient-to-r from-blue-500 to-blue-600'
    case 'borrowing':
      return 'bg-gradient-to-r from-red-500 to-red-600'
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600'
  }
}

const getPositionTypeLabel = (type: string) => {
  switch (type) {
    case 'staking': return 'Стейкинг'
    case 'farming': return 'Фарминг'
    case 'lending': return 'Кредитование'
    case 'borrowing': return 'Займ'
    default: return type
  }
}

const formatLargeNumber = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(2)
}

const getTimeRemaining = (unlockDate?: Date) => {
  if (!unlockDate) return { timeText: 'Без блокировки', isExpired: false }
  
  const now = new Date()
  const diff = unlockDate.getTime() - now.getTime()
  
  if (diff <= 0) {
    return { timeText: 'Доступно', isExpired: true }
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return { timeText: `${days}д ${hours}ч`, isExpired: false }
  }
  return { timeText: `${hours}ч`, isExpired: false }
}

export function DeFiPositionCard({ 
  position, 
  index = 0,
  onClaim,
  onManage,
  onViewDetails,
  onShare,
  className = '',
  isVisible = true
}: DeFiPositionCardProps) {
  const timeRemaining = getTimeRemaining(position.unlockDate)
  const isActive = position.status === 'active'
  const daysSinceStart = Math.floor((Date.now() - position.startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={className}
    >
      <SimpleCard 
        className="cursor-pointer group hover:border-white/20"
        onClick={() => onViewDetails?.(position)}
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getPositionTypeColor(position.type)} text-white border-0 text-xs`}>
                  {getPositionTypeLabel(position.type)}
                </Badge>
                {isActive && position.unlockDate && !timeRemaining.isExpired && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeRemaining.timeText}
                  </Badge>
                )}
                {timeRemaining.isExpired && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Готово
                  </Badge>
                )}
                {position.status === 'unstaking' && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    Анстейк
                  </Badge>
                )}
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                {position.protocol} • {position.token}
              </h3>
              <p className="text-sm text-gray-400">
                {position.category}
              </p>
            </div>
          </div>

          {/* Position info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>Позиция с: {position.startDate.toLocaleDateString('ru-RU')}</span>
            <span>{daysSinceStart} дней назад</span>
          </div>
        </div>

        {/* Position details */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Сумма</p>
              <p className="text-sm font-bold text-white">
                {isVisible ? `${formatLargeNumber(position.amount)} ${position.token}` : '••••••'}
              </p>
              <p className="text-xs text-gray-400">
                {isVisible ? `$${formatLargeNumber(position.usdValue)}` : '$••••'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">APY</p>
              <p className="text-sm font-bold text-green-400">
                {position.apy.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">
                Доходность
              </p>
            </div>
          </div>
          
          {/* Rewards */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Накопленная награда</p>
                <p className="text-sm font-bold text-green-400">
                  {isVisible ? `+${formatLargeNumber(position.rewards)} ${position.token}` : '+••••••'}
                </p>
              </div>
              {position.rewards > 0 && (
                <SimpleButton 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    onClaim?.(position)
                  }}
                >
                  Забрать
                </SimpleButton>
              )}
            </div>
          </div>

          {/* Health factor for lending */}
          {position.type === 'borrowing' && position.healthFactor && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Здоровье позиции</span>
                <span className={`${
                  position.healthFactor > 1.5 ? 'text-green-400' :
                  position.healthFactor > 1.2 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {position.healthFactor.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(position.healthFactor * 50, 100)} 
                className="h-1" 
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <SimpleButton 
            size="sm" 
            className="flex-1"
            onClick={() => {
              onManage?.(position)
            }}
          >
            Управление
          </SimpleButton>
          
          {/* Secondary actions */}
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onShare?.(position)
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Share2 className="w-4 h-4 text-gray-400" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails?.(position)
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Performance indicator */}
        <motion.div 
          className="flex items-center justify-between mt-3 pt-3 border-t border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            {position.apy > 10 ? (
              <TrendingUp className="w-3 h-3 text-green-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-yellow-400" />
            )}
            <span className="text-xs text-gray-400">
              {position.apy > 10 ? 'Высокая доходность' : 'Стабильная доходность'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            #{position.id.slice(0, 6)}
          </span>
        </motion.div>
      </SimpleCard>
    </motion.div>
  )
}


