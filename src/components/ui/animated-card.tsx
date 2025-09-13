'use client'

import { forwardRef, ReactNode } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  tilt?: boolean
  glow?: boolean
  glass?: boolean
  delay?: number
  motionProps?: MotionProps
  variant?: 'default' | 'floating' | 'glass' | 'solid'
  onClick?: () => void
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className,
    children,
    hover = true,
    tilt = false,
    glow = false,
    glass = true,
    delay = 0,
    motionProps,
    variant = 'default',
    ...props 
  }, ref) => {
    
    // Варианты карточек
    const variants = {
      default: 'glass-card',
      floating: 'glass-card shadow-2xl',
      glass: 'glass backdrop-blur-xl',
      solid: 'bg-card border'
    }

    // Анимации появления
    const cardVariants = {
      hidden: { 
        opacity: 0, 
        y: 20, 
        scale: 0.95,
        rotateX: tilt ? 10 : 0
      },
      visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        rotateX: 0,
        transition: {
          duration: 0.5,
          delay,
          type: "spring",
          stiffness: 100,
          damping: 15
        }
      }
    }

    // Hover эффекты
    const hoverEffects = hover ? {
      whileHover: {
        scale: 1.02,
        y: -4,
        rotateX: tilt ? -5 : 0,
        rotateY: tilt ? 2 : 0,
        boxShadow: glow 
          ? "0 10px 30px rgba(153, 69, 255, 0.3)" 
          : "0 10px 30px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2 }
      },
      whileTap: {
        scale: 0.98,
        transition: { duration: 0.1 }
      }
    } : {}

    return (
      <motion.div
        ref={ref}
        className={cn(
          variants[variant],
          'transition-all duration-200 cursor-pointer',
          tilt && 'perspective-1000',
          glow && 'hover:shadow-purple-500/25',
          className
        )}
        variants={cardVariants as any}
        initial="hidden"
        animate="visible"
        {...hoverEffects}
        {...motionProps}
        style={{
          transformStyle: tilt ? 'preserve-3d' : undefined,
          ...motionProps?.style
        }}
      >
        <Card className="bg-transparent border-0 shadow-none h-full" {...props}>
          {children}
        </Card>
        
        {/* Glow effect overlay */}
        {glow && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg opacity-0 pointer-events-none"
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
    )
  }
)

AnimatedCard.displayName = "AnimatedCard"

// Специализированные компоненты карточек

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  color?: string
  onClick?: () => void
  badge?: number | string
  className?: string
}

export function FeatureCard({ 
  icon, 
  title, 
  description, 
  color = '#9945FF',
  onClick,
  badge,
  className 
}: FeatureCardProps) {
  return (
    <AnimatedCard 
      className={cn("relative group cursor-pointer", className)}
      onClick={onClick}
      hover
      glow
    >
      <div className="p-6 text-center space-y-4">
        {/* Badge */}
        {badge && (
          <motion.div 
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {badge}
          </motion.div>
        )}
        
        {/* Icon */}
        <motion.div 
          className="flex justify-center"
          whileHover={{ 
            scale: 1.1, 
            rotate: 5,
            filter: `drop-shadow(0 0 10px ${color}40)`
          }}
          style={{ color }}
        >
          {icon}
        </motion.div>
        
        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        
        {/* Hover line */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </AnimatedCard>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  className?: string
}

export function StatCard({ 
  label, 
  value, 
  change, 
  trend = 'neutral',
  icon,
  className 
}: StatCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400', 
    neutral: 'text-muted-foreground'
  }

  return (
    <AnimatedCard className={cn("", className)} glass>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-primary"
            >
              {icon}
            </motion.div>
          )}
        </div>
        
        <div className="space-y-1">
          <motion.p 
            className="text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {value}
          </motion.p>
          
          {change && (
            <motion.p 
              className={cn("text-sm", trendColors[trend])}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              {change}
            </motion.p>
          )}
        </div>
      </div>
    </AnimatedCard>
  )
}
