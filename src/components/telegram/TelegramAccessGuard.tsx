'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Smartphone, MessageCircle, ExternalLink } from 'lucide-react'

interface TelegramAccessGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function TelegramAccessGuard({ children, fallback }: TelegramAccessGuardProps) {
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Проверяем наличие Telegram WebApp API
    const checkTelegramEnvironment = () => {
      if (typeof window === 'undefined') {
        return false
      }

      // Проверяем различные индикаторы Telegram Mini App
      const hasTelegramWebApp = !!(window as any).Telegram?.WebApp
      const hasTelegramInitData = !!(window as any).Telegram?.WebApp?.initData
      const isTelegramUserAgent = /Telegram/i.test(navigator.userAgent)
      
      // Дополнительные проверки для Telegram окружения
      const hasWebAppReady = typeof (window as any).Telegram?.WebApp?.ready === 'function'
      
      return hasTelegramWebApp || hasTelegramInitData || (isTelegramUserAgent && hasWebAppReady)
    }

    // Задержка для корректной инициализации Telegram WebApp
    const checkTimer = setTimeout(() => {
      const isTelegram = checkTelegramEnvironment()
      setIsTelegramEnvironment(isTelegram)
      setIsChecking(false)
    }, 500)

    // Дополнительная проверка через 2 секунды на случай медленной загрузки
    const fallbackTimer = setTimeout(() => {
      if (isTelegramEnvironment === null) {
        const isTelegram = checkTelegramEnvironment()
        setIsTelegramEnvironment(isTelegram)
        setIsChecking(false)
      }
    }, 2000)

    return () => {
      clearTimeout(checkTimer)
      clearTimeout(fallbackTimer)
    }
  }, [isTelegramEnvironment])

  // Показываем fallback во время проверки
  if (isChecking || isTelegramEnvironment === null) {
    return <>{fallback || <div className="min-h-screen bg-background" />}</>
  }

  // Если это Telegram окружение, показываем приложение
  if (isTelegramEnvironment) {
    return <>{children}</>
  }

  // Показываем красивое уведомление для не-Telegram пользователей
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25,
          duration: 0.6 
        }}
        className="w-full max-w-md"
      >
        <SimpleCard className="p-8 border border-white/10 bg-black/90 backdrop-blur-xl text-center">
          {/* Иконка */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </motion.div>

          {/* Заголовок */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-4"
          >
            Solana SuperApp
          </motion.h1>

          {/* Описание */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300 mb-6 leading-relaxed"
          >
            Это приложение работает только как{' '}
            <span className="text-blue-400 font-medium">Telegram Mini App</span>.
            Для доступа к полному функционалу откройте приложение через Telegram.
          </motion.p>

          {/* Инструкции */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3 text-sm text-gray-400">
              <Smartphone className="w-5 h-5 mt-0.5 text-blue-400 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium text-white mb-1">Как открыть:</p>
                <ol className="space-y-1 text-xs">
                  <li>1. Откройте Telegram</li>
                  <li>2. Найдите бота @YourSolanaBot</li>
                  <li>3. Запустите Mini App</li>
                </ol>
              </div>
            </div>
          </motion.div>

          {/* Кнопка */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <SimpleButton
              onClick={() => window.open('https://t.me/YourSolanaBot', '_blank')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3"
            >
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Открыть в Telegram
                <ExternalLink className="w-4 h-4" />
              </div>
            </SimpleButton>
          </motion.div>

          {/* Дополнительная информация */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xs text-gray-500 mt-4"
          >
            Полнофункциональное Solana приложение с кошельком, NFT, DAO и обучением
          </motion.p>
        </SimpleCard>
      </motion.div>
    </div>
  )
}

export default TelegramAccessGuard
