'use client'

/**
 * Editable Bio Component - Редактируемое описание профиля
 * Solana SuperApp Profile System
 */

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit, Check, X, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface EditableBioProps {
  bio: string
  onSave?: (newBio: string) => Promise<boolean>
  placeholder?: string
  maxLength?: number
  className?: string
}

export function EditableBio({ 
  bio, 
  onSave,
  placeholder = 'Расскажите о себе...',
  maxLength = 160,
  className = ''
}: EditableBioProps) {
  const { isAuthenticated } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [currentBio, setCurrentBio] = useState(bio)
  const [tempBio, setTempBio] = useState(bio)
  const [isSaving, setIsSaving] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Решение проблемы hydration - дожидаемся монтирования компонента
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Синхронизация с внешними изменениями
  useEffect(() => {
    setCurrentBio(bio)
    setTempBio(bio)
  }, [bio])

  const handleEdit = useCallback(() => {
    if (!isAuthenticated) return
    
    setIsEditing(true)
    setTempBio(currentBio)
    hapticFeedback.impact('light')
  }, [isAuthenticated, currentBio])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setTempBio(currentBio)
    hapticFeedback.impact('light')
  }, [currentBio])

  const handleSave = useCallback(async () => {
    if (tempBio === currentBio) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    hapticFeedback.impact('medium')

    try {
      const success = onSave ? await onSave(tempBio) : true
      
      if (success) {
        setCurrentBio(tempBio)
        setIsEditing(false)
        hapticFeedback.notification('success')
      } else {
        setTempBio(currentBio) 
        hapticFeedback.notification('error')
      }
    } catch (error) {
      setTempBio(currentBio)
      hapticFeedback.notification('error')
    } finally {
      setIsSaving(false)
    }
  }, [tempBio, currentBio, onSave])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  // Показывать пока компонент не смонтирован (избегаем hydration mismatch)
  if (!isMounted) {
    return (
      <div className={`text-gray-400 text-xs leading-relaxed ${className}`}>
        <div className="flex items-center gap-2">
          <User className="w-3 h-3" />
          <span className="italic">{placeholder}</span>
        </div>
      </div>
    )
  }

  // Показывать для неавторизованных пользователей
  if (!isAuthenticated) {
    return (
      <div className={`text-gray-400 text-xs leading-relaxed ${className}`}>
        <div className="flex items-center gap-2">
          <User className="w-3 h-3" />
          <span className="italic">{placeholder}</span>
        </div>
      </div>
    )
  }

  // Режимы с правильной анимацией
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <textarea
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value.slice(0, maxLength))}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                maxLength={maxLength}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-solana-purple focus:ring-1 focus:ring-solana-purple"
                rows={3}
                autoFocus
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {tempBio.length}/{maxLength}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg bg-gray-600/50 hover:bg-gray-600/70 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3 text-gray-300" />
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving || tempBio === currentBio}
                    className="p-1.5 rounded-lg bg-solana-purple/50 hover:bg-solana-purple/70 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="viewing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`group overflow-hidden`}
          >
            {currentBio ? (
              <div 
                className="relative cursor-pointer"
                onClick={handleEdit}
              >
                <p className="text-gray-300 text-xs leading-relaxed line-clamp-3 pr-6">
                  {currentBio}
                </p>
                
                {/* Edit Icon */}
                <button 
                  className="absolute top-0 right-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit()
                  }}
                >
                  <Edit className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 text-gray-500 text-xs hover:text-gray-400 transition-colors"
              >
                <User className="w-3 h-3" />
                <span className="italic">{placeholder}</span>
                <Edit className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
