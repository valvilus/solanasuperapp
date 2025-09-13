/**
 * Database Metrics API - Performance monitoring endpoint
 * GET /api/admin/db-metrics
 * Solana SuperApp Database Optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { dbMonitor } from '@/lib/monitoring/db-monitor'
import { memoryCache } from '@/lib/cache/memory-cache.service'

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const report = dbMonitor.generateReport()
    
    const cacheDetails = {
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    }

    return NextResponse.json({
      success: true,
      report,
      details: cacheDetails,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    dbMonitor.reset()
    
    memoryCache.clear()

    return NextResponse.json({
      success: true,
      message: 'DB metrics and cache cleared',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

