/**
 * Система аудита и логирования действий пользователей
 */

interface AuditEvent {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  action: string
  resource: string
  details?: any
  ipAddress?: string
  userAgent?: string
  success: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
}

interface AuditQuery {
  userId?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  riskLevel?: string
  limit?: number
  offset?: number
}

export class AuditLogger {
  private events: AuditEvent[] = []
  private readonly maxEvents = 10000 // Максимальное количество событий в памяти
  private suspiciousPatterns: Map<string, number> = new Map()

  /**
   * Логировать событие аудита
   */
  async logEvent(
    action: string,
    resource: string,
    options: {
      userId?: string
      sessionId?: string
      success: boolean
      details?: any
      ipAddress?: string
      userAgent?: string
      riskLevel?: 'low' | 'medium' | 'high' | 'critical'
      metadata?: Record<string, any>
    }
  ): Promise<string> {
    const eventId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const event: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      action,
      resource,
      success: options.success,
      riskLevel: options.riskLevel || this.calculateRiskLevel(action, resource, options.success),
      userId: options.userId,
      sessionId: options.sessionId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata
    }

    // Добавляем событие в память
    this.events.push(event)

    // Ограничиваем размер массива
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Анализируем на подозрительную активность
    await this.analyzeSuspiciousActivity(event)

    // В реальном проекте здесь было бы сохранение в базу данных
    await this.persistEvent(event)

    console.log(`📋 Audit: ${action} on ${resource} by ${options.userId || 'anonymous'} - ${options.success ? 'SUCCESS' : 'FAILED'}`)

    return eventId
  }

  /**
   * Получить события аудита по запросу
   */
  async getEvents(query: AuditQuery = {}): Promise<AuditEvent[]> {
    let filteredEvents = [...this.events]

    // Фильтрация по пользователю
    if (query.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === query.userId)
    }

    // Фильтрация по действию
    if (query.action) {
      filteredEvents = filteredEvents.filter(event => event.action === query.action)
    }

    // Фильтрация по ресурсу
    if (query.resource) {
      filteredEvents = filteredEvents.filter(event => event.resource === query.resource)
    }

    // Фильтрация по уровню риска
    if (query.riskLevel) {
      filteredEvents = filteredEvents.filter(event => event.riskLevel === query.riskLevel)
    }

    // Фильтрация по дате
    if (query.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= query.startDate!)
    }

    if (query.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= query.endDate!)
    }

    // Сортировка по времени (новые первые)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Пагинация
    const offset = query.offset || 0
    const limit = query.limit || 100

    return filteredEvents.slice(offset, offset + limit)
  }

  /**
   * Получить статистику аудита
   */
  getStatistics(timeframe?: { start: Date; end: Date }) {
    let events = this.events

    if (timeframe) {
      events = events.filter(event => 
        event.timestamp >= timeframe.start && event.timestamp <= timeframe.end
      )
    }

    const totalEvents = events.length
    const successfulEvents = events.filter(event => event.success).length
    const failedEvents = totalEvents - successfulEvents

    const eventsByAction = events.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByRisk = events.reduce((acc, event) => {
      acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByUser = events.reduce((acc, event) => {
      if (event.userId) {
        acc[event.userId] = (acc[event.userId] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0,
      eventsByAction,
      eventsByRisk,
      eventsByUser,
      timeframe: timeframe || { start: events[0]?.timestamp, end: events[events.length - 1]?.timestamp }
    }
  }

  /**
   * Получить подозрительную активность
   */
  getSuspiciousActivity(): Array<{ pattern: string; count: number; riskLevel: string }> {
    const suspicious = []

    for (const [pattern, count] of this.suspiciousPatterns.entries()) {
      let riskLevel = 'low'
      
      if (count > 10) riskLevel = 'medium'
      if (count > 50) riskLevel = 'high'
      if (count > 100) riskLevel = 'critical'

      suspicious.push({ pattern, count, riskLevel })
    }

    return suspicious.sort((a, b) => b.count - a.count)
  }

  /**
   * Рассчитать уровень риска события
   */
  private calculateRiskLevel(action: string, resource: string, success: boolean): 'low' | 'medium' | 'high' | 'critical' {
    // Критические действия
    const criticalActions = [
      'wallet_create',
      'private_key_export',
      'admin_access',
      'system_config_change',
      'user_delete'
    ]

    // Высокорискованные действия
    const highRiskActions = [
      'transfer',
      'withdraw',
      'swap',
      'lending_borrow',
      'staking_unstake',
      'password_change'
    ]

    // Среднерискованные действия
    const mediumRiskActions = [
      'login',
      'deposit',
      'staking_stake',
      'farming_add_liquidity',
      'profile_update'
    ]

    // Неудачные попытки повышают риск
    if (!success) {
      if (criticalActions.includes(action)) return 'critical'
      if (highRiskActions.includes(action)) return 'high'
      return 'medium'
    }

    // Определяем риск по типу действия
    if (criticalActions.includes(action)) return 'critical'
    if (highRiskActions.includes(action)) return 'high'
    if (mediumRiskActions.includes(action)) return 'medium'

    return 'low'
  }

  /**
   * Анализировать подозрительную активность
   */
  private async analyzeSuspiciousActivity(event: AuditEvent): Promise<void> {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    // Анализируем последние события за час
    const recentEvents = this.events.filter(e => 
      now - e.timestamp.getTime() < oneHour
    )

    // Проверяем частоту неудачных попыток
    if (!event.success) {
      const failedAttempts = recentEvents.filter(e => 
        e.userId === event.userId &&
        e.action === event.action &&
        !e.success
      ).length

      if (failedAttempts >= 5) {
        const pattern = `multiple_failed_${event.action}_${event.userId}`
        this.suspiciousPatterns.set(pattern, failedAttempts)
      }
    }

    // Проверяем необычную активность по IP
    if (event.ipAddress) {
      const ipEvents = recentEvents.filter(e => e.ipAddress === event.ipAddress)
      
      if (ipEvents.length > 100) { // Более 100 запросов за час
        const pattern = `high_frequency_ip_${event.ipAddress}`
        this.suspiciousPatterns.set(pattern, ipEvents.length)
      }
    }

    // Проверяем доступ к критическим ресурсам
    if (event.riskLevel === 'critical') {
      const criticalEvents = recentEvents.filter(e => 
        e.userId === event.userId && e.riskLevel === 'critical'
      ).length

      if (criticalEvents > 3) {
        const pattern = `multiple_critical_actions_${event.userId}`
        this.suspiciousPatterns.set(pattern, criticalEvents)
      }
    }

    // Проверяем географические аномалии (если есть данные)
    // Здесь можно добавить проверку на изменение геолокации

    // Проверяем паттерны User Agent
    if (event.userAgent) {
      const botPatterns = ['bot', 'crawler', 'spider', 'scraper']
      const isBot = botPatterns.some(pattern => 
        event.userAgent!.toLowerCase().includes(pattern)
      )

      if (isBot) {
        const pattern = `bot_activity_${event.ipAddress}`
        this.suspiciousPatterns.set(pattern, 1)
      }
    }
  }

  /**
   * Сохранить событие (в реальном проекте - в базу данных)
   */
  private async persistEvent(event: AuditEvent): Promise<void> {
    // В реальном проекте здесь было бы:
    // await prisma.auditEvent.create({ data: event })
    
    // Для демонстрации просто логируем
    if (event.riskLevel === 'critical' || event.riskLevel === 'high') {
      console.warn(`🚨 High-risk audit event: ${event.action} on ${event.resource}`, {
        userId: event.userId,
        success: event.success,
        riskLevel: event.riskLevel
      })
    }
  }

  /**
   * Очистить старые события
   */
  async cleanup(olderThan: Date): Promise<number> {
    const initialCount = this.events.length
    this.events = this.events.filter(event => event.timestamp > olderThan)
    
    const removedCount = initialCount - this.events.length
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old audit events`)
    }
    
    return removedCount
  }

  /**
   * Экспортировать события для анализа
   */
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'userId', 'action', 'resource', 'success', 'riskLevel', 'ipAddress']
      const csvRows = [
        headers.join(','),
        ...this.events.map(event => [
          event.id,
          event.timestamp.toISOString(),
          event.userId || '',
          event.action,
          event.resource,
          event.success.toString(),
          event.riskLevel,
          event.ipAddress || ''
        ].join(','))
      ]
      
      return csvRows.join('\n')
    }

    return JSON.stringify(this.events, null, 2)
  }
}

// Создаем глобальный экземпляр аудит-логгера
export const auditLogger = new AuditLogger()

// Автоматическая очистка старых событий каждые 24 часа
if (typeof window === 'undefined') { // Только на сервере
  setInterval(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await auditLogger.cleanup(thirtyDaysAgo)
  }, 24 * 60 * 60 * 1000)
}

/**
 * Middleware для автоматического логирования API запросов
 */
export function createAuditMiddleware() {
  return async (request: Request, userId?: string, sessionId?: string) => {
    const url = new URL(request.url)
    const action = `${request.method}_${url.pathname.replace(/^\/api\//, '').replace(/\//g, '_')}`
    const resource = url.pathname
    
    const startTime = Date.now()
    let success = true
    let details: any = {}

    try {
      // Здесь выполняется основная логика API
      return { success: true }
    } catch (error) {
      success = false
      details.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      // Логируем событие
      await auditLogger.logEvent(action, resource, {
        userId,
        sessionId,
        success,
        details: {
          ...details,
          duration: Date.now() - startTime,
          method: request.method
        },
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }
  }
}
