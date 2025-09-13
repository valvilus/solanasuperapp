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
import { StakingPageSkeleton } from '@/components/defi/StakingPageSkeleton'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  Coins, 
  TrendingUp, 
  Clock, 
  Shield, 
  Calculator,
  ChevronRight,
  Star,
  Users,
  Award,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useStaking } from '@/hooks/useStaking'
import { useCachedBalance } from '@/hooks/useCachedBalance'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useStakingContract } from '@/hooks/useStakingContract'

interface Validator {
  id: string
  name: string
  commission: number
  apr: number
  totalStaked: number
  uptime: number
  isActive: boolean
  description: string
  website?: string
  rank: number
  isRecommended: boolean
}

interface StakeModal {
  isOpen: boolean
  validator: Validator | null
  amount: number
  step: 'select' | 'confirm' | 'processing' | 'success' | 'error'
  errorMessage?: string
}

// Real staking pools will come from useStaking hook

export default function StakingPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const [isLoading, setIsLoading] = useState(true)
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null)
  const [stakeModal, setStakeModal] = useState<StakeModal>({
    isOpen: false,
    validator: null,
    amount: 0,
    step: 'select'
  })

  //  РЕАЛЬНЫЕ ДАННЫЕ из готовой инфраструктуры
  const { apiCall } = useCompatibleAuth()
  const [useSmartContract, setUseSmartContract] = useState(true) // Contract режим по умолчанию
  
  // MVP Staking (current implementation)
  const stakingData = useStaking()
  
  // Smart Contract Staking (new implementation)
  const contractData = useStakingContract()
  const [lastStakeSignature, setLastStakeSignature] = useState<string | null>(null)
  
  // Choose data source based on toggle
  const currentStakingData = useSmartContract ? contractData : stakingData
  const userPositions = stakingData.data?.positions || []
  
  //  РЕАЛЬНЫЕ БАЛАНСЫ через TokenBalanceCache
  const solBalance = useCachedBalance('SOL', { 
    cacheTime: 30000,
    autoRefresh: true 
  })
  
  const tngBalance = useCachedBalance('TNG', { 
    cacheTime: 30000,
    autoRefresh: true 
  })
  
  //  РЕАЛЬНЫЕ стейкинг пулы (TNG пулы вместо SOL валидаторов)
  const validators: Validator[] = stakingData.data?.pools?.map((pool, index) => ({
    id: pool.id,
    name: pool.name,
    commission: 0, // TNG стейкинг без комиссий
    apr: pool.apy,
    totalStaked: pool.totalStaked || 0,
    uptime: 100, // TNG пулы всегда активны
    isActive: pool.isActive,
    description: `${pool.name} - ${pool.apy}% годовых`,
    rank: index + 1,
    isRecommended: pool.apy > 10 // Рекомендуем пулы с APY > 10%
  })) || []
  
  //  РЕАЛЬНЫЕ пользовательские данные
  const userStaked = stakingData.data?.totalStaked || 0
  const userBalance = solBalance.balance || 0 // Реальный SOL баланс
  const userTNGBalance = tngBalance.balance || 0 // Реальный TNG баланс  
  const totalRewards = stakingData.data?.totalRewards || 0

  //  АВТОМАТИЧЕСКАЯ ЗАГРУЗКА БАЛАНСОВ при монтировании
  useEffect(() => {
    const loadBalances = async () => {
      await Promise.all([
        solBalance.refreshBalance(),
        tngBalance.refreshBalance()
      ])
    }
    
    if (!solBalance.loading && !tngBalance.loading) {
      loadBalances()
    }
  }, []) // Загружаем один раз при монтировании

  //  Функция получения TNG через faucet
  const handleGetTNG = async () => {
    try {
      
      
      const response = await apiCall('/api/tokens/tng/faucet', {
        method: 'POST',
        body: JSON.stringify({ amount: '1000000000000' }) // 1000 TNG
      })
      
      const result = await response.json()
      
      
      if (result.success) {
        // Обновляем TNG баланс после получения
        
        
        // Очищаем кеш и принудительно обновляем баланс
        tngBalance.clearCache()
        await tngBalance.refreshBalance()
        
        hapticFeedback.notification('success')
        
      } else {
        throw new Error(result.error || 'Faucet request failed')
      }
    } catch (error) {
      
      hapticFeedback.notification('error')
      
      // Показываем пользователю понятную ошибку
      
    }
  }

  useEffect(() => {
    if (!stakingData.isLoading && !solBalance.loading && !tngBalance.loading) {
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [stakingData.isLoading, solBalance.loading, tngBalance.loading])

  //  TMA интеграция - НЕ используем MainButton чтобы избежать конфликтов с navbar
  // Вместо этого показываем кнопку в UI страницы

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

  const handleStake = (validator: Validator, amount: number) => {
    //  Проверка минимальной суммы и баланса
    if (amount < 100) {
      hapticFeedback.notification('error')
      return
    }
    
    //  КРИТИЧНО: Проверяем реальный TNG баланс
    if (userTNGBalance === 0) {
      hapticFeedback.notification('error')
      // Скроллим к faucet секции
      setTimeout(() => {
        const faucetSection = document.getElementById('tng-faucet-section')
        if (faucetSection) {
          faucetSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      return
    }
    
    if (userTNGBalance < amount) {
      hapticFeedback.notification('error')
      return
    }
    
    setStakeModal({ isOpen: true, validator, amount, step: 'confirm' })
    hapticFeedback.impact('medium')
  }

  const processStaking = async () => {
    if (!stakeModal.validator || !stakeModal.amount) return

    setStakeModal(prev => ({ ...prev, step: 'processing' }))
    hapticFeedback.notification('warning')
    
    try {
      

      let result

      if (useSmartContract) {
        //  СМАРТ-КОНТРАКТ СТЕЙКИНГ
        
        result = await contractData.stakeTokens(BigInt(stakeModal.amount * 10**9)) // Convert to lamports
      } else {
        //  MVP СТЕЙКИНГ (текущая реализация)
        
        result = await stakingData.stakeTokens(stakeModal.validator.id, stakeModal.amount)
      }
      
      if (result.success) {
        setStakeModal(prev => ({ ...prev, step: 'success' }))
        hapticFeedback.notification('success')
        
        // Сохраняем signature для показа в Explorer
        if (result.signature) {
          setLastStakeSignature(result.signature)
        }
        
        //  Обновляем реальные балансы после операции
        await Promise.all([
          stakingData.refreshData(), // Обновляем MVP данные
          contractData.refreshData(), // Обновляем контракт данные
          tngBalance.refreshBalance(),      // Обновляем TNG баланс
          solBalance.refreshBalance()       // Обновляем SOL баланс (комиссии)
        ])
        
        // Закрываем модал через 2 секунды
        setTimeout(() => {
          setStakeModal({ isOpen: false, validator: null, amount: 0, step: 'select' })
        }, 2000)
      } else {
        throw new Error(result.error || 'Staking operation failed')
      }
    } catch (error) {
      
      
      // Показываем конкретную ошибку пользователю
      let errorMessage = 'Ошибка стейкинга'
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Недостаточно TNG токенов. Получите TNG через faucet.'
        } else if (error.message.includes('TokenAccountNotFoundError')) {
          errorMessage = 'У вас нет TNG токенов. Получите их через faucet.'
        } else {
          errorMessage = error.message
        }
      }
      
      setStakeModal(prev => ({ ...prev, step: 'error', errorMessage }))
      hapticFeedback.notification('error')
    }
  }

  const calculateDailyRewards = (amount: number, apr: number) => {
    return (amount * apr) / 100 / 365
  }

  const calculateYearlyRewards = (amount: number, apr: number) => {
    return (amount * apr) / 100
  }

  const LoadingFallback = () => <StakingPageSkeleton />

  const renderStakeModal = () => {
    if (!stakeModal.isOpen || !stakeModal.validator) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onClick={() => setStakeModal({ isOpen: false, validator: null, amount: 0, step: 'select' })}
      >
        {/*  Современная модальная структура */}
        <div className="w-full h-full max-w-lg flex flex-col justify-center p-4 pb-safe">
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-h-[calc(100vh-8rem)] flex flex-col"
            onClick={(e?: React.MouseEvent) => e?.stopPropagation()}
          >
            <SimpleCard className="flex-1 overflow-y-auto p-6 border border-solana-purple/20 bg-black/95 backdrop-blur-2xl shadow-2xl shadow-solana-purple/10">
          {/*  Modal Header - Элегантный заголовок */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-4">
              <div></div> {/* Spacer для центрирования */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                stakeModal.step === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                stakeModal.step === 'error' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                stakeModal.step === 'processing' ? 'bg-gradient-to-br from-purple-500 to-blue-500' :
                'bg-gradient-to-br from-solana-purple to-solana-green'
              }`}>
                {stakeModal.step === 'success' && <CheckCircle className="w-6 h-6 text-white" />}
                {stakeModal.step === 'error' && <XCircle className="w-6 h-6 text-white" />}
                {stakeModal.step === 'processing' && <Coins className="w-6 h-6 text-white animate-spin" />}
                {(stakeModal.step === 'select' || stakeModal.step === 'confirm') && <Coins className="w-6 h-6 text-white" />}
              </div>
              <button
                onClick={() => setStakeModal({ isOpen: false, validator: null, amount: 0, step: 'select' })}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {stakeModal.step === 'select' && 'Стейкинг TNG'}
              {stakeModal.step === 'confirm' && 'Подтверждение'}
              {stakeModal.step === 'processing' && 'Обработка...'}
              {stakeModal.step === 'success' && 'Успешно!'}
              {stakeModal.step === 'error' && 'Ошибка'}
            </h2>
            <p className="text-sm text-gray-400">
              {stakeModal.step === 'select' && 'Выберите сумму для стейкинга'}
              {stakeModal.step === 'confirm' && 'Проверьте детали операции'}
              {stakeModal.step === 'processing' && 'Ваши токены стейкаются...'}
              {stakeModal.step === 'success' && 'Стейкинг завершен успешно'}
              {stakeModal.step === 'error' && 'Произошла ошибка при стейкинге'}
            </p>
          </div>

          {/* Select Amount Step */}
          {stakeModal.step === 'select' && (
            <div className="space-y-4">
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-green-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">#{stakeModal.validator.rank}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{stakeModal.validator.name}</h3>
                    <p className="text-xs text-gray-400">{stakeModal.validator.apr}% APR</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Сумма для стейкинга
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={stakeModal.amount || ''}
                        onChange={(e) => setStakeModal(prev => ({ 
                          ...prev, 
                          amount: Number(e.target.value) || 0 
                        }))}
                        placeholder="Введите сумму TNG"
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-solana-purple/50"
                        min="100"
                        max={userTNGBalance}
                      />
                      <button
                        onClick={() => setStakeModal(prev => ({ 
                          ...prev, 
                          amount: userTNGBalance 
                        }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-solana-purple hover:text-purple-300 transition-colors"
                      >
                        МАКС
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Доступно: {userTNGBalance.toFixed(2)} TNG • Минимум: 100 TNG
                    </p>
                  </div>
                  
                  {stakeModal.amount > 0 && (
                    <div className="bg-white/5 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Доход в день:</span>
                        <span className="text-green-400">+{calculateDailyRewards(stakeModal.amount, stakeModal.validator.apr).toFixed(2)} TNG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Доход в год:</span>
                        <span className="text-green-400">+{calculateYearlyRewards(stakeModal.amount, stakeModal.validator.apr).toFixed(0)} TNG</span>
                      </div>
                    </div>
                  )}
                </div>
              </SimpleCard>
              
              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setStakeModal({ isOpen: false, validator: null, amount: 0, step: 'select' })}
                  className="w-full"
                >
                  Отмена
                </SimpleButton>
                <SimpleButton
                  onClick={() => {
                    if (stakeModal.amount >= 100 && stakeModal.amount <= userTNGBalance) {
                      setStakeModal(prev => ({ ...prev, step: 'confirm' }))
                    }
                  }}
                  disabled={!stakeModal.amount || stakeModal.amount < 100 || stakeModal.amount > userTNGBalance}
                  gradient={true}
                  className="w-full"
                >
                  Продолжить
                </SimpleButton>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {stakeModal.step === 'confirm' && (
            <div className="space-y-4">
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{stakeModal.validator.name}</h3>
                    <p className="text-xs text-gray-400">{stakeModal.validator.apr}% APR</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Сумма стейкинга:</span>
                    <span className="text-white font-medium">{stakeModal.amount} TNG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Доход в день:</span>
                    <span className="text-green-400">+{calculateDailyRewards(stakeModal.amount, stakeModal.validator.apr).toFixed(2)} TNG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Доход в год:</span>
                    <span className="text-green-400">+{calculateYearlyRewards(stakeModal.amount, stakeModal.validator.apr).toFixed(0)} TNG</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-gray-400">Комиссии blockchain:</span>
                    <span className="text-purple-400">Спонсируются </span>
                  </div>
                </div>
              </SimpleCard>

              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setStakeModal({ isOpen: false, validator: null, amount: 0, step: 'select' })}
                  className="w-full"
                >
                  Отмена
                </SimpleButton>
                <SimpleButton
                  gradient={true}
                  onClick={processStaking}
                  className="w-full"
                >
                  Застейкать
                </SimpleButton>
              </div>
            </div>
          )}

          {/*  Processing State */}
          {stakeModal.step === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-full bg-white/10 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-solana-purple to-solana-green h-3 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
              <p className="text-sm text-gray-400">
                Подождите, ваши токены стейкаются в блокчейне...
              </p>
            </div>
          )}

          {/*  Success State */}
          {stakeModal.step === 'success' && (
            <div className="text-center space-y-4">
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <p className="text-green-400 font-medium mb-2">
                   {stakeModal.amount} TNG успешно застейкано!
                </p>
                <p className="text-sm text-gray-400">
                  Пул: {stakeModal.validator?.name}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Награды начнут начисляться немедленно
              </p>
            </div>
          )}

          {/*  Error State */}
          {stakeModal.step === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                <p className="text-red-400 font-medium mb-2">
                  {stakeModal.errorMessage || 'Не удалось выполнить стейкинг'}
                </p>
                <p className="text-xs text-gray-400">
                  {stakeModal.errorMessage?.includes('токенов') || stakeModal.errorMessage?.includes('insufficient') 
                    ? ' Получите TNG токены через faucet на главной странице' 
                    : ' Попробуйте позже или обратитесь в поддержку'
                  }
                </p>
              </div>
              <SimpleButton
                onClick={() => setStakeModal({ isOpen: false, validator: null, amount: 0, step: 'select' })}
                className="w-full"
                gradient={true}
              >
                Понятно
              </SimpleButton>
            </div>
          )}
            </SimpleCard>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {isLoading ? (
        <LoadingFallback />
      ) : (
        <>
          <PageLayout showBottomNav={true}>
            <div className="space-y-5 pb-safe">
              
              {/*  Header - Минималистичный и симметричный */}
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
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </motion.button>
                    <div>
                      <h1 className="text-xl font-bold text-white">
                        TNG <span className="text-solana-purple">Стейкинг</span>
                      </h1>
                      <p className="text-xs text-gray-400">Заработай на своих токенах</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Smart Contract Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {useSmartContract ? 'Contract' : 'MVP'}
                      </span>
                      <button
                        onClick={() => setUseSmartContract(!useSmartContract)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          useSmartContract ? 'bg-solana-purple' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            useSmartContract ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status bar - компактная статистика */}
                <motion.div
                  className="grid grid-cols-3 gap-4 py-3 px-6 bg-white/5 rounded-lg border border-white/10 mx-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{validators.length} пулов</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Shield className="w-3 h-3" />
                    <span>Спонсируется</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-solana-purple rounded-full"></div>
                    <span>Devnet</span>
                  </div>
                </motion.div>
              </motion.div>

              {/*  Portfolio Overview - Главная статистика */}
              <motion.div
                className="px-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/10 via-transparent to-solana-green/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
                        <Coins className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Мой портфель</h3>
                        <p className="text-xs text-gray-400">TNG Стейкинг</p>
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

                  {/*  Main Stats - Симметричная сетка */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white mb-1">
                        {isBalanceVisible ? userStaked.toFixed(0) : '••••'}
                      </p>
                      <p className="text-sm text-gray-400 mb-2">TNG Застейкано</p>
                      <div className="w-full h-1 bg-gradient-to-r from-solana-purple to-transparent rounded-full" />
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-solana-green mb-1">
                        +{isBalanceVisible ? totalRewards.toFixed(2) : '••••'}
                      </p>
                      <p className="text-sm text-gray-400 mb-2">TNG Награды</p>
                      <div className="w-full h-1 bg-gradient-to-r from-solana-green to-transparent rounded-full" />
                    </div>
                  </div>

                  {/*  Balance Grid - Чистая симметричная раскладка */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white mb-1">
                        {isBalanceVisible ? (
                          tngBalance.loading ? '...' : userTNGBalance.toFixed(0)
                        ) : '••••'}
                      </p>
                      <p className="text-xs text-gray-400">TNG Баланс</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-solana-purple mb-1">
                        {validators.length > 0 ? 
                          `${(validators.reduce((sum, v) => sum + v.apr, 0) / validators.length).toFixed(1)}%` : 
                          'N/A'
                        }
                      </p>
                      <p className="text-xs text-gray-400">Средний APY</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white mb-1">
                        {isBalanceVisible ? (
                          solBalance.loading ? '...' : userBalance.toFixed(2)
                        ) : '••••'}
                      </p>
                      <p className="text-xs text-gray-400">SOL Баланс</p>
                    </div>
                  </div>
                </SimpleCard>
              </motion.div>

              {/*  Action Center - Единая секция для действий */}
              <motion.div
                className="px-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/5 to-transparent">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-solana-purple to-blue-500 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">Действия</h4>
                      <p className="text-xs text-gray-400">Быстрый старт стейкинга</p>
                    </div>
                  </div>

                  {/* Условный контент */}
                  {userTNGBalance < 100 ? (
                    /*  Нужны токены - показываем faucet */
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3">
                          <Coins className="w-8 h-8 text-yellow-400" />
                        </div>
                        <h5 className="text-white font-semibold mb-2">Нужны TNG токены</h5>
                        <p className="text-sm text-gray-400">Получите бесплатные токены для начала стейкинга</p>
                      </div>
                      
                      <SimpleButton
                        onClick={handleGetTNG}
                        className="w-full"
                        gradient={true}
                        disabled={tngBalance.loading}
                      >
                        {tngBalance.loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Получение токенов...
                          </>
                        ) : (
                          <>
                            <Coins className="w-4 h-4 mr-2" />
                            Получить 1000 TNG
                          </>
                        )}
                      </SimpleButton>
                      
                      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span> Devnet Faucet</span>
                        <span>•</span>
                        <span>Каждые 10 минут</span>
                      </div>
                    </div>
                  ) : (
                    /*  Есть токены - показываем быстрый стейкинг */
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <h5 className="text-white font-semibold mb-2">Быстрый стейкинг</h5>
                        <p className="text-sm text-gray-400">Выберите сумму для мгновенного стейкинга</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {[100, 500, 1000].map((amount) => (
                          <SimpleButton
                            key={amount}
                            size="sm"
                            onClick={() => {
                              const topValidator = validators.find(v => v.isRecommended) || validators[0]
                              if (topValidator && userTNGBalance >= amount) {
                                handleStake(topValidator, amount)
                              }
                            }}
                            className="flex-1 py-3"
                            disabled={validators.length === 0 || userTNGBalance < amount}
                            gradient={userTNGBalance >= amount}
                          >
                            <div className="text-center">
                              <p className="font-bold">{amount}</p>
                              <p className="text-xs opacity-80">TNG</p>
                            </div>
                          </SimpleButton>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span> Мгновенный стейкинг</span>
                        <span>•</span>
                        <span>Лучший APY: {validators.length > 0 ? Math.max(...validators.map(v => v.apr)).toFixed(1) : 'N/A'}%</span>
                      </div>
                    </div>
                  )}
                </SimpleCard>
              </motion.div>

              {/*  Smart Contract Info - Компактная версия */}
              {useSmartContract && contractData.data && (
                <motion.div
                  className="px-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <SimpleCard className="p-4 bg-gradient-to-r from-solana-purple/10 to-blue-500/10 border border-solana-purple/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-solana-purple/30 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-solana-purple" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold text-sm">Smart Contract</h4>
                          <p className="text-xs text-gray-400">Блокчейн стейкинг</p>
                        </div>
                      </div>
                      
                      {contractData.data.pool && (
                        <div className="text-right">
                          <p className="text-green-400 font-bold text-lg">{contractData.data.pool.apy}%</p>
                          <p className="text-xs text-gray-400">APY</p>
                        </div>
                      )}
                    </div>
                    
                    {contractData.hasStakedTokens && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                        <SimpleButton
                          size="sm"
                          onClick={() => contractData.claimRewards()}
                          className="text-xs"
                          gradient={true}
                        >
                           Награды
                        </SimpleButton>
                                                  <SimpleButton
                            size="sm"
                            onClick={() => contractData.unstakeTokens(BigInt(contractData.data?.stngBalance || '0'))}
                            className="text-xs"
                          >
                             Анстейк
                          </SimpleButton>
                      </div>
                    )}
                  </SimpleCard>
                </motion.div>
              )}

              {/*  Active Staking Positions - MVP и Smart Contract */}
              {((userPositions && userPositions.length > 0) || (useSmartContract && contractData.data)) && (
                <motion.div
                  className="px-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/5 to-transparent">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-solana-purple to-blue-500 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">Мои стейкинги</h4>
                        <p className="text-xs text-gray-400">
                          {useSmartContract 
                            ? 'Smart Contract стейкинг' 
                            : `${userPositions?.length || 0} активных позиций`
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Smart Contract Position */}
                      {useSmartContract && contractData.data && (
                        contractData.hasStakedTokens ? (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white/5 rounded-lg p-4 border border-white/10"
                        >
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana-purple to-blue-500 flex items-center justify-center">
                                  <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h5 className="text-white font-semibold text-sm">Smart Contract Pool</h5>
                                  <Badge className="bg-solana-purple/20 text-solana-purple border-solana-purple/30 text-xs mt-1">
                                    {contractData.data?.pool?.apy || 0}% APY
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <p className="text-gray-500 text-xs mb-1">Застейкано</p>
                                <p className="text-white font-bold text-sm">{contractData.formattedStakedAmount || '0'}</p>
                                <p className="text-gray-400 text-xs">TNG</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 text-xs mb-1">sTNG Баланс</p>
                                <p className="text-blue-400 font-bold text-sm">{contractData.formattedStngBalance || '0'}</p>
                                <p className="text-gray-400 text-xs">sTNG</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 text-xs mb-1">Потенц. награды</p>
                                <p className="text-green-400 font-bold text-sm">{contractData.formattedPotentialRewards || '0'}</p>
                                <p className="text-gray-400 text-xs">TNG</p>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="space-y-3 pt-3 border-t border-white/10">
                              {/* Explorer Button */}
                              <SimpleButton
                                size="sm"
                                onClick={() => {
                                  // Для Smart Contract - показываем конкретную транзакцию стейкинга
                                  const stakeSignature = lastStakeSignature
                                  if (stakeSignature) {
                                    const explorerUrl = `https://explorer.solana.com/tx/${stakeSignature}?cluster=devnet`
                                    window.open(explorerUrl, '_blank')
                                  } else {
                                    // Fallback - показываем program
                                    const programId = 'HQEY4xvroTrgEjwUcfGvqtcCdPN3zYTqHw83FiGWpBvH'
                                    const explorerUrl = `https://explorer.solana.com/address/${programId}?cluster=devnet`  
                                    window.open(explorerUrl, '_blank')
                                  }
                                  hapticFeedback.impact('light')
                                }}
                                className="w-full text-xs"
                              >
                                <ExternalLink className="w-3 h-3 mr-2" />
                                Смотреть в Explorer
                              </SimpleButton>
                              
                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-3">
                                <SimpleButton
                                  size="sm"
                                  onClick={() => contractData.claimRewards()}
                                  className="text-xs"
                                  gradient={true}
                                >
                                  <Award className="w-3 h-3 mr-2" />
                                  Получить награды
                                </SimpleButton>
                                <SimpleButton
                                  size="sm"
                                  onClick={() => contractData.unstakeTokens(BigInt(contractData.data?.stngBalance || '0'))}
                                  className="text-xs"
                                >
                                  <Coins className="w-3 h-3 mr-2" />
                                  Анстейк всё
                                </SimpleButton>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        ) : (
                          /* Нет застейканных токенов в Smart Contract */
                          <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-solana-purple/10 flex items-center justify-center mx-auto mb-4">
                              <Coins className="w-8 h-8 text-solana-purple/50" />
                            </div>
                            <h5 className="text-white font-semibold mb-2">Нет активных стейкингов</h5>
                            <p className="text-sm text-gray-400 mb-4">
                              Застейкайте TNG токены в Smart Contract пуле для начала заработка
                            </p>
                            <SimpleButton
                              size="sm"
                              gradient={true}
                              onClick={() => {
                                // Скроллим к пулам
                                const poolsSection = document.querySelector('[data-pools-section]')
                                if (poolsSection) {
                                  poolsSection.scrollIntoView({ behavior: 'smooth' })
                                }
                              }}
                              className="text-xs"
                            >
                              Выбрать пул для стейкинга
                            </SimpleButton>
                          </div>
                        )
                      )}

                      {/* MVP Positions */}
                      {!useSmartContract && userPositions && userPositions.map((position: any, index: number) => (
                        <motion.div
                          key={position?.id || index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/5 rounded-lg p-4 border border-white/10"
                        >
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana-green to-emerald-500 flex items-center justify-center">
                                  <Coins className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h5 className="text-white font-semibold text-sm">{position?.poolName || 'TNG Pool'}</h5>
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-1">
                                    {position?.apy || 0}% APY
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <p className="text-gray-500 text-xs mb-1">Застейкано</p>
                                <p className="text-white font-bold text-sm">{(Number(position?.stakedAmount || 0) / 1e9).toFixed(2)}</p>
                                <p className="text-gray-400 text-xs">TNG</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 text-xs mb-1">Награды</p>
                                <p className="text-green-400 font-bold text-sm">+{(Number(position?.rewards || 0) / 1e9).toFixed(4)}</p>
                                <p className="text-gray-400 text-xs">TNG</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 text-xs mb-1">Дата стейка</p>
                                <p className="text-gray-300 font-medium text-sm">
                                  {(position?.stakeDate || position?.createdAt)
                                    ? new Date(position.stakeDate || position.createdAt).toLocaleDateString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit'
                                      })
                                    : 'N/A'
                                  }
                                </p>
                                <p className="text-gray-400 text-xs">дд.мм</p>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                              {position?.signature && (
                                <SimpleButton
                                  size="sm"
                                  onClick={() => {
                                    const explorerUrl = `https://explorer.solana.com/tx/${position.signature}?cluster=devnet`
                                    window.open(explorerUrl, '_blank')
                                    hapticFeedback.impact('light')
                                  }}
                                  className="text-xs"
                                >
                                  <ExternalLink className="w-3 h-3 mr-2" />
                                  Explorer
                                </SimpleButton>
                              )}
                              <SimpleButton
                                size="sm"
                                gradient={true}
                                onClick={() => {
                                  // TODO: Implement unstaking modal
                                  console.log('Unstaking position:', position?.id || index)
                                  hapticFeedback.impact('medium')
                                }}
                                disabled={!position?.isActive}
                                className="text-xs"
                              >
                                <Award className="w-3 h-3 mr-2" />
                                Unstake
                              </SimpleButton>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </SimpleCard>
                </motion.div>
              )}



              {/*  Staking Pools - Красивая минималистичная секция */}
              <motion.div
                className="px-5"
                data-pools-section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana-green to-emerald-500 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Стейкинг пулы</h3>
                      <p className="text-xs text-gray-400">Выберите лучший APY</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => stakingData.refreshData()}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    disabled={stakingData.isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${stakingData.isLoading ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
                
                <div className="space-y-3">
                  {validators.length === 0 ? (
                    <SimpleCard className="p-8 text-center border border-white/10">
                      <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                        <Coins className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-gray-400 mb-2">
                        {stakingData.isLoading ? 'Загрузка пулов...' : 'Пулы недоступны'}
                      </p>
                      {stakingData.error && (
                        <p className="text-red-400 text-sm">{stakingData.error}</p>
                      )}
                    </SimpleCard>
                  ) : (
                    validators.map((validator, index) => (
                      <motion.div
                        key={validator.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                      >
                        <SimpleCard 
                          className={`p-4 border transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                            selectedValidator?.id === validator.id 
                              ? 'border-solana-purple/50 bg-solana-purple/5 shadow-lg shadow-solana-purple/20' 
                              : 'border-white/10 hover:border-solana-purple/30'
                          }`}
                          onClick={() => {
                            setSelectedValidator(validator)
                            setStakeModal({ isOpen: true, validator, amount: 0, step: 'select' })
                            hapticFeedback.impact('light')
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  validator.isRecommended 
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                                    : 'bg-gradient-to-br from-solana-purple/30 to-blue-500/30'
                                }`}>
                                  {validator.isRecommended ? (
                                    <Star className="w-5 h-5 text-white fill-current" />
                                  ) : (
                                    <span className="text-white font-bold text-sm">#{validator.rank}</span>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-white font-semibold">{validator.name}</h4>
                                    {validator.isRecommended && (
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-0.5">
                                        ТОП
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{validator.description}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <p className="text-gray-500 text-xs">APY</p>
                                  <p className="text-solana-green font-bold text-lg">{validator.apr}%</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 text-xs">Комиссия</p>
                                  <p className="text-white font-medium">{validator.commission}%</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-500 text-xs">TVL</p>
                                  <p className="text-gray-300 font-medium">{(validator.totalStaked / 1000).toFixed(0)}K</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <SimpleButton
                                size="sm"
                                gradient={true}
                                onClick={(e?: React.MouseEvent) => {
                                  e?.stopPropagation()
                                  setStakeModal({ isOpen: true, validator, amount: 100, step: 'select' })
                                }}
                                disabled={userTNGBalance < 100}
                                className="text-xs px-3 py-2"
                              >
                                Стейк
                              </SimpleButton>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </SimpleCard>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>

            </div>
          </PageLayout>

          {/* Stake Modal */}
          <AnimatePresence>
            {renderStakeModal()}
          </AnimatePresence>
        </>
      )}
    </ClientOnly>
  )
}


