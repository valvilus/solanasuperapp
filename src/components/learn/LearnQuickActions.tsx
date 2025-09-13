'use client'

import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Search, 
  Filter, 
  Trophy, 
  Target, 
  TrendingUp,
  Plus,
  Star
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

export type LearnAction = 
  | 'explore' 
  | 'search' 
  | 'filter' 
  | 'leaderboard' 
  | 'achievements' 
  | 'progress'
  | 'create'
  | 'categories'

interface LearnQuickActionsProps {
  onAction: (action: LearnAction) => void
  className?: string
}

const quickActions = [
  {
    id: 'explore' as LearnAction,
    label: 'Найти курсы',
    icon: Search,
    gradient: 'from-blue-500 to-cyan-600',
    description: 'Изучить каталог'
  },
  {
    id: 'achievements' as LearnAction,
    label: 'Достижения',
    icon: Trophy,
    gradient: 'from-yellow-500 to-orange-600',
    description: 'Ваши награды'
  },
  {
    id: 'leaderboard' as LearnAction,
    label: 'Рейтинг',
    icon: Target,
    gradient: 'from-green-500 to-emerald-600',
    description: 'Топ учеников'
  },
  {
    id: 'progress' as LearnAction,
    label: 'Прогресс',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-600',
    description: 'Ваша статистика'
  }
]

export function LearnQuickActions({ onAction, className = '' }: LearnQuickActionsProps) {
  
  const handleAction = (actionId: LearnAction) => {
    hapticFeedback.impact('light')
    onAction(actionId)
  }

  return (
    <div className={`px-5 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3 className="text-sm font-medium text-gray-300 mb-4">Быстрые действия</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAction(action.id)}
                className="w-full"
              >
                <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200 bg-white/5 backdrop-blur-sm group">
                  <div className="space-y-3">
                    {/* Icon with gradient background */}
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="text-left">
                      <h4 className="text-white font-medium text-sm mb-1">
                        {action.label}
                      </h4>
                      <p className="text-gray-400 text-xs">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </SimpleCard>
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Featured action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-4"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction('create')}
            className="w-full"
          >
            <SimpleCard className="p-4 border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 text-left">
                  <h4 className="text-white font-semibold mb-1">
                    Создать курс
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Поделитесь знаниями и зарабатывайте
                  </p>
                </div>
                
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">Популярно</span>
                </div>
              </div>
            </SimpleCard>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}






