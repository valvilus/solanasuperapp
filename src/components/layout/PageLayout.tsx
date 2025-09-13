'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomTabBar } from '@/components/navigation/BottomTabBar'
import { useTelegram } from '@/components/telegram/TelegramProvider'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  showBackButton?: boolean
  onBackPress?: () => void
  onBack?: () => void // Alias for onBackPress
  showBottomNav?: boolean
  className?: string
  headerActions?: ReactNode
  fullScreen?: boolean
}

export function PageLayout({
  children,
  title,
  showBackButton = false,
  onBackPress,
  onBack,
  showBottomNav = true,
  className = '',
  headerActions,
  fullScreen = false
}: PageLayoutProps) {
  const { webApp } = useTelegram()

  const handleBackPress = () => {
    if (onBack) {
      onBack()
    } else if (onBackPress) {
      onBackPress()
    } else if (webApp?.BackButton) {
      webApp.BackButton.show()
    } else {
      window.history.back()
    }
  }

  // Анимации для страниц
  const pageVariants = {
    initial: { 
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    in: { 
      opacity: 1,
      y: 0,
      scale: 1
    },
    out: { 
      opacity: 0,
      y: -20,
      scale: 0.98
    }
  }

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
  }

  return (
    <div className={`min-h-screen bg-gradient-dark ${fullScreen ? '' : 'pb-20'} ${className}`}>
      {/* Header */}
      {(title || showBackButton || headerActions) && (
        <motion.header 
          className="sticky top-0 z-40 glass-card border-b border-white/10"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackPress}
                  className="p-2 hover:bg-white/10"
                >
                  <ArrowLeft size={20} />
                </Button>
              )}
              
              {title && (
                <motion.h1 
                  className="text-xl font-semibold text-gradient"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {title}
                </motion.h1>
              )}
            </div>
            
            {headerActions && (
              <motion.div 
                className="flex items-center space-x-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {headerActions}
              </motion.div>
            )}
          </div>
        </motion.header>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.main
          className={`flex-1 ${fullScreen ? '' : 'p-4'}`}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition as any}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.2 }}
        >
          <BottomTabBar />
        </motion.div>
      )}
      
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-5">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
      </div>
    </div>
  )
}

// Компонент секции страницы
interface PageSectionProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
  headerActions?: ReactNode
}

export function PageSection({ 
  children, 
  title, 
  description, 
  className = '',
  headerActions 
}: PageSectionProps) {
  return (
    <motion.section
      className={`space-y-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      {(title || description || headerActions) && (
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {title && (
              <h2 className="text-2xl font-bold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </motion.section>
  )
}

// Анимированный контейнер для карточек
interface AnimatedGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function AnimatedGrid({ 
  children, 
  columns = 2, 
  className = '' 
}: AnimatedGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }

  return (
    <motion.div
      className={`grid ${gridCols[columns]} gap-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {children}
    </motion.div>
  )
}
