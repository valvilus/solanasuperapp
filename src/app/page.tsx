'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'
import ClientOnly from '@/components/common/ClientOnly'
import { useTelegram, hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useNotifications } from '@/contexts/NotificationContext'
// Removed unused hooks - now using optimized useTokenBalance
// import { useAuth } from '@/contexts/AuthContext' // Removed unused
// import { AuthGuard, UserInfo } from '@/components/auth' // Removed unused
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useBottomNavigation } from '@/components/navigation/BottomTabBar'
import { 
  Wallet, 
  ImageIcon, 
  Users, 
  GraduationCap, 
  Briefcase,
  TrendingUp,
  // Zap, // Unused
  ArrowUpRight,
  // Eye, // Unused
  Plus,
  RefreshCw
  // Coins // Unused
} from 'lucide-react'
import { motion } from 'framer-motion'
import { MainPageSkeleton } from '@/components/ui/MainPageSkeleton'
import { GlassLoader } from '@/components/ui/GlassLoader'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import { formatTokenBalance, formatUSDValue } from '@/lib/formatters'
import { usePortfolioBalances } from '@/hooks/useTokenBalance'

export default function Home() {
  return (
    <ClientOnly fallback={<MainPageSkeleton />}>
      <HomeContent />
    </ClientOnly>
  )
}

function HomeContent() {
  const { isReady, initData } = useTelegram()
  const { user, login, isAuthenticated, isLoading: authLoading, apiCall } = useCompatibleAuth()
  const { navigateTo } = useBottomNavigation()
  const { showSuccess, showError } = useNotifications()
  const [isFaucetLoading, setIsFaucetLoading] = useState(false)
  
  // Портфель с оптимизированным кешированием и автообновлением
  const {
    TNG,
    SOL,
    USDC,
    totalUSDValue,
    formattedTotalUSD,
    loading,
    refreshAll: refreshPortfolio
  } = usePortfolioBalances({
    cacheTime: 2 * 60 * 1000, // 2 минуты кеш
    autoRefresh: true, //  Включаем автообновление
    formatType: 'visual'
  })

  // Функция ручного обновления балансов (объявляем до использования)
  const handleRefreshBalances = useCallback(async () => {
    try {
      // Очищаем кеши и обновляем
      SOL.clearCache()
      TNG.clearCache()
      USDC.clearCache()
      
      await refreshPortfolio()
    } catch (error) {
      
    }
  }, [SOL, TNG, USDC, refreshPortfolio])

  // Auto login when Telegram is ready
  useEffect(() => {
    const performAutoLogin = async () => {
      if (isReady && initData && !isAuthenticated && !authLoading) {
        try {
          await login(initData)
        } catch (error) {
          // Silent fail for auto login
        }
      }
    }

    performAutoLogin()
  }, [isReady, initData, isAuthenticated, authLoading, login])

  // Обновляем балансы при возвращении на страницу (для случаев после свапа)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && user?.walletAddress) {
        handleRefreshBalances()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, user?.walletAddress, handleRefreshBalances])
  
  // Автоматическая загрузка балансов теперь происходит через usePortfolioBalances с autoRefresh: true

  // Убираем индикатор загрузки - авторизация происходит беззвучно
  // if (!isReady || isLoading) {
  //   return (
  //     <SolanaFullScreenLoader 
  //       title="Solana SuperApp"
  //       subtitle="Подключение к экосистеме..."
  //     />
  //   )
  // }

  const handleFeatureClick = (path: string) => {
    hapticFeedback.impact('light')
    
    // ИСПРАВЛЕНО: Специальная обработка для DAO - сразу открываем голосования
    if (path === '/dao') {
      navigateTo('/dao?tab=proposals')
    } else {
      // Авторизация происходит автоматически, просто переходим
      navigateTo(path)
    }
  }

  const handleQuickAction = async () => {
    hapticFeedback.selection()
    setIsFaucetLoading(true)
    
    try {
      // Сначала убеждаемся что у пользователя есть кошелек
      if (!user?.walletAddress) {
        console.log(' User has no wallet, creating one...')
        const walletResponse = await apiCall('/api/wallet', {
          method: 'POST'
        })
        
        if (!walletResponse.ok) {
          console.error(' Failed to create wallet')
          hapticFeedback.notification('error')
          return
        }
        
        // Перезагружаем пользователя для получения нового walletAddress
        await login(initData)
      }

      // Теперь используем apiCall для правильной авторизации
      const result = await apiCall('/api/tokens/tng/faucet', {
        method: 'POST',
        body: JSON.stringify({ amount: '1000000000000' })
      })
      
      const data = await result.json()
      
      if (data.success) {
        hapticFeedback.notification('success')
        showSuccess(
          '🎉 Получено 1000 TNG!',
          'Токены успешно добавлены в кошелек',
          4000
        )
        await handleRefreshBalances()
      } else {
        if (data.nextAvailable) {
          const nextTime = new Date(data.nextAvailable).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          })
          showError(
            '⏰ Фосет недоступен',
            `Можно использовать снова в ${nextTime}`,
            6000
          )
        } else {
          showError(
            '⚠️ Ошибка фосета',
            data.error || 'Ошибка получения токенов',
            5000
          )
        }
        hapticFeedback.notification('error')
      }
    } catch (e) {
      console.error(' Faucet error:', e)
      hapticFeedback.notification('error')
    } finally {
      setIsFaucetLoading(false)
    }
  }

  // Основные функции - thumb-friendly размеры
  const primaryFeatures = [
    {
      id: 'wallet',
      title: 'Кошелек',
      subtitle: 'SOL • Токены',
      icon: Wallet,
      path: '/wallet',
      accent: 'purple',
      value: !user?.walletAddress ? 
        'Подключить' : 
        SOL.formattedBalance,
      bgGradient: 'from-solana-purple/20 to-solana-purple/5',
      requiresAuth: true
    },
    {
      id: 'nft',
      title: 'NFT',
      subtitle: 'Коллекции',
      icon: ImageIcon,
      path: '/nft',
      accent: 'green',
      value: '0 NFT',
      bgGradient: 'from-solana-green/20 to-solana-green/5',
      requiresAuth: true
    }
  ]

  // Вторичные функции - компактные
  const secondaryFeatures = [
    { 
      id: 'dao', 
      title: 'DAO', 
      icon: Users, 
      path: '/dao', 
      color: 'text-solana-cyan',
      requiresAuth: true,
      locked: false
    },
    { 
      id: 'learn', 
      title: 'Учеба', 
      icon: GraduationCap, 
      path: '/learn', 
      color: 'text-yellow-400',
      requiresAuth: false, // Обучение доступно всем
      locked: false
    },
    { 
      id: 'jobs', 
      title: 'Работа', 
      icon: Briefcase, 
      path: '/jobs', 
      color: 'text-blue-400',
      requiresAuth: true,
      locked: false
    },
    { 
      id: 'defi', 
      title: 'DeFi', 
      icon: TrendingUp, 
      path: '/defi', 
      color: 'text-orange-400',
      requiresAuth: true,
      locked: !user?.walletAddress
    }
  ]

  return (
    <ClientOnly fallback={<MainPageSkeleton />}>
      {/* 3D Background - приглушенный для не отвлечения */}
      <div className="fixed inset-0 opacity-20">
        <Scene3DBackground />
      </div>
      
      <PageLayout showBottomNav={true}>
        <div className="space-y-5 pb-safe">
          
          {/* BREATHING ROOM - компактный header */}
          <motion.div
            className="px-5 pt-4 pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">
                  Solana <span className="text-solana-purple">SuperApp</span>
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Web3 экосистема
                </p>
              </div>
                              {user?.isPremium && (
                  <Badge className="bg-gradient-to-r from-solana-purple to-solana-green text-white border-0 text-xs">
                    Premium
                  </Badge>
                )}
            </div>
          </motion.div>

          {/* ВИЗУАЛЬНАЯ ИЕРАРХИЯ - центральная карточка баланса */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <SimpleCard className="p-5 border border-white/10">
              {/* User info - аватарка, имя пользователя, баланс */}
              <div className="flex items-center gap-3 mb-4">
                {user && (
                  <Avatar className="w-10 h-10 ring-2 ring-solana-purple/30">
                    <AvatarImage src={user.photoUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-solana-purple to-solana-green text-white text-sm font-medium">
                      {user.firstName[0]}{user.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <h3 className="text-white font-medium text-sm">
                    {user ? `Привет, ${user.username || user.firstName}` : 'Кошелек'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Общий баланс портфеля
                  </p>
                </div>
              </div>
              
              {/* КОНТРАСТНОСТЬ - четкое разделение баланса */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenLogo token="SOL" size="sm" className="text-solana-green" />
                    <span className="text-2xl font-bold text-white" suppressHydrationWarning>
                      {!user?.walletAddress ? 
                        '--' : 
                        SOL.loading ? 
                          <GlassLoader size="sm" /> : 
                          SOL.formattedBalance}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500" suppressHydrationWarning>
                      {!user?.walletAddress ? 
                        'Подключите кошелек' : 
                        loading ?
                          <GlassLoader size="xs" /> :
                          formattedTotalUSD}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <div className="flex items-center gap-1">
                        <TokenLogo token="TNG" size="sm" className="text-solana-cyan w-3 h-3" />
                        <span className="text-xs text-solana-cyan" suppressHydrationWarning>
                          {!user?.walletAddress ? 
                            '0 TNG' : 
                            TNG.loading ? 
                              <GlassLoader size="xs" /> : 
                              TNG.formattedBalance}
                        </span>
                      </div>
                      {/* Кнопка обновления (только для авторизованных с кошельком) */}
                      {user?.walletAddress && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            hapticFeedback.impact('light')
                            handleRefreshBalances()
                          }}
                          disabled={loading}
                          className="text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                          title="Обновить балансы"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SimpleCard>
          </motion.div>

          {/* THUMB-FRIENDLY - основные функции с оптимальными размерами */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="grid grid-cols-2 gap-3">
              {primaryFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleFeatureClick(feature.path)}
                  className="cursor-pointer touch-manipulation"
                >
                  {/* ПОСЛЕДОВАТЕЛЬНОСТЬ - единый стиль карточек */}
                  <SimpleCard className={`p-4 h-32 bg-gradient-to-br ${feature.bgGradient} border border-white/10 hover:border-white/20 transition-all duration-200`}>
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between">
                        <feature.icon className={`w-6 h-6 ${getAccentColor(feature.accent)}`} />
                        <ArrowUpRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          {feature.id === 'wallet' && user?.walletAddress && (
                            <>
                              <TokenLogo token="SOL" size="sm" className="w-3 h-3 text-solana-purple" />
                              <TokenLogo token="TNG" size="sm" className="w-3 h-3 text-solana-green" />
                            </>
                          )}
                          <p className="text-xs text-gray-400">{feature.subtitle}</p>
                        </div>
                        <p className={`text-xs font-medium ${getAccentColor(feature.accent)}`}>
                          {feature.value}
                        </p>
                      </div>
                    </div>
                  </SimpleCard>
                </motion.div>
              ))}
        </div>
          </motion.div>

          {/* БЫСТРОЕ СКАНИРОВАНИЕ - компактная сетка вторичных функций */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h3 className="text-sm font-medium text-gray-300 mb-3">Сервисы</h3>
            <div className="grid grid-cols-4 gap-2">
              {secondaryFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05, duration: 0.2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleFeatureClick(feature.path)}
                  className="cursor-pointer touch-manipulation"
                >
                  {/* КОНСИСТЕНТНОСТЬ - повторяющийся паттern */}
                  <SimpleCard className="p-3 h-18 border border-white/5 hover:border-white/10 transition-all duration-150">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <feature.icon className={`w-5 h-5 mb-1.5 ${feature.color}`} />
                      <p className="text-xs text-white font-medium">{feature.title}</p>
                    </div>
                  </SimpleCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ИНТУИТИВНАЯ НАВИГАЦИЯ - четкий CTA */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <SimpleCard className="p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-3">
                  <h3 className="text-white font-medium text-sm mb-1">Начать работу</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">Получите тестовые токены</p>
                </div>
                {/* МИКРОАНИМАЦИИ - subtle hover/tap эффекты */}
                <SimpleButton
                  gradient={true}
                  size="sm"
                  className="flex items-center gap-2 touch-manipulation"
                  onClick={handleQuickAction}
                  disabled={isFaucetLoading}
                >
                  {isFaucetLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Получение...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Фосет
                    </>
                  )}
                </SimpleButton>
              </div>
            </SimpleCard>
          </motion.div>

            </div>
      </PageLayout>
    </ClientOnly>
  )
}

// Утилиты для цветовой схемы
function getAccentColor(accent: string): string {
  const colors = {
    purple: 'text-solana-purple',
    green: 'text-solana-green',
    cyan: 'text-solana-cyan',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400'
  }
  return colors[accent as keyof typeof colors] || colors.purple
}