/**
 * Web3 QR Scanner Component - Universal QR code scanner
 * Solana SuperApp - Enhanced Web3 Ecosystem
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  X,
  QrCode,
  Camera,
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Upload,
  AlertCircle,
  CheckCircle,
  Smartphone,
  ScanLine,
  Zap,
  Shield,
  Globe,
  Loader2,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { detectIdentifierType, isValidSolanaAddress } from '@/lib/address-utils'

interface QRScanResult {
  raw: string
  type: 'wallet' | 'nft' | 'transfer' | 'url' | 'text' | 'unknown'
  data: any
  isValid: boolean
}

interface Web3QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (result: QRScanResult) => void
  onScanError?: (error: string) => void
  expectedTypes?: string[]
  title?: string
  description?: string
  className?: string
}

export function Web3QRScanner({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError,
  expectedTypes = ['wallet', 'nft', 'transfer'],
  title = 'QR Сканер',
  description = 'Отсканируйте QR код для быстрого взаимодействия',
  className = ''
}: Web3QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment')
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null)
  const [error, setError] = useState<string>('')
  const [showFileUpload, setShowFileUpload] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    stopScanning()
    hapticFeedback.impact('light')
    onClose()
  }

  const startCamera = async () => {
    try {
      setError('')
      
      const constraints = {
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      setHasPermission(true)
      setIsScanning(true)
      startScanLoop()
    } catch (error) {
      console.error('Camera access error:', error)
      setHasPermission(false)
      setError('Не удается получить доступ к камере. Проверьте разрешения.')
      onScanError?.('Не удается получить доступ к камере')
    }
  }

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsScanning(false)
    setFlashlightOn(false)
  }

  const startScanLoop = () => {
    if (scanIntervalRef.current) return
    
    scanIntervalRef.current = setInterval(() => {
      scanQRCode()
    }, 100) // Scan every 100ms
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context || video.readyState !== 4) return
    
    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // In a real implementation, you would use a QR code detection library here
    // For this demo, we'll simulate QR detection
    // Example libraries: jsQR, qr-scanner, @zxing/library
    
    // Simulate QR detection (replace with actual QR detection logic)
    if (Math.random() < 0.01) { // 1% chance to simulate finding a QR code
      const mockQRData = generateMockQRData()
      handleQRDetected(mockQRData)
    }
  }

  const generateMockQRData = (): string => {
    const mockTypes = [
      JSON.stringify({
        type: 'wallet',
        address: '7Np41oeYqPXiYCMgWXzFCeBPgG9b3QjqyKZhjmfQKpG1',
        network: 'solana'
      }),
      JSON.stringify({
        type: 'nft_transfer',
        mintAddress: 'AKFq2rVvACKDL1bLbb8bw2tcJw3UjMhnA1ZtcpYfAwFM',
        nftName: 'Cool NFT #123',
        nftType: 'COLLECTIBLE'
      }),
      'https://solana-superapp.com/nft/view/AKFq2rVvACKDL1bLbb8bw2tcJw3UjMhnA1ZtcpYfAwFM',
      '7Np41oeYqPXiYCMgWXzFCeBPgG9b3QjqyKZhjmfQKpG1'
    ]
    
    return mockTypes[Math.floor(Math.random() * mockTypes.length)]
  }

  const handleQRDetected = (qrData: string) => {
    try {
      const result = parseQRData(qrData)
      setScanResult(result)
      hapticFeedback.notification(result.isValid ? 'success' : 'error')
      
      if (result.isValid) {
        setTimeout(() => {
          onScanSuccess(result)
          handleClose()
        }, 1500) // Show result for 1.5 seconds before closing
      }
    } catch (error) {
      console.error('QR parsing error:', error)
      setError('Неверный формат QR кода')
    }
  }

  const parseQRData = (qrData: string): QRScanResult => {
    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(qrData)
      
      if (jsonData.type) {
        return {
          raw: qrData,
          type: jsonData.type,
          data: jsonData,
          isValid: expectedTypes.includes(jsonData.type)
        }
      }
    } catch {
      // Not JSON, try other formats
    }
    
    // Check if it's a URL
    if (qrData.startsWith('http')) {
      return {
        raw: qrData,
        type: 'url',
        data: { url: qrData },
        isValid: expectedTypes.includes('url')
      }
    }
    
    // Check if it's a Solana address
    if (isValidSolanaAddress(qrData)) {
      return {
        raw: qrData,
        type: 'wallet',
        data: { address: qrData },
        isValid: expectedTypes.includes('wallet')
      }
    }
    
    // Default to text
    return {
      raw: qrData,
      type: 'text',
      data: { text: qrData },
      isValid: expectedTypes.includes('text')
    }
  }

  const toggleFlashlight = async () => {
    if (!streamRef.current) return
    
    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      
      if ((capabilities as any).torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashlightOn } as any]
        } as any)
        setFlashlightOn(!flashlightOn)
        hapticFeedback.impact('light')
      }
    } catch (error) {
      console.error('Flashlight error:', error)
    }
  }

  const switchCamera = async () => {
    stopScanning()
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    setTimeout(() => {
      if (hasPermission) {
        startCamera()
      }
    }, 100)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // In a real implementation, you would use a QR code reading library
    // to decode QR codes from uploaded images
    
    // Simulate file processing
    setTimeout(() => {
      const mockResult = parseQRData(generateMockQRData())
      handleQRDetected(mockResult.raw)
    }, 1000)
    
    hapticFeedback.impact('medium')
  }

  useEffect(() => {
    if (isOpen && hasPermission === null) {
      // Check camera permission
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false))
    }
    
    return () => {
      stopScanning()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && hasPermission) {
      startCamera()
    }
    
    return () => {
      stopScanning()
    }
  }, [isOpen, hasPermission, cameraFacingMode])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[80] flex items-center justify-center p-4" // Z-INDEX: Utility modal layer
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn('w-full max-w-md max-h-[90vh] overflow-hidden', className)}
      >
        <SimpleCard className="p-0 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <QrCode className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  <p className="text-sm text-gray-400">{description}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Scanner Content */}
          <div className="relative">
            {hasPermission === false ? (
              <div className="p-8 text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Нужен доступ к камере
                </h3>
                <p className="text-gray-400 mb-6">
                  Для сканирования QR кодов необходимо разрешить доступ к камере
                </p>
                <div className="space-y-3">
                  <SimpleButton
                    onClick={startCamera}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Разрешить доступ
                  </SimpleButton>
                  <SimpleButton
                    onClick={() => setShowFileUpload(true)}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Загрузить изображение
                  </SimpleButton>
                </div>
              </div>
            ) : (
              <>
                {/* Camera View */}
                <div className="relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  
                  {/* Scanning Overlay */}
                  <div className="absolute inset-0">
                    {/* Corner frames */}
                    <div className="absolute inset-4 border-2 border-transparent">
                      {/* Top-left */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
                      {/* Top-right */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
                      {/* Bottom-left */}
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
                      {/* Bottom-right */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
                    </div>
                    
                    {/* Scanning line animation */}
                    {isScanning && (
                      <motion.div
                        animate={{ y: [0, 200, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        className="absolute left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                        style={{ top: '20%' }}
                      />
                    )}
                    
                    {/* Center guide */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-48 h-48 border border-white/30 rounded-lg flex items-center justify-center">
                        {!isScanning && (
                          <div className="text-center">
                            <QrCode className="w-8 h-8 text-white/50 mx-auto mb-2" />
                            <p className="text-white/70 text-sm">Наведите на QR код</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute top-4 left-4">
                    <div className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm',
                      isScanning ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                    )}>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        isScanning ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                      )} />
                      <span className={cn(
                        'text-xs font-medium',
                        isScanning ? 'text-green-400' : 'text-red-400'
                      )}>
                        {isScanning ? 'Сканирование...' : 'Не активен'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="p-4 bg-gray-900/50">
                  <div className="flex items-center justify-center gap-4">
                    <SimpleButton
                      onClick={toggleFlashlight}
                      className="p-3"
                    >
                      {flashlightOn ? (
                        <Flashlight className="w-5 h-5" />
                      ) : (
                        <FlashlightOff className="w-5 h-5" />
                      )}
                    </SimpleButton>
                    
                    <SimpleButton
                      onClick={switchCamera}
                      className="p-3"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </SimpleButton>
                    
                    <SimpleButton
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3"
                    >
                      <Upload className="w-5 h-5" />
                    </SimpleButton>
                  </div>
                  
                  {error && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm">{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Scan Result */}
          <AnimatePresence>
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <div className="text-center">
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
                    scanResult.isValid 
                      ? 'bg-green-500/20 border-2 border-green-500'
                      : 'bg-red-500/20 border-2 border-red-500'
                  )}>
                    {scanResult.isValid ? (
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    )}
                  </div>
                  
                  <h3 className={cn(
                    'text-lg font-semibold mb-2',
                    scanResult.isValid ? 'text-green-400' : 'text-red-400'
                  )}>
                    {scanResult.isValid ? 'QR код распознан!' : 'Неподдерживаемый QR код'}
                  </h3>
                  
                  <p className="text-gray-300 text-sm mb-4">
                    Тип: {scanResult.type.toUpperCase()}
                  </p>
                  
                  {scanResult.isValid ? (
                    <div className="text-xs text-gray-400">
                      Обработка данных...
                    </div>
                  ) : (
                    <SimpleButton
                      onClick={() => setScanResult(null)}
                      className="mt-2"
                    >
                      Сканировать снова
                    </SimpleButton>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SimpleCard>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </motion.div>
  )
}
