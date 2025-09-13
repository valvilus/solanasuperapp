'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Calendar, Users, DollarSign } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Button } from '@/components/ui/button'
import { CreateProposalForm, ProposalType } from '@/features/dao/types/dao.types'

interface CreateProposalModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (form: CreateProposalForm) => Promise<void>
  className?: string
}

const PROPOSAL_TYPES: Array<{ value: ProposalType; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: 'treasury',
    label: 'Казна',
    icon: <DollarSign className="w-5 h-5" />,
    description: 'Операции с казной DAO, переводы средств'
  },
  {
    value: 'governance',
    label: 'Управление',
    icon: <Users className="w-5 h-5" />,
    description: 'Изменения в управлении и правилах DAO'
  },
  {
    value: 'feature',
    label: 'Функциональность',
    icon: <FileText className="w-5 h-5" />,
    description: 'Новые функции и обновления платформы'
  },
  {
    value: 'community',
    label: 'Сообщество',
    icon: <Users className="w-5 h-5" />,
    description: 'Инициативы сообщества и события'
  }
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
    startDelay: 1, // часы
    duration: 7, // дни
    requiredQuorum: 1000, // TNG токены
    category: 'Фича',
    tags: [],
    actions: []
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    console.log(' Validating form data:', formData)

    if (!formData.title.trim()) {
      newErrors.title = 'Заголовок обязателен'
    } else if (formData.title.length < 10) {
      newErrors.title = 'Заголовок должен содержать минимум 10 символов'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Заголовок не должен превышать 100 символов'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно'
    } else if (formData.description.length < 50) {
      newErrors.description = 'Описание должно содержать минимум 50 символов'
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Описание не должно превышать 2000 символов'
    }

    if (formData.startDelay < 1) {
      newErrors.startDelay = 'Минимальная задержка 1 час'
    } else if (formData.startDelay > 168) { // 1 неделя
      newErrors.startDelay = 'Максимальная задержка 168 часов (1 неделя)'
    }

    if (formData.duration < 1) {
      newErrors.duration = 'Минимальная длительность 1 день'
    } else if (formData.duration > 30) {
      newErrors.duration = 'Максимальная длительность 30 дней'
    }

    if (formData.requiredQuorum < 100) {
      newErrors.requiredQuorum = 'Минимальный кворум 100 TNG'
    } else if (formData.requiredQuorum > 1000000) {
      newErrors.requiredQuorum = 'Максимальный кворум 1,000,000 TNG'
    }

    console.log(' Validation errors:', newErrors)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log(' Form submission started', { formData, isSubmitting })

    if (!validateForm()) {
      console.log(' Form validation failed', errors)
      return
    }

    setIsSubmitting(true)
    setErrors({}) // Очистить предыдущие ошибки
    
    try {
      console.log(' Calling onSubmit with:', formData)
      console.log(' onSubmit function:', typeof onSubmit)
      
      await onSubmit(formData)
      
      console.log(' Proposal created successfully')
      
      // Сбрасываем форму
      setFormData({
        title: '',
        description: '',
        type: 'feature',
        startDelay: 1,
        duration: 7,
        requiredQuorum: 1000,
        category: 'Фича',
        tags: [],
        actions: []
      })
      
      onClose()
    } catch (error: any) {
      console.error(' Error creating proposal:', error)
      const errorMessage = error?.message || error?.error || 'Произошла ошибка при создании предложения'
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof CreateProposalForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'type' && { category: PROPOSAL_TYPES.find(t => t.value === value)?.label || prev.category })
    }))
    
    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${className}`}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <SimpleCard className="flex flex-col bg-gray-900 border border-white/10 h-full overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-blue-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Создать предложение</h2>
                    <p className="text-sm text-gray-400">Предложите изменения для голосования в DAO</p>
                  </div>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-4 mobile-scroll-container">

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Заголовок */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Заголовок предложения *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                    errors.title ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder="Краткое описание предложения..."
                  maxLength={100}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.title && <p className="text-red-400 text-xs">{errors.title}</p>}
                  <p className="text-xs text-gray-500 ml-auto">{formData.title.length}/100</p>
                </div>
              </div>

              {/* Тип предложения */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Тип предложения *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROPOSAL_TYPES.map((type) => (
                    <motion.button
                      key={type.value}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateFormData('type', type.value)}
                      className={`p-4 rounded-lg border transition-all text-left min-h-[80px] flex flex-col justify-between ${
                        formData.type === type.value
                          ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        {type.icon}
                        <span className="font-medium text-sm truncate">{type.label}</span>
                      </div>
                      <p className="text-xs opacity-80 line-clamp-2 leading-relaxed">{type.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Подробное описание *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={6}
                  className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-none transition-colors ${
                    errors.description ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                  }`}
                  placeholder="Детальное объяснение предложения, его цели и ожидаемые результаты..."
                  maxLength={2000}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description && <p className="text-red-400 text-xs">{errors.description}</p>}
                  <p className="text-xs text-gray-500 ml-auto">{formData.description.length}/2000</p>
                </div>
              </div>

              {/* Параметры голосования */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Задержка начала (час)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={formData.startDelay}
                    onChange={(e) => updateFormData('startDelay', parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.startDelay ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                    }`}
                  />
                  {errors.startDelay && <p className="text-red-400 text-xs mt-1">{errors.startDelay}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Длительность (дни)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.duration}
                    onChange={(e) => updateFormData('duration', parseInt(e.target.value) || 7)}
                    className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.duration ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                    }`}
                  />
                  {errors.duration && <p className="text-red-400 text-xs mt-1">{errors.duration}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Кворум (TNG)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="1000000"
                    value={formData.requiredQuorum}
                    onChange={(e) => updateFormData('requiredQuorum', parseInt(e.target.value) || 1000)}
                    className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.requiredQuorum ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-blue-500'
                    }`}
                  />
                  {errors.requiredQuorum && <p className="text-red-400 text-xs mt-1">{errors.requiredQuorum}</p>}
                </div>
              </div>

              {/* Ошибка отправки */}
              {errors.submit && (
                <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                  {errors.submit}
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 order-2 sm:order-1"
                >
                  Отмена
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Создание...</span>
                    </div>
                  ) : (
                    'Опубликовать предложение'
                  )}
                </Button>
              </div>
            </form>
            </div>
          </SimpleCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
