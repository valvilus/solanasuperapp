import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SecurityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  details?: string
}

async function checkDatabaseSecurity(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []

  try {
    // Проверяем подозрительную активность
    const recentFailedTransactions = await prisma.transaction.count({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    checks.push({
      name: 'Неудачные транзакции',
      status: recentFailedTransactions > 100 ? 'warning' : 'pass',
      message: `${recentFailedTransactions} неудачных транзакций за 24 часа`,
      details: recentFailedTransactions > 100 ? 'Высокое количество неудачных транзакций может указывать на атаку' : undefined
    })

    // Проверяем подозрительные балансы
    const highValueUsers = await prisma.balance.count({
      where: {
        amountCached: {
          gte: BigInt('1000000000000') // Очень большие балансы
        }
      }
    })

    checks.push({
      name: 'Подозрительные балансы',
      status: highValueUsers > 5 ? 'warning' : 'pass',
      message: `${highValueUsers} пользователей с очень высокими балансами`,
      details: highValueUsers > 5 ? 'Проверьте легитимность высоких балансов' : undefined
    })

    // Проверяем активность пользователей
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const totalUsers = await prisma.user.count()
    const activityRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0

    checks.push({
      name: 'Активность пользователей',
      status: activityRate < 10 ? 'warning' : 'pass',
      message: `${activityRate.toFixed(1)}% пользователей активны за неделю`,
      details: activityRate < 10 ? 'Низкая активность может указывать на проблемы' : undefined
    })

  } catch (error) {
    checks.push({
      name: 'Проверка базы данных',
      status: 'fail',
      message: 'Ошибка доступа к базе данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }

  return checks
}

async function checkEnvironmentSecurity(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []

  // Проверяем критические переменные окружения
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'ENCRYPTION_KEY'
  ]

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    checks.push({
      name: `Переменная ${envVar}`,
      status: value ? 'pass' : 'fail',
      message: value ? 'Настроена' : 'Не настроена',
      details: !value ? 'Критическая переменная окружения отсутствует' : undefined
    })
  }

  // Проверяем режим разработки
  const isDev = process.env.NODE_ENV === 'development'
  checks.push({
    name: 'Режим разработки',
    status: isDev ? 'warning' : 'pass',
    message: isDev ? 'Включен режим разработки' : 'Продакшн режим',
    details: isDev ? 'В продакшне должен быть отключен режим разработки' : undefined
  })

  return checks
}

async function checkAPIEndpointsSecurity(): Promise<SecurityCheck[]> {
  const checks: SecurityCheck[] = []

  try {
    // Проверяем доступность критических эндпоинтов
    const criticalEndpoints = [
      '/api/auth/telegram',
      '/api/wallet',
      '/api/defi/staking',
      '/api/defi/swap',
      '/api/defi/lending'
    ]

    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
          method: 'GET'
        })
        
        checks.push({
          name: `Эндпоинт ${endpoint}`,
          status: response.status === 401 || response.status === 403 ? 'pass' : 'warning',
          message: `Статус: ${response.status}`,
          details: response.status === 200 ? 'Эндпоинт доступен без авторизации' : undefined
        })
      } catch (error) {
        checks.push({
          name: `Эндпоинт ${endpoint}`,
          status: 'fail',
          message: 'Недоступен',
          details: 'Ошибка подключения к эндпоинту'
        })
      }
    }
  } catch (error) {
    checks.push({
      name: 'Проверка API',
      status: 'fail',
      message: 'Ошибка проверки эндпоинтов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    })
  }

  return checks
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const [
      databaseChecks,
      environmentChecks,
      apiChecks
    ] = await Promise.all([
      checkDatabaseSecurity(),
      checkEnvironmentSecurity(),
      checkAPIEndpointsSecurity()
    ])

    const allChecks = [
      ...databaseChecks,
      ...environmentChecks,
      ...apiChecks
    ]

    const summary = {
      total: allChecks.length,
      passed: allChecks.filter(c => c.status === 'pass').length,
      warnings: allChecks.filter(c => c.status === 'warning').length,
      failed: allChecks.filter(c => c.status === 'fail').length
    }

    const overallStatus = summary.failed > 0 ? 'critical' :
                         summary.warnings > 0 ? 'warning' : 'secure'

    return NextResponse.json({
      success: true,
      message: `Сканирование завершено: ${overallStatus}`,
      timestamp: new Date().toISOString(),
      summary,
      checks: allChecks,
      recommendations: [
        summary.failed > 0 ? 'Немедленно исправьте критические уязвимости' : null,
        summary.warnings > 0 ? 'Рассмотрите предупреждения безопасности' : null,
        'Регулярно проводите сканирование безопасности',
        'Следите за обновлениями зависимостей'
      ].filter(Boolean)
    })
  } catch (error) {
    console.error('Security scan error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка сканирования безопасности'
    }, { status: 500 })
  }
})
