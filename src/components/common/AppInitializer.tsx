'use client'

/**
 * App Initializer - Предзагрузка критичных компонентов
 * Solana SuperApp - Ускорение приложения
 */

import { useEffect } from 'react'
import ModulePreloader from '@/lib/optimized/ModulePreloader'

interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  useEffect(() => {
    // Предзагружаем критичные модули в фоне
    const preloader = ModulePreloader.getInstance()
    
    if (!preloader.isReady()) {
      // Запускаем предзагрузку с задержкой, чтобы не блокировать UI
      const timer = setTimeout(() => {
        preloader.preloadCriticalModules()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [])

  return <>{children}</>
}

// HOC для автоматической предзагрузки
export function withAppInitializer<P extends object>(
  Component: React.ComponentType<P>
) {
  return function InitializedComponent(props: P) {
    return (
      <AppInitializer>
        <Component {...props} />
      </AppInitializer>
    )
  }
}
