'use client'

/**
 * NoSSR Component - Принудительный Client-Side Rendering для TMA
 * Полностью отключает Server-Side Rendering и гидратацию
 */

import { useState, useEffect, ReactNode } from 'react'

interface NoSSRProps {
  children: ReactNode
  fallback?: ReactNode
}

export function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default NoSSR
