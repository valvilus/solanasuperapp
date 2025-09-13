'use client'

import { useEffect } from 'react'
import { NotificationType } from '../types'
import { notificationService } from '../services/notification.service'

export function useNotifications(
  onNotification: (type: NotificationType, message: string) => void
) {
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(onNotification)
    return unsubscribe
  }, [onNotification])

  return {
    showNotification: (type: NotificationType, message: string) => {
      notificationService.show(type, message)
    }
  }
}
