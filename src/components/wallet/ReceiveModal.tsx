/**
 * Receive Modal Component - Display QR code for receiving payments
 * Solana SuperApp - Wallet Page
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
  AlertCircle
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import QRCode from 'qrcode'

interface ReceiveModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { custodial, external, activeWallet } = useWallet()
  
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<'SOL' | 'TNG'>('SOL')
  const [amount, setAmount] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get current wallet address
  const currentAddress = activeWallet === 'external' 
    ? external.address 
    : custodial.address

  // Generate QR code when modal opens or parameters change
  React.useEffect(() => {
    const generateQR = async () => {
      if (!currentAddress) return

      try {
        // Create Solana Pay URL format
        let qrData = `solana:${currentAddress}`
        
        const params = new URLSearchParams()
        if (amount) {
          params.append('amount', amount)
        }
        if (selectedToken === 'TNG') {
          // In production, this would be the TNG token mint address
          params.append('spl-token', '7UuuwrzNE5fAgpCNqRFcrLFGYg8HsMb3uUTNrojC2PX7')
        }
        params.append('label', 'SuperApp Payment')
        params.append('message', `Платеж через SuperApp${amount ? ` на сумму ${amount} ${selectedToken}` : ''}`)

        if (params.toString()) {
          qrData += '?' + params.toString()
        }

        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 320,
          margin: 2,
          color: {
            dark: '#000000',  // Black QR on white background for optimal scanning
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M',  // Medium error correction for better performance
          type: 'image/png',
          quality: 0.92,
          rendererOpts: {
            quality: 0.92
          }
        } as any) as unknown as string
        
        if (dataUrl) {
          setQrDataUrl(dataUrl)
        }
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }

    if (isOpen && currentAddress) {
      generateQR()
    }
  }, [isOpen, currentAddress, selectedToken, amount])

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
      
      if (navigator.share && navigator.canShare({ files: [new File([blob], 'qr-code.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: 'Мой адрес кошелька',
          text: `Отправьте ${selectedToken} на мой адрес`,
          files: [new File([blob], 'wallet-qr.png', { type: 'image/png' })]
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
    link.download = `wallet-qr-${selectedToken.toLowerCase()}.png`
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
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
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
                  <h2 className="text-xl font-bold text-white">Получить</h2>
                  <p className="text-sm text-gray-400">QR код для платежей</p>
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
                  <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Кошелек не подключен</h3>
                  <p className="text-gray-400 mb-4">
                    Подключите кошелек для получения платежей
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Token Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Токен для получения
                    </label>
                    <div className="flex gap-2">
                      {(['SOL', 'TNG'] as const).map((token) => (
                        <motion.button
                          key={token}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedToken(token)}
                          className={`flex-1 p-3 rounded-lg border transition-all ${
                            selectedToken === token
                              ? 'border-solana-green bg-solana-green/20 text-white'
                              : 'border-white/10 hover:border-white/20 text-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <TokenLogo 
                              token={token} 
                              size="sm" 
                              className={token === 'SOL' ? 'text-[#00FFA3]' : 'text-solana-green'}
                            />
                            <span className="font-medium">{token}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Amount (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Сумма (необязательно)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Укажите сумму в ${selectedToken}`}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Если указать сумму, она будет встроена в QR код
                    </p>
                  </div>

                  {/* QR Code Display */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-6 bg-white rounded-2xl mb-4 mx-auto">
                      {qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt="Wallet QR Code" 
                          className="w-48 h-48 block"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <Badge className="bg-solana-green/20 text-solana-green border-solana-green/30 mb-4">
                      {selectedToken} {amount && `• ${amount}`}
                    </Badge>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Адрес кошелька
                    </label>
                    
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="flex-1 text-sm text-white font-mono break-all">
                        {formatAddress(currentAddress)}
                      </p>
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

                    {/* Full address (expandable) */}
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                        {currentAddress}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <SimpleButton
                      onClick={shareQR}
                      className="flex items-center justify-center gap-2"
                    >
                      <Share className="w-4 h-4" />
                      Поделиться
                    </SimpleButton>
                    <SimpleButton
                      onClick={downloadQR}
                      className="flex items-center justify-center gap-2"
                      gradient={true}
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </SimpleButton>
                  </div>

                  {/* Instructions */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Инструкция:</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Покажите QR код отправителю</li>
                      <li>• Или поделитесь адресом кошелька</li>
                      <li>• Средства поступят автоматически</li>
                      <li>• Уведомление придет в приложение</li>
                    </ul>
                  </div>
                </div>
              )}
            </SimpleCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
