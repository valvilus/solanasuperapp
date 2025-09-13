'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface FloatingActionButtonProps {
  onClick: () => void
  icon: ReactNode
  label?: string
  className?: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

export function FloatingActionButton({ 
  onClick, 
  icon, 
  label, 
  className = '',
  variant = 'primary',
  size = 'md'
}: FloatingActionButtonProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14', 
    lg: 'w-16 h-16'
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  }

  const handleClick = () => {
    hapticFeedback.impact('medium')
    onClick()
  }

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.1, y: -4 }}
      whileTap={{ scale: 0.95 }}
      whileFocus={{ scale: 1.05 }}
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 45 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25 
      }}
      className={`
        fixed bottom-24 right-5 z-40
        ${sizeClasses[size]}
        ${variant === 'primary' 
          ? 'bg-gradient-to-r from-solana-purple to-solana-green shadow-lg shadow-solana-purple/30' 
          : 'bg-white/10 border border-white/20 backdrop-blur-md'
        }
        rounded-full
        flex items-center justify-center
        transition-all duration-300
        thumb-friendly
        hover:shadow-xl hover:shadow-solana-purple/40
        group
        ${className}
      `}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-solana-purple/20 to-solana-green/20 blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Icon */}
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
        className={`${iconSizes[size]} text-white relative z-10`}
      >
        {icon}
      </motion.div>
      
      {/* Label tooltip */}
      {label && (
        <motion.div
          initial={{ opacity: 0, x: 10, scale: 0.8 }}
          whileHover={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute right-full mr-3 px-3 py-2 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap backdrop-blur-sm border border-white/10 pointer-events-none"
        >
          {label}
          <div className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 w-0 h-0 border-l-4 border-l-black/80 border-t-2 border-b-2 border-t-transparent border-b-transparent" />
        </motion.div>
      )}
    </motion.button>
  )
}
