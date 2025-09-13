'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Shield, Clock, AlertTriangle, CheckCircle, XCircle, FileText, TrendingUp, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Input } from '@/components/ui/input'
import { MainPageSkeleton } from '@/components/ui/MainPageSkeleton'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface InsurancePool {
  poolId: string
  protectedProtocol: string
  coverageAmount: number
  premiumRate: number
  totalPremiums: number
  totalClaims: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface InsurancePolicy {
  policyId: string
  userId: string
  poolId: string
  coverageAmount: number
  premiumPaid: number
  startTime: Date
  expiryTime: Date
  isActive: boolean
  createdAt: Date
}

interface InsuranceClaim {
  claimId: string
  policyId: string
  poolId: string
  claimAmount: number
  evidence?: any
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  payoutAmount: number
  filedAt: Date
  processedAt?: Date
}

export default function InsurancePage() {
  const router = useRouter()
  const { apiCall } = useCompatibleAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pools' | 'policies' | 'claims'>('pools')
  
  const [pools, setPools] = useState<InsurancePool[]>([])
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [stats, setStats] = useState({
    totalCoverage: 0,
    totalPremiums: 0,
    totalClaims: 0,
    activePolicies: 0,
    claimRatio: 0
  })
  
  const [selectedPool, setSelectedPool] = useState<InsurancePool | null>(null)
  const [purchaseForm, setPurchaseForm] = useState({
    coverageAmount: '',
    duration: '30'
  })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadInsuranceData()
  }, [])

  const loadInsuranceData = async () => {
    try {
      setIsLoading(true)
      
      const [poolsResponse, policiesResponse, claimsResponse, statsResponse] = await Promise.all([
        apiCall('/api/defi/insurance?action=pools', { method: 'GET' }),
        apiCall('/api/defi/insurance?action=policies', { method: 'GET' }),
        apiCall('/api/defi/insurance?action=claims', { method: 'GET' }),
        apiCall('/api/defi/insurance?action=stats', { method: 'GET' })
      ])

      if (poolsResponse.ok) {
        const poolsData = await poolsResponse.json()
        if (poolsData.success) {
          setPools(poolsData.data.pools)
        }
      }

      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json()
        if (policiesData.success) {
          setPolicies(policiesData.data.policies)
        }
      }

      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json()
        if (claimsData.success) {
          setClaims(claimsData.data.claims)
        }
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.data.stats)
        }
      }
    } catch (error) {
      console.error('Error loading insurance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchasePolicy = async () => {
    if (!selectedPool || !purchaseForm.coverageAmount || parseFloat(purchaseForm.coverageAmount) <= 0) {
      hapticFeedback.notification('error')
      return
    }

    try {
      setIsProcessing(true)
      hapticFeedback.impact('light')

      const response = await apiCall('/api/defi/insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'purchase-policy',
          poolId: selectedPool.poolId,
          coverageAmount: parseFloat(purchaseForm.coverageAmount),
          duration: parseInt(purchaseForm.duration)
        })
      })

      if (response.ok) {
        const responseData = await response.json()
        if (responseData.success) {
          hapticFeedback.notification('success')
          setSelectedPool(null)
          setPurchaseForm({ coverageAmount: '', duration: '30' })
          await loadInsuranceData()
          setActiveTab('policies')
        } else {
          hapticFeedback.notification('error')
        }
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      console.error('Purchase policy error:', error)
      hapticFeedback.notification('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/defi')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-400'
      case 'APPROVED': return 'text-blue-400'
      case 'PENDING': return 'text-yellow-400'
      case 'REJECTED': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-500/10 border-green-500/20'
      case 'APPROVED': return 'bg-blue-500/10 border-blue-500/20'
      case 'PENDING': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'REJECTED': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  const calculatePremium = () => {
    if (!selectedPool || !purchaseForm.coverageAmount) return 0
    const coverage = parseFloat(purchaseForm.coverageAmount)
    const duration = parseInt(purchaseForm.duration)
    return Math.floor((coverage * selectedPool.premiumRate * duration) / (365 * 10000))
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
                  DeFi <span className="text-blue-400">Страхование</span>
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Защита протоколов и активов</p>
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
              <span>Защищено</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Проверено</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{stats.activePolicies} полисов</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SimpleCard>
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Общая статистика</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalCoverage)}</p>
                  <p className="text-xs text-gray-400">Общее покрытие</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalPremiums)}</p>
                  <p className="text-xs text-gray-400">Премии собрано</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{stats.activePolicies}</p>
                  <p className="text-xs text-gray-400">Активных полисов</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{stats.claimRatio.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">Коэффициент выплат</p>
                </div>
              </div>
            </div>
          </SimpleCard>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex bg-white/5 rounded-xl p-1">
            {[
              { id: 'pools', label: 'Пулы', icon: Shield },
              { id: 'policies', label: 'Полисы', icon: FileText },
              { id: 'claims', label: 'Претензии', icon: AlertTriangle }
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
          {activeTab === 'pools' ? (
            <motion.div
              key="pools"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {pools.length === 0 ? (
                <SimpleCard>
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Страховые пулы не найдены</p>
                  </div>
                </SimpleCard>
              ) : (
                <div className="space-y-3">
                  {pools.map((pool, index) => (
                    <motion.div
                      key={pool.poolId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <SimpleCard>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold">{pool.protectedProtocol}</h4>
                              <p className="text-sm text-gray-400">Покрытие: {formatCurrency(pool.coverageAmount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-400">{(pool.premiumRate / 100).toFixed(1)}%</p>
                              <p className="text-xs text-gray-400">Премия</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Премии: {formatCurrency(pool.totalPremiums)}</span>
                            <span>Выплаты: {formatCurrency(pool.totalClaims)}</span>
                          </div>

                          <SimpleButton
                            onClick={() => {
                              setSelectedPool(pool)
                              hapticFeedback.impact('light')
                            }}
                            className="w-full py-2 text-sm"
                          >
                            Купить полис
                          </SimpleButton>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'policies' ? (
            <motion.div
              key="policies"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {policies.length === 0 ? (
                <SimpleCard>
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">У вас нет активных полисов</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Приобретите страховку в разделе "Пулы"
                    </p>
                  </div>
                </SimpleCard>
              ) : (
                <div className="space-y-3">
                  {policies.map((policy, index) => (
                    <motion.div
                      key={policy.policyId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <SimpleCard>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold">Полис #{policy.policyId}</h4>
                              <p className="text-sm text-gray-400">Покрытие: {formatCurrency(policy.coverageAmount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-400">{formatCurrency(policy.premiumPaid)}</p>
                              <p className="text-xs text-gray-400">Премия</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Начало: {new Date(policy.startTime).toLocaleDateString('ru-RU')}</span>
                            <span>Истекает: {new Date(policy.expiryTime).toLocaleDateString('ru-RU')}</span>
                          </div>

                          <div className={`px-2 py-1 rounded-lg text-xs border ${policy.isActive ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <span className={policy.isActive ? 'text-green-400' : 'text-red-400'}>
                              {policy.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="claims"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {claims.length === 0 ? (
                <SimpleCard>
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">У вас нет поданных претензий</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Претензии по страховым случаям будут отображаться здесь
                    </p>
                  </div>
                </SimpleCard>
              ) : (
                <div className="space-y-3">
                  {claims.map((claim, index) => (
                    <motion.div
                      key={claim.claimId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <SimpleCard>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold">Претензия #{claim.claimId}</h4>
                              <p className="text-sm text-gray-400">Сумма: {formatCurrency(claim.claimAmount)}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs border ${getStatusBg(claim.status)}`}>
                              <span className={getStatusColor(claim.status)}>{claim.status}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Подана: {new Date(claim.filedAt).toLocaleDateString('ru-RU')}</span>
                            {claim.payoutAmount > 0 && (
                              <span>Выплата: {formatCurrency(claim.payoutAmount)}</span>
                            )}
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

        {/* Purchase Policy Modal */}
        <AnimatePresence>
          {selectedPool && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Покупка полиса</h3>
                    <p className="text-gray-400">{selectedPool.protectedProtocol}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Сумма покрытия (USD)</label>
                      <Input
                        type="number"
                        value={purchaseForm.coverageAmount}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, coverageAmount: e.target.value })}
                        placeholder="10000"
                        max={selectedPool.coverageAmount}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Срок (дней)</label>
                      <select
                        value={purchaseForm.duration}
                        onChange={(e) => setPurchaseForm({ ...purchaseForm, duration: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="30" className="bg-gray-800">30 дней</option>
                        <option value="90" className="bg-gray-800">90 дней</option>
                        <option value="180" className="bg-gray-800">180 дней</option>
                        <option value="365" className="bg-gray-800">365 дней</option>
                      </select>
                    </div>

                    {purchaseForm.coverageAmount && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Премия к оплате:</span>
                          <span className="text-blue-400 font-semibold">
                            {formatCurrency(calculatePremium())}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <SimpleButton
                      onClick={() => setSelectedPool(null)}
                      className="flex-1 py-3 bg-gray-700 hover:bg-gray-600"
                    >
                      Отмена
                    </SimpleButton>
                    <SimpleButton
                      onClick={handlePurchasePolicy}
                      disabled={!purchaseForm.coverageAmount || isProcessing}
                      className="flex-1 py-3"
                    >
                      {isProcessing ? 'Покупка...' : 'Купить полис'}
                    </SimpleButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  )
}
