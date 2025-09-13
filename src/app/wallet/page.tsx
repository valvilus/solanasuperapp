/**
 * Enhanced Wallet Page - Complete wallet functionality
 * Solana SuperApp - Production Ready
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import ClientOnly from '@/components/common/ClientOnly'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'

// Enhanced wallet components
import { WalletBalance } from '@/components/wallet/WalletBalance'
import { WalletConnect } from '@/components/wallet/WalletConnect'
import { WalletTestPanel } from '@/components/wallet/WalletTestPanel'


import { SendModal } from '@/components/wallet/SendModal'
import { ReceiveModal } from '@/components/wallet/ReceiveModal'
import { QRScanner } from '@/components/wallet/QRScanner'
import { TransactionHistory } from '@/components/wallet/TransactionHistory'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import { WalletPageSkeleton, RecentTransactionsSkeleton } from '@/components/wallet/WalletSkeleton'

// Optimized Hooks
import { useWallet } from '@/hooks/useWallet'
import { usePortfolioBalances } from '@/hooks/useTokenBalance'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { usePrices } from '@/hooks/usePrices'
import { useTransactionHistory, type RecentTransaction } from '@/hooks/useTransactionHistory'

// Icons and utilities
import { 
  Send, 
  Download, 
  History, 
  QrCode, 
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Coins,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { formatTokenBalance, formatUSDValue, formatPercentageChange, formatTransactionAmount, formatWalletAddress } from '@/lib/formatters'

// Types
interface QuickAction {
  id: string
  title: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  handler: () => void
}

interface PortfolioToken {
  symbol: string
  name: string
  balance: number
  usdValue: number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: string
}



export default function WalletPage() {
  // Optimized state management
  const { custodial, external, activeWallet, totalBalance, refreshBalances } = useWallet()
  const { isAuthenticated, isLoading: authLoading, apiCall } = useCompatibleAuth()
  const { getPrices } = usePrices()
  const { loadTransactionHistory } = useTransactionHistory()
  
  // Optimized portfolio management with caching
  const {
    SOL,
    TNG,
    USDC,
    totalUSDValue,
    formattedTotalUSD,
    loading: portfolioLoading,
    refreshAll: refreshPortfolio,
    loadSequentially
  } = usePortfolioBalances({
    cacheTime: 2 * 60 * 1000, // 2 минуты кеш для wallet page
    autoRefresh: false,
    formatType: 'visual'
  })
  
  // TNG service no longer needed - faucet works through API
  
  // UI state
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Modal states
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [qrScanData, setQrScanData] = useState<{
    address?: string
    amount?: string
    token?: 'SOL' | 'TNG'
  } | null>(null)
  
  // Simplified state - using optimized hooks for data
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Optimized data loading - simplified and cached
  useEffect(() => {
    const initializeData = async () => {
      if (authLoading || !isAuthenticated || dataLoaded) return
      
      try {
        // Load recent transactions (balances load automatically via hooks)
        await loadTransactionHistoryData()
        
        setDataLoaded(true)
      } catch (error) {
        // Silent error handling for production
      }
    }
    
    initializeData()
  }, [authLoading, isAuthenticated, dataLoaded])

  // Load transaction history using optimized hook
  const loadTransactionHistoryData = async () => {
    try {
      const transactions = await loadTransactionHistory()
      setRecentTransactions(transactions)
    } catch (error) {
      // Silent error handling for production
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    hapticFeedback.impact('light')
    
    try {
      // Принудительно очищаем все кеши перед обновлением
      SOL.clearCache()
      TNG.clearCache()
      USDC.clearCache()
      
      // Optimized refresh with caching
      await Promise.all([
        refreshBalances(), // Refresh wallet state
        refreshPortfolio(), // Refresh cached balances
        loadTransactionHistoryData() // Refresh transaction history
      ])
      
      console.log(' Wallet balances refreshed')
    } catch (error) {
      console.error(' Wallet refresh error:', error)
      // Silent error handling for production
    } finally {
      setRefreshing(false)
    }
  }, [refreshBalances, refreshPortfolio])

  // Обновляем балансы при возвращении на страницу (для случаев после свапа)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log(' Wallet page became visible, refreshing balances...')
        handleRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, handleRefresh])

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'send',
      title: 'Отправить',
      icon: Send,
      color: 'text-red-400',
      bgColor: 'from-red-500/15 to-red-500/5',
      handler: () => {
        hapticFeedback.impact('medium')
        setQrScanData(null) // Очищаем данные QR при обычном открытии
        setSendModalOpen(true)
      }
    },
    {
      id: 'receive',
      title: 'Получить',
      icon: Download,
      color: 'text-green-400',
      bgColor: 'from-green-500/15 to-green-500/5',
      handler: () => {
        hapticFeedback.impact('medium')
        setReceiveModalOpen(true)
      }
    },
    {
      id: 'scan',
      title: 'Сканер',
      icon: QrCode,
      color: 'text-blue-400',
      bgColor: 'from-blue-500/15 to-blue-500/5',
      handler: () => {
        hapticFeedback.impact('medium')
        setScannerOpen(true)
      }
    },
    {
      id: 'history',
      title: 'История',
      icon: History,
      color: 'text-purple-400',
      bgColor: 'from-purple-500/15 to-purple-500/5',
      handler: () => {
        hapticFeedback.impact('medium')
        setHistoryOpen(true)
      }
    }
  ]


  const handleFaucet = async () => {
    hapticFeedback.impact('medium')
    
    try {
      const result = await getTNGFaucet()
      
      if (result.success) {
        // Optimized refresh after faucet
        await refreshPortfolio()
        await loadTransactionHistoryData()
        
        hapticFeedback.notification('success')
        alert('Получено 1000 TNG токенов!')
      } else {
        if (result.nextAvailable) {
          const nextTime = new Date(result.nextAvailable).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          })
          alert(`Фосет можно использовать снова в ${nextTime}`)
        } else {
          alert(result.error || 'Ошибка получения токенов')
        }
        hapticFeedback.notification('error')
      }
    } catch (error) {
      alert('Ошибка получения токенов')
      hapticFeedback.notification('error')
    }
  }
  
  // Optimized TNG faucet with service
  const getTNGFaucet = async () => {
    try {
      const response = await apiCall('/api/tokens/tng/faucet', {
        method: 'POST'
      })
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const handleQRScan = (address: string) => {
    setScannerOpen(false)
    setSendModalOpen(true)
  }

  const handleQRScanWithSendModal = (scanResult: any) => {
    const prefillData = {
      address: scanResult.address,
      amount: scanResult.amount,
      token: scanResult.token || 'SOL' as 'SOL' | 'TNG'
    }
    
    setQrScanData(prefillData)
    setScannerOpen(false)
    setSendModalOpen(true)
  }

  const handleTransactionClick = (tx: RecentTransaction) => {
    hapticFeedback.impact('light')
    
    // If transaction has explorer URL (on-chain), open it
    if (tx.explorerUrl) {
      window.open(tx.explorerUrl, '_blank')
    } else {
      // Otherwise open full history modal
      setHistoryOpen(true)
    }
  }

  // Функция для сокращения username
  const truncateUsername = (username: string, maxLength: number = 10) => {
    if (username.length <= maxLength) {
      return username
    }
    return username.substring(0, maxLength) + '...'
  }

  // Функция для определения типа адреса и правильного форматирования (такая же как в TransactionHistory)
  const formatAddressOrUsername = (text: string) => {
    // Если это username (начинается с @), сокращаем его
    if (text.startsWith('@')) {
      const username = text.substring(1)
      return `@${truncateUsername(username)}`
    }
    
    // Если это кошелек (длинная строка из символов), используем formatWalletAddress
    if (text.length > 30 && /^[A-Za-z0-9]+$/.test(text)) {
      return formatWalletAddress(text, 'short')
    }
    
    // Для других случаев возвращаем как есть
    return text
  }

  const getTransactionSourceText = (tx: RecentTransaction) => {
    // Для получения показываем отправителя
    if (tx.type === 'receive') {
      if (tx.isAnonymous) {
        return 'От: Анонимно'
      }
      if (tx.fromUsername) {
        return `От: @${truncateUsername(tx.fromUsername)}`
      }
      // Используем from из API вместо address
      if (tx.from) {
        return `От: ${formatAddressOrUsername(tx.from)}`
      }
      return 'От: Неизвестно'
    }
    
    // Для отправки показываем получателя
    if (tx.type === 'send') {
      if (tx.toUsername) {
        return `Кому: @${truncateUsername(tx.toUsername)}`
      }
      // Используем to из API вместо address
      if (tx.to) {
        return `Кому: ${formatAddressOrUsername(tx.to)}`
      }
      return 'Кому: Неизвестно'
    }
    
    // Для других типов (swap, etc)
    if (tx.from) {
      return formatAddressOrUsername(tx.from)
    }
    return formatAddressOrUsername(tx.address) || 'Без описания'
  }



  const LoadingFallback = () => (
    <SolanaFullScreenLoader 
      title="Загрузка кошелька"
      subtitle="Подключение к Solana..."
    />
  )

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      <PageLayout showBottomNav={true}>
        {authLoading || !dataLoaded ? (
          <WalletPageSkeleton />
        ) : (
          <div className="space-y-6 pb-safe">
          
          {/* HEADER */}
          <motion.div
            className="px-5 pt-4 pb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Кошелек</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {activeWallet === 'external' ? 'Внешний кошелек' : 'Встроенный кошелек'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => hapticFeedback.impact('light')}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Settings className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ENHANCED BALANCE CARD */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <WalletBalance isRefreshing={refreshing} />
          </motion.div>

          {/* QUICK ACTIONS */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={action.handler}
                  className="cursor-pointer touch-manipulation"
                >
                  <SimpleCard className={`p-4 h-20 bg-gradient-to-br ${action.bgColor} border border-white/5 hover:border-white/10 transition-all duration-150`}>
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <action.icon className={`w-5 h-5 mb-2 ${action.color}`} />
                      <p className="text-xs text-white font-medium">{action.title}</p>
                    </div>
                  </SimpleCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* WALLET MANAGEMENT */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Управление кошельками</h3>
            </div>
            <WalletConnect variant="compact" showBalance={false} />
          </motion.div>

          {/* PORTFOLIO TOKENS */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Портфель активов</h3>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFaucet}
                  className="text-xs text-solana-purple hover:text-solana-green transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Фосет
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="text-xs text-solana-purple hover:text-solana-green transition-colors"
                >
                  Управление
                </motion.button>
              </div>
            </div>

            <div className="space-y-2">
              {portfolioLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <SimpleCard className="p-3 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700" />
                            <div>
                              <div className="w-16 h-4 bg-gray-700 rounded mb-1" />
                              <div className="w-24 h-3 bg-gray-700 rounded" />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-20 h-4 bg-gray-700 rounded mb-1" />
                            <div className="w-16 h-3 bg-gray-700 rounded" />
                          </div>
                        </div>
                      </SimpleCard>
                    </div>
                  ))}
                </div>
              ) : (
                [
                  { data: SOL, symbol: 'SOL', name: 'Solana', color: 'text-[#00FFA3]' },
                  { data: TNG, symbol: 'TNG', name: 'Tenge Token', color: 'text-solana-green' },
                  { data: USDC, symbol: 'USDC', name: 'USD Coin', color: 'text-blue-400' }
                ].map((token, index) => (
                  <motion.div
                    key={token.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                  >
                    <SimpleCard 
                      className="p-3 border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
                      onClick={() => hapticFeedback.impact('light')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                            <TokenLogo 
                              token={token.symbol as 'SOL' | 'TNG' | 'USDC'} 
                              size="md" 
                              className={token.color}
                            />
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm">{token.symbol}</h4>
                            <p className="text-xs text-gray-400">{token.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium text-sm">
                            {isBalanceVisible ? token.data.formattedBalance : '••••'}
                          </p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-gray-400">
                              {isBalanceVisible ? token.data.formattedUSDValue : '$••••'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* RECENT TRANSACTIONS */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Недавние транзакции</h3>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setHistoryOpen(true)}
                className="text-xs text-solana-purple hover:text-solana-green transition-colors flex items-center gap-1"
              >
                Все
                <ArrowUpRight className="w-3 h-3" />
              </motion.button>
            </div>

            {refreshing ? (
              <RecentTransactionsSkeleton />
            ) : (
              <>
                <div className="space-y-2">
                  {recentTransactions.slice(0, 3).map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05, duration: 0.2 }}
                    >
                      <SimpleCard 
                        className="p-3 border border-white/5 hover:border-white/10 transition-all duration-150 cursor-pointer"
                        onClick={() => handleTransactionClick(tx)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              tx.type === 'receive' ? 'bg-green-500/20' :
                              tx.type === 'send' ? 'bg-red-500/20' : 'bg-blue-500/20'
                            }`}>
                              {tx.type === 'receive' ? (
                                <ArrowDownLeft className="w-4 h-4 text-green-400" />
                              ) : tx.type === 'send' ? (
                                <Send className="w-4 h-4 text-red-400" />
                              ) : (
                                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-medium text-sm">
                                  {tx.type === 'receive' ? 'Получено' : 
                                   tx.type === 'send' ? 'Отправлено' : 'Обмен'}
                                </h4>
                                {tx.status === 'pending' && (
                                  <Clock className="w-3 h-3 text-yellow-400" />
                                )}
                                {tx.explorerUrl && (
                                  <ExternalLink className="w-3 h-3 text-solana-green" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{getTransactionSourceText(tx)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium text-sm ${
                              tx.type === 'receive' && tx.status === 'confirmed' ? 'text-green-400' : 'text-white'
                            }`}>
                              {formatTransactionAmount(tx.amount, tx.token as 'SOL' | 'TNG' | 'USDC', 'visual')}
                            </p>
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-gray-400">{tx.usdAmount}</p>
                              <p className="text-xs text-gray-500">•</p>
                              <p className="text-xs text-gray-500">{tx.time}</p>
                            </div>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </div>

                {recentTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Пока нет транзакций</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Отправьте или получите криптовалюту для начала
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>


        </div>
        )}

        {/* MODALS */}
        <SendModal 
          isOpen={sendModalOpen} 
          onClose={() => {
            setSendModalOpen(false)
            setQrScanData(null)
          }}
          onRefreshBalances={async () => {
            // Optimized refresh after send
            await Promise.all([
              refreshBalances(),
              refreshPortfolio(),
              loadTransactionHistoryData()
            ])
          }}
          prefillData={qrScanData || undefined}
        />
        <ReceiveModal 
          isOpen={receiveModalOpen} 
          onClose={() => setReceiveModalOpen(false)} 
        />
        <QRScanner 
          isOpen={scannerOpen} 
          onClose={() => setScannerOpen(false)}
          onScan={handleQRScan}
          onOpenSendModal={handleQRScanWithSendModal}
          onReopen={() => setScannerOpen(true)}
        />
        <TransactionHistory 
          isOpen={historyOpen} 
          onClose={() => setHistoryOpen(false)} 
        />


      </PageLayout>
    </ClientOnly>
  )
}