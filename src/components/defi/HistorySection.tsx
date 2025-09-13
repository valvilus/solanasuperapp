'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  History, 
  ArrowUpDown, 
  Coins, 
  CreditCard,
  Zap,
  ExternalLink,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface DeFiTransaction {
  id: string
  type: 'swap' | 'stake' | 'unstake' | 'supply' | 'borrow' | 'repay' | 'farm' | 'harvest'
  timestamp: Date
  fromToken?: string
  toToken?: string
  fromAmount?: number
  toAmount?: number
  fee?: number
  status: 'pending' | 'confirmed' | 'failed'
  signature: string
  protocol: string
  gasUsed?: number
  value: number // USD value
}

interface HistorySectionProps {
  transactions: DeFiTransaction[]
  onViewTransaction: (signature: string) => void
  onFilterChange: (filters: any) => void
}

//  Mock данные удалены - компонент теперь требует реальные данные через props

const transactionTypes = [
  { id: 'all', label: 'Все', icon: History },
  { id: 'swap', label: 'Обмен', icon: ArrowUpDown },
  { id: 'stake', label: 'Стейкинг', icon: Coins },
  { id: 'supply', label: 'Депозиты', icon: TrendingUp },
  { id: 'borrow', label: 'Займы', icon: CreditCard },
  { id: 'farm', label: 'Фарминг', icon: Zap }
]

export function HistorySection({ 
  transactions = [], //  Требует реальные данные
  onViewTransaction,
  onFilterChange
}: HistorySectionProps) {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (filterId: string) => {
    hapticFeedback.impact('light')
    setSelectedFilter(filterId)
    onFilterChange({ type: filterId === 'all' ? null : filterId, search: searchQuery })
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesType = selectedFilter === 'all' || tx.type === selectedFilter
    const matchesSearch = searchQuery === '' || 
      tx.signature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.fromToken?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.toToken?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesType && matchesSearch
  })

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'swap': return ArrowUpDown
      case 'stake': 
      case 'unstake': return Coins
      case 'supply': 
      case 'repay': return TrendingUp
      case 'borrow': return CreditCard
      case 'farm': 
      case 'harvest': return Zap
      default: return History
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'swap': return 'text-blue-400'
      case 'stake': 
      case 'unstake': return 'text-purple-400'
      case 'supply': 
      case 'repay': return 'text-green-400'
      case 'borrow': return 'text-red-400'
      case 'farm': 
      case 'harvest': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return CheckCircle
      case 'failed': return XCircle
      case 'pending': return Clock
      default: return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400'
      case 'failed': return 'text-red-400'
      case 'pending': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes} мин назад`
    } else if (hours < 24) {
      return `${hours} ч назад`
    } else {
      return `${days} д назад`
    }
  }

  const formatTransactionTitle = (tx: DeFiTransaction) => {
    switch (tx.type) {
      case 'swap':
        return `${tx.fromToken} → ${tx.toToken}`
      case 'stake':
        return `Стейкинг ${tx.fromToken}`
      case 'unstake':
        return `Анстейк ${tx.fromToken}`
      case 'supply':
        return `Депозит ${tx.fromToken}`
      case 'borrow':
        return `Займ ${tx.toToken}`
      case 'repay':
        return `Погашение ${tx.fromToken}`
      case 'farm':
        return `Фарминг ${tx.fromToken}`
      case 'harvest':
        return `Сбор ${tx.toToken}`
      default:
        return 'DeFi операция'
    }
  }

  const totalVolume = filteredTransactions.reduce((sum, tx) => sum + tx.value, 0)
  const totalTransactions = filteredTransactions.length

  return (
    <div className="px-5 space-y-6">
      
      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-gray-500/10 to-slate-600/5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <History className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalTransactions}</p>
              <p className="text-sm text-gray-400">Всего операций</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">${totalVolume.toFixed(0)}</p>
              <p className="text-sm text-gray-400">Общий объем</p>
            </div>
            <div className="text-center">
              <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                ${(totalVolume * 0.002).toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">Комиссии</p>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="space-y-3"
      >
        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по подписи, протоколу, токену..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-white/20 transition-colors"
            />
          </div>
          <SimpleButton
            onClick={() => {
              hapticFeedback.impact('light')
              setShowFilters(!showFilters)
            }}
            className="px-4"
          >
            <Filter className="w-4 h-4" />
          </SimpleButton>
        </div>

        {/* Filter Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {transactionTypes.map((type) => {
            const isActive = selectedFilter === type.id
            const IconComponent = type.icon
            
            return (
              <motion.button
                key={type.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : 'text-gray-400 hover:text-white bg-white/5'
                }`}
                onClick={() => handleFilterChange(type.id)}
                whileTap={{ scale: 0.96 }}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{type.label}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Transactions List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">
          История операций {selectedFilter !== 'all' && `(${filteredTransactions.length})`}
        </h3>
        
        {filteredTransactions.length === 0 ? (
          <SimpleCard className="p-8 border border-white/10 text-center">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Операции не найдены</p>
          </SimpleCard>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx, index) => {
              const IconComponent = getTransactionIcon(tx.type)
              const StatusIconComponent = getStatusIcon(tx.status)
              
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <SimpleCard 
                    className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200 min-h-[80px] flex items-center"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${getTransactionColor(tx.type)} flex-shrink-0`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">
                            {formatTransactionTitle(tx)}
                          </h4>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400 truncate">{tx.protocol}</p>
                            <div className="w-1 h-1 bg-gray-500 rounded-full flex-shrink-0" />
                            <p className="text-xs text-gray-400 flex-shrink-0">{formatTime(tx.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white font-medium">${tx.value.toFixed(2)}</p>
                              <StatusIconComponent className={`w-4 h-4 ${getStatusColor(tx.status)}`} />
                            </div>
                            <p className="text-xs text-gray-400 font-mono">
                              {tx.signature.slice(0, 6)}...{tx.signature.slice(-4)}
                            </p>
                          </div>
                        
                        {/* Explorer Button */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`, '_blank')
                            hapticFeedback.impact('light')
                          }}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors group"
                          title="Открыть в Explorer"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Transaction Details */}
                    {(tx.fromAmount || tx.toAmount) && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between text-sm">
                          {tx.fromAmount && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">Из:</span>
                              <span className="text-white">
                                {tx.fromAmount} {tx.fromToken}
                              </span>
                            </div>
                          )}
                          {tx.toAmount && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">В:</span>
                              <span className="text-white">
                                {tx.toAmount} {tx.toToken}
                              </span>
                            </div>
                          )}
                          {tx.fee && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">Комиссия:</span>
                              <span className="text-gray-300">{tx.fee}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </SimpleCard>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Удалено: Экспорт истории согласно ТЗ */}
    </div>
  )
}


