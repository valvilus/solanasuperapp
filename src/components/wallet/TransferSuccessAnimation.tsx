/**
 * Enhanced Transfer Confirmation & Success Page
 * Beautiful slide-to-confirm with comprehensive transfer details
 * Solana SuperApp - Wallet Page
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion'
import { 
  ArrowRight, 
  CheckCircle, 
  ArrowLeft, 
  DollarSign, 
  User, 
  Shield,
  Zap,
  Eye,
  Sparkles,
  ExternalLink,
  Copy,
  Link
} from 'lucide-react'
import { usePrices, TokenPrice } from '@/hooks/usePrices'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { TokenLogo } from '@/components/wallet/TokenLogos'

interface TransferConfirmationProps {
  isVisible: boolean
  onComplete: () => void
  onCancel: () => void
  amount: string
  token: string
  recipient: string
  recipientAddress?: string
  memo?: string
  isAnonymous?: boolean
  onConfirm: () => Promise<{success: boolean; signature?: string; explorerUrl?: string}>
  onRefreshBalances?: () => Promise<void>
}

export function TransferSuccessAnimation({ 
  isVisible, 
  onComplete, 
  onCancel,
  amount, 
  token, 
  recipient,
  recipientAddress,
  memo,
  isAnonymous = false,
  onConfirm,
  onRefreshBalances
}: TransferConfirmationProps) {
  const [confirmationStep, setConfirmationStep] = useState<'confirm' | 'processing' | 'success'>('confirm')
  const [slidePosition, setSlidePosition] = useState(0)
  const [isSlideCompleted, setIsSlideCompleted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transferResult, setTransferResult] = useState<{signature?: string; explorerUrl?: string} | null>(null)
  const [tokenPrices, setTokenPrices] = useState<Record<string, TokenPrice>>({})
  const { getPrices } = usePrices()

  // Motion values for smooth, synchronized slider movement
  const slideX = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Dynamic constants for responsive design
  const [sliderDimensions, setSliderDimensions] = useState({
    SLIDER_WIDTH: 320, // Default width, will be updated
    THUMB_WIDTH: 52,   // Slightly larger thumb
    THUMB_PADDING: 6   // More padding for smoother look
  })
  
  const { SLIDER_WIDTH, THUMB_WIDTH, THUMB_PADDING } = sliderDimensions
  const MAX_SLIDE = SLIDER_WIDTH - THUMB_WIDTH - THUMB_PADDING
  
  // Transform for gradient width - perfectly synced with thumb position
  const gradientWidth = useTransform(slideX, [0, MAX_SLIDE], [THUMB_WIDTH, SLIDER_WIDTH])
  
  // Transform for completion detection
  const slideProgress = useTransform(slideX, [0, MAX_SLIDE], [0, 1])

  // Измеряем ширину контейнера для адаптивности
  useEffect(() => {
    if (isVisible && containerRef.current) {
      const updateDimensions = () => {
        const containerWidth = containerRef.current?.offsetWidth || 320
        const availableWidth = containerWidth - 32 // Учитываем padding
        setSliderDimensions({
          SLIDER_WIDTH: availableWidth,
          THUMB_WIDTH: 52,
          THUMB_PADDING: 6
        })
      }
      
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [isVisible])

  // Загружаем цены при открытии
  useEffect(() => {
    if (isVisible) {
      getPrices([token]).then(setTokenPrices).catch(console.error)
    }
  }, [isVisible, token, getPrices])

  // Расчет USD эквивалента
  const getUSDValue = () => {
    const price = tokenPrices[token]?.price || 0
    const usdValue = parseFloat(amount) * price
    return usdValue.toFixed(2)
  }

  // Reset state and motion values when modal opens
  useEffect(() => {
    if (isVisible) {
      setConfirmationStep('confirm')
      setSlidePosition(0)
      setIsSlideCompleted(false)
      setIsProcessing(false)
      setLastProgress(0)
      setTransferResult(null)
      // Reset motion value immediately
      slideX.set(0)
    }
  }, [isVisible, slideX])

  // Обработка завершения слайда
  const handleSlideComplete = async () => {
    if (isSlideCompleted && !isProcessing) {
      setIsProcessing(true)
      setConfirmationStep('processing')
      
      // Вибрация при начале процесса
      const telegram = (window as any).Telegram
      if (telegram?.WebApp?.HapticFeedback) {
        telegram.WebApp.HapticFeedback.impactOccurred('heavy')
      }

      try {
        const result = await onConfirm()
        setTransferResult(result)
        setConfirmationStep('success')
        
        // Вибрация успеха
        const telegramSuccess = (window as any).Telegram
        if (telegramSuccess?.WebApp?.HapticFeedback) {
          telegramSuccess.WebApp.HapticFeedback.notificationOccurred('success')
        }
        
        // Длинная вибрация для успеха (Telegram)
        setTimeout(() => {
          const telegram = (window as any).Telegram
          if (telegram?.WebApp?.HapticFeedback) {
            telegram.WebApp.HapticFeedback.impactOccurred('heavy')
            // Дополнительные вибрации для эмфазы
            setTimeout(() => telegram.WebApp.HapticFeedback.impactOccurred('medium'), 100)
            setTimeout(() => telegram.WebApp.HapticFeedback.impactOccurred('light'), 200)
          }
        }, 500)
        
        // Через 4 секунды закрываем и обновляем балансы
        setTimeout(async () => {
          try {
            // Используем хук обновления балансов вместо перезагрузки страницы
            if (onRefreshBalances) {
              await onRefreshBalances()
            }
          } catch (error) {
            console.error('Error refreshing balances:', error)
          } finally {
            onComplete()
          }
        }, 4000)
        
      } catch (error) {
        // Вибрация ошибки
        const telegramError = (window as any).Telegram
        if (telegramError?.WebApp?.HapticFeedback) {
          telegramError.WebApp.HapticFeedback.notificationOccurred('error')
        }
        
        // Сброс состояния при ошибке
        setConfirmationStep('confirm')
        setSlidePosition(0)
        setIsSlideCompleted(false)
        setIsProcessing(false)
        setTransferResult(null)
      }
    }
  }

  // Real-time progress tracking for completion detection
  const [lastProgress, setLastProgress] = useState(0)
  
  // Enhanced pan handling with real-time motion values
  const handlePan = (event: any, info: PanInfo) => {
    // Clamp the position to valid range with smooth boundaries
    const newPosition = Math.max(0, Math.min(info.offset.x, MAX_SLIDE))
    
    // Update motion value immediately with GPU acceleration
    slideX.set(newPosition)
    
    // Calculate progress for haptic feedback
    const progress = newPosition / MAX_SLIDE
    
    // Haptic feedback at progress milestones (with hysteresis to prevent rapid firing)
    const progressDiff = Math.abs(progress - lastProgress)
    if (progressDiff > 0.01) { // Only update if significant change
      if (progress >= 0.25 && lastProgress < 0.25 && !isSlideCompleted) {
        hapticFeedback.selection()
      } else if (progress >= 0.5 && lastProgress < 0.5 && !isSlideCompleted) {
        hapticFeedback.impact('light')
      } else if (progress >= 0.75 && lastProgress < 0.75 && !isSlideCompleted) {
        hapticFeedback.impact('medium')
      }
      setLastProgress(progress)
    }
    
    // Check completion threshold
    const completionThreshold = 0.85
    if (progress >= completionThreshold && !isSlideCompleted) {
      setIsSlideCompleted(true)
      hapticFeedback.impact('heavy')
      
      // Celebration haptics
      setTimeout(() => hapticFeedback.selection(), 100)
      setTimeout(() => hapticFeedback.selection(), 200)
    } else if (progress < completionThreshold && isSlideCompleted) {
      setIsSlideCompleted(false)
      hapticFeedback.impact('light')
    }
  }

  // Handle pan end with smoother reset animation
  const handlePanEnd = () => {
    if (isSlideCompleted) {
      handleSlideComplete()
    } else {
      // Ultra-smooth animated reset to start position
      slideX.stop()
      animate(slideX, 0, { 
        type: "spring", 
        stiffness: 400, 
        damping: 35,
        mass: 0.8
      })
      setLastProgress(0)
    }
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.98) 100%)'
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-transparent to-solana-green/10" />
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-solana-purple/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              rotate: -360,
              scale: [1, 0.9, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-solana-green/5 rounded-full blur-3xl"
          />
        </div>

        {/* Main Content - Fixed Height for Consistency */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="relative z-10 w-full max-w-md flex flex-col"
          style={{ 
            height: 'auto', 
            minHeight: confirmationStep === 'confirm' ? '520px' : '580px', // Больше для processing/success
            maxHeight: 'calc(100vh - 2rem)' 
          }}
        >
          {/* Compact Header */}
          <div className="bg-black/40 backdrop-blur-xl rounded-t-3xl border border-white/10 border-b-0 p-4">
            <div className="flex items-center justify-between mb-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                disabled={confirmationStep !== 'confirm'}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
              
              <h2 className="text-xl font-bold text-white">
                {confirmationStep === 'confirm' && 'Подтверждение'}
                {confirmationStep === 'processing' && 'Отправка...'}
                {confirmationStep === 'success' && 'Успешно!'}
              </h2>
              
              <div className="w-10 h-10" />
            </div>

            {/* Compact Progress Steps */}
            <div className="flex items-center justify-center space-x-2 mb-3">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <motion.div
                    className={`w-3 h-3 rounded-full transition-colors ${
                      (step === 1 && confirmationStep === 'confirm') ||
                      (step === 2 && confirmationStep === 'processing') ||
                      (step === 3 && confirmationStep === 'success')
                        ? 'bg-solana-green' 
                        : step < (confirmationStep === 'processing' ? 2 : confirmationStep === 'success' ? 3 : 1)
                        ? 'bg-white/40'
                        : 'bg-white/20'
                    }`}
                    animate={{
                      scale: (step === 1 && confirmationStep === 'confirm') ||
                             (step === 2 && confirmationStep === 'processing') ||
                             (step === 3 && confirmationStep === 'success') ? [1, 1.2, 1] : 1
                    }}
                    transition={{ duration: 0.3, repeat: confirmationStep === 'processing' ? Infinity : 0 }}
                  />
                  {step < 3 && <div className="w-8 h-px bg-white/20 mx-2" />}
                </div>
              ))}
            </div>
          </div>

          {/* Consistent Content Area */}
          <div className={`bg-black/40 backdrop-blur-xl border border-white/10 border-t-0 border-b-0 p-4 flex-1 overflow-y-auto flex flex-col justify-center ${
            confirmationStep === 'confirm' ? 'min-h-[360px]' : 'min-h-[420px]'
          }`}>
            
            {/* Confirmation Step */}
            <AnimatePresence mode="wait">
              {confirmationStep === 'confirm' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 min-h-[300px] flex flex-col justify-center"
                >
                  {/* Minimalistic Amount Display */}
                  <div className="text-center mb-4">
                    {/* Token Icon */}
                    <motion.div
                      className="w-16 h-16 mx-auto mb-3"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4, ease: "backOut" }}
                    >
                      <TokenLogo 
                        token={token as 'SOL' | 'TNG'} 
                        size="lg" 
                        className={`w-16 h-16 ${token === 'SOL' ? 'text-[#00FFA3]' : 'text-solana-green'}`}
                      />
                    </motion.div>
                    
                    {/* Amount */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-white mb-1"
                    >
                      {amount} {token}
                    </motion.div>
                    
                    {/* USD Value */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-gray-400 mb-3"
                    >
                      ≈ ${getUSDValue()} USD
                    </motion.div>
                    
                    {/* Transfer type (minimal) */}
                    {isAnonymous && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="inline-flex items-center gap-1 text-xs text-purple-400"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Анонимно</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Simplified Transfer Details */}
                  <div className="space-y-2">
                    {/* Recipient - Compact */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Кому</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">{recipient}</div>
                        {recipientAddress && (
                          <div className="text-xs text-gray-500 font-mono truncate max-w-[140px]">
                            {recipientAddress}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Fee - Compact */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Комиссия</span>
                      </div>
                      <div className="text-green-400 text-sm font-medium">Бесплатно</div>
                    </motion.div>

                    {/* Network - Compact */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Сеть</span>
                      </div>
                      <div className="text-white text-sm">Solana</div>
                    </motion.div>

                    {/* Memo (if provided) - Compact */}
                    {memo && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="p-3 bg-white/5 rounded-lg"
                      >
                        <div className="text-xs text-gray-400 mb-1">Комментарий</div>
                        <div className="text-white text-sm">{memo}</div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Processing Step - Consistent Height */}
              {confirmationStep === 'processing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 flex flex-col justify-center min-h-[360px]"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 mx-auto mb-4"
                  >
                    <TokenLogo 
                      token={token as 'SOL' | 'TNG'} 
                      size="lg" 
                      className={`w-12 h-12 ${token === 'SOL' ? 'text-[#00FFA3]' : 'text-solana-green'}`}
                    />
                  </motion.div>
                  
                  <div className="text-lg font-medium text-white mb-1">
                    Отправляем {amount} {token}
                  </div>
                  <div className="text-sm text-gray-400">
                    Обработка транзакции...
                  </div>
                </motion.div>
              )}

              {/* Success Step - Consistent Height */}
              {confirmationStep === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 flex flex-col justify-center min-h-[360px] relative"
                >
                  {/* Success particles - minimal */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-green-400"
                      style={{
                        left: '50%',
                        top: '40%'
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: [0, Math.cos(i * 60 * Math.PI / 180) * 60],
                        y: [0, Math.sin(i * 60 * Math.PI / 180) * 60]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 0.2 + i * 0.1,
                        ease: "easeOut"
                      }}
                    />
                  ))}

                  {/* Success Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, ease: "backOut" }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center"
                    style={{
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>
                  
                  {/* Success Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      Успешно!
                    </div>
                    <div className="text-gray-300 mb-1">
                      {amount} {token} отправлено
                    </div>
                    <div className="text-sm text-gray-400 mb-4">
                      Транзакция подтверждена
                    </div>
                  </motion.div>

                  {/* Blockchain Explorer Links */}
                  {transferResult && (transferResult.explorerUrl || transferResult.signature) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="space-y-2 mb-4"
                    >
                      {/* Explorer Link */}
                      {transferResult.explorerUrl && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => window.open(transferResult.explorerUrl, '_blank')}
                          className="flex items-center justify-center gap-2 w-full p-3 bg-gradient-to-r from-solana-purple/20 to-solana-green/20 border border-solana-green/30 rounded-lg text-white hover:border-solana-green/50 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-sm font-medium">Посмотреть в блокчейне</span>
                        </motion.button>
                      )}

                      {/* Transaction Signature */}
                      {transferResult.signature && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                          className="p-3 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-400">Подпись транзакции</span>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(transferResult.signature!)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="Копировать подпись"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          <div className="mt-1 font-mono text-xs text-white truncate">
                            {transferResult.signature}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Auto-close notice */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-2 text-xs text-gray-500"
                  >
                    Закрытие через несколько секунд...
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slide to Confirm Button - Only for Confirmation Step */}
          {confirmationStep === 'confirm' && (
            <motion.div 
              ref={containerRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-black/40 backdrop-blur-xl rounded-b-3xl border border-white/10 border-t-0 p-4"
            >
              {/* Simplified Slider Track */}
              <div 
                className={`relative w-full h-14 rounded-xl border-2 overflow-hidden transition-colors duration-200 ${
                  isSlideCompleted 
                    ? 'bg-green-500/15 border-green-500/40' 
                    : 'bg-white/8 border-white/15'
                }`}
              >
                {/* Perfectly Synchronized Progress Fill */}
                <motion.div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-solana-purple to-solana-green opacity-30 rounded-xl"
                  style={{
                    width: gradientWidth,
                    willChange: 'width'
                  }}
                />

                {/* Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className={`font-medium text-sm transition-colors duration-200 ${
                    isSlideCompleted ? 'text-green-300' : 'text-white/70'
                  }`}>
                    {isSlideCompleted ? 'Отпустите для отправки' : 'Проведите для подтверждения →'}
                  </span>
                </div>

                {/* Smooth Slide Button - Perfect Sync */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: MAX_SLIDE }}
                  dragElastic={0}
                  dragMomentum={false}
                  onPan={handlePan}
                  onPanEnd={handlePanEnd}
                  whileDrag={{ scale: 1.05 }}
                  className="absolute cursor-grab active:cursor-grabbing flex items-center justify-center z-20"
                  style={{
                    width: THUMB_WIDTH,
                    height: THUMB_WIDTH - THUMB_PADDING,
                    x: slideX,
                    top: THUMB_PADDING / 2,
                    left: THUMB_PADDING / 2,
                    borderRadius: '10px',
                    background: isSlideCompleted 
                      ? '#10B981'
                      : '#ffffff',
                    boxShadow: isSlideCompleted
                      ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    // Убираем transition для мгновенного отклика
                    willChange: 'transform'
                  }}
                >
                  {isSlideCompleted ? (
                    <Zap className="w-5 h-5 text-white" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                  )}
                </motion.div>
              </div>

              {/* Security Notice - Compact */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-500"
              >
                <Shield className="w-3 h-3" />
                <span>Защищено Solana</span>
              </motion.div>
            </motion.div>
          )}

          {/* Spacer for processing/success steps to maintain consistent height */}
          {(confirmationStep === 'processing' || confirmationStep === 'success') && (
            <div className="bg-black/40 backdrop-blur-xl rounded-b-3xl border border-white/10 border-t-0 p-4">
              <div className="h-14 flex items-center justify-center">
                <div className="text-sm text-gray-400">
                  {confirmationStep === 'processing' ? 'Обработка...' : 'Готово!'}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}