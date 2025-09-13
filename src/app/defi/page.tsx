'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'
import ClientOnly from '@/components/common/ClientOnly'
import { useBottomNavigation } from '@/components/navigation/BottomTabBar'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useRouter } from 'next/navigation'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'

// DeFi Components
import {
  DeFiHeader,
  DeFiTabs,
  DeFiStatsSection,
  DeFiQuickActions,
  DeFiPositionCard,
  EnhancedPortfolioSection,
  StakingSection,
  LendingSection,
  HistorySection,
  SwapInterface,
  Token3DCard
} from '@/components/defi'

import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import { MainDeFiPageSkeleton } from '@/components/defi/DeFiSkeletons'

// Business Logic & Data
import {
  useDeFiState,
  useDeFiActions
} from '@/features/defi'

// Real DeFi Hooks
import { useStaking } from '@/hooks/useStaking'
import { useSwap } from '@/hooks/useSwap'
import { useFarming } from '@/hooks/useFarming'
import { useEnhancedAnalytics } from '@/hooks/useEnhancedAnalytics'
import { useHistory } from '@/hooks/useHistory'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useFarmingRealTimePrice } from '@/hooks/useFarmingRealTimePrice'
import { useLending } from '@/hooks/useLending'

export default function DeFiPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const { navigateTo } = useBottomNavigation()
  const { apiCall } = useCompatibleAuth()
  const router = useRouter()
  
  //  Реальные балансы для главной DeFi страницы
  const solBalance = useTokenBalance('SOL', { cacheTime: 30000, autoRefresh: true })
  const tngBalance = useTokenBalance('TNG', { cacheTime: 30000, autoRefresh: true })
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 30000, autoRefresh: true })
  
  // Real DeFi Data Hooks - Lazy loaded based on active tab
  const stakingData = useStaking()
  const swapData = useSwap()
  // Only load heavy data when needed
  const farmingData = useFarming()
  // ИСПРАВЛЕНО: Загружаем реальные данные lending
  const lendingData = useLending()
  const analyticsData = useEnhancedAnalytics()
  const historyData = useHistory({ limit: 5 }) // Reduce initial load
  const priceData = useFarmingRealTimePrice() // Реальные цены токенов
  
  // State Management
  const {
    state,
    setActiveTab,
    setSelectedToken,
    togglePortfolioDetails,
    setSlippage,
    toggleAutoRefresh,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification
  } = useDeFiState()

  // Actions
  const {
    handlePortfolioRefresh,
    handleTokenClick,
    handleSwapTokens,
    handleGetSwapQuote,
    handleStakeTokens,
    handleQuickAction
  } = useDeFiActions(
    setActiveTab,
    setSelectedToken,
    () => {}, // setIsLoading будет использоваться из state
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification
  )

  // Progressive loading - show content as soon as core data is ready
  useEffect(() => {
    // Core data needed for initial render
    const coreDataLoaded = (
      !stakingData.isLoading &&
      !swapData.isLoading
    )

    // Progressive loading progress
    const loadedCount = [
      !stakingData.isLoading,
      !swapData.isLoading,
      !farmingData.isLoading,
      true,
      !analyticsData.isLoading,
      !historyData.isLoading
    ].filter(Boolean).length

    setLoadingProgress((loadedCount / 6) * 100)

    if (coreDataLoaded) {
      // Show content with core data, load others in background
      const timer = setTimeout(() => setIsLoading(false), 200)
      return () => clearTimeout(timer)
    }
  }, [
    stakingData.isLoading,
    swapData.isLoading,
    farmingData.isLoading,
    false,
    analyticsData.isLoading,
    historyData.isLoading
  ])

  // Swap state - using real tokens from swapData
  const [swapFromToken, setSwapFromToken] = useState<any>(null)
  const [swapToToken, setSwapToToken] = useState<any>(null)
  const [swapAmount, setSwapAmount] = useState(0)
  const [swapQuote, setSwapQuote] = useState(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)

  // Initialize tokens when swap data loads
  React.useEffect(() => {
    if (swapData.data?.tokens && swapData.data.tokens.length >= 2) {
      if (!swapFromToken) setSwapFromToken(swapData.data.tokens[0])
      if (!swapToToken) setSwapToToken(swapData.data.tokens[1])
    }
  }, [swapData.data?.tokens, swapFromToken, swapToToken])

  // Farming/Staking state - using real pools
  const [selectedStakingPool, setSelectedStakingPool] = useState<any>(null)
  const [stakingAmount, setStakingAmount] = useState(0)

  // Initialize staking pool when data loads
  React.useEffect(() => {
    if (stakingData.data?.pools && stakingData.data.pools.length > 0 && !selectedStakingPool) {
      setSelectedStakingPool(stakingData.data.pools[0])
    }
  }, [stakingData.data?.pools, selectedStakingPool])

  // Handle back navigation
  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/') // Navigate to main page
  }

  const LoadingFallback = () => <MainDeFiPageSkeleton />

  // Error handling
  const hasErrors = (
    stakingData.error ||
    swapData.error ||
    farmingData.error ||
    lendingData.error ||
    analyticsData.error ||
    historyData.error
  )

  if (hasErrors) {
    console.warn('DeFi data loading errors:', {
      staking: stakingData.error,
      swap: swapData.error,
      farming: farmingData.error,
      lending: lendingData.error,
      analytics: analyticsData.error,
      history: historyData.error
    })
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {isLoading ? (
        <LoadingFallback />
      ) : (
        <>
          {/* 3D Background */}
          <div className="fixed inset-0 opacity-10">
            <Scene3DBackground />
          </div>
          
          <PageLayout showBottomNav={true}>
            <div className="space-y-5 pb-safe ultra-smooth-scroll no-horizontal-scroll mobile-scroll-container overflow-y-auto">
            
              {/* HEADER */}
              <DeFiHeader
                title="DeFi SuperApp"
                subtitle="Децентрализованные финансы"
                totalValue={analyticsData.data.overview.totalValue}
                dailyChange={analyticsData.data.overview.dailyChange}
                dailyChangePercent={analyticsData.data.overview.dailyChangePercent}
                activePositions={analyticsData.data.protocols.length}
                onOpenSettings={() => handleQuickAction('settings')}
                showBackButton={true}
                onBack={handleBack}
              />

              {/* STATS SECTION - только для вкладки portfolio */}
              {state.activeTab === 'portfolio' && (
                <DeFiStatsSection 
                  stats={{
                    totalValue: analyticsData.data.overview.totalValue,
                    dailyChange: analyticsData.data.overview.dailyChange,
                    dailyChangePercent: analyticsData.data.overview.dailyChangePercent,
                    activePositions: analyticsData.data.protocols.length,
                    totalStaked: analyticsData.data.breakdown.staking.stakedAmount,
                    totalRewards: analyticsData.data.overview.totalPnL,
                    avgAPY: analyticsData.data.overview.avgAPY,
                    riskScore: analyticsData.data.risk.portfolioRisk
                  }}
                  isVisible={state.showPortfolioDetails}
                  onToggleVisibility={togglePortfolioDetails}
                />
              )}

              {/* QUICK ACTIONS - только для вкладки portfolio */}
              {state.activeTab === 'portfolio' && (
                <DeFiQuickActions onAction={handleQuickAction} />
              )}
              
              {/* MAIN CONTENT - только портфель */}
              <div className="px-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="px-5">
                    <h3 className="text-sm font-medium text-gray-300 mb-4">Активные позиции</h3>
                    
                    {/* Real DeFi positions from staking */}
                    {stakingData.data?.positions?.filter(pos => pos.isActive).map((position, index) => (
                      <DeFiPositionCard
                        key={`staking-${(position as any).poolId}`}
                        position={{
                          id: `staking-${(position as any).poolId}`,
                          type: 'staking' as const,
                          protocol: 'SuperApp Staking',
                          token: (position as any).poolId.includes('sol') ? 'SOL' : 'TNG',
                          amount: parseFloat(position.stakedAmount),
                          usdValue: parseFloat(position.stakedAmount) * ((position as any).poolId.includes('sol') ? (priceData?.prices?.SOL || 0) : (priceData?.prices?.TNG || 0)),
                          apy: position.apy,
                          rewards: parseFloat(position.rewardsEarned),
                          startDate: new Date(position.stakeDate),
                          status: 'active' as const,
                          category: 'Token staking'
                        }}
                        index={index}
                        isVisible={state.showPortfolioDetails}
                        onClaim={(pos) => showSuccessNotification(`Награды за ${pos.token} забраны`)}
                        onManage={(pos) => showInfoNotification(`Управление позицией ${pos.protocol}`)}
                        onViewDetails={(pos) => showInfoNotification(`Детали позиции ${pos.id}`)}
                        onShare={(pos) => showInfoNotification(`Поделиться позицией ${pos.protocol}`)}
                        className="mb-3"
                      />
                    ))}
                    
                    {/* Real DeFi positions from farming */}
                    {farmingData.data?.positions?.filter(pos => pos.isActive).map((position, index) => (
                      <DeFiPositionCard
                        key={`farming-${(position as any).poolId}`}
                        position={{
                          id: `farming-${(position as any).poolId}`,
                          type: 'farming' as const,
                          protocol: 'SuperApp Farming',
                          token: (position as any).poolId.replace('-pool', '').toUpperCase(),
                          amount: position.currentValue,
                          usdValue: position.currentValue,
                          apy: position.apy,
                          rewards: parseFloat(position.rewardsEarned),
                          startDate: new Date(position.depositDate),
                          status: 'active' as const,
                          category: 'Liquidity farming'
                        }}
                        index={stakingData.data?.positions?.length || 0 + index}
                        isVisible={state.showPortfolioDetails}
                        onClaim={(pos) => showSuccessNotification(`Награды за ${pos.token} забраны`)}
                        onManage={(pos) => showInfoNotification(`Управление позицией ${pos.protocol}`)}
                        onViewDetails={(pos) => showInfoNotification(`Детали позиции ${pos.id}`)}
                        onShare={(pos) => showInfoNotification(`Поделиться позицией ${pos.protocol}`)}
                        className="mb-3"
                      />
                    ))}
                    
                    {/* Lending positions are shown on Lending page; hidden here to avoid duplicate requests */}
                    
                    {/* Show message if no positions */}
                    {(!stakingData.data?.positions?.length && !farmingData.data?.positions?.length && !lendingData.data?.userPositions?.length) && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 mb-4">У вас пока нет активных позиций</p>
                        <SimpleButton
                          onClick={() => handleQuickAction('stake')}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Начать стейкинг
                        </SimpleButton>
                      </div>
                    )}
                  </div>

                  {/* РЕАЛЬНАЯ ИСТОРИЯ ТРАНЗАКЦИЙ */}
                  <div className="px-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-300">Последние операции</h3>
                      <SimpleButton
                        size="sm"
                        onClick={() => {
                          hapticFeedback.impact('light')
                          setActiveTab('history')
                        }}
                        className="text-blue-400 hover:text-blue-300 text-xs px-3 py-1"
                      >
                        Explore →
                      </SimpleButton>
                    </div>
                    {historyData.isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 animate-pulse">
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-gray-800 rounded w-16"></div>
                            </div>
                            <div className="text-right">
                              <div className="h-4 bg-gray-700 rounded w-16 mb-1"></div>
                              <div className="h-3 bg-gray-800 rounded w-12"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : historyData.data?.transactions?.length ? (
                      <div className="space-y-3">
                        {historyData.data.transactions.slice(0, 5).map((tx, index) => (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                            onClick={() => {
                              hapticFeedback.impact('light')
                              window.open(tx.explorerUrl, '_blank')
                            }}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              tx.type === 'swap' ? 'bg-blue-500/20' :
                              tx.type === 'stake' || tx.type === 'unstake' ? 'bg-purple-500/20' :
                              tx.type === 'farm_add' || tx.type === 'farm_remove' ? 'bg-green-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              {tx.type === 'swap' ? (
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              ) : (tx.type === 'stake' || tx.type === 'unstake') ? (
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              ) : (tx.type === 'farm_add' || tx.type === 'farm_remove') ? (
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium">{tx.details.operation}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(tx.timestamp).toLocaleDateString()} • 
                                <span className={`ml-1 ${
                                  tx.status === 'confirmed' ? 'text-green-400' :
                                  tx.status === 'pending' ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {tx.status === 'confirmed' ? 'Завершена' :
                                   tx.status === 'pending' ? 'В процессе' : 'Ошибка'}
                                </span>
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm text-white font-medium">
                                {tx.signature.substring(0, 8)}...
                              </p>
                              <p className="text-xs text-gray-400">
                                {tx.type === 'swap' ? 'Обмен' :
                                 tx.type === 'stake' ? 'Стейк' :
                                 tx.type === 'unstake' ? 'Анстейк' :
                                 tx.type === 'farm_add' ? 'Добавить LP' :
                                 tx.type === 'farm_remove' ? 'Убрать LP' : tx.type}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                        
                        {/* Кнопка "Показать все" */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-center pt-4"
                        >
                          <SimpleButton
                            size="sm"
                            onClick={() => {
                              hapticFeedback.impact('light')
                              setActiveTab('history')
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            Показать все операции →
                          </SimpleButton>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          
                        </div>
                        <p className="text-gray-400 text-sm">Пока нет операций</p>
                        <p className="text-gray-500 text-xs">Начните торговать на DeFi!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

            </div>
          </PageLayout>
          
          {/* Notification Toast */}
          {state.notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`
                fixed top-4 left-4 right-4 p-4 rounded-xl backdrop-blur-sm z-[110]
                ${state.notification.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                  state.notification.type === 'error' ? 'bg-red-500/20 border border-red-500/30' :
                  state.notification.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                  'bg-blue-500/20 border border-blue-500/30'
                }
              `}
            >
              <p className="text-white font-medium">{state.notification.message}</p>
            </motion.div>
          )}
        </>
      )}
    </ClientOnly>
  )
}

