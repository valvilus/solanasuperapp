/**
 * Premium Buy Modal Component - NFT Purchase Interface
 * Solana SuperApp - Premium Design System
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { 
  X, 
  ShoppingCart, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Wallet,
  CreditCard,
  Coins
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import { useOptimizedNFT } from '@/hooks/useOptimizedNFT'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import type { NftItem } from '@/features/nft/types'

interface PremiumBuyModalProps {
  nft: NftItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (error: string) => void
  className?: string
}

export function PremiumBuyModal({
  nft,
  isOpen,
  onClose,
  onSuccess,
  onError,
  className = ''
}: PremiumBuyModalProps) {
  // Payment method is determined by NFT currency, not user choice
  const paymentMethod = (nft?.currency || 'SOL') as 'SOL' | 'TNG'
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [maxPrice, setMaxPrice] = useState('')
  
  // Use the NFT hook for operations
  const { buyNft } = useOptimizedNFT()
  
  // Get user balances
  const solBalance = useTokenBalance('SOL')
  const tngBalance = useTokenBalance('TNG')

  // Handle ESC key
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
    if (isOpen && nft) {
      setMaxPrice('')
      setIsPurchasing(false)
    }
  }, [isOpen, nft])

  const handlePurchase = async () => {
    if (!nft || !nft.price) {
      onError('Информация о цене NFT недоступна')
      return
    }

    const nftPrice = parseFloat(nft.price.amount)
    const userBalance = paymentMethod === 'SOL' ? solBalance.balance : tngBalance.balance
    
    if (userBalance < nftPrice) {
      onError(`Недостаточно ${paymentMethod} для покупки. Нужно: ${nftPrice}, доступно: ${userBalance}`)
      return
    }

    setIsPurchasing(true)
    hapticFeedback.impact('medium')

    try {
      await buyNft(nft.id || nft.mintAddress)
      
      hapticFeedback.notification('success')
      onSuccess()
    } catch (error) {
      console.error('Purchase failed:', error)
      hapticFeedback.notification('error')
      onError(error instanceof Error ? error.message : 'Ошибка покупки NFT')
    } finally {
      setIsPurchasing(false)
    }
  }

  if (!nft || !nft.price) return null

  const nftPrice = parseFloat(nft.price.amount)
  const solBalance_num = solBalance.balance || 0
  const tngBalance_num = tngBalance.balance || 0
  
  const canAffordSOL = solBalance_num >= nftPrice
  const canAffordTNG = tngBalance_num >= nftPrice
  const canPurchase = paymentMethod === 'SOL' ? canAffordSOL : canAffordTNG
  
  const priceInUSD = nftPrice * (paymentMethod === 'SOL' ? 211.34 : 0.001857)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center border border-white/20">
                      <ShoppingCart className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Купить NFT</h2>
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
                    <p className="text-lg text-green-400 font-bold">
                      {nft.price.amount}
                    </p>
                  </div>
                </div>

                {/* Payment Method Info - Fixed by NFT currency */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-300 mb-3">Способ оплаты</p>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {paymentMethod === 'SOL' ? (
                          <Coins className="w-6 h-6 text-solana-purple" />
                        ) : (
                          <Zap className="w-6 h-6 text-orange-400" />
                        )}
                        <div>
                          <div className="text-white font-medium">{paymentMethod}</div>
                          <div className="text-xs text-gray-400">
                            Валюта продажи NFT
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {paymentMethod === 'SOL' ? solBalance_num.toFixed(3) : tngBalance_num.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-400">Ваш баланс</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Check */}
                <div className={cn(
                  "p-4 rounded-xl border mb-6",
                  canPurchase 
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-red-500/10 border-red-500/20"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    {canPurchase ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                    <h4 className={cn(
                      "font-medium",
                      canPurchase ? "text-green-400" : "text-red-400"
                    )}>
                      {canPurchase ? 'Достаточно средств' : 'Недостаточно средств'}
                    </h4>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Цена:</span>
                      <span className="text-white">{nftPrice} {paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ваш баланс:</span>
                      <span className={cn(
                        "font-medium",
                        canPurchase ? "text-green-400" : "text-red-400"
                      )}>
                        {paymentMethod === 'SOL' ? solBalance_num.toFixed(3) : tngBalance_num.toFixed(0)} {paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">≈ USD:</span>
                      <span className="text-gray-300">${priceInUSD.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Purchase Info */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-blue-400 font-medium text-sm mb-1">Детали покупки</h4>
                      <p className="text-blue-300/80 text-xs leading-relaxed">
                        NFT будет переведен в ваш кошелек сразу после подтверждения транзакции. 
                        Комиссия сети составляет ~0.000005 SOL.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <SimpleButton
                    onClick={onClose}
                    disabled={isPurchasing}
                    className="flex-1"
                  >
                    Отмена
                  </SimpleButton>
                  <SimpleButton
                    onClick={handlePurchase}
                    disabled={!canPurchase || isPurchasing}
                    gradient
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {isPurchasing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Покупка...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Купить за {nftPrice} {paymentMethod}
                      </>
                    )}
                  </SimpleButton>
                </div>
              </SimpleCard>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
