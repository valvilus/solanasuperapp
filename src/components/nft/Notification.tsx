/**
 * Premium Notification Component - Toast Notifications
 * Solana SuperApp - Premium Design System
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Sparkles
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'

export interface NftNotification {
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING'
  title: string
  message: string
}

interface PremiumNotificationProps {
  notification: NftNotification | null
  onClose: () => void
  className?: string
}

export function PremiumNotification({
  notification,
  onClose,
  className = ''
}: PremiumNotificationProps) {
  
  if (!notification) return null

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return {
          icon: CheckCircle,
          bgColor: 'from-green-500/20 to-green-600/10',
          borderColor: 'border-green-500/30',
          iconColor: 'text-green-400',
          titleColor: 'text-green-300'
        }
      case 'ERROR':
        return {
          icon: XCircle,
          bgColor: 'from-red-500/20 to-red-600/10',
          borderColor: 'border-red-500/30',
          iconColor: 'text-red-400',
          titleColor: 'text-red-300'
        }
      case 'WARNING':
        return {
          icon: AlertCircle,
          bgColor: 'from-yellow-500/20 to-yellow-600/10',
          borderColor: 'border-yellow-500/30',
          iconColor: 'text-yellow-400',
          titleColor: 'text-yellow-300'
        }
      default:
        return {
          icon: Info,
          bgColor: 'from-blue-500/20 to-blue-600/10',
          borderColor: 'border-blue-500/30',
          iconColor: 'text-blue-400',
          titleColor: 'text-blue-300'
        }
    }
  }

  const config = getNotificationConfig(notification.type)
  const IconComponent = config.icon

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed top-4 left-4 right-4 z-[90]', // Z-INDEX: Notification layer - moved to top
          'bg-gray-900/95 backdrop-blur-md border rounded-xl',
          'shadow-2xl relative overflow-hidden max-w-sm mx-auto',
          config.borderColor,
          className
        )}
      >
        {/* Premium Background */}
        <div className={cn('absolute inset-0 bg-gradient-to-br', config.bgColor)} />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.08]" />
        
        {/* Animated Border Glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${config.iconColor.replace('text-', 'rgba(')}40, 0.2) 0%, transparent 50%, ${config.iconColor.replace('text-', 'rgba(')}40, 0.2) 100%)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'subtract',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            padding: '1px'
          }}
        />
        
        <div className="relative z-10 p-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.4, type: 'spring' }}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                'bg-gradient-to-br from-white/20 to-white/10 border border-white/20'
              )}
            >
              <IconComponent className={cn('w-4 h-4', config.iconColor)} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <motion.h4
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className={cn('font-semibold text-xs mb-0.5', config.titleColor)}
              >
                {notification.title}
              </motion.h4>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-gray-300 text-xs leading-tight"
              >
                {notification.message}
              </motion.p>
            </div>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <X className="w-3 h-3 text-gray-400" />
            </motion.button>
          </div>

          {/* Success Sparkles */}
          {notification.type === 'SUCCESS' && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, Math.random() * 40 - 20],
                    y: [0, Math.random() * 40 - 20]
                  }}
                  transition={{
                    delay: 0.5 + i * 0.1,
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`
                  }}
                >
                  <Sparkles className="w-3 h-3 text-green-400" />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 3, ease: 'linear' }}
          className={cn(
            'absolute bottom-0 left-0 h-1 rounded-b-2xl origin-left',
            notification.type === 'SUCCESS' ? 'bg-green-400' :
            notification.type === 'ERROR' ? 'bg-red-400' :
            notification.type === 'WARNING' ? 'bg-yellow-400' : 'bg-blue-400'
          )}
          style={{ width: '100%' }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
