'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import WebApp from '@twa-dev/sdk'
import { TelegramDataManager } from '@/lib/telegram/TelegramDataManager'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface TelegramContextType {
  user: TelegramUser | null
  webApp: typeof WebApp | null
  isReady: boolean
  initData: string | null
  platform: string | null
  refreshCount: number
  forceRefresh: () => Promise<boolean>
  getStats: () => any
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  webApp: null,
  isReady: false,
  initData: null,
  platform: null,
  refreshCount: 0,
  forceRefresh: async () => false,
  getStats: () => ({}),
})

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  // ВСЕ хуки должны быть объявлены до любых условных возвратов
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [webApp, setWebApp] = useState<typeof WebApp | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [initData, setInitData] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [mounted, setMounted] = useState(false) // Для предотвращения hydration mismatch
  const [dataManager] = useState(() => TelegramDataManager.getInstance())

  //  Инициализация с TelegramDataManager
  useEffect(() => {
    if (!mounted) return

    const initializeTelegram = async () => {
      try {
        console.log(' Initializing enhanced Telegram Provider...')
        
        // Инициализируем менеджер данных
        const success = await dataManager.initialize()
        
        if (success) {
          // Подписываемся на изменения данных
          const unsubscribe = dataManager.subscribe((telegramState) => {
            console.log(' Telegram data updated:', {
              hasInitData: !!telegramState.initData,
              hasUser: !!telegramState.user,
              refreshCount: telegramState.refreshCount
            })

            setUser(telegramState.user)
            setInitData(telegramState.initData)
            setPlatform(telegramState.platform)
            setIsReady(telegramState.isReady)
            setRefreshCount(telegramState.refreshCount)
          })

          // Настраиваем WebApp если доступен
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = WebApp
            setWebApp(tg)

            // Базовая настройка WebApp
            tg.ready()
            tg.setHeaderColor('#0A0A0F')
            tg.setBackgroundColor('#0A0A0F')
            tg.enableClosingConfirmation()

            // Welcome message removed as per requirements

            // Кнопка назад
            tg.BackButton.onClick(() => {
              tg.BackButton.hide()
            })

            // WebApp configured
          }

          // Получаем начальное состояние
          const initialState = dataManager.getState()
          setUser(initialState.user)
          setInitData(initialState.initData)
          setPlatform(initialState.platform)
          setIsReady(initialState.isReady)
          setRefreshCount(initialState.refreshCount)

          // Enhanced Telegram Provider initialized

          // Возвращаем функцию очистки
          return () => {
            unsubscribe()
            dataManager.cleanup()
          }
        } else {
          console.warn(' TelegramDataManager initialization failed')
          setIsReady(true) // Все равно готово для разработки
        }
      } catch (error) {
        console.error(' Enhanced Telegram Provider initialization error:', error)
        setIsReady(true)
      }
    }

    const cleanup = initializeTelegram()
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.())
    }
  }, [mounted, dataManager])

  //  Принудительное обновление данных
  const forceRefresh = useCallback(async (): Promise<boolean> => {
    try {
      console.log(' Force refreshing Telegram data via Provider...')
      const success = await dataManager.forceRefresh()
      
      if (success) {
        // Состояние обновится автоматически через subscription
        console.log(' Telegram data force refresh successful')
      }
      
      return success
    } catch (error) {
      console.error(' Force refresh error:', error)
      return false
    }
  }, [dataManager])

  //  Получение статистики
  const getStats = useCallback(() => {
    return dataManager.getStats()
  }, [dataManager])

  // Проверка mounted состояния после всех хуков
  useEffect(() => {
    setMounted(true)
  }, [])

  // Если не mounted, показываем loading (предотвращение hydration mismatch)
  if (!mounted) {
    return <div suppressHydrationWarning>Loading...</div>
  }

  const value: TelegramContextType = {
    user,
    webApp,
    isReady,
    initData,
    platform,
    refreshCount,
    forceRefresh,
    getStats,
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram должен использоваться внутри TelegramProvider')
  }
  return context
}

// Хелперы для тактильной обратной связи
export const hapticFeedback = {
  impact: (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
    }
  },
  
  notification: (type: 'error' | 'success' | 'warning') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type)
    }
  },
  
  selection: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged()
    }
  }
}
