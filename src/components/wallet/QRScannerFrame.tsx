/**
 * Enhanced QR Scanner Frame - Banking-app quality with GPU acceleration
 * Solana SuperApp - QR Scanner Components
 */

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

interface QRCorner {
  x: number
  y: number
}

interface QRBounds {
  topLeft: QRCorner
  topRight: QRCorner
  bottomLeft: QRCorner
  bottomRight: QRCorner
  width: number
  height: number
}

interface QRScannerFrameProps {
  isScanning: boolean
  qrBounds?: QRBounds | null
  containerWidth?: number
  containerHeight?: number
}

export function QRScannerFrame({ 
  isScanning, 
  qrBounds, 
  containerWidth = 320, 
  containerHeight = 320 
}: QRScannerFrameProps) {
  
  // Fixed frame size - responsive but never changes during scanning
  const frameSize = useMemo(() => {
    const minDimension = Math.min(containerWidth, containerHeight)
    const size = Math.max(220, Math.min(280, minDimension * 0.65))
    return { width: size, height: size }
  }, [containerWidth, containerHeight])

  // Fixed center position - never moves
  const framePosition = useMemo(() => ({
    x: (containerWidth - frameSize.width) / 2,
    y: (containerHeight - frameSize.height) / 2
  }), [containerWidth, containerHeight, frameSize])

  // Simple state for detection status
  const isDetected = Boolean(qrBounds)

  return (
    <div className="absolute inset-0 pointer-events-none">
      
      {/* Fixed scanning frame - never moves or resizes */}
      <div
        className="absolute"
        style={{
          left: framePosition.x,
          top: framePosition.y,
          width: frameSize.width,
          height: frameSize.height,
          transform: 'translateZ(0)', // GPU layer
        }}
      >
        {/* Main frame border */}
        <div className="relative w-full h-full border-2 border-white/50 rounded-2xl">
          
          {/* Fixed corner indicators with smooth color transitions */}
          <motion.div 
            className="absolute -top-1 -left-1 border-t-4 border-l-4 rounded-tl-2xl w-8 h-8"
            animate={{
              borderColor: isDetected ? '#10B981' : '#9945FF',
              boxShadow: isDetected 
                ? '0 0 12px rgba(16, 185, 129, 0.5)' 
                : '0 0 8px rgba(153, 69, 255, 0.3)'
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: 'border-color, box-shadow' }}
          />
          <motion.div 
            className="absolute -top-1 -right-1 border-t-4 border-r-4 rounded-tr-2xl w-8 h-8"
            animate={{
              borderColor: isDetected ? '#10B981' : '#9945FF',
              boxShadow: isDetected 
                ? '0 0 12px rgba(16, 185, 129, 0.5)' 
                : '0 0 8px rgba(153, 69, 255, 0.3)'
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: 'border-color, box-shadow' }}
          />
          <motion.div 
            className="absolute -bottom-1 -left-1 border-b-4 border-l-4 rounded-bl-2xl w-8 h-8"
            animate={{
              borderColor: isDetected ? '#10B981' : '#9945FF',
              boxShadow: isDetected 
                ? '0 0 12px rgba(16, 185, 129, 0.5)' 
                : '0 0 8px rgba(153, 69, 255, 0.3)'
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: 'border-color, box-shadow' }}
          />
          <motion.div 
            className="absolute -bottom-1 -right-1 border-b-4 border-r-4 rounded-br-2xl w-8 h-8"
            animate={{
              borderColor: isDetected ? '#10B981' : '#9945FF',
              boxShadow: isDetected 
                ? '0 0 12px rgba(16, 185, 129, 0.5)' 
                : '0 0 8px rgba(153, 69, 255, 0.3)'
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: 'border-color, box-shadow' }}
          />
          
          {/* Ultra-smooth scanning line with perfect GPU acceleration */}
          {isScanning && (
            <motion.div
              className="absolute left-4 right-4 h-0.5 rounded-full"
              animate={{ 
                y: [16, frameSize.height - 24, 16]
              }}
              transition={{ 
                duration: 2.2, 
                repeat: Infinity, 
                ease: "linear", // Линейное движение для плавности
                repeatType: "reverse"
              }}
              style={{
                background: isDetected 
                  ? 'linear-gradient(90deg, transparent 0%, #10B981 40%, #10B981 60%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, #9945FF 40%, #9945FF 60%, transparent 100%)',
                boxShadow: isDetected 
                  ? '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(16, 185, 129, 0.4)'
                  : '0 0 16px rgba(153, 69, 255, 0.6), 0 0 32px rgba(153, 69, 255, 0.3)',
                willChange: 'transform',
                transform: 'translateZ(0)', // Force GPU layer
                filter: 'blur(0.5px)', // Небольшое размытие для мягкости
              }}
            />
          )}
        </div>
      </div>

      {/* Status text with smooth transitions */}
      <div className="absolute bottom-0 left-0 right-0 pb-20">
        <div className="text-center px-6">
          <motion.p 
            className="font-semibold text-lg mb-1"
            animate={{
              color: isDetected ? '#10B981' : '#ffffff',
              scale: isDetected ? 1.02 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ 
              willChange: 'color, transform',
              textShadow: isDetected 
                ? '0 0 8px rgba(16, 185, 129, 0.4)' 
                : '0 0 4px rgba(0, 0, 0, 0.6)'
            }}
          >
            {isDetected ? 'QR код обнаружен!' : 'Поместите QR код в рамку'}
          </motion.p>
          
          {isDetected && (
            <motion.p 
              className="text-green-400 text-sm font-medium"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
              style={{
                textShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
              }}
            >
               Обработка...
            </motion.p>
          )}
        </div>
      </div>
    </div>
  )
}
