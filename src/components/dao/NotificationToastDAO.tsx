'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { NotificationState } from '@/features/dao/types/dao.types'

interface NotificationToastDAOProps {
  notification: NotificationState | null
  onClose?: () => void
}

export function NotificationToastDAO({ notification, onClose }: NotificationToastDAOProps) {
  if (!notification) return null

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20'
      case 'error':
        return 'bg-red-500/10 border-red-500/20'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20'
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/20'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25 
        }}
        className="fixed top-4 left-4 right-4 z-50"
      >
        <div className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm ${getBgColor()}`}>
          {getIcon()}
          <p className="flex-1 text-sm text-white font-medium">
            {notification.message}
          </p>
          {onClose && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
































