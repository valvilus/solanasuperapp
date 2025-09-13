'use client'

import { motion } from 'framer-motion'
import { Wallet, Coins, Zap, CreditCard, ArrowUpDown, History } from 'lucide-react'
import { DeFiTabType } from '@/features/defi/types'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface DeFiTabsProps {
  activeTab: DeFiTabType
  onChange: (tab: DeFiTabType) => void
}

const tabs = [
  {
    id: 'portfolio' as DeFiTabType,
    label: 'Портфель',
    icon: Wallet,
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'staking' as DeFiTabType,
    label: 'Стейкинг',
    icon: Coins,
    gradient: 'from-solana-purple to-purple-600'
  },
  {
    id: 'farming' as DeFiTabType,
    label: 'Фарминг',
    icon: Zap,
    gradient: 'from-gray-600 to-gray-700'
  },
  {
    id: 'lending' as DeFiTabType,
    label: 'Кредиты',
    icon: CreditCard,
    gradient: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'swap' as DeFiTabType,
    label: 'Обмен',
    icon: ArrowUpDown,
    gradient: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'history' as DeFiTabType,
    label: 'История',
    icon: History,
    gradient: 'from-gray-500 to-slate-600'
  }
]

export function DeFiTabs({ activeTab, onChange }: DeFiTabsProps) {
  
  const handleTabClick = (tabId: DeFiTabType) => {
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
                relative flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-xl
                transition-all duration-300 min-h-[80px]
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
                  layoutId="activeTab"
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
                  layoutId="activeBorder"
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} rounded-xl opacity-40 blur-sm`}
                  initial={false}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30 
                  }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center space-y-2">
                {/* Icon */}
                <motion.div
                  className={`
                    p-2 rounded-lg
                    ${isActive 
                      ? `bg-gradient-to-br ${tab.gradient}` 
                      : 'bg-gray-800/50'
                    }
                  `}
                  initial={false}
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    rotate: isActive ? [0, -5, 5, 0] : 0
                  }}
                  transition={{ 
                    duration: 0.3,
                    rotate: { duration: 0.6 }
                  }}
                >
                  <IconComponent 
                    className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} 
                  />
                </motion.div>
                
                {/* Label */}
                <motion.span 
                  className={`
                    text-xs font-medium tracking-wide
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

