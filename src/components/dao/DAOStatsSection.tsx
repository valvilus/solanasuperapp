'use client'

import { motion } from 'framer-motion'
import { Users, Vote, Coins, Target, TrendingUp, Eye, EyeOff } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { DAOStats } from '@/features/dao/types/dao.types'
import { formatLargeNumber } from '@/features/dao/utils'

interface DAOStatsSectionProps {
  stats: {
    totalMembers: number
    totalProposals: number
    activeProposals: number
    totalVotes: number
    treasuryValue: string
    userVotingPower: string
    userTotalVotes: number
    governanceTokenSymbol: string
  }
  isVisible?: boolean
  onToggleVisibility?: () => void
  className?: string
}

export function DAOStatsSection({ 
  stats, 
  isVisible = true, 
  onToggleVisibility,
  className = '' 
}: DAOStatsSectionProps) {
  
  const statCards = [
    {
      label: 'Участников DAO',
      value: formatLargeNumber(stats.totalMembers),
      change: '+12% за месяц',
      changeType: 'positive',
      icon: Users,
      color: 'text-blue-400'
    },
    {
      label: 'Моя сила голоса',
      value: isVisible ? stats.userVotingPower : '••••• TNG',
      change: '1.2% от общего',
      changeType: null,
      icon: Vote,
      color: 'text-solana-purple'
    },
    {
      label: 'Казна DAO',
      value: isVisible ? stats.treasuryValue : '$•••,•••',
      change: '+8.5% за месяц',
      changeType: 'positive',
      icon: Coins,
      color: 'text-solana-green'
    },
    {
      label: 'Всего предложений',
      value: stats.totalProposals.toString(),
      change: `${stats.activeProposals} активных`,
      changeType: null,
      icon: Target,
      color: 'text-orange-400'
    }
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with visibility toggle */}
      <motion.div
        className="flex items-center justify-between px-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-sm font-medium text-gray-300">Статистика DAO</h3>
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
                      <TrendingUp className="w-3 h-3 text-red-400" />
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

      {/* User voting status */}
      <motion.div
        className="px-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <SimpleCard className="p-4 border border-white/10 bg-gradient-to-r from-solana-purple/5 to-solana-green/5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Ваша активность
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                Проголосовано: {stats.userTotalVotes} раз
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-solana-purple/20 text-solana-purple border-solana-purple/30 text-xs">
                  Активный участник
                </Badge>
                {stats.userTotalVotes > 10 && (
                  <Badge className="bg-solana-green/20 text-solana-green border-solana-green/30 text-xs">
                    Топ-голосующий
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
                <Vote className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}