/**
 * NFT Receive Modal Component - Display QR code for receiving NFT transfers
 * Solana SuperApp - NFT Page
 */

'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Copy, 
  CheckCircle,
  Download,
  Share,
  QrCode,
  Wallet,
  AlertCircle,
  Palette
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import QRCode from 'qrcode'
import type { NftItem } from '@/features/nft/types'

interface NFTReceiveModalProps {
  isOpen: boolean
  onClose: () => void
  nft?: NftItem  // Для специфичного NFT или общий адрес
}

export function NFTReceiveModal({ isOpen, onClose, nft }: NFTReceiveModalProps) {
  const { custodial, external, activeWallet } = useWallet()
  
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get current wallet address
  const currentAddress = activeWallet === 'external' 
    ? external.address 
    : custodial.address

  // Generate QR code when modal opens
  React.useEffect(() => {
    const generateQR = async () => {
      if (!currentAddress) return

      try {
        // Create NFT transfer URL format
        let qrData = `solana:${currentAddress}`
        
        const params = new URLSearchParams()
        if (nft) {
          params.append('message', `Send NFT: ${nft.name} to SuperApp`)
          params.append('label', `NFT Transfer - ${nft.name}`)
        } else {
          params.append('message', 'Send NFT to SuperApp')
          params.append('label', 'NFT Transfer')
        }

        if (params.toString()) {
          qrData += '?' + params.toString()
        }

        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 320,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        })
        
        setQrDataUrl(dataUrl)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }

    if (isOpen && currentAddress) {
      generateQR()
    }
  }, [isOpen, currentAddress, nft])

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  const copyAddress = async () => {
    if (!currentAddress) return
    
    try {
      await navigator.clipboard.writeText(currentAddress)
      hapticFeedback.impact('light')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  const shareQR = async () => {
    if (!qrDataUrl) return

    try {
      hapticFeedback.impact('medium')
      
      // Convert data URL to blob
      const response = await fetch(qrDataUrl)
      const blob = await response.blob()
      
      if (navigator.share && navigator.canShare({ files: [new File([blob], 'nft-qr.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: 'Мой адрес для NFT',
          text: nft ? `Отправьте NFT "${nft.name}" на мой адрес` : 'Отправьте NFT на мой адрес',
          files: [new File([blob], 'nft-qr.png', { type: 'image/png' })]
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(currentAddress || '')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Error sharing QR code:', error)
    }
  }

  const downloadQR = () => {
    if (!qrDataUrl) return

    hapticFeedback.impact('light')
    
    const link = document.createElement('a')
    link.download = nft ? `nft-${nft.name.toLowerCase().replace(/\s/g, '-')}-qr.png` : 'nft-address-qr.png'
    link.href = qrDataUrl
    link.click()
  }

  const formatAddress = (address: string | null) => {
    if (!address) return 'Адрес недоступен'
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4" // Z-INDEX: Detail modal layer
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleCard className="p-6 border border-white/10 bg-black/90 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Получить NFT</h2>
                  <p className="text-sm text-gray-400">
                    {nft ? `QR код для получения: ${nft.name}` : 'QR код для получения NFT'}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {!currentAddress ? (
                /* No Wallet State */
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Кошелек не подключен</h3>
                  <p className="text-gray-400 mb-6">
                    Подключите кошелек для получения NFT
                  </p>
                  <SimpleButton onClick={handleClose}>
                    Закрыть
                  </SimpleButton>
                </div>
              ) : (
                <>
                  {/* NFT Info (if specific NFT) */}
                  {nft && (
                    <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {nft.type === 'TICKET' ? '' : 
                           nft.type === 'COUPON' ? '' : 
                           nft.type === 'BADGE' ? '' : 
                           nft.type === 'CERTIFICATE' ? '' : ''}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{nft.name}</h3>
                          <p className="text-xs text-gray-400">{nft.type} NFT</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR Code */}
                  <div className="text-center mb-6">
                    <div className="inline-block p-4 bg-white rounded-xl mb-4">
                      {qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt="NFT Address QR Code" 
                          className="w-64 h-64 mx-auto"
                        />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                          <QrCode className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-2">
                      Отсканируйте QR код для отправки NFT
                    </p>
                  </div>

                  {/* Address */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-xs text-gray-400">Мой адрес для NFT</p>
                          <p className="text-sm font-mono text-white">
                            {formatAddress(currentAddress)}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={copyAddress}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <SimpleButton
                      onClick={shareQR}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Share className="w-4 h-4" />
                      Поделиться
                    </SimpleButton>
                    <SimpleButton
                      onClick={downloadQR}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </SimpleButton>
                  </div>

                  {/* Instructions */}
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Wallet className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-400 mb-1">
                          Инструкция для отправителя
                        </h4>
                        <ul className="text-xs text-blue-300 space-y-1">
                          <li>• Отсканируйте QR код в своем кошельке</li>
                          <li>• Выберите NFT который хотите отправить</li>
                          <li>• Подтвердите транзакцию</li>
                          <li>• NFT будет переведен на мой адрес</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </SimpleCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
