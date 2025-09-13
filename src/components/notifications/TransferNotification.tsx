'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownLeft, X, CheckCircle } from 'lucide-react'
import { formatTokenBalance, formatUSDValue } from '@/lib/formatters'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { TransferNotification as TransferNotificationType } from '@/contexts/NotificationContext'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { useState, useEffect } from 'react'

interface TransferNotificationProps {
  notification: TransferNotificationType
  onClose: () => void
  onMarkAsRead: () => void
  autoClose?: boolean
  duration?: number
}

export function TransferNotification({ 
  notification, 
  onClose, 
  onMarkAsRead,
  autoClose = true,
  duration = 6000 
}: TransferNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  // Автозакрытие
  useEffect(() => {
    if (!autoClose) return

    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [autoClose, duration])

  // Вибрация при появлении
  useEffect(() => {
    hapticFeedback.notification('success')
    setTimeout(() => hapticFeedback.impact('light'), 100)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleAccept = () => {
    hapticFeedback.impact('light')
    onMarkAsRead()
    handleClose()
  }

  const getTokenIcon = (token: string) => {
    switch (token) {
      case 'TNG':
        return '₸'
      case 'SOL':
        return ''
      case 'USDC':
        return '$'
      default:
        return ''
    }
  }

  const getTokenColor = (token: string) => {
    switch (token) {
      case 'TNG':
        return 'text-yellow-400'
      case 'SOL':
        return 'text-purple-400'
      case 'USDC':
        return 'text-green-400'
      default:
        return 'text-blue-400'
    }
  }

  const formatSenderName = () => {
    if (notification.isAnonymous) {
      return 'Анонимно'
    }
    return notification.senderUsername ? `@${notification.senderUsername}` : 'Неизвестно'
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30
        }}
        className="w-full max-w-sm mx-auto"
      >
        <SimpleCard className="relative p-4 border border-white/10 bg-black/90 backdrop-blur-xl">
          {/* Header с иконкой и кнопкой закрытия */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-solana-green/20 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-solana-green" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Получен перевод</h3>
                <p className="text-xs text-gray-400">
                  {new Date(notification.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-3 h-3 text-gray-400" />
            </motion.button>
          </div>

          {/* Основная информация */}
          <div className="space-y-3">
            {/* Сумма */}
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getTokenColor(notification.token)}`}>
                {getTokenIcon(notification.token)}
              </span>
              <span className="text-lg font-bold text-white">
                +{formatTokenBalance(parseFloat(notification.amount), notification.token as any, 'visual')}
              </span>
              <span className={`text-sm font-medium ${getTokenColor(notification.token)}`}>
                {notification.token}
              </span>
              {notification.usdAmount && (
                <span className="text-xs text-gray-400 ml-auto">
                  ≈{formatUSDValue(parseFloat(notification.usdAmount), 'visual')}
                </span>
              )}
            </div>

            {/* Отправитель */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">От:</span>
              <span className={notification.isAnonymous ? 'italic text-gray-500' : 'text-white font-medium'}>
                {formatSenderName()}
              </span>
            </div>

            {/* Комментарий */}
            {notification.memo && (
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-300">
                  "{notification.memo}"
                </p>
              </div>
            )}

            {/* Кнопка действия */}
            <SimpleButton
              onClick={handleAccept}
              className="w-full py-2 text-sm bg-solana-green/20 border-solana-green/30 text-solana-green hover:bg-solana-green/30"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Принять
            </SimpleButton>
          </div>
        </SimpleCard>
      </motion.div>
    </AnimatePresence>
  )
}