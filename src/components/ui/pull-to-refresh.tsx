'use client'

import { ReactNode, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  refreshThreshold?: number
  maxPullDistance?: number
  isRefreshing?: boolean
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  refreshThreshold = 60,
  maxPullDistance = 100,
  isRefreshing = false
}: PullToRefreshProps) {
  const [isTriggered, setIsTriggered] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const lastY = useRef(0)
  const velocityY = useRef(0)
  const animationId = useRef<number | null>(null)
  
  // Use spring physics for ultra-smooth animations
  const y = useMotionValue(0)
  const smoothY = useSpring(y, { 
    stiffness: 400, 
    damping: 40,
    mass: 0.8
  })
  
  // Direct transforms - no nested hooks
  const pullProgress = useTransform(smoothY, [0, refreshThreshold], [0, 1])
  const iconRotation = useTransform(smoothY, [0, refreshThreshold], [0, 180])
  const indicatorOpacity = useTransform(smoothY, [0, 20], [0, 1])
  const iconScale = useTransform(smoothY, [0, refreshThreshold], [0.7, 1.1])

  // Add mount effect for hydration fix
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isAtTop = useCallback(() => {
    if (!isMounted || !containerRef.current) return true
    try {
      return containerRef.current.scrollTop === 0
    } catch (error) {
      console.warn('Error checking scroll position:', error)
      return true
    }
  }, [isMounted])

  // Optimized animation loop with safety checks
  const updatePull = useCallback((deltaY: number) => {
    if (!isMounted) return
    
    if (animationId.current !== null) {
      cancelAnimationFrame(animationId.current)
    }

    animationId.current = requestAnimationFrame(() => {
      try {
        // Smooth resistance curve
        const resistance = deltaY > 50 ? 0.3 : 0.6
        const pullDistance = Math.max(0, Math.min(deltaY * resistance, maxPullDistance))
        
        y.set(pullDistance)
        
        // Trigger logic with debouncing
        const shouldTrigger = pullDistance >= refreshThreshold
        if (shouldTrigger !== isTriggered) {
          setIsTriggered(shouldTrigger)
          try {
            hapticFeedback.impact(shouldTrigger ? 'medium' : 'light')
          } catch (error) {
            // Haptic feedback might not be available
          }
        }
      } catch (error) {
        console.warn('Error in updatePull:', error)
      }
    })
  }, [y, maxPullDistance, refreshThreshold, isTriggered, isMounted])

  const resetPull = useCallback(() => {
    if (!isMounted) return
    
    if (animationId.current !== null) {
      cancelAnimationFrame(animationId.current)
      animationId.current = null
    }
    
    try {
      // Use spring animation for reset
      y.set(0)
      setIsPulling(false)
      setIsTriggered(false)
    } catch (error) {
      console.warn('Error in resetPull:', error)
    }
  }, [y, isMounted])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMounted || !isAtTop() || isRefreshing) return
    
    try {
      if (e.touches && e.touches.length > 0) {
        startY.current = e.touches[0].clientY
        lastY.current = startY.current
        velocityY.current = 0
      }
    } catch (error) {
      console.warn('Error in handleTouchStart:', error)
    }
  }, [isAtTop, isRefreshing, isMounted])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isMounted || !isAtTop() || isRefreshing) return
    
    try {
      if (!e.touches || e.touches.length === 0) return
      
      const currentY = e.touches[0].clientY
      const deltaY = currentY - startY.current
      
      // Calculate velocity for smoother experience
      velocityY.current = currentY - lastY.current
      lastY.current = currentY
      
      // Only activate if pulling down from top
      if (deltaY > 5) {
        e.preventDefault() // Prevent scroll only when needed
        
        if (!isPulling) {
          setIsPulling(true)
          try {
            hapticFeedback.impact('light')
          } catch (error) {
            // Haptic feedback might not be available
          }
        }
        
        updatePull(deltaY)
      }
    } catch (error) {
      console.warn('Error in handleTouchMove:', error)
    }
  }, [isAtTop, isRefreshing, isPulling, updatePull, isMounted])

  const handleTouchEnd = useCallback(async () => {
    if (!isMounted || !isPulling) return
    
    try {
      const pullDistance = y.get()
      
      if (pullDistance >= refreshThreshold && !isRefreshing) {
        try {
          hapticFeedback.impact('heavy')
        } catch (error) {
          // Haptic feedback might not be available
        }
        setIsTriggered(true)
        
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh failed:', error)
        }
      }
      
      resetPull()
    } catch (error) {
      console.warn('Error in handleTouchEnd:', error)
      resetPull()
    }
  }, [isPulling, y, refreshThreshold, isRefreshing, onRefresh, resetPull, isMounted])

  // Optimized event listeners with safety checks
  useEffect(() => {
    if (!isMounted) return
    
    const container = containerRef.current
    if (!container) return

    try {
      // Use passive listeners where possible for better performance
      const options = { passive: false }
      const passiveOptions = { passive: true }

      container.addEventListener('touchstart', handleTouchStart, passiveOptions)
      container.addEventListener('touchmove', handleTouchMove, options)
      container.addEventListener('touchend', handleTouchEnd, passiveOptions)

      return () => {
        try {
          if (animationId.current !== null) {
            cancelAnimationFrame(animationId.current)
            animationId.current = null
          }
          container.removeEventListener('touchstart', handleTouchStart)
          container.removeEventListener('touchmove', handleTouchMove)
          container.removeEventListener('touchend', handleTouchEnd)
        } catch (error) {
          console.warn('Error cleaning up event listeners:', error)
        }
      }
    } catch (error) {
      console.warn('Error setting up event listeners:', error)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMounted])



  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isMounted) return
    
    try {
      const target = e.currentTarget
      if (target) {
        target.style.willChange = 'scroll-position'
        
        // Use requestIdleCallback if available, otherwise requestAnimationFrame
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            if (target) target.style.willChange = 'auto'
          })
        } else if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            if (target) target.style.willChange = 'auto'
          })
        }
      }
    } catch (error) {
      console.warn('Error in handleScroll:', error)
    }
  }, [isMounted])

  // Don't render anything until mounted to prevent hydration errors
  if (!isMounted) {
    return (
      <div className="relative overflow-hidden">
        <div 
          ref={containerRef}
          className="relative z-20 overflow-y-auto overflow-x-hidden"
          style={{
            transform: 'translateZ(0)',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth'
          }}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      {/* Optimized Pull Indicator - Only render when pulling */}
      {isMounted && isPulling && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ 
            height: smoothY,
            opacity: indicatorOpacity
          }}
        >
          <motion.div
            className={`w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm ${
              isTriggered 
                ? 'bg-gradient-to-r from-solana-purple/80 to-solana-green/80' 
                : 'bg-white/15'
            }`}
            style={{ 
              rotate: iconRotation,
              scale: iconScale
            }}
          >
            <RotateCcw 
              className={`w-3 h-3 ${
                isTriggered ? 'text-white' : 'text-gray-300'
              }`} 
            />
          </motion.div>
        </motion.div>
      )}

      {/* High-Performance Content Container */}
      <motion.div
        ref={containerRef}
        className="relative z-20 overflow-y-auto overflow-x-hidden will-change-transform"
        onScroll={handleScroll}
        style={{
          y: smoothY,
          // Hardware acceleration
          transform: 'translateZ(0)',
          // iOS momentum scrolling
          WebkitOverflowScrolling: 'touch',
          // Prevent overscroll
          overscrollBehavior: 'contain',
          // Smooth scrolling
          scrollBehavior: 'smooth'
        }}
      >
        {children}
      </motion.div>
      
      {/* Minimal Loading Indicator - Only when refreshing */}
      {isMounted && isRefreshing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 rounded-full border-2 border-solana-purple/60 border-t-solana-purple"
          />
        </motion.div>
      )}
    </div>
  )
}
