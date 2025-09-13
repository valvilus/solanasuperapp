'use client'

import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  maxHeight?: string
  className?: string
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  maxHeight = 'max-h-[80vh]',
  className = '' 
}: BottomSheetProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      hapticFeedback.impact('light')
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleDragEnd = (event: any, info: PanInfo) => {
    // Close if dragged down more than 100px or with sufficient velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      hapticFeedback.impact('medium')
      onClose()
    }
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Enhanced Apple-style Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl"
            style={{ backdropFilter: 'blur(20px) saturate(180%)' }}
          />
          
          {/* Compact Apple-style Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.8 }}
            transition={{ 
              type: 'spring', 
              damping: 35, 
              stiffness: 400,
              duration: 0.4
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.15 }}
            onDragEnd={handleDragEnd}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              bg-black/40 backdrop-blur-2xl border border-white/10
              rounded-t-3xl shadow-2xl
              ${maxHeight} overflow-hidden
              ${className}
            `}
            style={{ 
              backdropFilter: 'blur(40px) saturate(150%)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(20,20,20,0.8) 50%, rgba(0,0,0,0.9) 100%)'
            }}
          >
            {/* Refined Drag Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-white/40 rounded-full" />
            </div>
            
            {/* Compact Header */}
            {title && (
              <div className="flex items-center justify-between px-4 pb-3">
                <h3 className="text-base font-bold text-white/90">{title}</h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 transition-all duration-200"
                >
                  <X className="w-4 h-4 text-white/70" />
                </motion.button>
              </div>
            )}
            
            {/* Compact Content */}
            <div className="px-4 pb-4 overflow-y-auto max-h-full">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
