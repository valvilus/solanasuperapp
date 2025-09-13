'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// Типы уведомлений
export interface TransferNotification {
  id: string
  type: 'transfer_received'
  senderId: string
  senderUsername?: string
  token: string
  amount: string
  usdAmount?: string
  memo?: string
  isAnonymous: boolean
  timestamp: string
  isRead?: boolean
}

export interface SystemNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  duration?: number
  isRead?: boolean
}

export type NotificationItem = TransferNotification | SystemNotification

interface NotificationContextType {
  // Состояние
  notifications: NotificationItem[]
  unreadCount: number
  isConnected: boolean
  
  // Методы для уведомлений о переводах
  addTransferNotification: (notification: Omit<TransferNotification, 'id' | 'timestamp'>) => void
  
  // Методы для системных уведомлений
  addSystemNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => void
  showSuccess: (title: string, message: string, duration?: number) => void
  showError: (title: string, message: string, duration?: number) => void
  showWarning: (title: string, message: string, duration?: number) => void
  showInfo: (title: string, message: string, duration?: number) => void
  
  // Управление уведомлениями
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  
  // Статус подключения
  setConnectionStatus: (connected: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Генерация уникального ID
  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Добавление уведомления о переводе
  const addTransferNotification = useCallback((notification: Omit<TransferNotification, 'id' | 'timestamp'>) => {
    const newNotification: TransferNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date().toISOString(),
      isRead: false
    }

    setNotifications(prev => [newNotification, ...prev])
    
    // Автоматически помечаем как прочитанное через 10 секунд
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => n.id === newNotification.id ? { ...n, isRead: true } : n)
      )
    }, 10000)

    console.log(' Transfer notification added:', newNotification)
  }, [generateId])

  // Добавление системного уведомления
  const addSystemNotification = useCallback((notification: Omit<SystemNotification, 'id' | 'timestamp'>) => {
    const newNotification: SystemNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date().toISOString(),
      isRead: false
    }

    setNotifications(prev => [newNotification, ...prev])

    // Автоматическое удаление через указанное время
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, notification.duration)
    }

    console.log(' System notification added:', newNotification)
  }, [generateId])

  // Хелперы для системных уведомлений
  const showSuccess = useCallback((title: string, message: string, duration = 5000) => {
    addSystemNotification({ type: 'success', title, message, duration })
  }, [addSystemNotification])

  const showError = useCallback((title: string, message: string, duration = 8000) => {
    addSystemNotification({ type: 'error', title, message, duration })
  }, [addSystemNotification])

  const showWarning = useCallback((title: string, message: string, duration = 6000) => {
    addSystemNotification({ type: 'warning', title, message, duration })
  }, [addSystemNotification])

  const showInfo = useCallback((title: string, message: string, duration = 4000) => {
    addSystemNotification({ type: 'info', title, message, duration })
  }, [addSystemNotification])

  // Пометить как прочитанное
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    )
  }, [])

  // Пометить все как прочитанные
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    )
  }, [])

  // Удалить уведомление
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  // Очистить все уведомления
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Установить статус подключения
  const setConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected)
  }, [])

  // Подсчет непрочитанных
  const unreadCount = notifications.filter(n => !n.isRead).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    addTransferNotification,
    addSystemNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    setConnectionStatus
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// Хук для использования контекста
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Экспорт типов для использования в компонентах - removed duplicate exports
