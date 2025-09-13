/**
 * Transaction History Component - Display wallet transaction history
 * Solana SuperApp - Wallet Page
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useTransactions } from '@/hooks/useTransactions'
import { useOnchainOperations } from '@/hooks/useOnchainOperations'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter,
  Calendar,
  Search,
  TrendingUp,
  Send,
  Download,
  Coins
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { formatTransactionAmount, formatWalletAddress } from '@/lib/formatters'

interface TransactionHistoryProps {
  isOpen: boolean
  onClose: () => void
}

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
  status: 'pending' | 'confirmed' | 'failed'
  token: string
  amount: string
  usdAmount: string
  fee?: string
  from?: string
  to?: string
  fromUsername?: string // Username отправителя
  toUsername?: string   // Username получателя
  isAnonymous?: boolean // Анонимный перевод
  signature?: string
  timestamp: Date
  memo?: string
  blockTime?: Date
  explorerUrl?: string
  isOnchain?: boolean
}

// Check if transaction has explorer link available
const hasExplorerLink = (transaction: Transaction) => {
  if (transaction.explorerUrl) return true
  if (transaction.signature && transaction.signature.length >= 60 && /^[A-Za-z0-9]+$/.test(transaction.signature)) {
    return true
  }
  return false
}

export function TransactionHistory({ isOpen, onClose }: TransactionHistoryProps) {
  const { activeWallet } = useWallet()
  const { getTransactions, loading: txLoading } = useTransactions()
  const { getOnchainTransferHistory } = useOnchainOperations()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'send' | 'receive' | 'swap' | 'lending'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all')
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  // Load transactions when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadTransactions()
    }
  }, [isOpen, selectedFilter, selectedStatus])

  // Filter transactions based on search and filters
  useEffect(() => {
    let filtered = transactions

    // Filter by type
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'lending') {
        // Filter for DeFi Lending transactions
        filtered = filtered.filter(tx => 
          tx.memo?.includes('DeFi Lending') || 
          tx.from === 'DeFi Lending Pool' || 
          tx.to === 'DeFi Lending Pool'
        )
      } else {
        filtered = filtered.filter(tx => tx.type === selectedFilter)
      }
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === selectedStatus)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tx =>
        tx.token.toLowerCase().includes(query) ||
        tx.memo?.toLowerCase().includes(query) ||
        tx.signature?.toLowerCase().includes(query) ||
        tx.from?.toLowerCase().includes(query) ||
        tx.to?.toLowerCase().includes(query)
      )
    }

    setFilteredTransactions(filtered)
  }, [transactions, selectedFilter, selectedStatus, searchQuery])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      console.log(' Loading combined transaction history...')
      
      // Load both ledger transactions and on-chain transfers
      const [ledgerResult, onchainResult] = await Promise.allSettled([
        getTransactions({
          limit: 30,
          type: selectedFilter !== 'all' && selectedFilter !== 'lending' ? selectedFilter : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined
        }),
        getOnchainTransferHistory(undefined, 20)
      ])
      
      const ledgerTxs = ledgerResult.status === 'fulfilled' ? ledgerResult.value.transactions : []
      const onchainTxs = onchainResult.status === 'fulfilled' ? onchainResult.value : []
      
      console.log(' Transaction data loaded:', {
        ledgerCount: ledgerTxs.length,
        onchainCount: onchainTxs.length
      })
      
      // Transform on-chain transfers to match transaction format
      const onchainTransactions: Transaction[] = onchainTxs.map(transfer => {
        const isFaucet = (transfer as any).purpose === 'FAUCET'
        const isDeposit = (transfer as any).purpose === 'DEPOSIT' // получено
        const isWithdraw = (transfer as any).purpose === 'WITHDRAW' // отправлено
        const amountInTokens = parseFloat(transfer.amount) / 1e9
        const tokenPrice = transfer.asset === 'SOL' ? 200.45 : 0.01
        
        // Определяем тип транзакции
        let txType: 'send' | 'receive' = 'send'
        if (isFaucet || isDeposit) {
          txType = 'receive'
        }
        
        // Определяем from/to в зависимости от типа
        let fromInfo: string | undefined
        let toInfo: string | undefined
        
        if (isFaucet) {
          fromInfo = 'TNG Faucet'
        } else if (isDeposit) {
          // Получили от кого-то
          fromInfo = (transfer as any).fromAddress ? formatWalletAddress((transfer as any).fromAddress, 'short') : 'Блокчейн'
        } else if (isWithdraw) {
          // Отправили кому-то  
          toInfo = transfer.toAddress ? formatWalletAddress(transfer.toAddress, 'short') : 'Блокчейн'
        }
        
        return {
          id: `onchain_${transfer.id}`,
          type: txType,
          status: transfer.status.toLowerCase() as 'confirmed' | 'pending' | 'failed',
          token: transfer.asset,
          amount: txType === 'receive' 
            ? `+${amountInTokens.toFixed(transfer.asset === 'SOL' ? 9 : 2)}`
            : `-${amountInTokens.toFixed(transfer.asset === 'SOL' ? 9 : 9)}`,
          usdAmount: txType === 'receive'
            ? `+$${(amountInTokens * tokenPrice).toFixed(2)}`
            : `-$${(amountInTokens * tokenPrice).toFixed(2)}`,
          fee: transfer.fee ? (parseFloat(transfer.fee) / 1e9).toFixed(9) : undefined,
          from: fromInfo,
          to: toInfo,
          signature: transfer.signature,
          timestamp: new Date(transfer.createdAt),
          memo: isFaucet ? 'Получено из фосета TNG' : transfer.memo,
          blockTime: transfer.confirmedAt ? new Date(transfer.confirmedAt) : undefined,
          explorerUrl: transfer.explorerUrl || (transfer.signature ? `https://explorer.solana.com/tx/${transfer.signature}?cluster=devnet` : undefined),
          isOnchain: true
        }
      })
      
      // Combine and sort all transactions
      const allTransactions = [...ledgerTxs, ...onchainTransactions]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50) // Limit to 50 total
      
      setTransactions(allTransactions)
      setHasMore(allTransactions.length >= 50)
      setTotal(allTransactions.length)
      
    } catch (error) {
      console.error('Error loading transactions:', error)
      setTransactions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  const handleTransactionClick = (transaction: Transaction) => {
    hapticFeedback.impact('light')
    
    // Generate proper explorer URL based on transaction type and signature
    let explorerUrl = transaction.explorerUrl
    
    if (!explorerUrl && transaction.signature) {
      // Check if signature looks like a Solana transaction hash
      if (transaction.signature.length >= 60 && /^[A-Za-z0-9]+$/.test(transaction.signature)) {
        // This looks like a Solana transaction signature
        explorerUrl = `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`
      }
    }
    
    if (explorerUrl) {
      window.open(explorerUrl, '_blank')
    } else {
      // If no explorer URL available, show transaction details
      console.log('Transaction details:', transaction)
    }
  }

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4" />
    if (status === 'failed') return <XCircle className="w-4 h-4" />
    
    switch (type) {
      case 'receive':
        return <ArrowDownLeft className="w-4 h-4" />
      case 'send':
        return <Send className="w-4 h-4" />
      case 'swap':
        return <ArrowRightLeft className="w-4 h-4" />
      default:
        return <Coins className="w-4 h-4" />
    }
  }

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return 'text-yellow-400 bg-yellow-500/20'
    if (status === 'failed') return 'text-red-400 bg-red-500/20'
    
    switch (type) {
      case 'receive':
        return 'text-green-400 bg-green-500/20'
      case 'send':
        return 'text-red-400 bg-red-500/20'
      case 'swap':
        return 'text-blue-400 bg-blue-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getTransactionTitle = (type: string, status: string) => {
    if (status === 'failed') return 'Неудачно'
    
    switch (type) {
      case 'receive':
        return 'Получено'
      case 'send':
        return 'Отправлено'
      case 'swap':
        return 'Обмен'
      case 'mint':
        return 'Создано'
      case 'burn':
        return 'Сожжено'
      default:
        return 'Транзакция'
    }
  }

  // Функция для сокращения username в истории (можно чуть больше символов)
  const truncateUsername = (username: string, maxLength: number = 12) => {
    if (username.length <= maxLength) {
      return username
    }
    return username.substring(0, maxLength) + '...'
  }

  // Функция для определения типа адреса и правильного форматирования
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

  const getTransactionSourceText = (transaction: Transaction) => {
    // Для получения показываем отправителя
    if (transaction.type === 'receive') {
      if (transaction.isAnonymous) {
        return 'От: Анонимно'
      }
      if (transaction.fromUsername) {
        return `От: @${truncateUsername(transaction.fromUsername)}`
      }
      if (transaction.from) {
        return `От: ${formatAddressOrUsername(transaction.from)}`
      }
      return 'От: Неизвестно'
    }
    
    // Для отправки показываем получателя
    if (transaction.type === 'send') {
      if (transaction.toUsername) {
        return `Кому: @${truncateUsername(transaction.toUsername)}`
      }
      if (transaction.to) {
        return `Кому: ${formatAddressOrUsername(transaction.to)}`
      }
      return 'Кому: Неизвестно'
    }
    
    // Для других типов транзакций
    if (transaction.memo) {
      return transaction.memo
    }
    
    if (transaction.from || transaction.to) {
      const addressText = transaction.from || transaction.to || 'Без описания'
      return formatAddressOrUsername(addressText)
    }
    
    return 'Без описания'
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 60) return `${minutes} мин назад`
    if (hours < 24) return `${hours} ч назад`
    if (days < 7) return `${days} дн назад`
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  const filterOptions = [
    { value: 'all', label: 'Все', count: transactions.length },
    { value: 'receive', label: 'Получено', count: transactions.filter(tx => tx.type === 'receive').length },
    { value: 'send', label: 'Отправлено', count: transactions.filter(tx => tx.type === 'send').length },
    { value: 'swap', label: 'Обмены', count: transactions.filter(tx => tx.type === 'swap').length },
    { value: 'lending', label: 'DeFi Lending', count: transactions.filter(tx => 
      tx.memo?.includes('DeFi Lending') || 
      tx.from === 'DeFi Lending Pool' || 
      tx.to === 'DeFi Lending Pool'
    ).length }
  ]

  const statusOptions = [
    { value: 'all', label: 'Все статусы' },
    { value: 'confirmed', label: 'Подтверждено' },
    { value: 'pending', label: 'В ожидании' },
    { value: 'failed', label: 'Неудачно' }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={handleClose}
        >
          {/* Safe Area Container with proper padding */}
          <div className="w-full h-full max-w-lg flex flex-col justify-center p-4 pb-safe">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-h-[calc(100vh-8rem)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <SimpleCard className="flex-1 overflow-y-auto border border-white/10 bg-black/90 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white">История</h2>
                  <p className="text-xs text-gray-400">Все транзакции</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              {/* Filters and Search */}
              <div className="p-3 border-b border-white/10 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple text-sm"
                  />
                </div>

                {/* Filter buttons - compact layout */}
                <div className="flex gap-1 overflow-x-auto">
                  {filterOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedFilter(option.value as any)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-md border transition-all ${
                        selectedFilter === option.value
                          ? 'border-solana-purple bg-solana-purple/20 text-white'
                          : 'border-white/10 hover:border-white/20 text-gray-400'
                      }`}
                    >
                      <span className="text-xs">{option.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Status filter - compact select */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-solana-purple text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-6 h-6 border-2 border-solana-purple border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Загрузка...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {searchQuery || selectedFilter !== 'all' || selectedStatus !== 'all'
                        ? 'Не найдено'
                        : 'Нет транзакций'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleTransactionClick(transaction)}
                        className="p-3 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              getTransactionColor(transaction.type, transaction.status)
                            }`}>
                              {getTransactionIcon(transaction.type, transaction.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-medium text-sm">
                                  {getTransactionTitle(transaction.type, transaction.status)}
                                </h4>
                                {transaction.status === 'pending' && (
                                  <Clock className="w-3 h-3 text-yellow-400" />
                                )}
                                {transaction.isOnchain && (
                                  <Badge className="bg-gradient-to-r from-solana-purple to-solana-green text-white border-0 text-xs px-1.5 py-0">
                                    On-Chain
                                  </Badge>
                                )}
                                {hasExplorerLink(transaction) && (
                                  <ExternalLink className="w-3 h-3 text-solana-green" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {getTransactionSourceText(transaction)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium text-sm ${
                              transaction.type === 'receive' && transaction.status === 'confirmed' 
                                ? 'text-green-400' 
                                : 'text-white'
                            }`}>
                              {formatTransactionAmount(transaction.amount, transaction.token as 'SOL' | 'TNG' | 'USDC', 'visual')}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <span>{transaction.usdAmount}</span>
                              {transaction.isOnchain && (
                                <>
                                  <span>•</span>
                                  <span className="text-solana-green">Blockchain</span>
                                </>
                              )}
                            </div>
                            {transaction.fee && (
                              <p className="text-xs text-gray-500">
                                Комиссия: {formatTransactionAmount(transaction.fee, 'SOL', 'visual')}
                              </p>
                            )}
                            {transaction.memo && (
                              <p className="text-xs text-gray-500 truncate max-w-[120px]" title={transaction.memo}>
                                {transaction.memo}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 text-center">
                <p className="text-xs text-gray-500">
                  {filteredTransactions.length} из {transactions.length}
                </p>
              </div>
            </SimpleCard>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
