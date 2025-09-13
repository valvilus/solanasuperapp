'use client'

import { motion } from 'framer-motion'
import { Settings, Briefcase, TrendingUp, Users, Zap, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface JobsHeaderProps {
  title?: string
  subtitle?: string
  activeJobsCount?: number
  totalFreelancers?: number
  averageJobValue?: number
  onOpenSettings?: () => void
  onRefresh?: () => void
}

export function JobsHeader({
  title = 'Jobs Marketplace',
  subtitle = 'Найди работу мечты в Web3',
  activeJobsCount = 0,
  totalFreelancers = 0,
  averageJobValue = 0,
  onOpenSettings,
  onRefresh
}: JobsHeaderProps) {
  const router = useRouter()
  return (
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
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </motion.button>
          <h1 className="text-xl font-bold text-white">
            {title.split(' ')[0]} <span className="text-solana-green">{title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeJobsCount > 0 && (
            <Badge className="bg-solana-green/20 text-solana-green border-solana-green/30 text-xs">
              {activeJobsCount} активных
            </Badge>
          )}
          {onRefresh && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onRefresh}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
            >
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </motion.button>
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
      <motion.div
        className="flex items-center gap-4 text-xs text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-1">
          <Briefcase className="w-3 h-3" />
          <span>{activeJobsCount} работ доступно</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{totalFreelancers.toLocaleString()} фрилансеров</span>
        </div>
        {averageJobValue > 0 && (
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-green-400">
              ${averageJobValue.toLocaleString()} средний проект
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>Быстрые выплаты</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

