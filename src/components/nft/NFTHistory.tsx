/**
 * NFT History Component - Display NFT transaction history
 * Solana SuperApp - NFT Page
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Palette,
  Send,
  ShoppingCart,
  Zap,
  Eye,
  Hammer,
  Tag,
  Gavel
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { formatWalletAddress } from '@/lib/formatters'
import { useAuth } from '../../contexts/AuthContext'
import type { NftItem } from '@/features/nft/types'

interface NFTHistoryProps {
  nft: NftItem | null
  isOpen: boolean
  onClose: () => void
}

interface NFTTransaction {
  id: string
  type: 'MINT' | 'TRANSFER' | 'LIST' | 'UNLIST' | 'SALE' | 'USE' | 'BURN'
  status: 'pending' | 'confirmed' | 'failed'
  fromAddress?: string
  toAddress?: string
  fromUsername?: string
  toUsername?: string
  price?: {
    amount: string
    formatted: string
    lamports: number
  }
  signature?: string
  timestamp: Date
  blockTime?: Date
  explorerUrl?: string
  memo?: string
  isOnchain?: boolean
}

// NFT Transaction type configurations
const NFT_TRANSACTION_CONFIGS = {
  MINT: {
    icon: Hammer,
    color: 'text-green-400',
    bgColor: 'from-green-500/20 to-green-600/10',
    title: 'Создание NFT',
    description: 'NFT был создан'
  },
  TRANSFER: {
    icon: Send,
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/20 to-blue-600/10',
    title: 'Перевод',
    description: 'NFT был переведен'
  },
  LIST: {
    icon: Tag,
    color: 'text-purple-400',
    bgColor: 'from-purple-500/20 to-purple-600/10', 
    title: 'Выставление на продажу',
    description: 'NFT выставлен на маркетплейс'
  },
  UNLIST: {
    icon: XCircle,
    color: 'text-gray-400',
    bgColor: 'from-gray-500/20 to-gray-600/10',
    title: 'Снятие с продажи',
    description: 'NFT снят с маркетплейса'
  },
  SALE: {
    icon: ShoppingCart,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500/20 to-yellow-600/10',
    title: 'Продажа',
    description: 'NFT был продан'
  },
  USE: {
    icon: Zap,
    color: 'text-orange-400',
    bgColor: 'from-orange-500/20 to-orange-600/10',
    title: 'Использование',
    description: 'NFT был использован'
  },
  BURN: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'from-red-500/20 to-red-600/10',
    title: 'Сжигание',
    description: 'NFT был уничтожен'
  }
} as const

// Check if transaction has explorer link available
const hasExplorerLink = (transaction: NFTTransaction) => {
  if (transaction.explorerUrl) return true
  if (transaction.signature && transaction.signature.length >= 60 && /^[A-Za-z0-9]+$/.test(transaction.signature)) {
    return true
  }
  return false
}

// Format timestamp for display
const formatTimestamp = (timestamp: Date) => {
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
  
  if (diffMinutes < 1) return 'Только что'
  if (diffMinutes < 60) return `${diffMinutes} мин назад`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} ч назад`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} дн назад`
  
  return timestamp.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export function NFTHistory({ nft, isOpen, onClose }: NFTHistoryProps) {
  const { apiCall } = useAuth()
  const [transactions, setTransactions] = useState<NFTTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<NFTTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'MINT' | 'TRANSFER' | 'SALE' | 'USE'>('all')

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Load transaction history when modal opens
  useEffect(() => {
    if (isOpen && nft) {
      loadTransactionHistory()
    }
  }, [isOpen, nft])

  // Filter transactions based on search and filter
  useEffect(() => {
    let filtered = transactions

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === selectedFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tx => 
        tx.type.toLowerCase().includes(query) ||
        tx.fromAddress?.toLowerCase().includes(query) ||
        tx.toAddress?.toLowerCase().includes(query) ||
        tx.fromUsername?.toLowerCase().includes(query) ||
        tx.toUsername?.toLowerCase().includes(query) ||
        tx.signature?.toLowerCase().includes(query)
      )
    }

    setFilteredTransactions(filtered)
  }, [transactions, selectedFilter, searchQuery])

  const loadTransactionHistory = async () => {
    if (!nft?.id) return

    setLoading(true)
    try {
      const response = await apiCall(`/api/nft/${nft.id}/history`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Не удалось загрузить историю транзакций')
      }

      const data = await response.json()
      
      if (data.success && data.data?.transactions) {
        // Convert string timestamps back to Date objects
        const transactions = data.data.transactions.map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
          blockTime: tx.blockTime ? new Date(tx.blockTime) : undefined
        }))
        
        setTransactions(transactions)
      } else {
        throw new Error(data.error || 'Ошибка загрузки истории')
      }
    } catch (error) {
      console.error('Error loading NFT transaction history:', error)
      // Fallback to empty array
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const openExplorer = (transaction: NFTTransaction) => {
    const url = transaction.explorerUrl || 
      `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`
    window.open(url, '_blank')
    hapticFeedback.impact('light')
  }

  const getStatusBadge = (status: NFTTransaction['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Подтверждено
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            В обработке
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Не удалось
          </Badge>
        )
    }
  }

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  if (!nft) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" // Z-INDEX: Action modal layer
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleCard className="h-full overflow-hidden border border-white/10 bg-black/90 backdrop-blur-xl">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {nft.type === 'TICKET' ? '' : 
                       nft.type === 'COUPON' ? '' : 
                       nft.type === 'BADGE' ? '' : 
                       nft.type === 'CERTIFICATE' ? '' : ''}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">История NFT</h2>
                      <p className="text-sm text-gray-400">{nft.name}</p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </motion.button>
                </div>

                {/* Search and Filter */}
                <div className="mt-4 space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск по адресу, типу, подписи..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all text-sm"
                    />
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(['all', 'MINT', 'TRANSFER', 'SALE', 'USE'] as const).map((filter) => (
                      <motion.button
                        key={filter}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                          selectedFilter === filter
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {filter === 'all' ? 'Все' : 
                         filter === 'MINT' ? 'Создание' :
                         filter === 'TRANSFER' ? 'Переводы' :
                         filter === 'SALE' ? 'Продажи' : 'Использование'}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  /* Loading State */
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <SimpleCard className="p-4 border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-700" />
                              <div>
                                <div className="w-24 h-4 bg-gray-700 rounded mb-1" />
                                <div className="w-32 h-3 bg-gray-700 rounded" />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="w-16 h-4 bg-gray-700 rounded mb-1" />
                              <div className="w-20 h-3 bg-gray-700 rounded" />
                            </div>
                          </div>
                        </SimpleCard>
                      </div>
                    ))}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  /* Empty State */
                  <div className="text-center py-12">
                    <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {searchQuery || selectedFilter !== 'all' ? 'Ничего не найдено' : 'Пока нет истории'}
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {searchQuery || selectedFilter !== 'all' 
                        ? 'Попробуйте изменить параметры поиска'
                        : 'История транзакций этого NFT будет отображаться здесь'
                      }
                    </p>
                    {(searchQuery || selectedFilter !== 'all') && (
                      <SimpleButton 
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedFilter('all')
                        }}
                      >
                        Сбросить фильтры
                      </SimpleButton>
                    )}
                  </div>
                ) : (
                  /* Transaction List */
                  <div className="space-y-3">
                    {filteredTransactions.map((transaction, index) => {
                      const config = NFT_TRANSACTION_CONFIGS[transaction.type]
                      const Icon = config.icon

                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <SimpleCard className="p-4 border border-white/5 hover:border-white/10 transition-all duration-200">
                            <div className="flex items-center justify-between">
                              {/* Left Side - Icon & Info */}
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.bgColor} flex items-center justify-center`}>
                                  <Icon className={`w-5 h-5 ${config.color}`} />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-medium text-white">
                                      {config.title}
                                    </h4>
                                    {getStatusBadge(transaction.status)}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-400">
                                      {formatTimestamp(transaction.timestamp)}
                                    </p>
                                    
                                    {/* Address Info */}
                                    {transaction.type === 'TRANSFER' && (
                                      <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>От:</span>
                                        <span className="text-white">
                                          {transaction.fromUsername || formatWalletAddress(transaction.fromAddress)}
                                        </span>
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span>Кому:</span>
                                        <span className="text-white">
                                          {transaction.toUsername || formatWalletAddress(transaction.toAddress)}
                                        </span>
                                      </div>
                                    )}

                                    {/* Price Info */}
                                    {transaction.price && (
                                      <div className="flex items-center gap-1 text-xs">
                                        <span className="text-gray-400">Цена:</span>
                                        <span className="text-green-400 font-medium">
                                          {transaction.price.formatted}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Side - Explorer Link */}
                              {hasExplorerLink(transaction) && (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => openExplorer(transaction)}
                                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </motion.button>
                              )}
                            </div>
                          </SimpleCard>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-2">
                    Показано {filteredTransactions.length} из {transactions.length} транзакций
                  </p>
                  <SimpleButton onClick={handleClose}>
                    Закрыть
                  </SimpleButton>
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
