/**
 * Module Preloader - Предзагрузка критичных модулей
 * Solana SuperApp - Ускорение первого запроса
 */

// Singleton для предзагрузки тяжелых модулей
class ModulePreloader {
  private static instance: ModulePreloader
  private loaded = false
  private loading = false
  
  // Кеш предзагруженных модулей
  private moduleCache = new Map<string, any>()

  static getInstance(): ModulePreloader {
    if (!ModulePreloader.instance) {
      ModulePreloader.instance = new ModulePreloader()
    }
    return ModulePreloader.instance
  }

  // Предзагрузка критичных модулей в фоне
  async preloadCriticalModules(): Promise<void> {
    if (this.loaded || this.loading) return
    
    this.loading = true
    
    try {
      // Предзагружаем тяжелые Solana модули
      const [
        { Connection, PublicKey },
        { getAssociatedTokenAddress, getAccount },
        { prisma }
      ] = await Promise.all([
        import('@solana/web3.js'),
        import('@solana/spl-token'),
        import('@/lib/prisma')
      ])

      // Кешируем предзагруженные модули
      this.moduleCache.set('solana-web3', { Connection, PublicKey })
      this.moduleCache.set('spl-token', { getAssociatedTokenAddress, getAccount })
      this.moduleCache.set('prisma', { prisma })

      // Предзагружаем соединения
      const defaultConnection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )
      
      this.moduleCache.set('default-connection', defaultConnection)

      this.loaded = true
    } catch (error) {
      console.warn('Module preload failed:', error)
    } finally {
      this.loading = false
    }
  }

  // Получение предзагруженного модуля
  getModule<T>(key: string): T | null {
    return this.moduleCache.get(key) || null
  }

  // Получение или загрузка модуля
  async getOrLoadModule<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.moduleCache.get(key)
    if (cached) return cached

    const module = await loader()
    this.moduleCache.set(key, module)
    return module
  }

  // Статус предзагрузки
  isReady(): boolean {
    return this.loaded
  }

  // Очистка кеша
  clear(): void {
    this.moduleCache.clear()
    this.loaded = false
    this.loading = false
  }
}

// Автоматическая предзагрузка при импорте модуля
const preloader = ModulePreloader.getInstance()

// Запускаем предзагрузку в фоне (не блокируем основной поток)
if (typeof window !== 'undefined') {
  // В браузере - с задержкой
  setTimeout(() => {
    preloader.preloadCriticalModules()
  }, 2000)
} else {
  // На сервере - сразу
  preloader.preloadCriticalModules()
}

export default ModulePreloader

// Утилиты для быстрого доступа к предзагруженным модулям
export async function getOptimizedConnection() {
  const preloader = ModulePreloader.getInstance()
  
  const cached = preloader.getModule('default-connection')
  if (cached) return cached

  // Fallback - создаем новое соединение
  const { Connection } = await import('@solana/web3.js')
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  )
}

export async function getOptimizedSolanaModules() {
  const preloader = ModulePreloader.getInstance()
  
  return await preloader.getOrLoadModule('solana-web3', async () => {
    return await import('@solana/web3.js')
  })
}

export async function getOptimizedSPLModules() {
  const preloader = ModulePreloader.getInstance()
  
  return await preloader.getOrLoadModule('spl-token', async () => {
    return await import('@solana/spl-token')
  })
}
