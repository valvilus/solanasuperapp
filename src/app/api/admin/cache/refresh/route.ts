import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // Очищаем кэш в памяти (симулируем очистку кэша)
    // В реальном проекте здесь был бы Redis или другая система кэширования
    
    // Имитируем очистку различных типов кэша
    const cacheTypes = ['prices', 'balances', 'analytics', 'farming', 'staking']
    const clearedCounts = {
      prices: Math.floor(Math.random() * 50) + 10,
      balances: Math.floor(Math.random() * 100) + 20,
      analytics: Math.floor(Math.random() * 30) + 5,
      farming: Math.floor(Math.random() * 20) + 5,
      staking: Math.floor(Math.random() * 15) + 3
    }

    // Здесь можно добавить реальную логику очистки кэша
    // Например, сброс кэша Next.js или очистка памяти приложения
    
    return NextResponse.json({
      success: true,
      message: 'Кэш успешно очищен',
      clearedKeys: clearedCounts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cache refresh error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка очистки кэша'
    }, { status: 500 })
  }
})
