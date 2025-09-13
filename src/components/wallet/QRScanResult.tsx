/**
 * QR Scan Result Modal - SendModal-style result display
 * Solana SuperApp - QR Scanner Components
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  RotateCcw, 
  Send,
  Copy,
  Wallet,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface ScanResult {
  address: string
  amount?: string
  token?: string
  label?: string
  message?: string
}

interface QRScanResultProps {
  isVisible: boolean
  scanResult: ScanResult | null
  onClose: () => void
  onRetry: () => void
  onUseAddress: (address: string) => void
}

export function QRScanResult({ 
  isVisible, 
  scanResult, 
  onClose, 
  onRetry, 
  onUseAddress 
}: QRScanResultProps) {
  
  const handleUseAddress = () => {
    if (scanResult) {
      hapticFeedback.impact('heavy')
      hapticFeedback.notification('success')
      onUseAddress(scanResult.address)
    }
  }

  const handleCopyAddress = async () => {
    if (scanResult) {
      try {
        await navigator.clipboard.writeText(scanResult.address)
        hapticFeedback.notification('success')
      } catch (error) {
        console.error('Failed to copy address:', error)
      }
    }
  }

  const handleRetry = () => {
    hapticFeedback.impact('medium')
    onRetry()
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  if (!isVisible || !scanResult) return null

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

        {/* Main Content */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="relative z-10 w-full max-w-md flex flex-col"
          style={{ height: 'auto', minHeight: '520px', maxHeight: 'calc(100vh - 2rem)' }}
        >
          {/* Header */}
          <div className="bg-black/40 backdrop-blur-xl rounded-t-3xl border border-white/10 border-b-0 p-4">
            <div className="flex items-center justify-between mb-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
              
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                QR код найден!
              </h2>
              
              <div className="w-10 h-10" />
            </div>

            {/* Success indicator */}
            <div className="flex items-center justify-center space-x-2 mb-3">
              <motion.div
                className="w-3 h-3 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3, repeat: 2 }}
              />
              <div className="w-8 h-px bg-green-500/40" />
              <motion.div
                className="w-3 h-3 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3, delay: 0.1, repeat: 2 }}
              />
              <div className="w-8 h-px bg-green-500/40" />
              <motion.div
                className="w-3 h-3 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3, delay: 0.2, repeat: 2 }}
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 border-t-0 border-b-0 p-4 flex-1 overflow-y-auto min-h-[360px] flex flex-col justify-center">
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 min-h-[300px] flex flex-col justify-center"
            >
              {/* Success Icon */}
              <div className="text-center mb-4">
                <motion.div
                  className="w-16 h-16 mx-auto mb-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: "backOut" }}
                >
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
                       style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-white mb-2"
                >
                  Адрес получен
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-400"
                >
                  Готов к использованию
                </motion.div>
              </div>

              {/* Address Details */}
              <div className="space-y-3">
                {/* Address */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">Адрес кошелька</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopyAddress}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </motion.button>
                  </div>
                  <div className="text-white text-sm font-mono break-all">
                    {scanResult.address}
                  </div>
                </motion.div>

                {/* Additional Info */}
                {scanResult.amount && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Сумма</span>
                      </div>
                      <div className="text-white font-medium">
                        {scanResult.amount} {scanResult.token || 'SOL'}
                      </div>
                    </div>
                  </motion.div>
                )}

                {scanResult.label && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Метка</span>
                      <div className="text-white">{scanResult.label}</div>
                    </div>
                  </motion.div>
                )}

                {scanResult.message && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="text-sm text-gray-400 mb-1">Сообщение</div>
                    <div className="text-white text-sm">{scanResult.message}</div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-black/40 backdrop-blur-xl rounded-b-3xl border border-white/10 border-t-0 p-4"
          >
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRetry}
                className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-white" />
                <span className="text-white font-medium text-sm">Ещё раз</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUseAddress}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-solana-purple to-solana-green hover:from-solana-purple/90 hover:to-solana-green/90 flex items-center justify-center gap-2 transition-all"
                style={{ boxShadow: '0 4px 20px rgba(153, 69, 255, 0.3)' }}
              >
                <Send className="w-4 h-4 text-white" />
                <span className="text-white font-medium">Использовать</span>
              </motion.button>
            </div>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-500"
            >
              <CheckCircle className="w-3 h-3" />
              <span>Адрес проверен</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
