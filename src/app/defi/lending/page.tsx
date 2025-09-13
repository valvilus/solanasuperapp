'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import { LendingPageSkeleton } from '@/components/defi/DeFiSkeletons'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  CreditCard,
  Banknote,
  TrendingUp,
  Shield,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Plus,
  Minus,
  X,
  CheckCircle,
  Gem,
  Percent,
  Clock,
  Target,
  Zap
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useWallet } from '@/hooks/useWallet'
import { useLending } from '@/hooks/useLending'
import { FlashLoanInterface } from '@/components/defi/FlashLoanInterface'

interface InsuranceStatus {
  isInsured: boolean
  coverageAmount: number
  premiumRate: number
  poolId?: string
}

interface LendingPool {
  id: string
  asset: string
  icon: string
  totalSupply: number
  totalBorrow: number
  supplyAPY: number
  borrowAPY: number
  utilizationRate: number
  collateralFactor: number
  userSupplied: number
  userBorrowed: number
  canBeCollateral: boolean
  protocol: string
}

interface UserPosition {
  totalSupplied: number
  totalBorrowed: number
  healthFactor: number
  liquidationThreshold: number
  borrowCapacity: number
  netAPY: number
}

interface LendingModal {
  isOpen: boolean
  pool: LendingPool | null
  action: 'supply' | 'borrow' | 'repay' | 'withdraw'
  step: 'input' | 'confirm' | 'processing' | 'success' | 'error'
  amount: number
}

//  REMOVED MOCK DATA - Now using real lending data from useLending hook

export default function LendingPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const { apiCall } = useCompatibleAuth()
  // Убираем локальный isLoading, используем из lendingData
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [activeTab, setActiveTab] = useState<'markets' | 'positions' | 'flashloans'>('markets')
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus | null>(null)
  
  //  РЕАЛЬНЫЕ ДАННЫЕ через useLending hook
  const lendingData = useLending()
  // ИСПРАВЛЕНО: используем те же API что и wallet для консистентности
  const { custodial, refreshBalances } = useWallet()
  const solBalance = useTokenBalance('SOL', { cacheTime: 60000, autoRefresh: false })
  const tngBalance = useTokenBalance('TNG', { cacheTime: 60000, autoRefresh: false })
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 60000, autoRefresh: false })
  
  // ДОПОЛНИТЕЛЬНО: прямая загрузка TNG баланса через API
  const [directTngBalance, setDirectTngBalance] = useState<number>(0)
  const [lendingModal, setLendingModal] = useState<LendingModal>({
    isOpen: false,
    pool: null,
    action: 'supply',
    step: 'input',
    amount: 0
  })

  // ПРЯМАЯ загрузка TNG баланса
  const loadDirectTngBalance = async () => {
    try {
      const response = await apiCall('/api/tokens/tng/balance')
      const data = await response.json()
      console.log('🎯 Direct TNG balance response:', data)
      
      if (data.success && data.data && data.data.balance) {
        const amount = Number(data.data.balance.amount) / 1000000000
        setDirectTngBalance(amount)
        console.log('🎯 Direct TNG balance set:', amount)
      }
    } catch (error) {
      console.error('Error loading direct TNG balance:', error)
    }
  }

  // Функция для ручного обновления балансов (без autoRefresh)
  const refreshAllBalances = async () => {
    await Promise.all([
      solBalance.refresh(),
      tngBalance.refresh(),
      usdcBalance.refresh(),
      refreshBalances(),
      loadDirectTngBalance()
    ])
  }

  useEffect(() => {
    // Загружаем данные ОДИН РАЗ при монтировании без лишних зависимостей
    const initializePage = async () => {
      console.log('🔄 Initializing lending page (once)...')
      
      // Загружаем балансы только если они не загружены
      if (!solBalance.balance && !tngBalance.balance && !usdcBalance.balance) {
        refreshBalances()
      }
      
      // Прямая загрузка TNG баланса
      loadDirectTngBalance()
    }
    
    initializePage()
  }, []) // Без dependencies для избежания лишних вызовов

  const loadInsuranceStatus = async () => {
    try {
      const response = await apiCall('/api/defi/insurance?action=protocol-status&protocol=TNG Lending', {
        method: 'GET'
      })
      if (response.ok) {
        const responseData = await response.json()
        if (responseData.success) {
          setInsuranceStatus(responseData.data.status)
        }
      }
    } catch (error) {
      console.error('Error loading insurance status:', error)
    }
  }

  // User position
  //  РЕАЛЬНЫЕ пользовательские данные через lending hook  
  const userPosition: UserPosition = {
    totalSupplied: lendingData.data.summary.totalSupplied,
    totalBorrowed: lendingData.data.summary.totalBorrowed,
    healthFactor: lendingData.data.summary.healthFactor === Number.MAX_SAFE_INTEGER ? 999 : lendingData.data.summary.healthFactor,
    liquidationThreshold: 85, // Default threshold  
    borrowCapacity: lendingData.data.summary.borrowLimit,
    netAPY: lendingData.data.summary.netAPY
  }

  //  УБРАНА имитация загрузки - используем реальный статус из lendingData.isLoading

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

  const handleLendingAction = (pool: LendingPool, action: LendingModal['action']) => {
    setLendingModal({
      isOpen: true,
      pool,
      action,
      step: 'input',
      amount: 0
    })
    hapticFeedback.impact('medium')
  }

  const processLending = async () => {
    if (!lendingModal.pool || !lendingModal.amount) return

    // Check user balance before processing - ИСПРАВЛЕНО: используем wallet API
    const checkBalance = () => {
      const poolAsset = lendingModal.pool!.asset
      let userBalance = 0
      
      if (poolAsset === 'SOL') {
        // Приоритет custodial wallet данным (как в wallet page)
        userBalance = custodial?.balance?.sol || parseFloat(String(solBalance.balance || '0'))
      } else if (poolAsset === 'TNG') {
        // ИСПОЛЬЗУЕМ прямой API вызов как fallback
        userBalance = custodial?.balance?.tng || directTngBalance || parseFloat(String(tngBalance.balance || '0'))
      } else if (poolAsset === 'USDC') {
        userBalance = parseFloat(String(usdcBalance.balance || '0'))
      }
      
      console.log(`💰 Balance check for ${poolAsset}:`, {
        custodialSol: custodial?.balance?.sol,
        custodialTng: custodial?.balance?.tng,
        directTngBalance,
        custodialFull: custodial,
        tokenBalanceTng: tngBalance.balance,
        finalBalance: userBalance
      })
      
      return userBalance
    }

    // Validate balance for supply and repay operations
    if (lendingModal.action === 'supply' || lendingModal.action === 'repay') {
      const userBalance = checkBalance()
      if (userBalance < lendingModal.amount) {
        webApp?.showAlert(`Insufficient ${lendingModal.pool.asset} balance. Available: ${userBalance.toFixed(4)}`)
        return
      }
    }

    setLendingModal(prev => ({ ...prev, step: 'processing' }))
    hapticFeedback.notification('warning')
    
    try {
      let result
      if (lendingModal.action === 'supply') {
        result = await lendingData.supply(lendingModal.pool.asset, lendingModal.amount)
      } else if (lendingModal.action === 'borrow') {
        result = await lendingData.borrow(lendingModal.pool.asset, lendingModal.amount)
      } else if (lendingModal.action === 'repay') {
        result = await lendingData.repay(lendingModal.pool.asset, lendingModal.amount)
      } else if (lendingModal.action === 'withdraw') {
        // In withdraw, amount refers to liquidity/token amount
        result = await lendingData.withdraw(lendingModal.pool.asset, lendingModal.amount)
      }

      if (result && result.success) {
        setLendingModal(prev => ({ ...prev, step: 'success' }))
        hapticFeedback.notification('success')
        // Refresh balances after successful operation
        await Promise.all([
          solBalance.refresh(),
          tngBalance.refresh(), 
          usdcBalance.refresh(),
          lendingData.refetch()
        ])
        setTimeout(() => {
          setLendingModal(prev => ({ ...prev, isOpen: false }))
        }, 1500)
      } else {
        setLendingModal(prev => ({ ...prev, step: 'error' }))
        hapticFeedback.notification('error')
        webApp?.showAlert(result?.error || 'Transaction failed')
      }
    } catch (error: any) {
      setLendingModal(prev => ({ ...prev, step: 'error' }))
      hapticFeedback.notification('error')
      webApp?.showAlert(error?.message || 'An error occurred')
    }
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(2)
  }

  const getHealthFactorColor = (factor: number) => {
    if (factor >= 2) return 'text-green-400'
    if (factor >= 1.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const LoadingFallback = () => <LendingPageSkeleton />

  const renderLendingModal = () => {
    if (!lendingModal.isOpen || !lendingModal.pool) return null

    const actionLabels = {
      supply: 'Предоставить',
      borrow: 'Занять',
      repay: 'Погасить',
      withdraw: 'Вывести'
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setLendingModal(prev => ({ ...prev, isOpen: false }))}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">
              {actionLabels[lendingModal.action]} {lendingModal.pool.asset}
            </h2>
            <button
              onClick={() => setLendingModal(prev => ({ ...prev, isOpen: false }))}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Input Step */}
          {lendingModal.step === 'input' && (
            <div className="space-y-4">
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{lendingModal.pool.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{lendingModal.pool.asset}</h3>
                    <p className="text-xs text-gray-400">
                      {lendingModal.pool.protocol} • 
                      {lendingModal.action === 'supply' || lendingModal.action === 'withdraw' 
                        ? ` ${lendingModal.pool.supplyAPY}% APY`
                        : ` ${lendingModal.pool.borrowAPY}% APY`
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Сумма</label>
                  <input
                    type="number"
                    value={lendingModal.amount || ''}
                    onChange={(e) => setLendingModal(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20 text-right text-xl"
                  />
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-gray-400">
                      Доступно: {(() => {
                        if (lendingModal.action === 'withdraw') {
                          return lendingModal.pool.userSupplied.toFixed(2)
                        } else if (lendingModal.action === 'repay') {
                          return lendingModal.pool.userBorrowed.toFixed(2)
                        } else if (lendingModal.action === 'borrow') {
                          return (userPosition.borrowCapacity / 98.45).toFixed(2)
                        } else {
                          // For supply, show real user balance
                          const poolAsset = lendingModal.pool.asset
                          if (poolAsset === 'SOL') {
                            return (custodial?.balance?.sol || parseFloat(String(solBalance.balance || '0'))).toFixed(4)
                          } else if (poolAsset === 'TNG') {
                            return (custodial?.balance?.tng || directTngBalance || parseFloat(String(tngBalance.balance || '0'))).toFixed(2)
                          } else if (poolAsset === 'USDC') {
                            return parseFloat(String(usdcBalance.balance || '0')).toFixed(2)
                          }
                          return '0.00'
                        }
                      })()} {lendingModal.pool.asset}
                    </span>
                    {(lendingModal.action === 'withdraw' || lendingModal.action === 'repay' || lendingModal.action === 'supply') && (
                      <button
                        onClick={() => {
                          let maxAmount = 0
                          if (lendingModal.action === 'withdraw') {
                            maxAmount = lendingModal.pool!.userSupplied
                          } else if (lendingModal.action === 'repay') {
                            maxAmount = lendingModal.pool!.userBorrowed
                          } else if (lendingModal.action === 'supply') {
                            const poolAsset = lendingModal.pool!.asset
                            if (poolAsset === 'SOL') {
                              maxAmount = custodial?.balance?.sol || parseFloat(String(solBalance.balance || '0'))
                            } else if (poolAsset === 'TNG') {
                              maxAmount = custodial?.balance?.tng || directTngBalance || parseFloat(String(tngBalance.balance || '0'))
                            } else if (poolAsset === 'USDC') {
                              maxAmount = parseFloat(String(usdcBalance.balance || '0'))
                            }
                          }
                          setLendingModal(prev => ({ ...prev, amount: maxAmount }))
                        }}
                        className="text-solana-purple hover:text-solana-purple/80"
                      >
                        Макс
                      </button>
                    )}
                  </div>
                </div>
              </SimpleCard>

              {/* TNG Faucet Info - если TNG баланс = 0 */}
              {lendingModal.pool.asset === 'TNG' && (custodial?.balance?.tng || directTngBalance || parseFloat(String(tngBalance.balance || '0'))) === 0 && (
                <SimpleCard className="p-3 border border-amber-500/30 bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    <div className="text-sm">
                      <p className="text-amber-400 font-medium">Нужны TNG токены?</p>
                      <p className="text-amber-300/80 text-xs">
                        Получите бесплатные TNG токены на главной странице через Faucet
                      </p>
                    </div>
                  </div>
                </SimpleCard>
              )}

              {/* Additional Info */}
              <SimpleCard className="p-3 border border-white/10">
                <div className="space-y-2 text-xs">
                  {lendingModal.action === 'supply' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Годовая доходность:</span>
                        <span className="text-green-400">{lendingModal.pool.supplyAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Коэффициент залога:</span>
                        <span className="text-white">{lendingModal.pool.collateralFactor}%</span>
                      </div>
                    </>
                  )}
                  {lendingModal.action === 'borrow' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Процентная ставка:</span>
                        <span className="text-red-400">{lendingModal.pool.borrowAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Новый Health Factor:</span>
                        <span className={getHealthFactorColor(userPosition.healthFactor - 0.2)}>
                          {(userPosition.healthFactor - 0.2).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Использование пула:</span>
                    <span className="text-white">{lendingModal.pool.utilizationRate.toFixed(1)}%</span>
                  </div>
                </div>
              </SimpleCard>

              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setLendingModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full"
                >
                  Отмена
                </SimpleButton>
                <SimpleButton
                  gradient={true}
                  onClick={() => setLendingModal(prev => ({ ...prev, step: 'confirm' }))}
                  disabled={lendingModal.amount <= 0}
                  className="w-full"
                >
                  Продолжить
                </SimpleButton>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {lendingModal.step === 'confirm' && (
            <div className="space-y-4">
              <SimpleCard className="p-4 border border-white/10">
                <div className="text-center space-y-2">
                  <h3 className="text-white font-semibold">
                    {actionLabels[lendingModal.action]} {lendingModal.amount} {lendingModal.pool.asset}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {lendingModal.action === 'supply' && `Доходность: ${lendingModal.pool.supplyAPY}% годовых`}
                    {lendingModal.action === 'borrow' && `Процент: ${lendingModal.pool.borrowAPY}% годовых`}
                    {lendingModal.action === 'repay' && 'Погашение займа с процентами'}
                    {lendingModal.action === 'withdraw' && 'Вывод с накопленными процентами'}
                  </p>
                </div>
              </SimpleCard>

              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setLendingModal(prev => ({ ...prev, step: 'input' }))}
                  className="w-full"
                >
                  Назад
                </SimpleButton>
                <SimpleButton
                  gradient={true}
                  onClick={processLending}
                  className="w-full"
                >
                  Подтвердить
                </SimpleButton>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {lendingModal.step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto">
                {lendingModal.action === 'supply' || lendingModal.action === 'withdraw' ? (
                  <Banknote className="w-8 h-8 text-white animate-pulse" />
                ) : (
                  <CreditCard className="w-8 h-8 text-white animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Обработка операции</h3>
                <p className="text-sm text-gray-400">Выполнение транзакции...</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                />
              </div>
            </div>
          )}

          {/* Success Step */}
          {lendingModal.step === 'success' && (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="text-white font-semibold mb-2">Операция выполнена!</h3>
                <p className="text-sm text-gray-400">
                  {lendingModal.amount} {lendingModal.pool.asset} успешно {
                    lendingModal.action === 'supply' ? 'предоставлено' :
                    lendingModal.action === 'borrow' ? 'заимствовано' :
                    lendingModal.action === 'repay' ? 'погашено' :
                    'выведено'
                  }
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {lendingData.isLoading ? (
        <LoadingFallback />
      ) : (
        <>
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
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-white">
                          DeFi <span className="text-yellow-400">Займы</span>
                        </h1>
                        {insuranceStatus?.isInsured && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <Shield className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">Застрахован</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        Кредитование и заимствование
                        {insuranceStatus?.isInsured && (
                          <span className="text-green-400 ml-2">• Покрытие до ${insuranceStatus.coverageAmount.toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {isBalanceVisible ? 
                      <Eye className="w-4 h-4 text-gray-400" /> : 
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    }
                  </motion.button>
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
                    <Percent className="w-3 h-3" />
                    <span>Низкие ставки</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>Health Factor: {userPosition.healthFactor.toFixed(2)}</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* User Position Overview */}
              <motion.div
                className="px-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-yellow-500/10 to-orange-500/5">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-6 h-6 text-yellow-400" />
                    <h3 className="text-white font-semibold">Моя позиция</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-lg font-bold text-white">
                        ${isBalanceVisible ? formatLargeNumber(userPosition.totalSupplied) : '••••'}
                      </p>
                      <p className="text-sm text-gray-400">Предоставлено</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-400">
                        ${isBalanceVisible ? formatLargeNumber(userPosition.totalBorrowed) : '••••'}
                      </p>
                      <p className="text-sm text-gray-400">Заимствовано</p>
                    </div>
                  </div>

                  {/* Health Factor */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Health Factor</span>
                      <span className={`text-sm font-medium ${getHealthFactorColor(userPosition.healthFactor)}`}>
                        {userPosition.healthFactor.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((userPosition.healthFactor / 3) * 100, 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-gray-500">
                      {userPosition.healthFactor >= 2 ? 'Безопасная позиция' :
                       userPosition.healthFactor >= 1.5 ? 'Умеренный риск' :
                       'Высокий риск ликвидации'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Доступно для займа</p>
                      <p className="text-sm font-medium text-white">
                        ${isBalanceVisible ? formatLargeNumber(userPosition.borrowCapacity - userPosition.totalBorrowed) : '••••'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Чистый APY</p>
                      <p className="text-sm font-medium text-green-400">{userPosition.netAPY}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Ликвидация при</p>
                      <p className="text-sm font-medium text-white">{userPosition.liquidationThreshold}%</p>
                    </div>
                  </div>
                </SimpleCard>
              </motion.div>

              {/* Tabs */}
              <div className="px-5">
                <div className="flex bg-gray-900/50 rounded-2xl p-1 border border-gray-800/50">
                  {[
                    { id: 'markets', label: 'Рынки', icon: TrendingUp },
                    { id: 'positions', label: 'Позиции', icon: CreditCard },
                    { id: 'flashloans', label: 'Flash Loans', icon: Zap }
                  ].map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setActiveTab(tab.id as any)
                        hapticFeedback.impact('light')
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-white/10 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Markets Tab */}
              {activeTab === 'markets' && (
                <div className="px-5">
                  <h3 className="text-lg font-bold text-white mb-4">Все рынки</h3>
                  
                  {/* TNG Faucet Info - если у пользователя нет TNG токенов */}
                  {(custodial?.balance?.tng || directTngBalance || parseFloat(String(tngBalance.balance || '0'))) === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4"
                    >
                      <SimpleCard className="p-4 border border-amber-500/30 bg-amber-500/10">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-amber-400 font-medium text-sm mb-1">
                              Нужны TNG токены для займов?
                            </p>
                            <p className="text-amber-300/80 text-xs leading-relaxed">
                              Получите бесплатные TNG токены на главной странице через Faucet для тестирования lending функций
                            </p>
                          </div>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  )}
                  
                  <div className="space-y-3">
                    {lendingData.data.pools.map((pool, index) => (
                      <motion.div
                        key={pool.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                      >
                        <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                          {/* Pool Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{pool.icon}</span>
                              <div>
                                <h4 className="text-white font-semibold">{pool.asset}</h4>
                                <p className="text-xs text-gray-400">{pool.protocol}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-green-400">{pool.supplyAPY}%</span>
                                <span className="text-xs text-gray-400">/</span>
                                <span className="text-sm text-red-400">{pool.borrowAPY}%</span>
                              </div>
                              <p className="text-xs text-gray-400">Supply / Borrow APY</p>
                            </div>
                          </div>

                          {/* Pool Stats */}
                          <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                            <div>
                              <p className="text-gray-500">Total Supply</p>
                              <p className="text-white font-medium">{formatLargeNumber(pool.totalSupply)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Borrow</p>
                              <p className="text-white font-medium">{formatLargeNumber(pool.totalBorrow)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Utilization</p>
                              <p className="text-white font-medium">{pool.utilizationRate.toFixed(1)}%</p>
                            </div>
                          </div>

                          {/* Utilization Bar */}
                          <div className="mb-3">
                            <Progress value={pool.utilizationRate} className="h-1 mb-1" />
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <SimpleButton
                              size="sm"
                              onClick={() => handleLendingAction(pool, 'supply')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Supply
                            </SimpleButton>
                            <SimpleButton
                              size="sm"
                              onClick={() => handleLendingAction(pool, 'borrow')}
                              disabled={userPosition.borrowCapacity <= userPosition.totalBorrowed}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4 mr-1" />
                              Borrow
                            </SimpleButton>
                          </div>
                        </SimpleCard>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positions Tab */}
              {activeTab === 'positions' && (
                <div className="px-5">
                  <h3 className="text-lg font-bold text-white mb-4">Мои позиции</h3>
                  
                  <div className="space-y-3">
                    {lendingData.data.pools.filter(pool => pool.userSupplied > 0 || pool.userBorrowed > 0).map((pool, index) => (
                      <motion.div
                        key={pool.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <SimpleCard className="p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{pool.icon}</span>
                              <div>
                                <h4 className="text-white font-semibold">{pool.asset}</h4>
                                <p className="text-xs text-gray-400">{pool.protocol}</p>
                              </div>
                            </div>
                          </div>

                          {/* Supply Position */}
                          {pool.userSupplied > 0 && (
                            <div className="bg-green-500/10 rounded-lg p-3 mb-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-green-400">Предоставлено</span>
                                <span className="text-sm text-green-400">{pool.supplyAPY}% APY</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-white font-medium">
                                  {isBalanceVisible ? pool.userSupplied.toFixed(2) : '••••'} {pool.asset}
                                </span>
                                <SimpleButton
                                  size="sm"
                                  onClick={() => handleLendingAction(pool, 'withdraw')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Вывести
                                </SimpleButton>
                              </div>
                            </div>
                          )}

                          {/* Borrow Position */}
                          {pool.userBorrowed > 0 && (
                            <div className="bg-red-500/10 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-red-400">Заимствовано</span>
                                <span className="text-sm text-red-400">{pool.borrowAPY}% APY</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-white font-medium">
                                  {isBalanceVisible ? pool.userBorrowed.toFixed(2) : '••••'} {pool.asset}
                                </span>
                                <SimpleButton
                                  size="sm"
                                  onClick={() => handleLendingAction(pool, 'repay')}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Погасить
                                </SimpleButton>
                              </div>
                            </div>
                          )}
                        </SimpleCard>
                      </motion.div>
                    ))}
                    
                    {lendingData.data.pools.filter(pool => pool.userSupplied > 0 || pool.userBorrowed > 0).length === 0 && (
                      <div className="text-center py-12">
                        <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">У вас пока нет активных позиций</p>
                        <p className="text-sm text-gray-500 mt-1">Перейдите в раздел "Рынки" для начала работы</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flash Loans Tab */}
              {activeTab === 'flashloans' && (
                <div className="px-5">
                  <FlashLoanInterface 
                    onFlashLoanExecuted={(result) => {
                      // Refresh lending data after flash loan
                      lendingData.refetch()
                    }}
                  />
                </div>
              )}

            </div>
          </PageLayout>

          {/* Lending Modal */}
          <AnimatePresence>
            {renderLendingModal()}
          </AnimatePresence>
        </>
      )}
    </ClientOnly>
  )
}


