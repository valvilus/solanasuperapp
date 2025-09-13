'use client'

/**
 * TelegramSafeComponent - Максимальная защита от SSR/гидратации для TMA
 * Используйте этот компонент для обертывания любых Telegram-специфичных компонентов
 */

import { useEffect, useState, ReactNode } from 'react'

interface TelegramSafeComponentProps {
  children: ReactNode
  fallback?: ReactNode
  minDelay?: number // Минимальная задержка для предотвращения flickering
}

export function TelegramSafeComponent({ 
  children, 
  fallback = null, 
  minDelay = 100 
}: TelegramSafeComponentProps) {
  const [isTelegramReady, setIsTelegramReady] = useState(false)
  const [isDelayComplete, setIsDelayComplete] = useState(false)

  useEffect(() => {
    // Проверяем доступность Telegram WebApp API
    const checkTelegram = () => {
      if (typeof window !== 'undefined') {
        const hasTelegramWebApp = window.Telegram?.WebApp
        setIsTelegramReady(!!hasTelegramWebApp)
      }
    }

    // Минимальная задержка для предотвращения flickering
    const delayTimer = setTimeout(() => {
      setIsDelayComplete(true)
    }, minDelay)

    checkTelegram()

    // Проверяем периодически, если Telegram API загружается асинхронно
    const interval = setInterval(checkTelegram, 50)
    const maxWaitTimer = setTimeout(() => {
      clearInterval(interval)
      setIsTelegramReady(true) // Принудительно считаем готовым через 2 секунды
    }, 2000)

    return () => {
      clearTimeout(delayTimer)
      clearTimeout(maxWaitTimer)
      clearInterval(interval)
    }
  }, [minDelay])

  // Рендерим только когда и Telegram готов, и минимальная задержка прошла
  if (!isTelegramReady || !isDelayComplete) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default TelegramSafeComponent
