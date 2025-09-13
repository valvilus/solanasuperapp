/**
 * Система предотвращения атак и защиты
 */

interface RateLimitRule {
  windowMs: number // Окно времени в миллисекундах
  maxRequests: number // Максимальное количество запросов
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

interface SecurityThreat {
  id: string
  type: 'brute_force' | 'ddos' | 'sql_injection' | 'xss' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string // IP или user ID
  timestamp: Date
  description: string
  blocked: boolean
  metadata?: any
}

export class AttackPreventionSystem {
  private rateLimits = new Map<string, RateLimitEntry>()
  private blockedIPs = new Set<string>()
  private blockedUsers = new Set<string>()
  private threats: SecurityThreat[] = []
  private suspiciousPatterns = new Map<string, number>()

  // Правила rate limiting для разных типов запросов
  private rateLimitRules: Record<string, RateLimitRule> = {
    // Общие API запросы
    'api_general': {
      windowMs: 60 * 1000, // 1 минута
      maxRequests: 100
    },
    
    // Аутентификация
    'auth_login': {
      windowMs: 15 * 60 * 1000, // 15 минут
      maxRequests: 5,
      skipSuccessfulRequests: true
    },
    
    // Финансовые операции
    'financial_operations': {
      windowMs: 60 * 1000, // 1 минута
      maxRequests: 10
    },
    
    // Админские операции
    'admin_operations': {
      windowMs: 60 * 1000, // 1 минута
      maxRequests: 20
    },
    
    // Создание кошельков
    'wallet_creation': {
      windowMs: 60 * 60 * 1000, // 1 час
      maxRequests: 3
    }
  }

  /**
   * Проверить rate limit для запроса
   */
  checkRateLimit(
    identifier: string, // IP или user ID
    ruleType: string,
    success?: boolean
  ): { allowed: boolean; resetTime?: number; remaining?: number } {
    const rule = this.rateLimitRules[ruleType]
    if (!rule) {
      return { allowed: true }
    }

    // Пропускаем проверку для определенных типов запросов
    if (success && rule.skipSuccessfulRequests) {
      return { allowed: true }
    }
    if (!success && rule.skipFailedRequests) {
      return { allowed: true }
    }

    const key = `${ruleType}:${identifier}`
    const now = Date.now()
    
    let entry = this.rateLimits.get(key)
    
    // Создаем новую запись или сбрасываем если окно истекло
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + rule.windowMs,
        blocked: false
      }
    }

    entry.count++
    
    // Проверяем лимит
    if (entry.count > rule.maxRequests) {
      entry.blocked = true
      this.handleRateLimitExceeded(identifier, ruleType, entry.count)
      
      this.rateLimits.set(key, entry)
      return { 
        allowed: false, 
        resetTime: entry.resetTime,
        remaining: 0
      }
    }

    this.rateLimits.set(key, entry)
    return { 
      allowed: true, 
      resetTime: entry.resetTime,
      remaining: rule.maxRequests - entry.count
    }
  }

  /**
   * Проверить на подозрительную активность
   */
  detectSuspiciousActivity(
    request: {
      ip: string
      userAgent?: string
      userId?: string
      path: string
      method: string
      body?: any
    }
  ): { threat: SecurityThreat | null; blocked: boolean } {
    const threats: SecurityThreat[] = []

    // Проверка на SQL инъекции
    const sqlInjectionThreat = this.detectSQLInjection(request)
    if (sqlInjectionThreat) threats.push(sqlInjectionThreat)

    // Проверка на XSS
    const xssThreat = this.detectXSS(request)
    if (xssThreat) threats.push(xssThreat)

    // Проверка на подозрительные паттерны
    const suspiciousThreat = this.detectSuspiciousPatterns(request)
    if (suspiciousThreat) threats.push(suspiciousThreat)

    // Проверка на DDoS
    const ddosThreat = this.detectDDoS(request)
    if (ddosThreat) threats.push(ddosThreat)

    // Выбираем наиболее серьезную угрозу
    const mainThreat = threats.reduce((max, threat) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
      return severityOrder[threat.severity] > severityOrder[max?.severity || 'low'] ? threat : max
    }, null as SecurityThreat | null)

    let blocked = false

    if (mainThreat) {
      // Сохраняем угрозу
      this.threats.push(mainThreat)
      
      // Блокируем при высоком или критическом уровне
      if (mainThreat.severity === 'high' || mainThreat.severity === 'critical') {
        blocked = true
        this.blockSource(mainThreat.source, mainThreat.type)
      }
    }

    return { threat: mainThreat, blocked }
  }

  /**
   * Обнаружение SQL инъекций
   */
  private detectSQLInjection(request: any): SecurityThreat | null {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(OR|AND)\s+\d+\s*=\s*\d+/i,
      /'\s*(OR|AND)\s*'[^']*'\s*=\s*'/i,
      /--/,
      /\/\*.*\*\//,
      /;\s*(DROP|DELETE|INSERT|UPDATE)/i
    ]

    const checkString = JSON.stringify(request.body || '') + request.path

    for (const pattern of sqlPatterns) {
      if (pattern.test(checkString)) {
        return {
          id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'sql_injection',
          severity: 'critical',
          source: request.ip,
          timestamp: new Date(),
          description: 'Potential SQL injection attempt detected',
          blocked: true,
          metadata: {
            pattern: pattern.toString(),
            request: {
              path: request.path,
              method: request.method,
              userAgent: request.userAgent
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Обнаружение XSS атак
   */
  private detectXSS(request: any): SecurityThreat | null {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>.*?<\/iframe>/i,
      /eval\s*\(/i,
      /document\.cookie/i,
      /window\.location/i
    ]

    const checkString = JSON.stringify(request.body || '') + request.path

    for (const pattern of xssPatterns) {
      if (pattern.test(checkString)) {
        return {
          id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'xss',
          severity: 'high',
          source: request.ip,
          timestamp: new Date(),
          description: 'Potential XSS attack detected',
          blocked: true,
          metadata: {
            pattern: pattern.toString(),
            request: {
              path: request.path,
              method: request.method,
              userAgent: request.userAgent
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Обнаружение подозрительных паттернов
   */
  private detectSuspiciousPatterns(request: any): SecurityThreat | null {
    const suspiciousPatterns = [
      // Сканирование директорий
      /\.\.\//,
      /\/etc\/passwd/,
      /\/proc\/self\/environ/,
      
      // Попытки доступа к админским путям
      /\/(admin|administrator|wp-admin|phpmyadmin)/i,
      
      // Подозрительные User-Agent
      /sqlmap|nmap|nikto|dirbuster|burp|acunetix/i
    ]

    const checkString = request.path + (request.userAgent || '')

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        // Увеличиваем счетчик подозрительной активности
        const patternKey = `${request.ip}:${pattern.toString()}`
        const count = (this.suspiciousPatterns.get(patternKey) || 0) + 1
        this.suspiciousPatterns.set(patternKey, count)

        return {
          id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'suspicious_activity',
          severity: count > 3 ? 'high' : 'medium',
          source: request.ip,
          timestamp: new Date(),
          description: 'Suspicious activity pattern detected',
          blocked: count > 3,
          metadata: {
            pattern: pattern.toString(),
            count,
            request: {
              path: request.path,
              method: request.method,
              userAgent: request.userAgent
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Обнаружение DDoS атак
   */
  private detectDDoS(request: any): SecurityThreat | null {
    const now = Date.now()
    const oneMinute = 60 * 1000
    const fiveMinutes = 5 * 60 * 1000

    // Подсчитываем запросы за последние 5 минут от этого IP
    const recentThreats = this.threats.filter(threat => 
      threat.source === request.ip &&
      now - threat.timestamp.getTime() < fiveMinutes
    )

    // Если более 100 запросов за 5 минут - подозрение на DDoS
    if (recentThreats.length > 100) {
      return {
        id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ddos',
        severity: 'critical',
        source: request.ip,
        timestamp: new Date(),
        description: 'Potential DDoS attack detected',
        blocked: true,
        metadata: {
          requestCount: recentThreats.length,
          timeframe: '5 minutes'
        }
      }
    }

    return null
  }

  /**
   * Заблокировать источник угрозы
   */
  private blockSource(source: string, threatType: string): void {
    // Определяем, это IP или user ID
    if (this.isIPAddress(source)) {
      this.blockedIPs.add(source)
      console.warn(`🚫 Blocked IP ${source} due to ${threatType}`)
    } else {
      this.blockedUsers.add(source)
      console.warn(`🚫 Blocked user ${source} due to ${threatType}`)
    }

    // Автоматически разблокировать через определенное время
    setTimeout(() => {
      this.unblockSource(source)
    }, this.getBlockDuration(threatType))
  }

  /**
   * Разблокировать источник
   */
  unblockSource(source: string): void {
    if (this.isIPAddress(source)) {
      this.blockedIPs.delete(source)
      console.log(`✅ Unblocked IP ${source}`)
    } else {
      this.blockedUsers.delete(source)
      console.log(`✅ Unblocked user ${source}`)
    }
  }

  /**
   * Проверить, заблокирован ли источник
   */
  isBlocked(source: string): boolean {
    if (this.isIPAddress(source)) {
      return this.blockedIPs.has(source)
    } else {
      return this.blockedUsers.has(source)
    }
  }

  /**
   * Получить длительность блокировки
   */
  private getBlockDuration(threatType: string): number {
    const durations = {
      'brute_force': 15 * 60 * 1000, // 15 минут
      'ddos': 60 * 60 * 1000, // 1 час
      'sql_injection': 24 * 60 * 60 * 1000, // 24 часа
      'xss': 60 * 60 * 1000, // 1 час
      'suspicious_activity': 30 * 60 * 1000 // 30 минут
    }

    return durations[threatType] || 15 * 60 * 1000
  }

  /**
   * Обработка превышения rate limit
   */
  private handleRateLimitExceeded(identifier: string, ruleType: string, count: number): void {
    const threat: SecurityThreat = {
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'brute_force',
      severity: count > 20 ? 'critical' : count > 10 ? 'high' : 'medium',
      source: identifier,
      timestamp: new Date(),
      description: `Rate limit exceeded for ${ruleType}`,
      blocked: count > 10,
      metadata: {
        ruleType,
        count,
        threshold: this.rateLimitRules[ruleType]?.maxRequests
      }
    }

    this.threats.push(threat)

    if (count > 10) {
      this.blockSource(identifier, 'brute_force')
    }
  }

  /**
   * Проверить, является ли строка IP адресом
   */
  private isIPAddress(str: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    
    return ipv4Regex.test(str) || ipv6Regex.test(str)
  }

  /**
   * Получить статистику угроз
   */
  getThreatStatistics(timeframe?: { start: Date; end: Date }) {
    let threats = this.threats

    if (timeframe) {
      threats = threats.filter(threat => 
        threat.timestamp >= timeframe.start && threat.timestamp <= timeframe.end
      )
    }

    const totalThreats = threats.length
    const blockedThreats = threats.filter(threat => threat.blocked).length

    const threatsByType = threats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const threatsBySeverity = threats.reduce((acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalThreats,
      blockedThreats,
      blockRate: totalThreats > 0 ? (blockedThreats / totalThreats) * 100 : 0,
      threatsByType,
      threatsBySeverity,
      currentlyBlockedIPs: this.blockedIPs.size,
      currentlyBlockedUsers: this.blockedUsers.size
    }
  }

  /**
   * Очистить старые данные
   */
  cleanup(olderThan: Date): void {
    // Очищаем старые угрозы
    const initialCount = this.threats.length
    this.threats = this.threats.filter(threat => threat.timestamp > olderThan)
    
    // Очищаем старые rate limits
    const now = Date.now()
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key)
      }
    }

    console.log(`🧹 Security cleanup: removed ${initialCount - this.threats.length} old threats`)
  }
}

// Глобальный экземпляр системы предотвращения атак
export const attackPrevention = new AttackPreventionSystem()

// Автоматическая очистка каждые 6 часов
if (typeof window === 'undefined') { // Только на сервере
  setInterval(() => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    attackPrevention.cleanup(sixHoursAgo)
  }, 6 * 60 * 60 * 1000)
}
