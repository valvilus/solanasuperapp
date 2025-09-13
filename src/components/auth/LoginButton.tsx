'use client'

/**
 * Auth Components - Компоненты для автоматической авторизации
 * Solana SuperApp - Frontend Authentication
 */

import React from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useTelegram, hapticFeedback } from '@/components/telegram/TelegramProvider'
import { Button } from '@/components/ui/button'

// LoginButton больше не нужен - авторизация автоматическая
// Оставляем только для обратной совместимости
export function LoginButton() {
  return (
    <div className="flex items-center gap-2 text-solana-purple">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Автоматическая авторизация...</span>
    </div>
  )
}

/**
 * Auth Status Display - Тихий индикатор авторизации (только для отладки)
 */
export function AuthStatus() {
  const { isAuthenticated, user } = useCompatibleAuth()

  // Показываем только если пользователь авторизован, иначе ничего
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-xs opacity-50">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span>{user.firstName}</span>
      </div>
    )
  }

  return null // Полностью скрываем статус если не авторизован
}

/**
 * Auth Guard Component - Защищает контент для авторизованных пользователей
 */
interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireWallet?: boolean
  requirePremium?: boolean
}

export function AuthGuard({ 
  children, 
  fallback, 
  requireWallet = false,
  requirePremium = false 
}: AuthGuardProps) {
  const { user } = useCompatibleAuth()

  // ВСЕГДА показываем контент - авторизация беззвучная и автоматическая
  // Убираем все проверки isAuthenticated, isLoading, isReady

  if (requireWallet && !user?.walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Требуется кошелек
          </h3>
          <p className="text-gray-400 mb-6">
            Подключите Solana кошелек для доступа к этой функции
          </p>
        </div>
        <Button onClick={() => {
          // TODO: Открыть модал подключения кошелька
          hapticFeedback.impact('light')
        }}>
          Подключить кошелек
        </Button>
      </div>
    )
  }

  if (requirePremium && !user?.isPremium) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Требуется Premium
          </h3>
          <p className="text-gray-400 mb-6">
            Эта функция доступна только для Telegram Premium пользователей
          </p>
        </div>
        <Button onClick={() => {
          hapticFeedback.impact('light')
          // TODO: Показать информацию о Premium
        }}>
          Узнать о Premium
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
