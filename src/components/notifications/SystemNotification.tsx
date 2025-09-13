'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { SystemNotification as SystemNotificationType } from '@/contexts/NotificationContext'
import { SimpleCard } from '@/components/ui/simple-card'
import { useState, useEffect } from 'react'

interface SystemNotificationProps {
  notification: SystemNotificationType
  onClose: () => void
}

export function SystemNotification({ notification, onClose }: SystemNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Автозакрытие
  useEffect(() => {
    if (!notification.duration) return

    const timer = setTimeout(() => {
      handleClose()
    }, notification.duration)

    return () => clearTimeout(timer)
  }, [notification.duration])

  // Вибрация при появлении
  useEffect(() => {
    switch (notification.type) {
      case 'success':
        hapticFeedback.notification('success')
        break
      case 'error':
        hapticFeedback.notification('error')
        break
      case 'warning':
        hapticFeedback.notification('warning')
        break
      default:
        hapticFeedback.impact('light')
    }
  }, [notification.type])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-solana-green" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'info':
      default:
        return <Info className="w-4 h-4 text-solana-purple" />
    }
  }



  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30 
        }}
        className="w-full max-w-sm mx-auto"
      >
        <SimpleCard className="p-3 border border-white/10 bg-black/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Иконка */}
            <div className="flex-shrink-0">
              {getIcon()}
            </div>

            {/* Контент */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white">
                {notification.title}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {notification.message}
              </p>
            </div>

            {/* Кнопка закрытия */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </motion.button>
          </div>
        </SimpleCard>
      </motion.div>
    </AnimatePresence>
  )
}
