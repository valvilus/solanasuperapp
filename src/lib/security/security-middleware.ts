/**
 * Middleware безопасности для интеграции всех систем защиты
 */

import { NextRequest, NextResponse } from 'next/server'
import { attackPrevention } from './attack-prevention'
import { auditLogger } from './audit-logger'

interface SecurityContext {
  ip: string
  userAgent: string
  userId?: string
  sessionId?: string
  path: string
  method: string
}

interface SecurityCheckResult {
  allowed: boolean
  reason?: string
  rateLimitInfo?: {
    resetTime: number
    remaining: number
  }
  threat?: any
}

/**
 * Основной middleware безопасности
 */
export async function securityMiddleware(
  request: NextRequest,
  context: {
    userId?: string
    sessionId?: string
  } = {}
): Promise<SecurityCheckResult> {
  const securityContext: SecurityContext = {
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    userId: context.userId,
    sessionId: context.sessionId,
    path: new URL(request.url).pathname,
    method: request.method
  }

  // 1. Проверяем, не заблокирован ли источник
  const blocked = attackPrevention.isBlocked(securityContext.ip) || 
                  (securityContext.userId && attackPrevention.isBlocked(securityContext.userId))

  if (blocked) {
    await auditLogger.logEvent('request_blocked', securityContext.path, {
      userId: securityContext.userId,
      sessionId: securityContext.sessionId,
      success: false,
      ipAddress: securityContext.ip,
      userAgent: securityContext.userAgent,
      riskLevel: 'high',
      details: { reason: 'Source blocked due to previous threats' }
    })

    return {
      allowed: false,
      reason: 'Access blocked due to security policy'
    }
  }

  // 2. Определяем тип операции для rate limiting
  const ruleType = determineRateLimitRule(securityContext.path, securityContext.method)
  
  // 3. Проверяем rate limiting
  const rateLimitResult = attackPrevention.checkRateLimit(
    securityContext.userId || securityContext.ip,
    ruleType
  )

  if (!rateLimitResult.allowed) {
    await auditLogger.logEvent('rate_limit_exceeded', securityContext.path, {
      userId: securityContext.userId,
      sessionId: securityContext.sessionId,
      success: false,
      ipAddress: securityContext.ip,
      userAgent: securityContext.userAgent,
      riskLevel: 'medium',
      details: { 
        ruleType,
        resetTime: rateLimitResult.resetTime
      }
    })

    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      rateLimitInfo: {
        resetTime: rateLimitResult.resetTime!,
        remaining: rateLimitResult.remaining!
      }
    }
  }

  // 4. Проверяем на подозрительную активность
  const body = request.method !== 'GET' ? await getRequestBody(request) : undefined
  
  const suspiciousActivity = attackPrevention.detectSuspiciousActivity({
    ip: securityContext.ip,
    userAgent: securityContext.userAgent,
    userId: securityContext.userId,
    path: securityContext.path,
    method: securityContext.method,
    body
  })

  if (suspiciousActivity.blocked) {
    await auditLogger.logEvent('suspicious_activity_blocked', securityContext.path, {
      userId: securityContext.userId,
      sessionId: securityContext.sessionId,
      success: false,
      ipAddress: securityContext.ip,
      userAgent: securityContext.userAgent,
      riskLevel: 'critical',
      details: {
        threatType: suspiciousActivity.threat?.type,
        threatSeverity: suspiciousActivity.threat?.severity,
        threatDescription: suspiciousActivity.threat?.description
      }
    })

    return {
      allowed: false,
      reason: 'Suspicious activity detected',
      threat: suspiciousActivity.threat
    }
  }

  // 5. Логируем разрешенный запрос
  await auditLogger.logEvent('request_allowed', securityContext.path, {
    userId: securityContext.userId,
    sessionId: securityContext.sessionId,
    success: true,
    ipAddress: securityContext.ip,
    userAgent: securityContext.userAgent,
    riskLevel: 'low',
    details: {
      ruleType,
      remaining: rateLimitResult.remaining
    }
  })

  return {
    allowed: true,
    rateLimitInfo: {
      resetTime: rateLimitResult.resetTime!,
      remaining: rateLimitResult.remaining!
    },
    threat: suspiciousActivity.threat
  }
}

/**
 * Получить IP клиента
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return 'unknown'
}

/**
 * Определить правило rate limiting по пути
 */
function determineRateLimitRule(path: string, method: string): string {
  // Админские операции
  if (path.startsWith('/api/admin/')) {
    return 'admin_operations'
  }

  // Аутентификация
  if (path.includes('/auth/') || path.includes('/login')) {
    return 'auth_login'
  }

  // Создание кошельков
  if (path.includes('/wallet') && method === 'POST') {
    return 'wallet_creation'
  }

  // Финансовые операции
  const financialPaths = [
    '/api/defi/swap',
    '/api/defi/staking',
    '/api/defi/lending',
    '/api/defi/farming',
    '/api/onchain/transfers',
    '/api/onchain/withdrawals'
  ]

  if (financialPaths.some(fp => path.startsWith(fp))) {
    return 'financial_operations'
  }

  // Общие API запросы
  return 'api_general'
}

/**
 * Получить тело запроса
 */
async function getRequestBody(request: NextRequest): Promise<any> {
  try {
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      return await request.json()
    }
    
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const body: any = {}
      for (const [key, value] of formData.entries()) {
        body[key] = value
      }
      return body
    }
    
    return await request.text()
  } catch (error) {
    return null
  }
}

/**
 * Создать ответ об ошибке безопасности
 */
export function createSecurityErrorResponse(
  result: SecurityCheckResult,
  status: number = 429
): NextResponse {
  const response = NextResponse.json({
    error: 'Security policy violation',
    message: result.reason,
    code: 'SECURITY_BLOCKED'
  }, { status })

  // Добавляем заголовки rate limiting если доступны
  if (result.rateLimitInfo) {
    response.headers.set('X-RateLimit-Reset', result.rateLimitInfo.resetTime.toString())
    response.headers.set('X-RateLimit-Remaining', result.rateLimitInfo.remaining.toString())
  }

  // Добавляем заголовки безопасности
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

/**
 * Middleware для проверки CSRF токенов
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // Проверяем только для небезопасных методов
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  const token = request.headers.get('x-csrf-token') || 
                request.headers.get('x-xsrf-token')
  
  const cookie = request.cookies.get('csrf-token')?.value

  // В реальном проекте здесь была бы проверка подписи токена
  return token !== null && cookie !== null && token === cookie
}

/**
 * Middleware для проверки Content Security Policy
 */
export function validateContentSecurityPolicy(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type')
  
  // Проверяем только JSON запросы
  if (!contentType?.includes('application/json')) {
    return true
  }

  // Проверяем на подозрительные заголовки
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-forwarded-server',
    'x-forwarded-proto'
  ]

  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && !isValidHeaderValue(value)) {
      return false
    }
  }

  return true
}

/**
 * Проверить валидность значения заголовка
 */
function isValidHeaderValue(value: string): boolean {
  // Проверяем на подозрительные символы
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ]

  return !suspiciousPatterns.some(pattern => pattern.test(value))
}

/**
 * Wrapper для защищенных API роутов
 */
export function withSecurity(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any = {}) => {
    // Проверяем CSRF для небезопасных методов
    if (!validateCSRFToken(request)) {
      return NextResponse.json({
        error: 'CSRF token validation failed',
        code: 'CSRF_INVALID'
      }, { status: 403 })
    }

    // Проверяем CSP
    if (!validateContentSecurityPolicy(request)) {
      return NextResponse.json({
        error: 'Content Security Policy violation',
        code: 'CSP_VIOLATION'
      }, { status: 400 })
    }

    // Основная проверка безопасности
    const securityResult = await securityMiddleware(request, context)
    
    if (!securityResult.allowed) {
      return createSecurityErrorResponse(securityResult)
    }

    try {
      // Выполняем основной handler
      const response = await handler(request, {
        ...context,
        security: securityResult
      })

      // Добавляем заголовки безопасности к ответу
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      return response
    } catch (error) {
      // Логируем ошибку
      await auditLogger.logEvent('api_error', new URL(request.url).pathname, {
        userId: context.userId,
        sessionId: context.sessionId,
        success: false,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        riskLevel: 'medium',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }
}
