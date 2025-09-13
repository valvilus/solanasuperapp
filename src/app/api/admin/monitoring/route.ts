import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { systemMonitor } from '@/lib/monitoring/system-monitor.service'

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: {
            health: systemMonitor.getSystemHealth(),
            latestMetrics: systemMonitor.getLatestMetrics(),
            activeAlerts: systemMonitor.getActiveAlerts(),
            timestamp: new Date().toISOString()
          }
        })

      case 'metrics':
        const limit = parseInt(searchParams.get('limit') || '100')
        return NextResponse.json({
          success: true,
          data: {
            metrics: systemMonitor.getMetricsHistory(limit),
            count: systemMonitor.getMetricsHistory(limit).length
          }
        })

      case 'alerts':
        const alertLimit = parseInt(searchParams.get('limit') || '50')
        const activeOnly = searchParams.get('active') === 'true'
        
        return NextResponse.json({
          success: true,
          data: {
            alerts: activeOnly 
              ? systemMonitor.getActiveAlerts()
              : systemMonitor.getAllAlerts(alertLimit)
          }
        })

      case 'health':
        return NextResponse.json({
          success: true,
          data: {
            status: systemMonitor.getSystemHealth(),
            activeAlertsCount: systemMonitor.getActiveAlerts().length,
            lastUpdate: systemMonitor.getLatestMetrics()?.timestamp || null
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения данных мониторинга'
    }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { action, alertId } = body

    switch (action) {
      case 'resolve-alert':
        if (!alertId) {
          return NextResponse.json({
            success: false,
            error: 'ID алерта не указан'
          }, { status: 400 })
        }

        const resolved = systemMonitor.resolveAlert(alertId)
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Алерт закрыт' : 'Алерт не найден'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Monitoring POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка обработки запроса'
    }, { status: 500 })
  }
})
