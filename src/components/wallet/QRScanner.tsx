/**
 * QR Scanner Component - Scan QR codes using device camera
 * Solana SuperApp - Wallet Page
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { 
  X, 
  Camera, 
  Flashlight,
  FlashlightOff,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import jsQR from 'jsqr'
import { QRScannerFrame } from './QRScannerFrame'
import { QRScanResult } from './QRScanResult'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (data: string) => void
  onOpenSendModal?: (scanResult: ScanResult) => void
  onReopen?: () => void
}

interface QRBounds {
  topLeft: { x: number; y: number }
  topRight: { x: number; y: number }
  bottomLeft: { x: number; y: number }
  bottomRight: { x: number; y: number }
  width: number
  height: number
}

interface ScanResult {
  address: string
  amount?: string
  token?: string
  label?: string
  message?: string
}

export function QRScanner({ isOpen, onClose, onScan, onOpenSendModal, onReopen }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [qrBounds, setQrBounds] = useState<QRBounds | null>(null)
  const [containerSize, setContainerSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 320, 
    height: typeof window !== 'undefined' ? window.innerHeight : 320 
  })
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastScanTime = useRef<number>(0)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      // Обновляем размеры контейнера при открытии
      setContainerSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
      startCamera()
      setupResizeObserver()
    } else {
      stopCamera()
      cleanupResizeObserver()
    }

    return () => {
      stopCamera()
      cleanupResizeObserver()
    }
  }, [isOpen, facingMode])

  // Setup resize observer for responsive frame sizing
  const setupResizeObserver = () => {
    if (!videoRef.current) return
    
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
      }
    })
    
    resizeObserverRef.current.observe(videoRef.current)
  }

  const cleanupResizeObserver = () => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }
  }

  // Optimized QR Code scanning with requestAnimationFrame
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    // Clear existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Ultra-high-performance scanning loop using requestAnimationFrame
    const scanLoop = (timestamp: number) => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return
      
      // Increased frequency for instant detection - scan every frame
      if (timestamp - lastScanTime.current >= 8) { // ~120fps for instant detection
        scanQRCode()
        lastScanTime.current = timestamp
      }
      
      animationFrameRef.current = requestAnimationFrame(scanLoop)
    }

    // Start scanning loop
    animationFrameRef.current = requestAnimationFrame(scanLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isScanning])

  const startCamera = async () => {
    try {
      setError(null)
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
        setIsScanning(true)
      }

    } catch (err) {
      console.error('Camera access error:', err)
      setHasPermission(false)
      setError('Не удается получить доступ к камере')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    // Clean up animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Clean up resize observer
    cleanupResizeObserver()
    
    setIsScanning(false)
  }

  const toggleFlash = async () => {
    if (!stream) return

    try {
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()

      if ((capabilities as any).torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled } as any]
        })
        setFlashEnabled(!flashEnabled)
        hapticFeedback.impact('light')
      }
    } catch (error) {
      console.error('Flash toggle error:', error)
    }
  }

  const toggleCamera = () => {
    hapticFeedback.impact('medium')
    setFacingMode(facingMode === 'user' ? 'environment' : 'user')
  }

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Get actual video dimensions for proper scaling
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    
    if (videoWidth === 0 || videoHeight === 0) return

    // Optimize canvas size for better performance - use smaller canvas for scanning
    const scanWidth = Math.min(videoWidth, 640)
    const scanHeight = Math.min(videoHeight, 480)
    
    canvas.width = scanWidth
    canvas.height = scanHeight

    // Update container size (using display dimensions)
    const displayWidth = video.clientWidth || videoWidth
    const displayHeight = video.clientHeight || videoHeight
    setContainerSize({ width: displayWidth, height: displayHeight })

    // Draw scaled video frame for faster processing
    ctx.imageSmoothingEnabled = false // Better edge detection
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, scanWidth, scanHeight)

    try {
      // Get image data for scanning
      const imageData = ctx.getImageData(0, 0, scanWidth, scanHeight)
      
      // Use jsQR with ultra-optimized settings for instant detection
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth", // Try both normal and inverted
      })
      
      if (code && code.location) {
        // Calculate QR bounds with proper scaling for display
        const scaleX = displayWidth / scanWidth
        const scaleY = displayHeight / scanHeight
        
        const bounds: QRBounds = {
          topLeft: { 
            x: code.location.topLeftCorner.x * scaleX, 
            y: code.location.topLeftCorner.y * scaleY 
          },
          topRight: { 
            x: code.location.topRightCorner.x * scaleX, 
            y: code.location.topRightCorner.y * scaleY 
          },
          bottomLeft: { 
            x: code.location.bottomLeftCorner.x * scaleX, 
            y: code.location.bottomLeftCorner.y * scaleY 
          },
          bottomRight: { 
            x: code.location.bottomRightCorner.x * scaleX, 
            y: code.location.bottomRightCorner.y * scaleY 
          },
          width: Math.abs(code.location.topRightCorner.x - code.location.topLeftCorner.x) * scaleX,
          height: Math.abs(code.location.bottomLeftCorner.y - code.location.topLeftCorner.y) * scaleY
        }

        console.log(' QR detected instantly:', code.data)
        setQrBounds(bounds)
        
        // Immediate detection - no delay for instant response
        handleQRDetected(code.data, bounds)
        return
      }

      // Clear bounds if no QR detected
      setQrBounds(null)
      
    } catch (error) {
      console.error('QR scanning error:', error)
      setQrBounds(null)
    }
  }, [])



  const handleQRDetected = (data: string, bounds?: QRBounds) => {
    hapticFeedback.notification('success')
    hapticFeedback.impact('heavy')
    setIsScanning(false)

    try {
      const result = parseSolanaQR(data)
      setScanResult(result)
      console.log(' QR Code detected:', { data, bounds, result })
      
      // Задержка для показа "QR код обнаружен" перед закрытием сканера
      setTimeout(() => {
        onClose() // Закрываем сканер чтобы показать результат
      }, 1000)
      
    } catch (error) {
      setError('Неверный формат QR кода')
      setQrBounds(null)
      setIsScanning(true) // Продолжаем сканирование при ошибке
    }
  }

  const parseSolanaQR = (qrData: string): ScanResult => {
    console.log(' Parsing QR data:', qrData)
    
    const trimmedData = qrData.trim()
    
    // Parse Solana Pay QR format: solana:address?params
    if (trimmedData.startsWith('solana:')) {
      const [addressPart, paramsPart] = trimmedData.replace('solana:', '').split('?')
      const result: ScanResult = { address: addressPart.trim() }

      if (paramsPart) {
        const params = new URLSearchParams(paramsPart)
        result.amount = params.get('amount') || undefined
        result.token = params.get('spl-token') ? 'TNG' : 'SOL'
        result.label = params.get('label') || undefined
        result.message = params.get('message') || undefined
      }

      return result
    }
    
    // Try to detect if it's a plain Solana address (32-44 characters, base58)
    if (trimmedData.length >= 32 && trimmedData.length <= 44) {
      // Basic validation for Solana address format (base58)
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedData)) {
        return { address: trimmedData }
      }
    }

    // Try to parse as URL or other formats
    try {
      const url = new URL(trimmedData)
      if (url.protocol === 'solana:') {
        return parseSolanaQR(trimmedData)
      }
      // Handle other protocols if needed
      throw new Error('Unsupported QR format')
    } catch {
      // If all else fails, check if it looks like an address
      if (trimmedData.length > 20 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmedData)) {
        return { address: trimmedData }
      }
      throw new Error('Неверный формат QR кода. Ожидается Solana адрес.')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // Use jsQR to scan uploaded image
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          handleQRDetected(code.data)
        } else {
          setTimeout(() => {
            setError('QR код не найден в изображении')
          }, 1000)
        }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmScan = () => {
    if (scanResult) {
      onScan(scanResult.address)
      
      // Open SendModal with pre-filled data if callback provided
      if (onOpenSendModal) {
        onOpenSendModal(scanResult)
      }
      
      handleClose()
    }
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    setScanResult(null)
    setError(null)
    setQrBounds(null)
    
    // Clear scanning resources
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    onClose()
  }

  const retryScanning = () => {
    hapticFeedback.impact('medium')
    setScanResult(null)
    setError(null)
    setQrBounds(null)
    // Открываем сканер заново для повторного сканирования
    // Это будет вызвано через onRetry в QRScanResult
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="qr-scanner-main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm z-10">
            <div>
              <h2 className="text-lg font-bold text-white">Сканер QR</h2>
              <p className="text-sm text-gray-400">Наведите на QR код</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>
          </div>

          {/* Camera View */}
          <div className="flex-1 relative overflow-hidden">
            {hasPermission === false ? (
              /* Permission Denied */
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <SimpleCard className="p-6 text-center bg-black/80 backdrop-blur-xl border-white/10">
                  <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Доступ к камере заблокирован
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Разрешите доступ к камере для сканирования QR кодов
                  </p>
                  <SimpleButton
                    onClick={() => window.location.reload()}
                    gradient={true}
                  >
                    Попробовать снова
                  </SimpleButton>
                </SimpleCard>
              </div>
            ) : (
              /* Camera View with Enhanced Frame */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    // Optimize video for QR scanning
                    transform: 'translateZ(0)', // GPU acceleration
                    willChange: 'auto',
                    imageRendering: 'crisp-edges' // Better edge detection for QR codes
                  }}
                />

                {/* Enhanced Adaptive Scanning Frame */}
                <QRScannerFrame 
                  isScanning={isScanning}
                  qrBounds={qrBounds}
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />

                {/* Hidden canvas for QR processing */}
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="absolute bottom-20 left-4 right-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="p-4 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-6">
              {/* Upload from gallery */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ImageIcon className="w-6 h-6 text-white" />
              </motion.button>

              {/* Flash toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleFlash}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {flashEnabled ? (
                  <FlashlightOff className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Flashlight className="w-6 h-6 text-white" />
                )}
              </motion.button>

              {/* Camera flip */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleCamera}
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <RotateCcw className="w-6 h-6 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </motion.div>
      )}

      {/* Enhanced Scan Result Modal */}
      <QRScanResult
        key="qr-scan-result"
        isVisible={!!scanResult && !isOpen}
        scanResult={scanResult}
        onClose={handleClose}
        onRetry={() => {
          retryScanning()
          if (onReopen) {
            onReopen() // Снова открываем сканер через родительский компонент
          }
        }}
        onUseAddress={handleConfirmScan}
      />
    </AnimatePresence>
  )
}
