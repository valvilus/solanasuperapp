/**
 * Premium Create Interface Component - Advanced NFT Creation
 * Solana SuperApp - Premium Design System
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Eye, 
  Zap,
  Sparkles,
  Palette,
  FileText,
  CheckCircle,
  AlertCircle,
  Camera,
  Folder,
  Ticket,
  Tag,
  Award,
  Gem
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import { useOptimizedNFT } from '@/hooks/useOptimizedNFT'
import type { NftItem } from '@/features/nft/types'

interface PremiumCreateInterfaceProps {
  onNftCreated: (nft: NftItem) => void
  onError: (error: string) => void
  className?: string
}

interface NFTAttribute {
  trait_type: string
  value: string
}

interface CreateFormData {
  name: string
  description: string
  type: 'TICKET' | 'COUPON' | 'BADGE' | 'COLLECTIBLE' | 'CERTIFICATE'
  image: File | null
  attributes: NFTAttribute[]
}

const NFT_TYPES = [
  {
    id: 'TICKET' as const,
    label: 'Билет',
    icon: Ticket,
    description: 'Билеты на события, концерты, мероприятия',
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400'
  },
  {
    id: 'COUPON' as const,
    label: 'Купон',
    icon: Tag,
    description: 'Купоны на скидки, подарки, услуги',
    color: 'from-green-500/20 to-green-600/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400'
  },
  {
    id: 'BADGE' as const,
    label: 'Значок',
    icon: Award,
    description: 'Достижения, награды, статусы',
    color: 'from-yellow-500/20 to-yellow-600/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-400'
  },
  {
    id: 'COLLECTIBLE' as const,
    label: 'Коллекционный',
    icon: Gem,
    description: 'Уникальные предметы коллекционирования',
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400'
  }
]

export function PremiumCreateInterface({ 
  onNftCreated, 
  onError, 
  className = '' 
}: PremiumCreateInterfaceProps) {
  const [step, setStep] = useState<'type' | 'form' | 'preview' | 'creating'>('type')
  const [isCreating, setIsCreating] = useState(false)
  const { createNft } = useOptimizedNFT()
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    description: '',
    type: 'COLLECTIBLE',
    image: null,
    attributes: []
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageSelect(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  // Handle image selection
  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, image: file }))
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      hapticFeedback.impact('light')
    } else {
      onError('Пожалуйста, выберите изображение')
    }
  }

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  // Add attribute
  const addAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }]
    }))
    hapticFeedback.impact('light')
  }

  // Remove attribute
  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }))
    hapticFeedback.impact('light')
  }

  // Update attribute
  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }))
  }

  // Create NFT
  const handleCreateNFT = async () => {
    if (!formData.name.trim()) {
      onError('Введите название NFT')
      return
    }

    if (!formData.image) {
      onError('Выберите изображение для NFT')
      return
    }

    setIsCreating(true)
    setStep('creating')
    hapticFeedback.impact('medium')

    try {
      // Prepare form data for API
      const createFormData = new FormData()
      createFormData.append('name', formData.name.trim())
      createFormData.append('description', formData.description.trim())
      createFormData.append('type', formData.type)
      createFormData.append('image', formData.image)
      
      // Add attributes
      if (formData.attributes.length > 0) {
        const validAttributes = formData.attributes.filter(
          attr => attr.trait_type.trim() && attr.value.trim()
        )
        createFormData.append('attributes', JSON.stringify(validAttributes))
      }

      // Call API
      const result = await createNft(createFormData)
      
      if (result) {
        hapticFeedback.notification('success')
        onNftCreated(result)
      } else {
        throw new Error('Не удалось создать NFT')
      }
    } catch (error) {
      console.error('Failed to create NFT:', error)
      hapticFeedback.notification('error')
      onError(error instanceof Error ? error.message : 'Ошибка создания NFT')
      setStep('form')
    } finally {
      setIsCreating(false)
    }
  }

  // Validate form
  const isFormValid = formData.name.trim() && formData.image

  return (
    <motion.div
      className={`px-5 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <motion.div
            key="type-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Palette className="w-6 h-6 text-solana-purple" />
                Создать NFT
              </h2>
              <p className="text-gray-400">Выберите тип цифрового актива</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {NFT_TYPES.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, type: type.id }))
                    setStep('form')
                    hapticFeedback.impact('medium')
                  }}
                  className="cursor-pointer group"
                >
                  <SimpleCard className={cn(
                    'p-6 border transition-all duration-300 relative overflow-hidden',
                    formData.type === type.id
                      ? `${type.borderColor} bg-gradient-to-br ${type.color}`
                      : 'border-white/10 hover:border-white/20 bg-gradient-to-br from-white/5 to-white/[0.02]'
                  )}>
                    <div className="relative z-10">
                      <div className="mb-3">
                        <type.icon className={cn(
                          'w-8 h-8',
                          formData.type === type.id ? type.textColor : 'text-gray-400'
                        )} />
                      </div>
                      <h3 className={cn(
                        'text-lg font-semibold mb-2',
                        formData.type === type.id ? type.textColor : 'text-white'
                      )}>
                        {type.label}
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                    
                    {/* Selection indicator */}
                    {formData.type === type.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </SimpleCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-solana-green" />
                  Детали NFT
                </h2>
                <p className="text-gray-400">Заполните информацию о вашем NFT</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setStep('type')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            {/* Image Upload */}
            <SimpleCard className="p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-solana-purple" />
                Изображение
              </h3>
              
              {!imagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group',
                    dragActive
                      ? 'border-solana-purple bg-solana-purple/10'
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  )}
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-solana-purple" />
                    </div>
                    <div>
                      <p className="text-white font-medium mb-2">
                        Перетащите изображение сюда
                      </p>
                      <p className="text-gray-400 text-sm mb-4">
                        или нажмите для выбора файла
                      </p>
                      <div className="flex justify-center gap-2">
                        <SimpleButton
                          onClick={() => document.getElementById('image-input')?.click()}
                          className="flex items-center gap-2"
                        >
                          <Folder className="w-4 h-4" />
                          Выбрать файл
                        </SimpleButton>
                        <SimpleButton
                          onClick={() => {
                            // Camera functionality would go here
                            onError('Камера пока недоступна')
                          }}
                          className="flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Камера
                        </SimpleButton>
                      </div>
                    </div>
                  </div>
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="relative w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden border border-white/20">
                    <img
                      src={imagePreview}
                      alt="NFT Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setImagePreview(null)
                      setFormData(prev => ({ ...prev, image: null }))
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </motion.button>
                </div>
              )}
            </SimpleCard>

            {/* Basic Info */}
            <SimpleCard className="p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Основная информация</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Введите название NFT..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-solana-purple/50 focus:border-solana-purple/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Опишите ваш NFT..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-solana-purple/50 focus:border-solana-purple/30 transition-all resize-none"
                  />
                </div>
              </div>
            </SimpleCard>

            {/* Attributes */}
            <SimpleCard className="p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Атрибуты</h3>
                <SimpleButton
                  onClick={addAttribute}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </SimpleButton>
              </div>
              
              {formData.attributes.length > 0 ? (
                <div className="space-y-3">
                  {formData.attributes.map((attr, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3"
                    >
                      <input
                        type="text"
                        value={attr.trait_type}
                        onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                        placeholder="Тип (например, Цвет)"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-solana-purple/50 text-sm"
                      />
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                        placeholder="Значение (например, Синий)"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-solana-purple/50 text-sm"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeAttribute(index)}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">
                  Атрибуты помогают описать уникальные свойства вашего NFT
                </p>
              )}
            </SimpleCard>

            {/* Actions */}
            <div className="flex gap-3">
              <SimpleButton
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Назад
              </SimpleButton>
              <SimpleButton
                onClick={() => setStep('preview')}
                gradient
                disabled={!isFormValid}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Предпросмотр
              </SimpleButton>
            </div>
          </motion.div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-solana-blue" />
                  Предпросмотр
                </h2>
                <p className="text-gray-400">Проверьте как будет выглядеть ваш NFT</p>
              </div>
            </div>

            {/* Preview Card */}
            <div className="max-w-sm mx-auto">
              <SimpleCard className="aspect-[4/5] p-4 border border-white/15 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.12] backdrop-blur-md relative overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/[0.08] via-transparent to-solana-green/[0.08]" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-60" />
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Новый
                    </Badge>
                  </div>

                  <div className="relative w-full aspect-square mb-4 flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt={formData.name}
                        className="w-full h-full object-cover rounded-xl border border-white/20 shadow-lg"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-purple-500/20 via-blue-500/15 to-green-500/20 border border-white/20 flex items-center justify-center text-5xl backdrop-blur-sm shadow-lg">
                        {(() => {
                          const type = NFT_TYPES.find(t => t.id === formData.type);
                          if (type) {
                            const Icon = type.icon;
                            return <Icon className="w-12 h-12 text-gray-400" />;
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-white font-semibold text-sm line-clamp-1">
                      {formData.name || 'Название NFT'}
                    </h4>
                    
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {formData.description || 'Описание NFT'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{NFT_TYPES.find(t => t.id === formData.type)?.label}</span>
                      <span>Новый</span>
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </div>

            {/* Attributes Preview */}
            {formData.attributes.length > 0 && (
              <SimpleCard className="p-4 border border-white/10">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Атрибуты</h4>
                <div className="grid grid-cols-2 gap-2">
                  {formData.attributes
                    .filter(attr => attr.trait_type.trim() && attr.value.trim())
                    .map((attr, index) => (
                      <div key={index} className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400">{attr.trait_type}</p>
                        <p className="text-sm text-white font-medium">{attr.value}</p>
                      </div>
                    ))}
                </div>
              </SimpleCard>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <SimpleButton
                onClick={() => setStep('form')}
                className="flex-1"
              >
                Редактировать
              </SimpleButton>
              <SimpleButton
                onClick={handleCreateNFT}
                gradient
                disabled={isCreating}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Создать NFT
              </SimpleButton>
            </div>
          </motion.div>
        )}

        {/* Step 4: Creating */}
        {step === 'creating' && (
          <motion.div
            key="creating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12"
          >
            <SimpleCard className="p-8 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-transparent to-solana-green/10" />
              
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-solana-purple to-solana-green flex items-center justify-center"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  Создание NFT...
                </h3>
                <p className="text-gray-400 mb-6">
                  Ваш цифровой актив минтится в блокчейне Solana
                </p>
                
                <div className="flex justify-center">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ 
                          duration: 0.6, 
                          repeat: Infinity, 
                          delay: i * 0.2 
                        }}
                        className="w-2 h-2 bg-solana-purple rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
