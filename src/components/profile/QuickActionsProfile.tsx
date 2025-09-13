'use client'

import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { profileQuickActions } from '@/features/profile/data'

interface QuickActionsProfileProps {
  onAction: (actionId: string) => void
  className?: string
}

export function QuickActionsProfile({ onAction, className = '' }: QuickActionsProfileProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="px-5">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Быстрые действия</h3>
      </div>
      
      <div className="px-5">
        <div className="grid grid-cols-4 gap-2.5">
          {profileQuickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onAction(action.id)}
              className="cursor-pointer touch-manipulation"
            >
              <SimpleCard className={`p-3 h-16 bg-gradient-to-br ${action.bgColor} border border-white/5 hover:border-white/10 transition-all duration-150`}>
                <div className="flex flex-col items-center justify-center h-full text-center gap-1">
                  <action.icon className={`w-4 h-4 ${action.color} flex-shrink-0`} />
                  <p className="text-xs text-white font-medium leading-tight line-clamp-2">{action.title}</p>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
