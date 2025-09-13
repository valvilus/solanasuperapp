'use client'

/**
 * Simple Auth Context - Reliable Authentication System
 * Solana SuperApp - No more 401 errors
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useTelegram } from '@/components/telegram/TelegramProvider'

// =============================================================================
// TYPES
// =============================================================================

interface AuthUser {
  id: string
  telegramId: string
  username?: string
  firstName: string
  lastName?: string
  isPremium: boolean
  photoUrl?: string
  walletAddress?: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (initData: string) => Promise<boolean>
  logout: () => Promise<void>
  getAuthHeader: () => string | null
  apiCall: (url: string, options?: RequestInit) => Promise<Response>
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// =============================================================================
// STORAGE UTILITIES
// =============================================================================

const STORAGE_KEY = 'solana_auth'

function saveAuth(user: AuthUser, token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, timestamp: Date.now() }))
  } catch (error) {
    console.error('Failed to save auth:', error)
  }
}

function loadAuth(): { user: AuthUser; token: string } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const data = JSON.parse(stored)
    const age = Date.now() - (data.timestamp || 0)
    
    // Clear if older than 7 days
    if (age > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    
    return { user: data.user, token: data.token }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp < Math.floor(Date.now() / 1000)
  } catch {
    return true
  }
}

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false
  })
  
  const telegramContext = useTelegram()
  const initRef = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // =============================================================================
  // CORE FUNCTIONS
  // =============================================================================

  const getAuthHeader = useCallback((): string | null => {
    if (!state.accessToken) {
      return null
    }
    
    if (isTokenExpired(state.accessToken)) {
      console.log('🔐 Token is expired, will need refresh')
      return null
    }
    
    return `Bearer ${state.accessToken}`
  }, [state.accessToken])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.tokens) {
          setState(prev => ({ ...prev, accessToken: data.tokens.accessToken }))
          if (state.user) {
            saveAuth(state.user, data.tokens.accessToken)
          }
          return true
        }
      }
      return false
    } catch {
      return false
    }
  }, [state.user])

  const apiCall = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>)
    }

    // Only set Content-Type if not provided and not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    // Add auth header if available
    const authHeader = getAuthHeader()
    if (authHeader) {
      headers.Authorization = authHeader
    } else {
      console.log(`🔐 No auth header available for ${url}`)
    }

    const response = await fetch(url, { ...options, headers })

    // Auto-refresh on 401 and retry once
    if (response.status === 401 && state.accessToken) {
      console.log(`🔐 Got 401 for ${url}, attempting token refresh...`)
      const refreshed = await refreshToken()
      if (refreshed) {
        console.log(`🔐 Token refreshed successfully, retrying ${url}`)
        const newAuthHeader = getAuthHeader()
        if (newAuthHeader) {
          headers.Authorization = newAuthHeader
          return fetch(url, { ...options, headers })
        }
      } else {
        console.log(`🔐 Token refresh failed for ${url}`)
      }
    }

    return response
  }, [state.accessToken, getAuthHeader, refreshToken])

  const login = useCallback(async (initData: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      })

      const data = await response.json()

      if (response.ok && data.success && data.user && data.tokens) {
        const user: AuthUser = {
          id: data.user.id,
          telegramId: data.user.telegramId,
          username: data.user.username,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          isPremium: data.user.isPremium,
          photoUrl: data.user.photoUrl,
          walletAddress: data.user.walletAddress
        }

        saveAuth(user, data.tokens.accessToken)
        
        setState({
          user,
          accessToken: data.tokens.accessToken,
          isLoading: false,
          isAuthenticated: true
        })

        // Schedule token refresh
        scheduleTokenRefresh(data.tokens.accessToken)
        
        return true
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return false
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }))
      return false
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (state.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: getAuthHeader()! },
          credentials: 'include'
        }).catch(() => {}) // Ignore errors
      }

      clearAuth()
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      
      setState({
        user: null,
        accessToken: null,
        isLoading: false,
        isAuthenticated: false
      })
    } catch (error) {
      clearAuth()
      setState({
        user: null,
        accessToken: null,
        isLoading: false,
        isAuthenticated: false
      })
    }
  }, [state.accessToken, getAuthHeader])

  const scheduleTokenRefresh = useCallback((token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiresIn = payload.exp * 1000 - Date.now()
      const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000) // 5 min before expiry, min 1 min

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = setTimeout(refreshToken, refreshIn)
    } catch (error) {
      // If we can't schedule, token is probably invalid
    }
  }, [refreshToken])

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  useEffect(() => {
    if (initRef.current) return
    if (!telegramContext?.isReady) return

    initRef.current = true

    const initialize = async () => {
      // Try to restore from storage
      const stored = loadAuth()
      if (stored) {
        if (!isTokenExpired(stored.token)) {
          setState({
            user: stored.user,
            accessToken: stored.token,
            isLoading: false,
            isAuthenticated: true
          })
          scheduleTokenRefresh(stored.token)
          return
        } else {
          console.log('🔐 Stored token is expired, attempting refresh...')
          // Try to refresh expired token
          const refreshed = await refreshToken()
          if (refreshed) {
            console.log('🔐 Token refreshed successfully on initialization')
            return
          } else {
            console.log('🔐 Token refresh failed on initialization, clearing storage')
            clearAuth()
          }
        }
      }

      // Auto-login with Telegram
      const initData = telegramContext.initData
      if (initData) {
        await login(initData)
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initialize()
  }, [telegramContext?.isReady, telegramContext?.initData, login, scheduleTokenRefresh])

  // Initialize from storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (initRef.current) return
      initRef.current = true

      setState(prev => ({ ...prev, isLoading: true }))

      try {
        const stored = loadAuth()
        if (stored && !isTokenExpired(stored.token)) {
          setState(prev => ({
            ...prev,
            user: stored.user,
            accessToken: stored.token,
            isAuthenticated: true,
            isLoading: false
          }))

          // Schedule refresh
          scheduleTokenRefresh(stored.token)
        } else {
          clearAuth()
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        clearAuth()
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AuthContextValue = {
    ...state,
    login,
    logout,
    getAuthHeader,
    apiCall
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}