/**
 * Telegram Data Manager - Dynamic initData Refresh
 * Solana SuperApp - Bulletproof Telegram Integration
 */

interface TelegramDataState {
  initData: string | null
  user: any | null
  platform: string | null
  version: string | null
  isReady: boolean
  lastUpdate: number
  refreshCount: number
}

export class TelegramDataManager {
  private static instance: TelegramDataManager | null = null
  private state: TelegramDataState = {
    initData: null,
    user: null,
    platform: null,
    version: null,
    isReady: false,
    lastUpdate: 0,
    refreshCount: 0
  }

  private listeners: Array<(data: TelegramDataState) => void> = []
  private refreshInterval: NodeJS.Timeout | null = null
  private webApp: any = null

  /**
   *  Singleton pattern
   */
  static getInstance(): TelegramDataManager {
    if (!TelegramDataManager.instance) {
      TelegramDataManager.instance = new TelegramDataManager()
    }
    return TelegramDataManager.instance
  }

  /**
   *  Инициализация с автообновлением
   */
  async initialize(): Promise<boolean> {
    try {
      console.log(' Initializing Telegram Data Manager...')

      // Проверяем доступность Telegram WebApp
      if (typeof window === 'undefined') {
        console.log(' Server-side environment, skipping Telegram init')
        return false
      }

      // Ждем загрузки Telegram WebApp
      await this.waitForTelegram()

      // Получаем первичные данные
      const success = this.updateTelegramData()

      if (success) {
        // Запускаем мониторинг изменений
        this.startDataMonitoring()
        
        // Устанавливаем интервал проверки
        this.refreshInterval = setInterval(() => {
          this.checkAndRefreshData()
        }, 30000) // Проверяем каждые 30 секунд

        console.log(' Telegram Data Manager initialized')
      }

      return success
    } catch (error) {
      console.error(' Telegram Data Manager initialization failed:', error)
      return false
    }
  }

  /**
   *  Ожидание загрузки Telegram WebApp
   */
  private async waitForTelegram(timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const checkTelegram = () => {
        if (window.Telegram?.WebApp) {
          this.webApp = window.Telegram.WebApp
          resolve(true)
          return
        }

        if (Date.now() - startTime > timeout) {
          console.log(' Telegram WebApp not available, using mock data')
          this.setupMockData()
          resolve(true)
          return
        }

        setTimeout(checkTelegram, 100)
      }

      checkTelegram()
    })
  }

  /**
   *  Обновление данных Telegram
   */
  private updateTelegramData(): boolean {
    try {
      if (this.webApp) {
        // Реальные данные из Telegram
        const initData = this.webApp.initData
        const user = this.webApp.initDataUnsafe?.user
        const platform = this.webApp.platform
        const version = this.webApp.version

        // Проверяем, что данные не пустые
        if (!initData || initData.length < 10) {
          console.warn(' Telegram initData is empty or too short')
          
          // Пытаемся форсировать обновление
          if (this.webApp.ready) {
            this.webApp.ready()
          }

          return false
        }

        // Обновляем состояние
        const prevInitData = this.state.initData
        this.state = {
          initData,
          user,
          platform,
          version,
          isReady: true,
          lastUpdate: Date.now(),
          refreshCount: this.state.refreshCount + (prevInitData !== initData ? 1 : 0)
        }

        // Уведомляем слушателей если данные изменились
        if (prevInitData !== initData) {
          console.log(' Telegram initData updated', {
            length: initData.length,
            refreshCount: this.state.refreshCount
          })
          this.notifyListeners()
        }

        return true
      } else {
        // Mock данные для разработки
        return this.setupMockData()
      }
    } catch (error) {
      console.error(' Error updating Telegram data:', error)
      return false
    }
  }

  /**
   *  Настройка mock данных для разработки
   */
  private setupMockData(): boolean {
    try {
      const mockUser = {
        id: 12345,
        first_name: 'Тест',
        last_name: 'Пользователь',
        username: 'testuser',
        language_code: 'ru',
        is_premium: false,
      }

      // Создаем динамический mock initData с timestamp
      const authDate = Math.floor(Date.now() / 1000)
      const mockInitData = `user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=${authDate}&hash=mock_hash_${authDate}`

      this.state = {
        initData: mockInitData,
        user: mockUser,
        platform: 'web',
        version: '6.0',
        isReady: true,
        lastUpdate: Date.now(),
        refreshCount: this.state.refreshCount + 1
      }

      console.log(' Mock Telegram data setup complete')
      this.notifyListeners()
      return true
    } catch (error) {
      console.error(' Mock data setup failed:', error)
      return false
    }
  }

  /**
   *  Мониторинг изменений данных
   */
  private startDataMonitoring(): void {
    if (!this.webApp) return

    // Слушаем события Telegram
    try {
      // Событие изменения viewport
      this.webApp.onEvent('viewportChanged', () => {
        console.log(' Telegram viewport changed, refreshing data')
        setTimeout(() => this.checkAndRefreshData(), 100)
      })

      // Событие активации приложения
      this.webApp.onEvent('themeChanged', () => {
        console.log(' Telegram theme changed, refreshing data')
        setTimeout(() => this.checkAndRefreshData(), 100)
      })

      // Событие фокуса
      window.addEventListener('focus', () => {
        console.log(' Window focused, checking Telegram data')
        setTimeout(() => this.checkAndRefreshData(), 500)
      })

      // Событие видимости страницы
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          console.log(' Page became visible, checking Telegram data')
          setTimeout(() => this.checkAndRefreshData(), 500)
        }
      })

    } catch (error) {
      console.warn(' Could not setup Telegram event listeners:', error)
    }
  }

  /**
   *  Проверка и обновление данных
   */
  private checkAndRefreshData(): void {
    try {
      // Проверяем возраст данных
      const dataAge = Date.now() - this.state.lastUpdate
      const MAX_AGE = 5 * 60 * 1000 // 5 минут

      if (dataAge > MAX_AGE) {
        console.log(' Telegram data is stale, refreshing', {
          ageMinutes: Math.round(dataAge / 60000)
        })
        this.updateTelegramData()
        return
      }

      // Проверяем целостность данных
      if (!this.state.initData || this.state.initData.length < 10) {
        console.log(' Telegram data integrity check failed, refreshing')
        this.updateTelegramData()
        return
      }

      // Проверяем доступность WebApp
      if (this.webApp && this.webApp.initData !== this.state.initData) {
        console.log(' Telegram initData mismatch detected, updating')
        this.updateTelegramData()
        return
      }

    } catch (error) {
      console.error(' Error checking Telegram data:', error)
    }
  }

  /**
   *  Принудительное обновление данных
   */
  async forceRefresh(): Promise<boolean> {
    try {
      console.log(' Force refreshing Telegram data...')

      // Перезапускаем WebApp если возможно
      if (this.webApp && this.webApp.ready) {
        this.webApp.ready()
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      const success = this.updateTelegramData()
      
      if (success) {
        console.log(' Telegram data force refresh successful')
      } else {
        console.warn(' Telegram data force refresh failed')
      }

      return success
    } catch (error) {
      console.error(' Force refresh error:', error)
      return false
    }
  }

  /**
   *  Подписка на изменения данных
   */
  subscribe(callback: (data: TelegramDataState) => void): () => void {
    this.listeners.push(callback)
    
    // Возвращаем функцию отписки
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   *  Уведомление слушателей
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback({ ...this.state })
      } catch (error) {
        console.error(' Listener callback error:', error)
      }
    })
  }

  /**
   *  Получение текущего состояния
   */
  getState(): TelegramDataState {
    return { ...this.state }
  }

  /**
   *  Получение текущих initData
   */
  getCurrentInitData(): string | null {
    return this.state.initData
  }

  /**
   *  Получение текущего пользователя
   */
  getCurrentUser(): any | null {
    return this.state.user
  }

  /**
   *  Очистка ресурсов
   */
  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }

    this.listeners = []
    
    console.log(' Telegram Data Manager cleaned up')
  }

  /**
   *  Статистика обновлений
   */
  getStats() {
    return {
      refreshCount: this.state.refreshCount,
      lastUpdate: this.state.lastUpdate,
      dataAge: Date.now() - this.state.lastUpdate,
      isHealthy: this.state.initData !== null && this.state.initData.length > 10
    }
  }
}
