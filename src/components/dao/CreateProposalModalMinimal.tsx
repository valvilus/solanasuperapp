'use client'

import React, { useState } from 'react'
import './modal-styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, DollarSign, Users, Settings } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Button } from '@/components/ui/button'
import { CreateProposalForm, ProposalType } from '@/features/dao/types/dao.types'

interface CreateProposalModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (form: CreateProposalForm) => Promise<void>
  className?: string
}

const PROPOSAL_TYPES: Array<{ value: ProposalType; label: string; icon: React.ReactNode }> = [
  { value: 'treasury', label: 'Казна', icon: <DollarSign className="w-4 h-4" /> },
  { value: 'governance', label: 'Управление', icon: <Settings className="w-4 h-4" /> },
  { value: 'feature', label: 'Функции', icon: <FileText className="w-4 h-4" /> },
  { value: 'community', label: 'Сообщество', icon: <Users className="w-4 h-4" /> }
]

export function CreateProposalModal({
  isOpen,
  onClose,
  onSubmit,
  className = ''
}: CreateProposalModalProps) {
  const [formData, setFormData] = useState<CreateProposalForm>({
    title: '',
    description: '',
    type: 'feature',
    category: 'general',
    tags: [],
    actions: [],
    startDelay: 1,
    duration: 7,
    requiredQuorum: 1000
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateFormData = (field: keyof CreateProposalForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = 'Название обязательно'
    if (formData.title.length > 100) newErrors.title = 'Максимум 100 символов'
    if (!formData.description.trim()) newErrors.description = 'Описание обязательно'
    if (formData.description.length > 500) newErrors.description = 'Максимум 500 символов'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'feature',
        category: 'general',
        tags: [],
        actions: [],
        startDelay: 1,
        duration: 7,
        requiredQuorum: 1000
      })
    } catch (error: any) {
      setErrors({ submit: error.message || 'Ошибка создания предложения' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ height: '100vh', overflow: 'hidden' }}
        >
          {/* Minimal spacer сверху */}
          <div className="h-4 flex-shrink-0" />
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 pt-2 modal-scrollable modal-content modal-bottom-safe">
            <motion.div
              className={`w-full max-w-md ${className}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
            <SimpleCard className="p-6 border border-white/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Создать предложение</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Тип</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPOSAL_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateFormData('type', type.value)}
                        className={`p-3 rounded-lg border transition-all ${
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {type.icon}
                          <span className="text-sm">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Название <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                      errors.title ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                    }`}
                    placeholder="Краткое название предложения"
                    maxLength={100}
                  />
                  {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
                  <p className="text-gray-400 text-xs mt-1">{formData.title.length}/100</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Описание <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors resize-none ${
                      errors.description ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                    }`}
                    placeholder="Подробное описание предложения"
                    rows={3}
                    maxLength={500}
                  />
                  {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
                  <p className="text-gray-400 text-xs mt-1">{formData.description.length}/500</p>
                </div>

                {/* Duration & Quorum */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Дни</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.duration}
                      onChange={(e) => updateFormData('duration', parseInt(e.target.value) || 7)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Кворум</label>
                    <input
                      type="number"
                      min="100"
                      value={formData.requiredQuorum}
                      onChange={(e) => updateFormData('requiredQuorum', parseInt(e.target.value) || 1000)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                    {errors.submit}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Создание...</span>
                      </div>
                    ) : (
                      'Создать'
                    )}
                  </Button>
                </div>
              </form>
              </SimpleCard>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
