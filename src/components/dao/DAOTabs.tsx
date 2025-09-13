'use client'

import { motion, PanInfo } from 'framer-motion'
import { FileText, Coins, Users, History } from 'lucide-react'
import { DAOTabType } from '@/features/dao/types/dao.types'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface DAOTabsProps {
  activeTab: DAOTabType
  onChange: (tab: DAOTabType) => void
}

export function DAOTabs({ activeTab, onChange }: DAOTabsProps) {
  const tabs = [
    { id: 'proposals', label: 'Предложения', shortLabel: 'Предл.', icon: FileText },
    { id: 'treasury', label: 'Казна', shortLabel: 'Казна', icon: Coins },
    { id: 'members', label: 'Участники', shortLabel: 'Участн.', icon: Users },
    { id: 'history', label: 'История', shortLabel: 'История', icon: History }
  ] as const

  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab)

  const handleSwipe = (event: any, info: PanInfo) => {
    const swipeThreshold = 50
    const velocity = Math.abs(info.velocity.x)
    
    if (velocity > 500 || Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > 0 && currentTabIndex > 0) {
        // Swipe right - previous tab
        hapticFeedback.impact('light')
        onChange(tabs[currentTabIndex - 1].id as DAOTabType)
      } else if (info.offset.x < 0 && currentTabIndex < tabs.length - 1) {
        // Swipe left - next tab
        hapticFeedback.impact('light')
        onChange(tabs[currentTabIndex + 1].id as DAOTabType)
      }
    }
  }

  return (
    <div className="px-4 mb-6">
      <motion.div 
        className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/5"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleSwipe}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === (tab.id as DAOTabType)
          const Icon = tab.icon
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                hapticFeedback.impact('light')
                onChange(tab.id as DAOTabType)
              }}
              className={`relative flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 touch-manipulation min-h-[36px] overflow-hidden ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {/* Active background */}
              {isActive && (
                <motion.div
                  layoutId="activeDAOTabBackground"
                  className="absolute inset-0 bg-gradient-to-r from-solana-purple/15 to-solana-green/8 border border-solana-purple/20 rounded-md"
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
              
              {/* Tab content */}
              <div className="relative z-10 flex items-center gap-1 truncate">
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium text-xs truncate leading-tight">
                  {tab.shortLabel}
                </span>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
































