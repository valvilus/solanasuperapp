'use client'

import { forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'

interface AnimatedButtonProps {
  children: React.ReactNode
  className?: string
  haptic?: 'light' | 'medium' | 'heavy'
  notification?: 'success' | 'error' | 'warning'
  animation?: 'scale' | 'bounce' | 'pulse' | 'glow'
  gradient?: boolean
  motionProps?: MotionProps
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  onClick?: () => void
  disabled?: boolean
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className,
    haptic = 'light',
    notification,
    animation = 'scale',
    gradient = false,
    motionProps,
    onClick,
    children,
    disabled,
    ...props 
  }, ref) => {
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      
      // Тактильная обратная связь
      hapticFeedback.impact(haptic)
      
      // Уведомления
      if (notification) {
        hapticFeedback.notification(notification)
      }
      
      // Вызов оригинального onClick
      onClick?.()
    }

    // Анимации
    const animations = {
      scale: {
        whileTap: { scale: 0.95 },
        whileHover: { scale: 1.02 },
        transition: { type: "spring", stiffness: 400, damping: 25 }
      },
      bounce: {
        whileTap: { scale: 0.9, y: 2 },
        whileHover: { y: -2 },
        transition: { type: "spring", stiffness: 600, damping: 20 }
      },
      pulse: {
        whileHover: { scale: [1, 1.05, 1] },
        transition: { duration: 0.3, repeat: Infinity }
      },
      glow: {
        whileHover: { 
          boxShadow: "0 0 20px rgba(153, 69, 255, 0.5)",
          scale: 1.02 
        },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.2 }
      }
    }

    const selectedAnimation = animations[animation]

    return (
      <motion.div
        {...(selectedAnimation as any)}
        {...(motionProps as any)}
      >
        <Button
          ref={ref}
          className={cn(
            'relative overflow-hidden transition-all duration-200',
            gradient && 'gradient-solana text-white border-0',
            animation === 'glow' && 'hover:shadow-lg',
            className
          )}
          onClick={handleClick}
          disabled={disabled}
          {...props}
        >
          {/* Градиентный overlay для обычных кнопок */}
          {!gradient && animation === 'glow' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
          
          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full scale-0"
            whileTap={{ scale: [0, 1], opacity: [1, 0] }}
            transition={{ duration: 0.3 }}
          />
          
          <span className="relative z-10">
            {children}
          </span>
        </Button>
      </motion.div>
    )
  }
)

AnimatedButton.displayName = "AnimatedButton"
