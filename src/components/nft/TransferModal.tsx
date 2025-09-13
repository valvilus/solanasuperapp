/**
 * Premium Transfer Modal Component - NFT Transfer Interface
 * Solana SuperApp - Premium Design System
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { 
  X, 
  Send, 
  User, 
  Wallet,
  AlertTriangle,
  CheckCircle,
  QrCode
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import { useOptimizedNFT } from '@/hooks/useOptimizedNFT'
import { Web3QRScanner } from '@/components/common/Web3QRScanner'
import type { NftItem } from '@/features/nft/types'

interface PremiumTransferModalProps {
  nft: NftItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (error: string) => void
  className?: string
}

export function PremiumTransferModal({
  nft,
  isOpen,
  onClose,
  onSuccess,
  onError,
  className = ''
}: PremiumTransferModalProps) {
  const [recipient, setRecipient] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [recipientType, setRecipientType] = useState<'username' | 'address'>('username')
  const [showQRScanner, setShowQRScanner] = useState(false)
  
  // Use the NFT hook for operations
  const { transferNft } = useOptimizedNFT()

  // Handle ESC key and focus trap
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecipient('')
      setRecipientType('username')
      setIsTransferring(false)
      setShowQRScanner(false)
    }
  }, [isOpen])

  // Handle QR scan result
  const handleQRScan = (result: any) => {
    if (result && result.data && result.data.address) {
      setRecipient(result.data.address)
      setRecipientType('address')
      setShowQRScanner(false)
      hapticFeedback.impact('light')
    } else if (result && result.raw) {
      // Try to extract address from raw QR data
      const addressMatch = result.raw.match(/solana:([A-Za-z0-9]{32,44})/)
      if (addressMatch) {
        setRecipient(addressMatch[1])
        setRecipientType('address')
        setShowQRScanner(false)
        hapticFeedback.impact('light')
      } else {
        onError('QR код не содержит действительный Solana адрес')
      }
    }
  }

  const handleTransfer = async () => {
    if (!nft || !recipient.trim()) {
      onError('Введите получателя')
      return
    }

    setIsTransferring(true)
    hapticFeedback.impact('medium')

    try {
      await transferNft({
        mintAddress: nft.mintAddress,
        recipient: recipient.trim(),
        recipientType: recipientType === 'username' ? 'username' : 'wallet'
      })
      
      hapticFeedback.notification('success')
      onSuccess()
    } catch (error) {
      console.error('Transfer failed:', error)
      hapticFeedback.notification('error')
      onError(error instanceof Error ? error.message : 'Ошибка перевода NFT')
    } finally {
      setIsTransferring(false)
    }
  }

  const isValidRecipient = recipient.trim().length > 0
  const isWalletAddress = recipient.length > 30 && /^[A-Za-z0-9]+$/.test(recipient)

  // Auto-detect recipient type
  useEffect(() => {
    if (recipient.startsWith('@')) {
      setRecipientType('username')
    } else if (isWalletAddress) {
      setRecipientType('address')
    }
  }, [recipient, isWalletAddress])

  if (!nft) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="transfer-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" // Z-INDEX: Action modal layer
          onClick={onClose}
        >
          <div className="w-full h-full max-w-lg flex flex-col justify-center p-4 pb-safe">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-h-[calc(100vh-8rem)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <SimpleCard className="flex-1 overflow-y-auto p-6 border border-white/10 bg-black/90 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/20">
                    <Send className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Перевести NFT</h2>
                    <p className="text-sm text-gray-400">{nft.name}</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* NFT Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-2xl border border-white/20">
                  {nft.imageUri ? (
                    <img 
                      src={nft.imageUri} 
                      alt={nft.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    ''
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{nft.name}</h3>
                  <p className="text-sm text-gray-400">{nft.type} NFT</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {nft.mintAddress.slice(0, 8)}...{nft.mintAddress.slice(-8)}
                  </p>
                </div>
              </div>

              {/* Recipient Type Selector */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Способ перевода</p>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRecipientType('username')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all text-sm font-medium',
                      recipientType === 'username'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <User className="w-4 h-4" />
                    Username
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRecipientType('address')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all text-sm font-medium',
                      recipientType === 'address'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <Wallet className="w-4 h-4" />
                    Адрес
                  </motion.button>
                </div>
              </div>

              {/* Recipient Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {recipientType === 'username' ? 'Username получателя' : 'Wallet адрес получателя'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={
                      recipientType === 'username' 
                        ? '@username или username'
                        : 'Введите Solana адрес...'
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
                    disabled={isTransferring}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        hapticFeedback.impact('light')
                        setShowQRScanner(true)
                      }}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      disabled={isTransferring}
                    >
                      <QrCode className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </div>
                </div>
                
                {/* Input validation feedback */}
                {recipient && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {isValidRecipient ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">
                          {recipientType === 'username' ? 'Username корректен' : 'Адрес корректен'}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">Проверьте корректность ввода</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-400 font-medium text-sm mb-1">Внимание</h4>
                    <p className="text-yellow-300/80 text-xs leading-relaxed">
                      Перевод NFT необратим. Убедитесь, что адрес получателя указан корректно.
                      После подтверждения операция будет выполнена в блокчейне Solana.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <SimpleButton
                  onClick={onClose}
                  disabled={isTransferring}
                  className="flex-1"
                >
                  Отмена
                </SimpleButton>
                <SimpleButton
                  onClick={handleTransfer}
                  disabled={!isValidRecipient || isTransferring}
                  gradient
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {isTransferring ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Перевод...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Перевести
                    </>
                  )}
                </SimpleButton>
              </div>
              </SimpleCard>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* QR Scanner Modal */}
      <Web3QRScanner
        {...{
          key: "qr-scanner",
          isOpen: showQRScanner,
          onClose: () => setShowQRScanner(false),
          onResult: handleQRScan,
          onError: (error: any) => {
            setShowQRScanner(false)
            onError(error)
          }
        } as any}
      />
    </AnimatePresence>
  )
}
