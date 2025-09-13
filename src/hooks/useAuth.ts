'use client'

/**
 * Auth Hooks - Specialized hooks for authentication
 * Solana SuperApp - Simplified Authentication System
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth as useAuthContext } from '../contexts/AuthContext'

// Re-export main useAuth from context for convenience
export { useAuth } from '../contexts/AuthContext'

// Compatibility exports for old code
export const useAuthenticatedFetch = () => {
  const { apiCall } = useAuthContext()
  return apiCall
}

export const useRequireAuth = () => {
  const { isAuthenticated, user } = useAuthContext()
  return { isAuthenticated, user }
}

export const useUser = () => {
  const { user } = useAuthContext()
  return user
}

// =============================================================================
// AUTH STATUS HOOKS
// =============================================================================

/**
 * Hook для проверки авторизации
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthContext()
  return isAuthenticated
}

/**
 * Hook для получения данных пользователя
 */
export function useCurrentUser() {
  const { user, isLoading, isAuthenticated } = useAuthContext()
  return { user, isLoading, isAuthenticated }
}

/**
 * Hook для защищённых страниц
 */
export function useAuthGuard(redirectTo?: string) {
  const { user, isAuthenticated, isLoading } = useAuthContext()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
        if (redirectTo) {
          console.warn(`Требуется авторизация для доступа к ${redirectTo}`)
        }
      }
    }
  }, [isAuthenticated, isLoading, redirectTo])

  return { isAuthorized, isLoading, user }
}

// =============================================================================
// SIMPLIFIED HOOKS
// =============================================================================

/**
 * Hook для входа через Telegram
 */
export function useTelegramLogin() {
  const { login, isLoading } = useAuthContext()
  const [isProcessing, setIsProcessing] = useState(false)

  const loginWithTelegram = useCallback(async (initData?: string) => {
    if (isProcessing) return false

    setIsProcessing(true)

    try {
      const telegramData = initData || (
        typeof window !== 'undefined' && 
        window.Telegram?.WebApp?.initData
      )

      if (!telegramData) {
        return false
      }

      const success = await login(telegramData)
      
      if (success && typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback?.notificationOccurred('success')
      }

      return success
    } catch (err) {
      return false
    } finally {
      setIsProcessing(false)
    }
  }, [login, isProcessing])

  return {
    loginWithTelegram,
    isProcessing: isProcessing || isLoading
  }
}

/**
 * Hook для выхода
 */
export function useLogout() {
  const { logout } = useAuthContext()
  const [isLogging, setIsLogging] = useState(false)

  const logoutUser = useCallback(async () => {
    if (isLogging) return

    setIsLogging(true)

    try {
      await logout()
      
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback?.notificationOccurred('warning')
      }
    } catch (error) {
      // Silent fail
    } finally {
      setIsLogging(false)
    }
  }, [logout, isLogging])

  return { logoutUser, isLogging }
}

// =============================================================================
// PERMISSION HOOKS
// =============================================================================

/**
 * Hook для проверки наличия кошелька
 */
export function useHasWallet(): boolean {
  const { user } = useAuthContext()
  return !!(user?.walletAddress)
}

/**
 * Hook для проверки Premium статуса
 */
export function useIsPremium(): boolean {
  const { user } = useAuthContext()
  return !!(user?.isPremium)
}

/**
 * Hook для проверки конкретных разрешений
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuthContext()

  return {
    canAccessWallet: isAuthenticated && !!user,
    canAccessNFT: isAuthenticated && !!user,
    canAccessDAO: isAuthenticated && !!user,
    canAccessJobs: isAuthenticated && !!user,
    canAccessLearn: isAuthenticated && !!user,
    canAccessDefi: isAuthenticated && !!user?.walletAddress,
    canAccessPremiumFeatures: isAuthenticated && !!user?.isPremium,
    hasWallet: !!user?.walletAddress,
    isPremium: !!user?.isPremium
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook для форматирования отображения пользователя
 */
export function useUserDisplay() {
  const { user } = useAuthContext()

  const displayName = user ? (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    (user.username ? `@${user.username}` : `User ${user.telegramId}`)
  ) : 'Гость'

  const shortName = user?.firstName || user?.username || 'Гость'
  const avatar = user?.photoUrl || null

  return { displayName, shortName, avatar, user }
}

/**
 * Hook для проверки состояния авторизации в реальном времени
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuthContext()

  return {
    isAuthenticated,
    isLoading,
    isReady: !isLoading,
    user,
    status: isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'unauthenticated'
  }
}

// =============================================================================
// PROFILE & SESSIONS HOOKS
// =============================================================================

/**
 * Hook для управления сессиями пользователя
 */
export function useUserSessions() {
  const { apiCall, isAuthenticated } = useAuthContext()
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Загрузка сессий
  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiCall('/api/auth/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      } else {
        throw new Error('Ошибка загрузки сессий')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [apiCall, isAuthenticated])

  // Отзыв сессии
  const revokeSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated || !sessionId) return false

    try {
      const response = await apiCall(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Обновляем список сессий
        setSessions(prev => prev.filter((s: any) => s.sessionId !== sessionId))
        return true
      }
      
      return false
    } catch (err) {
      return false
    }
  }, [apiCall, isAuthenticated])

  // Загружаем сессии при монтировании
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    isLoading,
    error,
    revokeSession,
    refetch: fetchSessions
  }
}

/**
 * Hook для работы с профилем пользователя  
 */
export function useUserProfile() {
  const { user, isAuthenticated } = useAuthContext()
  const { displayName, shortName, avatar } = useUserDisplay()

  return {
    profile: user,
    displayName,
    shortName,
    avatar,
    isAuthenticated,
    // Дополнительные поля профиля
    fullName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '',
    initials: user ? 
      (user.firstName?.[0] + (user.lastName?.[0] || '')).toUpperCase() : 
      'U',
    hasAvatar: !!avatar,
    isPremium: useIsPremium(),
    hasWallet: useHasWallet()
  }
}

/**
 * Hook для автоматического входа (совместимость)
 */
export function useAutoLogin() {
  const { login, isAuthenticated, isLoading } = useAuthContext()
  const [isAutoLoginAttempted, setIsAutoLoginAttempted] = useState(false)

  const attemptAutoLogin = useCallback(async () => {
    if (isAuthenticated || isAutoLoginAttempted || isLoading) {
      return false
    }

    setIsAutoLoginAttempted(true)

    try {
      // Проверяем, есть ли данные Telegram WebApp
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData
        const success = await login(initData)
        return success
      }
    } catch (error) {
      console.warn('Автовход не удался:', error)
    }

    return false
  }, [login, isAuthenticated, isAutoLoginAttempted, isLoading])

  return {
    attemptAutoLogin,
    isAutoLoginAttempted,
    canAutoLogin: !isAuthenticated && !isAutoLoginAttempted && !isLoading
  }
}