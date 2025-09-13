'use client'

import { motion } from 'framer-motion'
import { Settings, Users, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DAOHeaderProps {
  title?: string
  subtitle?: string
  activeProposalsCount?: number
  totalMembers?: number
  onOpenSettings?: () => void
}

export function DAOHeader({
  title = 'DAO Голосования',
  subtitle = 'Управление сообществом',
  activeProposalsCount = 0,
  totalMembers = 0,
  onOpenSettings
}: DAOHeaderProps) {
  return (
    <motion.div
      className="px-5 pt-4 pb-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {title.split(' ')[0]} <span className="text-solana-purple">{title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeProposalsCount > 0 && (
            <Badge className="bg-solana-purple/20 text-solana-purple border-solana-purple/30 text-xs">
              {activeProposalsCount} активных
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

      {/* Быстрая статистика */}
      {totalMembers > 0 && (
        <motion.div
          className="flex items-center gap-4 text-xs text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{totalMembers.toLocaleString()} участников</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Активность высокая</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}



















































