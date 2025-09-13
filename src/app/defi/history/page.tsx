'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import { HistoryPageSkeleton } from '@/components/defi/HistoryPageSkeleton'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpDown,
  Clock,
  ExternalLink,
  Calendar,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  Info,
  Coins,
  TrendingUp
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useHistory } from '@/hooks/useHistory'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useFarmingRealTimePrice } from '@/hooks/useFarmingRealTimePrice'
import { useTokenBalance } from '@/hooks/useTokenBalance'

interface Transaction {
  id: string
  type: 'stake' | 'unstake' | 'swap' | 'supply' | 'borrow' | 'repay' | 'withdraw' | 'farm' | 'harvest'
  protocol: string
  tokenIn?: string
  tokenOut?: string
  amountIn: number
  amountOut?: number
  status: 'completed' | 'pending' | 'failed'
  timestamp: Date
  signature: string
  fee: number
  value: number
  apy?: number
}

interface TransactionDetail {
  isOpen: boolean
  transaction: Transaction | null
}

export default function HistoryPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const { apiCall } = useCompatibleAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all')
  const [transactionDetail, setTransactionDetail] = useState<TransactionDetail>({
    isOpen: false,
    transaction: null
  })

  //  Реальная история транзакций из OnchainTx
  const historyData = useHistory({ 
    limit: 50,
    type: selectedFilter !== 'all' ? selectedFilter : undefined 
  })
  
  //  Реальные цены токенов
  const priceData = useFarmingRealTimePrice()

  //  Реальные балансы токенов для истории
  const solBalance = useTokenBalance('SOL', { cacheTime: 30000, autoRefresh: true })
  const tngBalance = useTokenBalance('TNG', { cacheTime: 30000, autoRefresh: true })
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 30000, autoRefresh: true })

  //  Конвертируем реальные OnchainTx в UI формат
  const transactions: Transaction[] = historyData.data?.transactions?.map(tx => ({
    id: tx.id,
    type: tx.purpose === 'STAKE' ? 'stake' : 
          tx.purpose === 'UNSTAKE' ? 'unstake' :
          tx.purpose === 'DEX_SWAP' ? 'swap' : 
          tx.purpose === 'FARMING' ? 'farm' : 
          tx.purpose === 'TOKEN_TRANSFER' ? 'swap' : 'stake',
    protocol: tx.metadata?.operation === 'stake' ? 'TNG Staking' :
              tx.metadata?.operation === 'unstake' ? 'TNG Staking' :
              tx.metadata?.operation === 'swap' ? 'Jupiter DEX' :
              tx.metadata?.operation === 'farming' ? 'TNG Farming' : 'TNG SuperApp',
    tokenIn: getTokenSymbol(tx.metadata?.inputMint),
    tokenOut: getTokenSymbol(tx.metadata?.outputMint),
    amountIn: parseFloat(tx.metadata?.inputAmount || '0') / 1e9, // Convert from lamports
    amountOut: parseFloat(tx.metadata?.outputAmount || '0') / 1e9,
    status: tx.status === 'confirmed' ? 'completed' : 
            tx.status === 'pending' ? 'pending' : 'failed',
    timestamp: new Date(tx.timestamp),
    signature: tx.signature,
    fee: 0, // Sponsored transactions
    value: calculateUSDValue(tx.metadata?.inputAmount, tx.metadata?.inputMint),
    apy: tx.metadata?.apy || undefined
  })) || []

  // Helper functions
  function getTokenSymbol(mint: string | undefined): string {
    if (!mint) return 'SOL'
    if (mint === 'So11111111111111111111111111111111111111112') return 'SOL'
    if (mint === 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs') return 'TNG'
    if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') return 'USDC'
    return 'Unknown'
  }

  function calculateUSDValue(amount: string | undefined, mint: string | undefined): number {
    if (!amount) return 0
    const tokenAmount = parseFloat(amount) / 1e9
    
    // Реальные USD цены из API
    const prices: Record<string, number> = {
      'So11111111111111111111111111111111111111112': priceData.prices?.SOL || 0, // SOL
      'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs': priceData.prices?.TNG || 0, // TNG
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': priceData.prices?.USDC || 1.0  // USDC
    }
    
    return tokenAmount * (prices[mint || ''] || 0)
  }

  //  Реальные фильтры на основе данных пользователя
  const filters = [
    { id: 'all', label: 'Все', count: transactions.length },
    { id: 'stake', label: 'Стейкинг', count: transactions.filter(tx => ['stake', 'unstake'].includes(tx.type)).length },
    { id: 'swap', label: 'Обмены', count: transactions.filter(tx => tx.type === 'swap').length },
    { id: 'farm', label: 'Фарминг', count: transactions.filter(tx => tx.type === 'farm').length }
  ]

  const protocols = [
    { id: 'all', label: 'Все протоколы' },
    { id: 'TNG Staking', label: 'TNG Staking' },
    { id: 'Jupiter DEX', label: 'Jupiter DEX' },
    { id: 'TNG Farming', label: 'TNG Farming' }
  ]

  // Фильтрация транзакций
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery || 
      tx.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.tokenIn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.tokenOut?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'stake' && ['stake', 'unstake'].includes(tx.type)) ||
      tx.type === selectedFilter
    
    const matchesProtocol = selectedProtocol === 'all' || tx.protocol === selectedProtocol
    
    return matchesSearch && matchesFilter && matchesProtocol
  })

  // Loading state
  useEffect(() => {
    if (!historyData.isLoading) {
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [historyData.isLoading])

  // Удалено: Telegram MainButton экспорт истории согласно ТЗ

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/defi')
  }

  const handleRefresh = async () => {
    hapticFeedback.impact('light')
    await historyData.refreshData()
  }

  const handleExportHistory = () => {
    hapticFeedback.impact('medium')
    
    // Create CSV content
    const csvContent = [
      ['Date', 'Type', 'Protocol', 'Token In', 'Amount In', 'Token Out', 'Amount Out', 'Status', 'Signature', 'Value USD'].join(','),
      ...filteredTransactions.map(tx => [
        tx.timestamp.toLocaleDateString(),
        tx.type,
        tx.protocol,
        tx.tokenIn || '',
        tx.amountIn,
        tx.tokenOut || '',
        tx.amountOut || '',
        tx.status,
        tx.signature,
        tx.value.toFixed(2)
      ].join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `defi-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stake': return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'unstake': return <ArrowDownLeft className="w-4 h-4 text-orange-400" />
      case 'swap': return <ArrowUpDown className="w-4 h-4 text-blue-400" />
      case 'farm': return <Coins className="w-4 h-4 text-purple-400" />
      default: return <History className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Завершено</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">В процессе</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Ошибка</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Неизвестно</Badge>
    }
  }

  const LoadingFallback = () => <HistoryPageSkeleton />

  if (isLoading) {
    return (
      <ClientOnly fallback={<LoadingFallback />}>
        <LoadingFallback />
      </ClientOnly>
    )
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      <PageLayout showBottomNav={true}>
        <div className="space-y-5 pb-safe">

          {/*  Header - минималистичный */}
          <motion.div
            className="px-5 pt-5 pb-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBack}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </motion.button>
                <div>
                  <h1 className="text-xl font-bold text-white">История транзакций</h1>
                  <p className="text-xs text-gray-400">Все DeFi операции</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {isBalanceVisible ? <Eye className="w-4 h-4 text-gray-400" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRefresh}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/*  Stats Overview */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {isBalanceVisible ? transactions.length : '***'}
                  </p>
                  <p className="text-sm text-gray-400">Всего операций</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {isBalanceVisible ? `$${transactions.reduce((sum, tx) => sum + tx.value, 0).toFixed(2)}` : '$***'}
                  </p>
                  <p className="text-sm text-gray-400">Общий объем</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {isBalanceVisible ? transactions.filter(tx => tx.status === 'completed').length : '***'}
                  </p>
                  <p className="text-sm text-gray-400">Завершено</p>
                </div>
              </div>
            </SimpleCard>
          </motion.div>

          {/*  Балансы токенов (SOL / TNG / USDC) */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <SimpleCard className="p-4 border border-white/10">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400">SOL баланс</p>
                  <p className="text-white font-semibold">
                    {isBalanceVisible ? (solBalance.balance || 0).toFixed(4) : '••••'} SOL
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">TNG баланс</p>
                  <p className="text-white font-semibold">
                    {isBalanceVisible ? (tngBalance.balance || 0).toFixed(0) : '••••'} TNG
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">USDC баланс</p>
                  <p className="text-white font-semibold">
                    {isBalanceVisible ? (usdcBalance.balance || 0).toFixed(2) : '••••'} USDC
                  </p>
                </div>
              </div>
            </SimpleCard>
          </motion.div>

          {/*  Search and Filters */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по подписи, протоколу, токену..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Type Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {filters.map(filter => (
                  <motion.button
                    key={filter.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedFilter === filter.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </motion.button>
                ))}
              </div>

              {/* Protocol Filter */}
              <select
                value={selectedProtocol}
                onChange={(e) => setSelectedProtocol(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                {protocols.map(protocol => (
                  <option key={protocol.id} value={protocol.id} className="bg-gray-900">
                    {protocol.label}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>

          {/*  Transactions List */}
          <motion.div
            className="px-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <SimpleCard className="p-8 text-center border border-white/10">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">История пуста</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {transactions.length === 0 
                      ? 'Выполните первую DeFi операцию для начала истории'
                      : 'Транзакции не найдены по выбранным фильтрам'
                    }
                  </p>
                  {transactions.length === 0 && (
                    <SimpleButton
                      onClick={() => router.push('/defi')}
                      className="text-sm"
                      gradient={true}
                    >
                      Начать торговлю
                    </SimpleButton>
                  )}
                </SimpleCard>
              ) : (
                filteredTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                  >
                    <SimpleCard
                      className="p-4 border border-white/10 hover:border-purple-500/30 transition-all cursor-pointer"
                      onClick={() => {
                        // При клике на транзакцию - открываем Solana Explorer
                        hapticFeedback.impact('light')
                        window.open(`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`, '_blank')
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(tx.type)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-semibold text-sm capitalize">
                                {tx.type === 'stake' ? 'Стейкинг' :
                                 tx.type === 'unstake' ? 'Анстейкинг' :
                                 tx.type === 'swap' ? 'Обмен' :
                                 tx.type === 'farm' ? 'Фарминг' : tx.type}
                              </span>
                              {getStatusBadge(tx.status)}
                            </div>
                            <p className="text-xs text-gray-400">
                              {tx.protocol} • {tx.timestamp.toLocaleDateString()}
                            </p>
                            {tx.tokenIn && tx.tokenOut && (
                              <p className="text-xs text-gray-500 mt-1">
                                {tx.amountIn.toFixed(4)} {tx.tokenIn} → {tx.amountOut?.toFixed(4)} {tx.tokenOut}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {isBalanceVisible ? `$${tx.value.toFixed(2)}` : '$***'}
                            </p>
                            <p className="text-xs text-gray-400">{tx.timestamp.toLocaleTimeString()}</p>
                          </div>
                          <SimpleButton
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation() // Предотвращаем переход на Explorer
                              setTransactionDetail({ isOpen: true, transaction: tx })
                              hapticFeedback.impact('light')
                            }}
                            className="text-xs px-2 py-1"
                          >
                            Детали
                          </SimpleButton>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Transaction Detail Modal */}
          <AnimatePresence>
            {transactionDetail.isOpen && transactionDetail.transaction && (
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setTransactionDetail({ isOpen: false, transaction: null })}
              >
                <motion.div
                  className="w-full max-w-md bg-gray-900 rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transactionDetail.transaction.type)}
                      <div>
                        <h2 className="text-lg font-bold text-white">Детали транзакции</h2>
                        <p className="text-xs text-gray-400">{transactionDetail.transaction.protocol}</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setTransactionDetail({ isOpen: false, transaction: null })}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </motion.button>
                  </div>

                  <div className="space-y-4">
                    <SimpleCard className="p-4 border border-white/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Статус</p>
                          {getStatusBadge(transactionDetail.transaction.status)}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Дата</p>
                          <p className="text-white text-sm">{transactionDetail.transaction.timestamp.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Сумма USD</p>
                          <p className="text-white text-sm font-semibold">${transactionDetail.transaction.value.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Комиссия</p>
                          <p className="text-white text-sm">${transactionDetail.transaction.fee.toFixed(4)}</p>
                        </div>
                      </div>
                    </SimpleCard>

                    {transactionDetail.transaction.tokenIn && (
                      <SimpleCard className="p-4 border border-white/10">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-semibold">Токены</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Отдано</p>
                              <p className="text-white text-sm">{transactionDetail.transaction.amountIn.toFixed(6)} {transactionDetail.transaction.tokenIn}</p>
                            </div>
                            {transactionDetail.transaction.tokenOut && (
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Получено</p>
                                <p className="text-white text-sm">{transactionDetail.transaction.amountOut?.toFixed(6)} {transactionDetail.transaction.tokenOut}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </SimpleCard>
                    )}

                    <SimpleCard className="p-4 border border-white/10">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Подпись транзакции</p>
                          <p className="text-white text-xs font-mono bg-gray-800/50 rounded p-2 break-all">
                            {transactionDetail.transaction.signature.slice(0, 20)}...{transactionDetail.transaction.signature.slice(-20)}
                          </p>
                        </div>
                        <SimpleButton
                          onClick={() => {
                            window.open(`https://explorer.solana.com/tx/${transactionDetail.transaction?.signature}?cluster=devnet`, '_blank')
                            hapticFeedback.impact('light')
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Открыть в Solana Explorer
                        </SimpleButton>
                      </div>
                    </SimpleCard>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </PageLayout>
    </ClientOnly>
  )
}