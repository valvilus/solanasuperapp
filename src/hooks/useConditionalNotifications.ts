'use client'

/**
 * Conditional Notifications Hook - Умная загрузка уведомлений
 * Solana SuperApp - Оптимизация производительности
 */

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UseConditionalNotificationsOptions {
  // Загружать уведомления только на определенных страницах
  enabledPaths?: string[]
  
  // Задержка перед подключением (чтобы не мешать основной загрузке)
  delay?: number
  
  // Автоматическое переподключение при ошибках
  autoReconnect?: boolean
  
  // Максимальное количество попыток переподключения
  maxReconnectAttempts?: number
}

export function useConditionalNotifications(
  options: UseConditionalNotificationsOptions = {}
) {
  const {
    enabledPaths = ['/wallet', '/profile', '/transactions'],
    delay = 3000, // 3 секунды задержки
    autoReconnect = true,
    maxReconnectAttempts = 3
  } = options

  const { isAuthenticated, user, accessToken } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Проверка, нужно ли подключать уведомления на текущей странице
  const shouldConnect = () => {
    if (!isAuthenticated || !user || !accessToken) return false
    
    const currentPath = window.location.pathname
    return enabledPaths.some(path => currentPath.startsWith(path))
  }

  // Подключение к SSE
  const connect = () => {
    if (!shouldConnect()) return

    try {
      setError(null)
      
      const url = `/api/notifications/stream?token=${accessToken}`
      const eventSource = new EventSource(url)
      
      eventSource.onopen = () => {
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
      }
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Здесь можно добавить обработку уведомлений
          console.log(' Notification received:', data)
        } catch (err) {
          console.warn('Failed to parse notification:', err)
        }
      }
      
      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource.close()
        
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          setTimeout(() => {
            connect()
          }, 1000 * Math.pow(2, reconnectAttemptsRef.current)) // Exponential backoff
        } else {
          setError('Не удалось подключиться к уведомлениям')
        }
      }
      
      eventSourceRef.current = eventSource
      
    } catch (err) {
      setError('Ошибка подключения к уведомлениям')
    }
  }

  // Отключение от SSE
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
    setError(null)
  }

  // Принудительное переподключение
  const reconnect = () => {
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }

  // Отложенное подключение
  useEffect(() => {
    if (shouldConnect()) {
      // Очищаем предыдущий таймер
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
      }
      
      // Подключаемся с задержкой
      delayTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    } else {
      disconnect()
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
      }
      disconnect()
    }
  }, [isAuthenticated, user, accessToken])

  // Переподключение при смене токена
  useEffect(() => {
    if (isConnected && accessToken) {
      reconnect()
    }
  }, [accessToken])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnect()
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
      }
    }
  }, [])

  return {
    isConnected,
    error,
    reconnect,
    disconnect,
    // Утилиты для отладки
    shouldConnect: shouldConnect(),
    reconnectAttempts: reconnectAttemptsRef.current
  }
}

// Хук для страниц, где уведомления критичны
export function useRealTimeNotifications() {
  return useConditionalNotifications({
    enabledPaths: ['/wallet', '/transactions', '/profile'],
    delay: 1000, // Быстрее подключаемся
    autoReconnect: true,
    maxReconnectAttempts: 5
  })
}

// Хук для фоновых уведомлений (не критичные)
export function useBackgroundNotifications() {
  return useConditionalNotifications({
    enabledPaths: ['/'],
    delay: 10000, // 10 секунд задержки
    autoReconnect: false, // Не переподключаемся автоматически
    maxReconnectAttempts: 1
  })
}
