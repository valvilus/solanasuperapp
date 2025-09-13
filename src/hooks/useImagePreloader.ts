import { useCallback } from 'react'
import { assetOptimizationManager } from '@/lib/performance/asset-optimization'

/**
 * Хук для предварительной загрузки изображений
 */
export function useImagePreloader() {
  const preloadImages = useCallback(async (sources: string[]) => {
    const promises = sources.map(src => 
      assetOptimizationManager.preloadImage(src).catch(error => {
        console.warn(`Failed to preload image ${src}:`, error)
        return null
      })
    )

    const results = await Promise.all(promises)
    return results.filter(Boolean) as HTMLImageElement[]
  }, [])

  const preloadSingleImage = useCallback(async (src: string) => {
    try {
      return await assetOptimizationManager.preloadImage(src)
    } catch (error) {
      console.warn(`Failed to preload image ${src}:`, error)
      return null
    }
  }, [])

  return { 
    preloadImages, 
    preloadSingleImage 
  }
}
