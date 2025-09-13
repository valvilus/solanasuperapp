'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { SimpleCard } from '@/components/ui/simple-card'
import { 
  Coins, 
  ArrowUpDown, 
  Zap, 
  CreditCard, 
  BarChart3, 
  History,
  Target,
  TrendingUp,
  ArrowRightLeft,
  Shield,
  AlertTriangle,
  Settings
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface QuickAction {
  id: string
  title: string
  icon: any
  color: string
  bgColor: string
}

interface QuickActionWithRoute extends QuickAction {
  route: string
}

const defiQuickActions: QuickActionWithRoute[] = [
  {
    id: 'stake',
    title: 'Стейк',
    icon: Coins,
    color: 'text-purple-400',
    bgColor: 'from-purple-500/15 to-purple-500/5',
    route: '/defi/staking'
  },
  {
    id: 'swap',
    title: 'Обмен',
    icon: ArrowUpDown,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/15 to-cyan-500/5',
    route: '/defi/swap'
  },
  {
    id: 'farm',
    title: 'Фарм',
    icon: Zap,
    color: 'text-green-400',
    bgColor: 'from-green-500/15 to-green-500/5',
    route: '/defi/farming'
  },
  {
    id: 'lend',
    title: 'Займ',
    icon: CreditCard,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500/15 to-yellow-500/5',
    route: '/defi/lending'
  },
  {
    id: 'analytics',
    title: 'Анализ',
    icon: BarChart3,
    color: 'text-blue-400',
    bgColor: 'from-blue-500/15 to-blue-500/5',
    route: '/defi/analytics'
  },
  {
    id: 'history',
    title: 'История',
    icon: History,
    color: 'text-gray-400',
    bgColor: 'from-gray-500/15 to-gray-500/5',
    route: '/defi/history'
  },
  {
    id: 'portfolio',
    title: 'Портфель',
    icon: Target,
    color: 'text-indigo-400',
    bgColor: 'from-indigo-500/15 to-indigo-500/5',
    route: '/defi/portfolio'
  },
  {
    id: 'yield',
    title: 'Доходы',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'from-emerald-500/15 to-emerald-500/5',
    route: '/defi/yield'
  },
  {
    id: 'bridge',
    title: 'Мост',
    icon: ArrowRightLeft,
    color: 'text-orange-400',
    bgColor: 'from-orange-500/15 to-orange-500/5',
    route: '/defi/bridge'
  },
  {
    id: 'insurance',
    title: 'Страховка',
    icon: Shield,
    color: 'text-red-400',
    bgColor: 'from-red-500/15 to-red-500/5',
    route: '/defi/insurance'
  },
  {
    id: 'risk',
    title: 'Риски',
    icon: AlertTriangle,
    color: 'text-purple-400',
    bgColor: 'from-purple-500/15 to-purple-500/5',
    route: '/defi/risk'
  },
  {
    id: 'admin',
    title: 'Админ',
    icon: Settings,
    color: 'text-gray-400',
    bgColor: 'from-gray-500/15 to-gray-500/5',
    route: '/defi/admin'
  }
]

interface DeFiQuickActionsProps {
  onAction: (actionId: string) => void
  className?: string
}

export function DeFiQuickActions({ onAction, className = '' }: DeFiQuickActionsProps) {
  const router = useRouter()

  const handleActionClick = (action: QuickActionWithRoute) => {
    hapticFeedback.impact('light')
    // Блокируем переход на admin страницу
    if (action.id !== 'admin') {
      router.push(action.route)
    }
    onAction(action.id)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="px-5">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Быстрые действия</h3>
      </div>
      
      <div className="px-5">
        <div className="grid grid-cols-4 gap-3">
          {defiQuickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleActionClick(action)}
              className="cursor-pointer touch-manipulation"
            >
              <SimpleCard className={`p-4 h-20 bg-gradient-to-br ${action.bgColor} border border-white/5 hover:border-white/10 transition-all duration-150`}>
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <action.icon className={`w-5 h-5 mb-2 ${action.color}`} />
                  <p className="text-xs text-white font-medium">{action.title}</p>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
