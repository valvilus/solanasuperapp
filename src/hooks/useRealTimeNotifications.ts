'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { useAuth } from '@/hooks/useAuth'

export interface SSEMessage {
  id?: string
  event?: string
  data: any
}

export function useRealTimeNotifications() {
  const { addTransferNotification, setConnectionStatus, showError, showSuccess } = useNotifications()
  const { accessToken, isAuthenticated } = useAuth()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    // Дополнительные проверки перед подключением
    if (!isAuthenticated || !accessToken || typeof window === 'undefined') {
      console.log(' Not ready for SSE connection:', { isAuthenticated, hasToken: !!accessToken, isClient: typeof window !== 'undefined' })
      return
    }

    if (eventSourceRef.current?.readyState === EventSource.CONNECTING || eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log(' SSE already connected or connecting')
      return
    }

    try {
      console.log(' Connecting to SSE...')
      
      const url = `/api/notifications/stream?token=${encodeURIComponent(accessToken)}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // Успешное подключение
      eventSource.onopen = () => {
        console.log(' SSE connected successfully')
        setConnectionStatus(true)
        reconnectAttemptsRef.current = 0
        
        // Показываем уведомление о подключении только при переподключении
        if (reconnectAttemptsRef.current > 0) {
          showSuccess('Подключение восстановлено', 'Уведомления в реальном времени активны')
        }
      }

      // Обработка сообщений
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log(' SSE message received:', data)
        } catch (error) {
          console.error(' Failed to parse SSE message:', error)
        }
      }

      // Обработка события подключения
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log(' SSE connection confirmed:', data)
        } catch (error) {
          console.error(' Failed to parse connection event:', error)
        }
      })

      // Обработка уведомлений о переводах
      eventSource.addEventListener('transfer_received', (event) => {
        try {
          const transferData = JSON.parse(event.data)
          console.log(' Transfer notification received:', transferData)
          
          addTransferNotification({
            type: 'transfer_received',
            senderId: transferData.senderId,
            senderUsername: transferData.senderUsername,
            token: transferData.token,
            amount: transferData.amount,
            usdAmount: transferData.usdAmount,
            memo: transferData.memo,
            isAnonymous: transferData.isAnonymous || false
          })
        } catch (error) {
          console.error(' Failed to parse transfer notification:', error)
        }
      })

      // Обработка ping для поддержания соединения
      eventSource.addEventListener('ping', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log(' SSE ping received:', data.timestamp)
        } catch (error) {
          console.error(' Failed to parse ping:', error)
        }
      })

      // Обработка ошибок
      eventSource.onerror = (event) => {
        console.error(' SSE connection error:', {
          readyState: eventSource.readyState,
          url: eventSource.url,
          withCredentials: eventSource.withCredentials
        })
        setConnectionStatus(false)
        
        // Только переподключаемся если пользователь все еще авторизован
        if (isAuthenticated && accessToken && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // Exponential backoff
          reconnectAttemptsRef.current++
          
          console.log(` Attempting to reconnect SSE in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            disconnect()
            connect()
          }, delay)
        } else if (!isAuthenticated || !accessToken) {
          console.log(' User no longer authenticated, stopping SSE reconnection')
        } else {
          console.error(' SSE max reconnect attempts reached')
          showError(
            'Соединение потеряно', 
            'Не удается подключиться к серверу уведомлений. Попробуйте обновить страницу.'
          )
        }
      }

    } catch (error) {
      console.error(' Failed to create SSE connection:', error)
      setConnectionStatus(false)
    }
  }, [isAuthenticated, accessToken, addTransferNotification, setConnectionStatus, showError, showSuccess])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }

    if (eventSourceRef.current) {
      console.log(' Disconnecting SSE...')
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setConnectionStatus(false)
    }
  }, [setConnectionStatus])

  const reconnect = useCallback(() => {
    console.log(' Manual SSE reconnect requested')
    disconnect()
    reconnectAttemptsRef.current = 0
    setTimeout(connect, 1000)
  }, [disconnect, connect])

  // Подключение при монтировании и изменении токена
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      // Небольшая задержка для стабилизации состояния
      const timer = setTimeout(() => {
        connect()
      }, 1000)
      
      return () => {
        clearTimeout(timer)
        disconnect()
      }
    } else {
      disconnect()
    }
  }, [isAuthenticated, accessToken, connect, disconnect])

  // Обработка видимости страницы для переподключения
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // Переподключаемся при возвращении на страницу
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          console.log(' Page became visible, reconnecting SSE...')
          reconnect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, reconnect])

  return {
    isConnected: isAuthenticated && !!accessToken && eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnect,
    disconnect
  }
}
