'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { assetOptimizationManager, OptimizedImageProps } from '@/lib/performance/asset-optimization'

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  placeholder = true,
  className = '',
  loading = 'lazy',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const optimizedSrc = useMemo(() => 
    assetOptimizationManager.optimizeImageUrl(src, { width, height, quality }),
    [src, width, height, quality]
  )

  const placeholderSrc = useMemo(() => {
    if (!placeholder || !width || !height) return undefined
    return assetOptimizationManager.createImagePlaceholder(width, height)
  }, [placeholder, width, height])

  const handleLoad = useCallback(() => {
    setImageLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setImageError(true)
    onError?.()
  }, [onError])

  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm">Ошибка загрузки</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {placeholder && placeholderSrc && !imageLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}
