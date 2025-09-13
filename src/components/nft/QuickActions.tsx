/**
 * Premium Quick Actions Component - Wallet-style Quick Actions Panel
 * Solana SuperApp - Premium Design System
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgGradient: string
  handler: () => void
}

interface PremiumQuickActionsProps {
  actions: QuickAction[]
  className?: string
}

export function PremiumQuickActions({ actions, className = '' }: PremiumQuickActionsProps) {
  return (
    <motion.div
      className={`${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="grid grid-cols-4 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              hapticFeedback.impact('medium')
              action.handler()
            }}
            className="cursor-pointer touch-manipulation"
          >
            <SimpleCard className={`p-4 h-20 bg-gradient-to-br ${action.bgGradient} border border-white/10 hover:border-white/20 transition-all duration-150`}>
              <div className="flex flex-col items-center justify-center h-full text-center">
                <action.icon className={`w-5 h-5 mb-2 ${action.color}`} />
                <p className="text-xs text-white font-medium">{action.title}</p>
              </div>
            </SimpleCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
