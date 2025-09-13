import { EventEmitter } from 'events'
import { prisma } from '@/lib/prisma'
import { Connection } from '@solana/web3.js'

export interface SystemAlert {
  id: string
  type: 'performance' | 'security' | 'system' | 'business'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: Date
  resolved: boolean
  metadata?: any
}

export interface SystemMetrics {
  timestamp: Date
  performance: {
    avgResponseTime: number
    requestsPerMinute: number
    errorRate: number
    activeConnections: number
  }
  business: {
    totalUsers: number
    activeUsers: number
    totalTVL: number
    transactionsPerHour: number
  }
  system: {
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
    networkLatency: number
  }
}

class SystemMonitorService extends EventEmitter {
  private isMonitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private metrics: SystemMetrics[] = []
  private alerts: SystemAlert[] = []
  private readonly MAX_METRICS_HISTORY = 1000
  private readonly MONITORING_INTERVAL = 30000 // 30 секунд

  constructor() {
    super()
    this.startMonitoring()
  }

  private async safeAggregate(operation: () => Promise<any>): Promise<{ _sum: { [key: string]: bigint | null } }> {
    try {
      return await operation()
    } catch (error: any) {
      // Если таблица не существует (P2021) или колонка не найдена (P2022), возвращаем пустой результат
      if (error?.code === 'P2021' || error?.code === 'P2022') {
        console.warn('Database table/column not found, returning empty aggregate:', error.message)
        return { _sum: {} }
      }
      throw error
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics()
        await this.checkAlerts()
      } catch (error) {
        console.error('System monitoring error:', error)
      }
    }, this.MONITORING_INTERVAL)

    console.log('System monitoring started')
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('System monitoring stopped')
  }

  private async collectMetrics() {
    const timestamp = new Date()

    // Собираем метрики производительности
    const performance = await this.collectPerformanceMetrics()
    
    // Собираем бизнес метрики
    const business = await this.collectBusinessMetrics()
    
    // Собираем системные метрики
    const system = await this.collectSystemMetrics()

    const metrics: SystemMetrics = {
      timestamp,
      performance,
      business,
      system
    }

    // Добавляем метрики в историю
    this.metrics.push(metrics)
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift()
    }

    // Эмитим событие с новыми метриками
    this.emit('metrics', metrics)
  }

  private async collectPerformanceMetrics() {
    try {
      // Получаем статистику транзакций за последний час
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const [totalTransactions, failedTransactions] = await Promise.all([
        prisma.transaction.count({
          where: {
            createdAt: { gte: oneHourAgo }
          }
        }),
        prisma.transaction.count({
          where: {
            createdAt: { gte: oneHourAgo },
            status: 'FAILED'
          }
        })
      ])

      // Получаем среднее время ответа из последних транзакций
      const recentTransactions = await prisma.transaction.findMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: { not: null },
          createdAt: { gte: oneHourAgo }
        },
        take: 100,
        select: {
          createdAt: true,
          confirmedAt: true
        }
      })

      const avgResponseTime = recentTransactions.length > 0
        ? recentTransactions.reduce((acc, tx) => {
            if (tx.confirmedAt) {
              return acc + (tx.confirmedAt.getTime() - tx.createdAt.getTime())
            }
            return acc
          }, 0) / recentTransactions.length
        : 0

      return {
        avgResponseTime: Math.round(avgResponseTime),
        requestsPerMinute: Math.round(totalTransactions / 60),
        errorRate: totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0,
        activeConnections: await this.getActiveConnections()
      }
    } catch (error) {
      console.error('Error collecting performance metrics:', error)
      return {
        avgResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        activeConnections: 0
      }
    }
  }

  private async collectBusinessMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const [
        totalUsers,
        activeUsers,
        totalStaked,
        totalLent,
        recentTransactions
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastLoginAt: { gte: oneDayAgo }
          }
        }),
        this.safeAggregate(() => prisma.userStake.aggregate({
          _sum: { amount: true }
        })),
        this.safeAggregate(() => prisma.userLendingPosition.aggregate({
          _sum: { suppliedAmount: true }
        })),
        prisma.transaction.count({
          where: {
            createdAt: { gte: oneHourAgo }
          }
        })
      ])

      // Рассчитываем TVL (с безопасной обработкой missing tables)
      const stakedValue = Number(totalStaked._sum?.amount || 0) * 0.5 // TNG price
      const lentValue = Number(totalLent._sum?.suppliedAmount || 0) * 1 // USDC price
      const totalTVL = stakedValue + lentValue

      return {
        totalUsers,
        activeUsers,
        totalTVL: Math.round(totalTVL),
        transactionsPerHour: recentTransactions
      }
    } catch (error) {
      console.error('Error collecting business metrics:', error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalTVL: 0,
        transactionsPerHour: 0
      }
    }
  }

  private async collectSystemMetrics() {
    try {
      // Получаем системные метрики (Node.js process)
      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      // Проверяем задержку сети до Solana RPC
      const networkLatency = await this.measureSolanaLatency()

      return {
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: Math.round((cpuUsage.user + cpuUsage.system) / 1000), // ms
        diskUsage: 0, // Placeholder - можно добавить реальную проверку диска
        networkLatency
      }
    } catch (error) {
      console.error('Error collecting system metrics:', error)
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        networkLatency: 0
      }
    }
  }

  private async measureSolanaLatency(): Promise<number> {
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
      const startTime = Date.now()
      await connection.getSlot()
      return Date.now() - startTime
    } catch (error) {
      return -1 // Индикатор ошибки
    }
  }

  private async getActiveConnections(): Promise<number> {
    // Placeholder - можно добавить реальный подсчет активных соединений
    return Math.floor(Math.random() * 100) + 50
  }

  private async checkAlerts() {
    const latestMetrics = this.metrics[this.metrics.length - 1]
    if (!latestMetrics) return

    const newAlerts: SystemAlert[] = []

    // Проверяем производительность
    if (latestMetrics.performance.avgResponseTime > 5000) {
      newAlerts.push(this.createAlert(
        'performance',
        'high',
        'Высокое время отклика',
        `Среднее время отклика: ${latestMetrics.performance.avgResponseTime}ms`
      ))
    }

    if (latestMetrics.performance.errorRate > 10) {
      newAlerts.push(this.createAlert(
        'performance',
        'critical',
        'Высокий уровень ошибок',
        `Уровень ошибок: ${latestMetrics.performance.errorRate.toFixed(1)}%`
      ))
    }

    // Проверяем системные ресурсы
    if (latestMetrics.system.memoryUsage > 1000) { // > 1GB
      newAlerts.push(this.createAlert(
        'system',
        'medium',
        'Высокое использование памяти',
        `Использование памяти: ${latestMetrics.system.memoryUsage}MB`
      ))
    }

    if (latestMetrics.system.networkLatency > 2000 || latestMetrics.system.networkLatency === -1) {
      newAlerts.push(this.createAlert(
        'system',
        'high',
        'Проблемы с сетевым подключением',
        latestMetrics.system.networkLatency === -1 
          ? 'Нет подключения к Solana RPC'
          : `Высокая задержка: ${latestMetrics.system.networkLatency}ms`
      ))
    }

    // Проверяем бизнес метрики
    if (latestMetrics.business.transactionsPerHour === 0) {
      newAlerts.push(this.createAlert(
        'business',
        'medium',
        'Отсутствие транзакций',
        'Нет транзакций за последний час'
      ))
    }

    // Добавляем новые алерты
    for (const alert of newAlerts) {
      this.addAlert(alert)
    }
  }

  private createAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    title: string,
    description: string,
    metadata?: any
  ): SystemAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      timestamp: new Date(),
      resolved: false,
      metadata
    }
  }

  private addAlert(alert: SystemAlert) {
    // Проверяем, нет ли уже похожего активного алерта
    const existingAlert = this.alerts.find(a => 
      !a.resolved && a.title === alert.title && a.type === alert.type
    )

    if (!existingAlert) {
      this.alerts.push(alert)
      this.emit('alert', alert)
      
      // Ограничиваем количество алертов
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100)
      }
    }
  }

  // Публичные методы для получения данных
  getLatestMetrics(): SystemMetrics | null {
    return this.metrics[this.metrics.length - 1] || null
  }

  getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.metrics.slice(-limit)
  }

  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  getAllAlerts(limit: number = 50): SystemAlert[] {
    return this.alerts.slice(-limit)
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.emit('alertResolved', alert)
      return true
    }
    return false
  }

  getSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const activeAlerts = this.getActiveAlerts()
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical')
    const highAlerts = activeAlerts.filter(a => a.severity === 'high')

    if (criticalAlerts.length > 0) return 'critical'
    if (highAlerts.length > 0 || activeAlerts.length > 5) return 'warning'
    return 'healthy'
  }
}

// Singleton instance
export const systemMonitor = new SystemMonitorService()
