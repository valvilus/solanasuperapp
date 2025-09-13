'use client'

import { motion } from 'framer-motion'
import { BookOpen, Compass, User, Trophy, Target, History } from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

export type LearnTabType = 'courses' | 'my-learning' | 'explore' | 'leaderboard' | 'achievements' | 'progress'

interface LearnTabsProps {
  activeTab: LearnTabType
  onChange: (tab: LearnTabType) => void
}

const tabs = [
  {
    id: 'courses' as LearnTabType,
    label: 'Курсы',
    icon: BookOpen,
    gradient: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'my-learning' as LearnTabType,
    label: 'Моё',
    icon: User,
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'explore' as LearnTabType,
    label: 'Поиск',
    icon: Compass,
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    id: 'leaderboard' as LearnTabType,
    label: 'Рейтинг',
    icon: Trophy,
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    id: 'achievements' as LearnTabType,
    label: 'Награды',
    icon: Target,
    gradient: 'from-red-500 to-pink-600'
  },
  {
    id: 'progress' as LearnTabType,
    label: 'Прогресс',
    icon: History,
    gradient: 'from-gray-500 to-slate-600'
  }
]

export function LearnTabs({ activeTab, onChange }: LearnTabsProps) {
  
  const handleTabClick = (tabId: LearnTabType) => {
    hapticFeedback.selection()
    onChange(tabId)
  }

  return (
    <div className="px-5 mb-6">
      <div className="flex overflow-x-auto bg-gray-900/50 rounded-2xl p-1 backdrop-blur-sm border border-gray-800/50 scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const IconComponent = tab.icon
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                relative flex flex-col items-center justify-center py-3 px-2 rounded-xl
                transition-all duration-300 min-h-[70px] min-w-[60px] flex-shrink-0
                ${isActive 
                  ? 'text-white shadow-lg' 
                  : 'text-gray-400 hover:text-gray-300'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active Background */}
              {isActive && (
                <motion.div
                  layoutId="activeLearnTab"
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} rounded-xl opacity-20`}
                  initial={false}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30 
                  }}
                />
              )}
              
              {/* Active Border */}
              {isActive && (
                <motion.div
                  layoutId="activeLearnBorder"
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} rounded-xl opacity-40 blur-sm`}
                  initial={false}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30 
                  }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center space-y-1">
                {/* Icon */}
                <motion.div
                  className={`
                    p-1.5 rounded-lg
                    ${isActive 
                      ? `bg-gradient-to-br ${tab.gradient}` 
                      : 'bg-gray-800/50'
                    }
                  `}
                  initial={false}
                  animate={{ 
                    scale: isActive ? 1.05 : 1,
                    rotate: isActive ? [0, -3, 3, 0] : 0
                  }}
                  transition={{ 
                    duration: 0.3,
                    rotate: { duration: 0.6 }
                  }}
                >
                  <IconComponent 
                    className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} 
                  />
                </motion.div>
                
                {/* Label */}
                <motion.span 
                  className={`
                    text-[10px] font-medium tracking-wide
                    ${isActive ? 'text-white' : 'text-gray-400'}
                  `}
                  initial={false}
                  animate={{ 
                    scale: isActive ? 1.05 : 1,
                    fontWeight: isActive ? 600 : 500
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {tab.label}
                </motion.span>
              </div>
              
              {/* Glow effect for active tab */}
              {isActive && (
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} rounded-xl opacity-10 blur-md scale-110`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}






