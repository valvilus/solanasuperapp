/**
 * Premium Sell Modal Component - NFT Listing Interface
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
  Tag,
  Zap,
  Coins
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { cn } from '@/lib/utils'
import { useOptimizedNFT } from '@/hooks/useOptimizedNFT'
import type { NftItem } from '@/features/nft/types'

interface PremiumSellModalProps {
  nft: NftItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (error: string) => void
  className?: string
}

export function PremiumSellModal({
  nft,
  isOpen,
  onClose,
  onSuccess,
  onError,
  className = ''
}: PremiumSellModalProps) {
  const [price, setPrice] = useState('')
  const [isListing, setIsListing] = useState(false)
  const [currency, setCurrency] = useState<'SOL' | 'TNG'>('SOL')
  
  // Use the NFT hook for operations
  const { sellNft, unlistNft, nftService } = useOptimizedNFT()

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

  // Reset form when modal opens (keep currency selection)
  useEffect(() => {
    if (isOpen) {
      setPrice('')
      setIsListing(false)
      // Don't reset currency - let user keep their selection
    }
  }, [isOpen])

  const handleList = async () => {
    if (!nft || !price.trim()) {
      onError('Введите цену для продажи')
      return
    }

    const priceValue = parseFloat(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      onError('Введите корректную цену')
      return
    }

    setIsListing(true)
    hapticFeedback.impact('medium')

    try {
      const nftId = nft.id || nft.mintAddress
      console.log(' Selling NFT:', { nftId, mintAddress: nft.mintAddress, price: priceValue.toString(), currency })
      
      await sellNft({
        nftId,
        mintAddress: nft.mintAddress,
        price: priceValue.toString(),
        currency
      })
      
      hapticFeedback.notification('success')
      onSuccess()
    } catch (error) {
      console.error('Listing failed:', error)
      hapticFeedback.notification('error')
      onError(error instanceof Error ? error.message : 'Ошибка выставления на продажу')
    } finally {
      setIsListing(false)
    }
  }

    const handleUnlist = async () => {
    if (!nft) return
    
    setIsListing(true)
    hapticFeedback.impact('medium')

    try {
      console.log('Unlisting NFT:', nft.mintAddress || nft.id)
      
      // Use the unlistNft method from the service
      await unlistNft(nft.id || nft.mintAddress)
      
      hapticFeedback.notification('success')
      onSuccess()
    } catch (error) {
      console.error('Unlisting failed:', error)
      hapticFeedback.notification('error')
      onError(error instanceof Error ? error.message : 'Ошибка снятия с продажи')
    } finally {
      setIsListing(false)
    }
  }

  const isValidPrice = price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) > 0
  const priceInUSD = isValidPrice ? parseFloat(price) * (currency === 'SOL' ? 211.34 : 0.001857) : 0
  const isCurrentlyListed = nft?.status === 'FOR_SALE'

  const suggestedPrices = currency === 'SOL' 
    ? [0.1, 0.5, 1.0, 2.5, 5.0]
    : [1000, 5000, 10000, 25000, 50000]

  if (!nft) return null

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
                    {isCurrentlyListed ? (
                      <Tag className="w-5 h-5 text-red-400" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {isCurrentlyListed ? 'Управление продажей' : 'Продать NFT'}
                    </h2>
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
                  {isCurrentlyListed && nft.price && (
                    <p className="text-sm text-green-400 font-medium">
                      Текущая цена: {nft.price.amount}
                    </p>
                  )}
                </div>
              </div>

              {isCurrentlyListed ? (
                /* Currently Listed - Show Unlist Option */
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <h4 className="text-green-400 font-medium">NFT выставлен на продажу</h4>
                    </div>
                    <p className="text-green-300/80 text-sm">
                      Ваш NFT доступен для покупки в маркетплейсе по цене {nft.price?.amount}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <SimpleButton
                      onClick={onClose}
                      disabled={isListing}
                      className="flex-1"
                    >
                      Закрыть
                    </SimpleButton>
                    <SimpleButton
                      onClick={handleUnlist}
                      disabled={isListing}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400"
                    >
                      {isListing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full"
                          />
                          Снятие...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Снять с продажи
                        </>
                      )}
                    </SimpleButton>
                  </div>
                </div>
              ) : (
                /* Not Listed - Show Listing Form */
                <div className="space-y-6">
                  {/* Currency Selector */}
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-3">Валюта</p>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrency('SOL')}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all text-sm font-medium',
                          currency === 'SOL'
                            ? 'bg-solana-purple/20 text-solana-purple border border-solana-purple/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        )}
                      >
                        <Coins className="w-4 h-4" />
                        SOL
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrency('TNG')}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all text-sm font-medium',
                          currency === 'TNG'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        )}
                      >
                        <Zap className="w-4 h-4" />
                        TNG
                      </motion.button>
                    </div>
                  </div>

                  {/* Price Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Цена в {currency}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder={`0.00 ${currency}`}
                        step={currency === 'SOL' ? '0.01' : '100'}
                        min="0"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30 transition-all"
                        disabled={isListing}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <span className="text-gray-400 text-sm font-medium">{currency}</span>
                      </div>
                    </div>
                    
                    {/* Price validation and USD conversion */}
                    {price && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        {isValidPrice ? (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-400">Цена корректна</span>
                            </div>
                            <span className="text-gray-400">
                              ≈ ${priceInUSD.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400">Введите корректную цену</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggested Prices */}
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-3">Рекомендуемые цены</p>
                    <div className="flex gap-2 flex-wrap">
                      {suggestedPrices.map((suggestedPrice) => (
                        <motion.button
                          key={suggestedPrice}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPrice(suggestedPrice.toString())}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm text-gray-300 hover:text-white"
                        >
                          {suggestedPrice} {currency}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Marketplace Fee Info */}
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-blue-400 font-medium text-sm mb-1">Комиссия маркетплейса</h4>
                        <p className="text-blue-300/80 text-xs leading-relaxed">
                          При продаже взимается комиссия 2.5%. 
                          {isValidPrice && ` Вы получите ${(parseFloat(price) * 0.975).toFixed(3)} ${currency}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <SimpleButton
                      onClick={onClose}
                      disabled={isListing}
                      className="flex-1"
                    >
                      Отмена
                    </SimpleButton>
                    <SimpleButton
                      onClick={handleList}
                      disabled={!isValidPrice || isListing}
                      gradient
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      {isListing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Выставление...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Выставить на продажу
                        </>
                      )}
                    </SimpleButton>
                  </div>
                </div>
              )}
              </SimpleCard>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
