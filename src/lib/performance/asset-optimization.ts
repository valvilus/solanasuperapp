/**
 * Система оптимизации ассетов и изображений
 */


interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  placeholder?: boolean
}

interface AssetPreloadOptions {
  priority?: 'high' | 'low'
  as?: 'image' | 'script' | 'style' | 'font'
  crossOrigin?: 'anonymous' | 'use-credentials'
}

/**
 * Менеджер оптимизации ассетов
 */
class AssetOptimizationManager {
  private preloadedAssets = new Set<string>()
  private imageCache = new Map<string, HTMLImageElement>()
  private loadingPromises = new Map<string, Promise<any>>()

  /**
   * Оптимизировать URL изображения
   */
  optimizeImageUrl(
    src: string,
    options: ImageOptimizationOptions = {}
  ): string {
    const {
      width,
      height,
      quality = 80,
      format = 'webp'
    } = options

    // Если это внешнее изображение, возвращаем как есть
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src
    }

    // Если это Next.js изображение, используем оптимизацию Next.js
    if (src.startsWith('/')) {
      const params = new URLSearchParams()
      
      if (width) params.set('w', width.toString())
      if (height) params.set('h', height.toString())
      if (quality !== 80) params.set('q', quality.toString())
      
      const queryString = params.toString()
      return queryString ? `${src}?${queryString}` : src
    }

    return src
  }

  /**
   * Предварительно загрузить ассет
   */
  async preloadAsset(
    href: string,
    options: AssetPreloadOptions = {}
  ): Promise<void> {
    if (this.preloadedAssets.has(href)) {
      return
    }

    const {
      priority = 'low',
      as = 'image',
      crossOrigin
    } = options

    // Проверяем, не загружается ли уже
    if (this.loadingPromises.has(href)) {
      return this.loadingPromises.get(href)!
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = href
      link.as = as

      if (crossOrigin) {
        link.crossOrigin = crossOrigin
      }

      if (priority === 'high') {
        link.setAttribute('importance', 'high')
      }

      link.onload = () => {
        this.preloadedAssets.add(href)
        resolve()
      }

      link.onerror = () => {
        reject(new Error(`Failed to preload ${href}`))
      }

      document.head.appendChild(link)
    })

    this.loadingPromises.set(href, loadPromise)

    try {
      await loadPromise
    } finally {
      this.loadingPromises.delete(href)
    }
  }

  /**
   * Предварительно загрузить изображение
   */
  async preloadImage(
    src: string,
    options: ImageOptimizationOptions = {}
  ): Promise<HTMLImageElement> {
    const optimizedSrc = this.optimizeImageUrl(src, options)

    // Проверяем кэш
    if (this.imageCache.has(optimizedSrc)) {
      return this.imageCache.get(optimizedSrc)!
    }

    // Проверяем, не загружается ли уже
    if (this.loadingPromises.has(optimizedSrc)) {
      return this.loadingPromises.get(optimizedSrc)!
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        this.imageCache.set(optimizedSrc, img)
        resolve(img)
      }

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${optimizedSrc}`))
      }

      img.src = optimizedSrc
    })

    this.loadingPromises.set(optimizedSrc, loadPromise)

    try {
      const img = await loadPromise
      return img
    } finally {
      this.loadingPromises.delete(optimizedSrc)
    }
  }

  /**
   * Создать placeholder для изображения
   */
  createImagePlaceholder(
    width: number,
    height: number,
    color: string = '#f3f4f6'
  ): string {
    // Создаем SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" font-family="system-ui" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
          Загрузка...
        </text>
      </svg>
    `
    
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  /**
   * Создать blurred placeholder
   */
  createBlurredPlaceholder(
    width: number,
    height: number,
    baseColor: string = '#e5e7eb'
  ): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return this.createImagePlaceholder(width, height)

    // Создаем градиент
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, baseColor)
    gradient.addColorStop(0.5, '#d1d5db')
    gradient.addColorStop(1, baseColor)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    return canvas.toDataURL()
  }

  /**
   * Оптимизировать загрузку шрифтов
   */
  optimizeFontLoading(fontFamilies: string[]): void {
    fontFamilies.forEach(fontFamily => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = 'https://fonts.googleapis.com'
      document.head.appendChild(link)

      const link2 = document.createElement('link')
      link2.rel = 'preconnect'
      link2.href = 'https://fonts.gstatic.com'
      link2.crossOrigin = 'anonymous'
      document.head.appendChild(link2)
    })
  }

  /**
   * Предварительно загрузить критические ресурсы
   */
  async preloadCriticalResources(): Promise<void> {
    const criticalAssets = [
      // Критические стили
      '/styles/critical.css',
      
      // Логотипы и иконки
      '/images/logo.svg',
      '/images/solana-logo.svg',
      
      // Критические скрипты
      '/scripts/telegram-web-app.js'
    ]

    const preloadPromises = criticalAssets.map(asset => 
      this.preloadAsset(asset, { priority: 'high' }).catch(error => {
        console.warn(`Failed to preload critical asset ${asset}:`, error)
      })
    )

    await Promise.all(preloadPromises)
  }

  /**
   * Очистить кэш изображений
   */
  clearImageCache(): void {
    this.imageCache.clear()
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      preloadedAssets: this.preloadedAssets.size,
      cachedImages: this.imageCache.size,
      loadingPromises: this.loadingPromises.size
    }
  }
}

// Глобальный менеджер оптимизации ассетов
export const assetOptimizationManager = new AssetOptimizationManager()

/**
 * Интерфейс для оптимизированного изображения
 */
export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  placeholder?: boolean
  className?: string
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
}

/**
 * Функция для предварительной загрузки изображений
 */
export function createImagePreloader() {
  return {
    preloadImages: async (sources: string[]) => {
      const promises = sources.map(src => 
        assetOptimizationManager.preloadImage(src).catch(error => {
          console.warn(`Failed to preload image ${src}:`, error)
          return null
        })
      )

      const results = await Promise.all(promises)
      return results.filter(Boolean) as HTMLImageElement[]
    }
  }
}

// Инициализация критических ресурсов при загрузке модуля
if (typeof window !== 'undefined') {
  // Предварительно загружаем критические ресурсы
  assetOptimizationManager.preloadCriticalResources().catch(error => {
    console.warn('Failed to preload critical resources:', error)
  })

  // Оптимизируем загрузку шрифтов
  assetOptimizationManager.optimizeFontLoading(['Inter', 'JetBrains Mono'])
}
