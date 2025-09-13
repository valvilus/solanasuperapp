'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, ExternalLink, Clock, Shield, Zap, RefreshCw, Copy, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Input } from '@/components/ui/input'
import { MainPageSkeleton } from '@/components/ui/MainPageSkeleton'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface SupportedChain {
  chainId: string
  name: string
  symbol: string
  rpcUrl: string
  blockExplorer: string
  bridgeFee: number
  estimatedTime: string
  isActive: boolean
  logo: string
}

interface BridgeTransaction {
  txId: string
  sourceChain: string
  targetChain: string
  sender: string
  recipient: string
  amount: number
  feeAmount: number
  tokenSymbol: string
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Failed'
  createdAt: Date
  completedAt?: Date
}

export default function BridgePage() {
  const router = useRouter()
  const { apiCall } = useCompatibleAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bridge' | 'history'>('bridge')
  
  const [sourceChain, setSourceChain] = useState('Solana')
  const [targetChain, setTargetChain] = useState('Ethereum')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('TNG')
  
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([])
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null)

  const mockChains: SupportedChain[] = [
    {
      chainId: 'Solana',
      name: 'Solana',
      symbol: 'SOL',
      rpcUrl: '',
      blockExplorer: 'https://solscan.io',
      bridgeFee: 0,
      estimatedTime: '0 мин',
      isActive: true,
      logo: '🌞'
    },
    {
      chainId: 'Ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      rpcUrl: '',
      blockExplorer: 'https://etherscan.io',
      bridgeFee: 0.25,
      estimatedTime: '10-15 мин',
      isActive: true,
      logo: '⟠'
    },
    {
      chainId: 'BSC',
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      rpcUrl: '',
      blockExplorer: 'https://bscscan.com',
      bridgeFee: 0.1,
      estimatedTime: '3-5 мин',
      isActive: true,
      logo: '🟡'
    },
    {
      chainId: 'Polygon',
      name: 'Polygon',
      symbol: 'MATIC',
      rpcUrl: '',
      blockExplorer: 'https://polygonscan.com',
      bridgeFee: 0.05,
      estimatedTime: '2-3 мин',
      isActive: true,
      logo: '🟣'
    }
  ]

  useEffect(() => {
    loadBridgeData()
  }, [])

  const loadBridgeData = async () => {
    try {
      setIsLoading(true)
      
      const [chainsResponse, transactionsResponse] = await Promise.all([
        apiCall('/api/defi/bridge?action=chains', { method: 'GET' }),
        apiCall('/api/defi/bridge?action=transactions', { method: 'GET' })
      ])

      // Handle chains response
      if (chainsResponse.ok) {
        const chainsData = await chainsResponse.json()
        if (chainsData.success) {
          setSupportedChains(chainsData.data.chains)
        } else {
          setSupportedChains(mockChains)
        }
      } else {
        setSupportedChains(mockChains)
      }

      // Handle transactions response
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        if (transactionsData.success) {
          setTransactions(transactionsData.data.transactions)
        }
      }
    } catch (error) {
      console.error('Error loading bridge data:', error)
      setSupportedChains(mockChains)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBridgeTransfer = async () => {
    if (!amount || !recipient || parseFloat(amount) <= 0) {
      hapticFeedback.notification('error')
      return
    }

    try {
      setIsProcessing(true)
      hapticFeedback.impact('light')

      const response = await apiCall('/api/defi/bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'transfer',
          targetChain,
          recipient,
          amount: parseFloat(amount),
          tokenSymbol
        })
      })

      if (response.ok) {
        const responseData = await response.json()
        if (responseData.success) {
          hapticFeedback.notification('success')
          setAmount('')
          setRecipient('')
          await loadBridgeData()
          setActiveTab('history')
        } else {
          hapticFeedback.notification('error')
        }
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      console.error('Bridge transfer error:', error)
      hapticFeedback.notification('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSwapChains = () => {
    if (sourceChain === 'Solana') return
    
    const temp = sourceChain
    setSourceChain(targetChain)
    setTargetChain(temp)
    hapticFeedback.impact('light')
  }

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/defi')
  }

  const copyTxId = (txId: string) => {
    navigator.clipboard.writeText(txId)
    setCopiedTxId(txId)
    hapticFeedback.impact('light')
    setTimeout(() => setCopiedTxId(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-400'
      case 'Pending': return 'text-yellow-400'
      case 'Confirmed': return 'text-blue-400'
      case 'Failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 border-green-500/20'
      case 'Pending': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'Confirmed': return 'bg-blue-500/10 border-blue-500/20'
      case 'Failed': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  const LoadingFallback = () => <MainPageSkeleton />

  if (isLoading) {
    return <LoadingFallback />
  }

  return (
    <PageLayout showBottomNav={true}>
      <div className="space-y-5 pb-safe">
        
        {/* Header */}
        <motion.div
          className="px-5 pt-4 pb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleBack}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Cross-Chain <span className="text-blue-400">Bridge</span>
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Межсетевые переводы</p>
              </div>
            </div>
          </div>

          <motion.div
            className="flex items-center gap-4 text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Безопасно</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Быстро</span>
            </div>
            <div className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              <span>Multi-Chain</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex bg-white/5 rounded-xl p-1">
            {[
              { id: 'bridge', label: 'Перевод', icon: ArrowRight },
              { id: 'history', label: 'История', icon: Clock }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  hapticFeedback.impact('light')
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'bridge' ? (
            <motion.div
              key="bridge"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Chain Selection */}
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Выбор сетей</h3>
                  
                  {/* From Chain */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Откуда</label>
                    <div className="relative">
                      <select
                        value={sourceChain}
                        onChange={(e) => setSourceChain(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                      >
                        {supportedChains.map((chain) => (
                          <option key={chain.chainId} value={chain.chainId} className="bg-gray-800">
                            {chain.logo} {chain.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSwapChains}
                      disabled={sourceChain === 'Solana'}
                      className="p-2 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                    </motion.button>
                  </div>

                  {/* To Chain */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Куда</label>
                    <div className="relative">
                      <select
                        value={targetChain}
                        onChange={(e) => setTargetChain(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                      >
                        {supportedChains.filter(chain => chain.chainId !== sourceChain).map((chain) => (
                          <option key={chain.chainId} value={chain.chainId} className="bg-gray-800">
                            {chain.logo} {chain.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </SimpleCard>

              {/* Amount Input */}
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Сумма перевода</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Токен</label>
                      <select
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="TNG" className="bg-gray-800">TNG</option>
                        <option value="SOL" className="bg-gray-800">SOL</option>
                        <option value="USDC" className="bg-gray-800">USDC</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Количество</label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="text-lg"
                      />
                    </div>
                  </div>

                  {/* Fee Info */}
                  {amount && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Комиссия моста:</span>
                        <span className="text-blue-400">
                          {supportedChains.find(c => c.chainId === targetChain)?.bridgeFee || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Время перевода:</span>
                        <span className="text-blue-400">
                          {supportedChains.find(c => c.chainId === targetChain)?.estimatedTime || '5-10 мин'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </SimpleCard>

              {/* Recipient */}
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Получатель</h3>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Адрес получателя в целевой сети"
                    className="font-mono text-sm"
                  />
                </div>
              </SimpleCard>

              {/* Bridge Button */}
              <SimpleButton
                onClick={handleBridgeTransfer}
                disabled={!amount || !recipient || isProcessing}
                className="w-full py-4 text-lg font-semibold"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Обработка...</span>
                  </div>
                ) : (
                  `Перевести в ${supportedChains.find(c => c.chainId === targetChain)?.name}`
                )}
              </SimpleButton>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {transactions.length === 0 ? (
                <SimpleCard>
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">История переводов пуста</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ваши межсетевые переводы будут отображаться здесь
                    </p>
                  </div>
                </SimpleCard>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx, index) => (
                    <motion.div
                      key={tx.txId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <SimpleCard>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-sm">
                                <span>{supportedChains.find(c => c.chainId === tx.sourceChain)?.logo}</span>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span>{supportedChains.find(c => c.chainId === tx.targetChain)?.logo}</span>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-xs border ${getStatusBg(tx.status)}`}>
                                <span className={getStatusColor(tx.status)}>{tx.status}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">{tx.amount} {tx.tokenSymbol}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(tx.createdAt).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <button
                              onClick={() => copyTxId(tx.txId)}
                              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedTxId === tx.txId ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span className="font-mono">{tx.txId.slice(0, 8)}...{tx.txId.slice(-8)}</span>
                            </button>
                            <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  )
}
