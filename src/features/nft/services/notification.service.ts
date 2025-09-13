import { NotificationType } from '../types'

export class NotificationService {
  private static instance: NotificationService
  private listeners: Array<(type: NotificationType, message: string) => void> = []

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  subscribe(listener: (type: NotificationType, message: string) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  show(type: NotificationType, message: string) {
    this.listeners.forEach(listener => listener(type, message))
  }

  success(message: string) {
    this.show('SUCCESS' as any, message)
  }

  error(message: string) {
    this.show('ERROR' as any, message)
  }

  info(message: string) {
    this.show('INFO' as any, message)
  }
}

export const notificationService = NotificationService.getInstance()
