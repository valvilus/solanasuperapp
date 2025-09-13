'use client'

import { forwardRef, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface SimpleButtonProps {
  children: ReactNode
  className?: string
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void
  gradient?: boolean
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
}

export const SimpleButton = forwardRef<HTMLButtonElement, SimpleButtonProps>(
  ({ className, children, onClick, gradient = false, size = 'default', disabled = false, ...props }, ref) => {
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && onClick) {
        hapticFeedback.impact('light')
        onClick(e)
      }
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      default: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all touch-manipulation",
          gradient 
            ? "bg-gradient-to-r from-solana-purple to-solana-green text-white shadow-lg hover:shadow-xl"
            : "bg-white/10 text-white hover:bg-white/20 border border-white/20",
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        whileTap={!disabled ? { scale: 0.96 } : undefined}
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.15 }}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

SimpleButton.displayName = "SimpleButton"
