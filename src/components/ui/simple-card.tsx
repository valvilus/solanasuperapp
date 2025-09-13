'use client'

import { forwardRef, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SimpleCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export const SimpleCard = forwardRef<HTMLDivElement, SimpleCardProps>(
  ({ className, children, onClick, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm p-4",
          className
        )}
        whileTap={onClick ? { scale: 0.96 } : undefined}
        whileHover={onClick ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

SimpleCard.displayName = "SimpleCard"
