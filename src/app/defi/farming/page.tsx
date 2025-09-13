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
import { FarmingPageSkeleton } from '@/components/defi/DeFiSkeletons'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  Zap, 
  TrendingUp,
  Droplets,
  Plus,
  Minus,
  Eye,
  EyeOff,
  RefreshCw,
  Calculator,
  Award,
  Info,
  X,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { useFarmingContract } from '@/hooks/useFarmingContract'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useFarmingPool } from '@/hooks/useFarmingPool'
import { useFarmingRealTimePrice } from '@/hooks/useFarmingRealTimePrice'
import { formatPrice, bpsToPercent, percentToBps, calculateExpectedTokenB, calculateExpectedTokenA } from '@/lib/utils/pool-utils'
import { SolanaLogo, TNGLogo, USDCLogo } from '@/components/wallet/TokenLogos'
import { Shield } from 'lucide-react'

interface InsuranceStatus {
  isInsured: boolean
  coverageAmount: number
  premiumRate: number
  poolId?: string
}

interface LiquidityPool {
  id: string
  name: string
  tokenA: string
  tokenB: string
  iconA: React.ReactNode
  iconB: React.ReactNode
  tvl: number
  apy: number
  volume24h: number
  fees24h: number
  fee: number
  userLiquidity: number
  userShare: number
  rewards: number
  protocol: string
  isStable: boolean
}

interface LiquidityModal {
  isOpen: boolean
  pool: LiquidityPool | null
  action: 'add' | 'remove'
  step: 'input' | 'confirm' | 'processing' | 'success' | 'error'
  amountA: number
  amountB: number
  slippage: number
  signature?: string // Добавляем signature для Explorer
  explorerUrl?: string // URL для просмотра в Explorer
}

// Real farming pools will come from useFarming hook

export default function FarmingPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const { apiCall, user, isAuthenticated } = useCompatibleAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null)
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus | null>(null)

  //  Реальные балансы токенов для LP операций
  const solBalance = useTokenBalance('SOL', { cacheTime: 30000, autoRefresh: true })
  const tngBalance = useTokenBalance('TNG', { cacheTime: 30000, autoRefresh: true })
  const usdcBalance = useTokenBalance('USDC', { cacheTime: 30000, autoRefresh: true })

  // Функция обновления всех балансов
  const refreshBalances = async () => {
    await Promise.all([
      solBalance.refresh(),
      tngBalance.refresh(),
      usdcBalance.refresh()
    ])
  }

  //  TNG Faucet интеграция для farming
  const handleGetTNG = async () => {
    try {
      hapticFeedback.impact('medium')
      const response = await apiCall('/api/tokens/tng/faucet', {
        method: 'POST',
        body: JSON.stringify({ amount: '1000000000000' }) // 1000 TNG
      })
      const result = await response.json()
      if (result.success) {
        hapticFeedback.notification('success')
        await tngBalance.refresh()
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      hapticFeedback.notification('error')
    }
  }
  const [liquidityModal, setLiquidityModal] = useState<LiquidityModal>({
    isOpen: false,
    pool: null,
    action: 'add',
    step: 'input',
    amountA: 0,
    amountB: 0,
    slippage: 0.5,
    signature: undefined,
    explorerUrl: undefined
  })
  
  // Track which field was changed last (like in swap)
  const [lastChangedField, setLastChangedField] = useState<'A' | 'B' | null>(null)
  const [amountsWereAdjusted, setAmountsWereAdjusted] = useState(false)
  const [balanceAdjusted, setBalanceAdjusted] = useState(false)

  // Функция для расчета оптимального соотношения токенов на основе резервов пула
  const calculateOptimalAmounts = (
    inputAmount: number, 
    isTokenA: boolean, 
    poolReserveA: number, 
    poolReserveB: number
  ) => {
    if (poolReserveA === 0 || poolReserveB === 0) {
      // Для нового пула - пользователь сам задает соотношение
      return { 
        amountA: isTokenA ? inputAmount : liquidityModal.amountA, 
        amountB: isTokenA ? liquidityModal.amountB : inputAmount,
        wasAdjusted: false
      }
    }
    
    const ratio = poolReserveB / poolReserveA
    const originalA = liquidityModal.amountA
    const originalB = liquidityModal.amountB
    
    let newAmountA, newAmountB
    
    if (isTokenA) {
      // Пользователь ввел amount A, рассчитываем B
      newAmountA = inputAmount
      newAmountB = inputAmount * ratio
    } else {
      // Пользователь ввел amount B, рассчитываем A  
      newAmountA = inputAmount / ratio
      newAmountB = inputAmount
    }
    
    // Проверяем нужна ли корректировка (разница больше 1%)
    const diffA = Math.abs(newAmountA - originalA) / Math.max(originalA, 0.01)
    const diffB = Math.abs(newAmountB - originalB) / Math.max(originalB, 0.01)
    const wasAdjusted = diffA > 0.01 || diffB > 0.01
    
    return {
      amountA: Number(newAmountA.toFixed(6)),
      amountB: Number(newAmountB.toFixed(6)),
      wasAdjusted
    }
  }

  // Real farming data from contract
  const farmingData = useFarmingContract('TNG_SOL')
  
  // Get current user's wallet address for farming pool data
  const getCurrentUserAddress = (): string | undefined => {
    // Get from authenticated user context (custodial wallet)
    return isAuthenticated ? (user?.walletAddress || undefined) : undefined
  }
  
  // TNG/SOL farming pool
  const solFarmingPool = useFarmingPool(
    'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs', // TNG mint
    'So11111111111111111111111111111111111111112', // SOL mint
    getCurrentUserAddress()
  )
  
  // TNG/USDC farming pool
  const usdcFarmingPool = useFarmingPool(
    'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs', // TNG mint
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    getCurrentUserAddress()
  )

  //  Real-time prices for accurate calculations (like in swap)
  const { prices, exchangeRates, calculateTokenAmount, loading: pricesLoading } = useFarmingRealTimePrice()

  //  РЕАЛЬНЫЕ LP пулы на devnet с TNG интеграцией
  const pools: LiquidityPool[] = [
    {
      id: 'sol-tng-lp',
      name: 'TNG-SOL LP',
      tokenA: 'TNG',
      tokenB: 'SOL',
      iconA: <TNGLogo className="w-5 h-5" />,
      iconB: <SolanaLogo className="w-5 h-5" />,
      tvl: solFarmingPool.poolData?.tvl || (
        solFarmingPool.poolData?.tngReserve && solFarmingPool.poolData?.otherReserve && prices?.TNG_USD
          ? ((parseFloat(solFarmingPool.poolData.tngReserve) / 1e9) * prices.TNG_USD + 
             (parseFloat(solFarmingPool.poolData.otherReserve) / 1e9) * (prices?.SOL_USD || 100)) * 2
          : 0
      ),
      apy: solFarmingPool.poolData?.rewardRate 
        ? Math.min(((parseFloat(solFarmingPool.poolData.rewardRate) / 1e9) * 365 * 100), 200) // Ограничиваем максимум 200%
        : 45.7,
      volume24h: solFarmingPool.poolData?.tvl ? solFarmingPool.poolData.tvl * 0.08 : 15000, // 8% от TVL как объем
      fees24h: solFarmingPool.poolData?.tvl ? solFarmingPool.poolData.tvl * 0.0002 : 37.5, // 0.02% от TVL как комиссии
      fee: 0.25,
      userLiquidity: solFarmingPool.userFarmData?.lpStakedFormatted 
        ? solFarmingPool.userFarmData.lpStakedFormatted * ((solFarmingPool.poolData?.tvl || 1000) / Math.max(parseFloat(solFarmingPool.poolData?.lpSupply || '1') / 1e9, 1))
        : 0,
      userShare: solFarmingPool.poolData && solFarmingPool.userFarmData?.lpStaked
        ? (parseFloat(solFarmingPool.userFarmData.lpStaked) / Math.max(parseFloat(solFarmingPool.poolData.lpSupply), 1)) * 100
        : 0,
      rewards: solFarmingPool.userFarmData?.pendingRewardsFormatted || 0,
      protocol: 'TNG SuperApp',
      isStable: false
    },
    {
      id: 'tng-usdc-lp',
      name: 'TNG-USDC LP', 
      tokenA: 'TNG',
      tokenB: 'USDC',
      iconA: <TNGLogo className="w-5 h-5" />,
      iconB: <USDCLogo className="w-5 h-5" />,
      tvl: usdcFarmingPool.poolData?.tvl || (
        usdcFarmingPool.poolData?.tngReserve && usdcFarmingPool.poolData?.otherReserve && prices?.TNG_USD
          ? ((parseFloat(usdcFarmingPool.poolData.tngReserve) / 1e9) * prices.TNG_USD + 
             (parseFloat(usdcFarmingPool.poolData.otherReserve) / 1e6) * 1) * 2 // USDC = $1
          : 0
      ),
      apy: usdcFarmingPool.poolData?.rewardRate 
        ? Math.min(((parseFloat(usdcFarmingPool.poolData.rewardRate) / 1e9) * 365 * 100), 150) // Ограничиваем максимум 150%
        : 28.3,
      volume24h: usdcFarmingPool.poolData?.tvl ? usdcFarmingPool.poolData.tvl * 0.05 : 8500, // 5% от TVL как объем
      fees24h: usdcFarmingPool.poolData?.tvl ? usdcFarmingPool.poolData.tvl * 0.0001 : 21.25, // 0.01% от TVL как комиссии
      fee: 0.25,
      userLiquidity: usdcFarmingPool.userFarmData?.lpStakedFormatted 
        ? usdcFarmingPool.userFarmData.lpStakedFormatted * ((usdcFarmingPool.poolData?.tvl || 1000) / Math.max(parseFloat(usdcFarmingPool.poolData?.lpSupply || '1') / 1e9, 1))
        : 0,
      userShare: usdcFarmingPool.poolData && usdcFarmingPool.userFarmData?.lpStaked
        ? (parseFloat(usdcFarmingPool.userFarmData.lpStaked) / Math.max(parseFloat(usdcFarmingPool.poolData.lpSupply), 1)) * 100
        : 0,
      rewards: usdcFarmingPool.userFarmData?.pendingRewardsFormatted || 0,
      protocol: 'TNG SuperApp',
      isStable: true
    }
  ]

  //  Реальные пользовательские статистики фарминга из реальных хуков
  const solUserLiquidity = solFarmingPool.userFarmData?.lpStakedFormatted 
    ? solFarmingPool.userFarmData.lpStakedFormatted * ((solFarmingPool.poolData?.tvl || 1000) / Math.max(parseFloat(solFarmingPool.poolData?.lpSupply || '1') / 1e9, 1))
    : 0
  
  const usdcUserLiquidity = usdcFarmingPool.userFarmData?.lpStakedFormatted 
    ? usdcFarmingPool.userFarmData.lpStakedFormatted * ((usdcFarmingPool.poolData?.tvl || 1000) / Math.max(parseFloat(usdcFarmingPool.poolData?.lpSupply || '1') / 1e9, 1))
    : 0

  const solUserRewards = solFarmingPool.userFarmData?.pendingRewardsFormatted || 0
  const usdcUserRewards = usdcFarmingPool.userFarmData?.pendingRewardsFormatted || 0

  const totalLiquidity = solUserLiquidity + usdcUserLiquidity
  const totalRewards = solUserRewards + usdcUserRewards
  const activePools = (solUserLiquidity > 0 ? 1 : 0) + (usdcUserLiquidity > 0 ? 1 : 0)

  // Вычисляем средний APY на основе реальных данных
  const averageApy = activePools > 0 
    ? ((solUserLiquidity > 0 ? (solFarmingPool.poolData?.rewardRate ? ((parseFloat(solFarmingPool.poolData.rewardRate) * 365 * 24 * 3600) / parseFloat(solFarmingPool.poolData.lpSupply || '1')) * 100 : 45.7) : 0) +
       (usdcUserLiquidity > 0 ? (usdcFarmingPool.poolData?.rewardRate ? ((parseFloat(usdcFarmingPool.poolData.rewardRate) * 365 * 24 * 3600) / parseFloat(usdcFarmingPool.poolData.lpSupply || '1')) * 100 : 28.3) : 0)) / activePools
    : 0

  useEffect(() => {
    if (!farmingData.loading && !solFarmingPool.loading && !usdcFarmingPool.loading && !pricesLoading) {
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [farmingData.loading, solFarmingPool.loading, usdcFarmingPool.loading, pricesLoading])

  useEffect(() => {
    loadInsuranceStatus()
  }, [])

  const loadInsuranceStatus = async () => {
    try {
      const response = await apiCall('/api/defi/insurance?action=protocol-status&protocol=TNG Farming', {
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

  //  Auto-calculate opposite amount using REAL-TIME PRICES (like in swap)
  useEffect(() => {
    if (!liquidityModal.isOpen || !liquidityModal.pool || !lastChangedField || !prices || !exchangeRates) {
      return
    }

    

    // Use real-time price calculation with 100ms delay to avoid too frequent updates
    const timer = setTimeout(() => {
      if (lastChangedField === 'A' && liquidityModal.amountA > 0 && liquidityModal.pool) {
        // User typed in tokenA field (TNG), calculate tokenB (SOL or USDC)
        const fromMint = 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' // TNG (always tokenA now)
        
        const toMint = liquidityModal.pool.id === 'sol-tng-lp' ?
          'So11111111111111111111111111111111111111112' : // SOL
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'   // USDC

        const calculatedAmount = calculateTokenAmount(liquidityModal.amountA, fromMint, toMint)
        
        
        
        setLiquidityModal(prev => ({ ...prev, amountB: calculatedAmount }))
        
      } else if (lastChangedField === 'B' && liquidityModal.amountB > 0 && liquidityModal.pool) {
        // User typed in tokenB field (SOL or USDC), calculate tokenA (TNG)
        const fromMint = liquidityModal.pool.id === 'sol-tng-lp' ?
          'So11111111111111111111111111111111111111112' : // SOL
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'   // USDC
        
        const toMint = 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' // TNG (always tokenA now)

        const calculatedAmount = calculateTokenAmount(liquidityModal.amountB, fromMint, toMint)
        
        
        
        setLiquidityModal(prev => ({ ...prev, amountA: calculatedAmount }))
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [liquidityModal.amountA, liquidityModal.amountB, liquidityModal.isOpen, liquidityModal.pool?.id, lastChangedField, prices, exchangeRates, calculateTokenAmount])

  // TMA интеграция - скрываем главную кнопку для farming (согласно требованиям)
  useEffect(() => {
    if (webApp) {
      // Всегда скрываем MainButton на farming странице
      webApp.MainButton.hide()
    }
  }, [webApp])

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

  // Функция для форматирования APY
  const formatAPY = (apy: number): string => {
    if (!apy || apy <= 0 || !isFinite(apy)) return '0.00'
    
    // Если APY больше 1000%, показываем как ">1000%"
    if (apy > 1000) return '>1000'
    
    // Если APY больше 100%, показываем без десятичных
    if (apy > 100) return Math.round(apy).toString()
    
    // Если APY больше 10%, показываем 1 десятичный знак
    if (apy > 10) return apy.toFixed(1)
    
    // Иначе показываем 2 десятичных знака
    return apy.toFixed(2)
  }

  const handleAddLiquidity = (pool: LiquidityPool) => {
    setLiquidityModal({
      isOpen: true,
      pool,
      action: 'add',
      step: 'input',
      amountA: 0,
      amountB: 0,
      slippage: 0.5,
      signature: undefined,
      explorerUrl: undefined
    })
    setLastChangedField(null) // Reset field tracking
    setAmountsWereAdjusted(false) // Reset adjustment flag
    setBalanceAdjusted(false) // Reset balance adjustment flag
    hapticFeedback.impact('medium')
  }

  const handleRemoveLiquidity = (pool: LiquidityPool) => {
    if (pool.userLiquidity === 0) return
    
    setLiquidityModal({
      isOpen: true,
      pool,
      action: 'remove',
      step: 'input',
      amountA: 0,
      amountB: 0,
      slippage: 0.5,
      signature: undefined,
      explorerUrl: undefined
    })
    setLastChangedField(null) // Reset field tracking
    hapticFeedback.impact('medium')
  }

  const processLiquidity = async () => {
    if (!liquidityModal.pool) return

    setLiquidityModal(prev => ({ ...prev, step: 'processing' }))
    hapticFeedback.notification('warning')
    
    try {
      
      
      // Get the appropriate farming pool
      const farmingPool = liquidityModal.pool.id === 'sol-tng-lp' ? solFarmingPool : usdcFarmingPool
      
      if (liquidityModal.action === 'add') {
        // Получаем текущие резервы пула для автокоррекции amounts
        const poolData = farmingPool?.poolData
        const reserveA = poolData?.tngReserve ? Number(poolData.tngReserve) / 1e9 : 1000 // TNG reserve
        const reserveB = poolData?.otherReserve ? Number(poolData.otherReserve) / 1e9 : 1000 // SOL/USDC reserve
        
        console.log('🔍 Pool reserves for auto-correction:', {
          poolId: liquidityModal.pool.id,
          reserveA,
          reserveB,
          originalAmountA: liquidityModal.amountA,
          originalAmountB: liquidityModal.amountB
        })
        
        // Автоматически корректируем amounts под текущие резервы
        const correctedAmounts = calculateOptimalAmounts(
          liquidityModal.amountA,
          true, // предполагаем что amountA - это primary input
          reserveA,
          reserveB
        )
        
        console.log('✅ Corrected amounts:', correctedAmounts)
        
        // Обновляем модальное окно с корректными amounts если они изменились
        if (correctedAmounts.wasAdjusted) {
          setAmountsWereAdjusted(true)
          setLiquidityModal(prev => ({
            ...prev,
            amountA: correctedAmounts.amountA,
            amountB: correctedAmounts.amountB
          }))
        }
        
        // Используем скорректированные amounts для API запроса
        const finalAmountA = correctedAmounts.amountA
        const finalAmountB = correctedAmounts.amountB
        //  Add liquidity using authenticated API
        const response = await apiCall('/api/defi/farming', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'add',
            poolId: liquidityModal.pool.id,
            tokenAAmount: finalAmountA,
            tokenBAmount: finalAmountB,
            slippage: 5.0 // Увеличиваем slippage до 5% для большей толерантности
          })
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to add liquidity')
        }
        
        // Сохраняем signature транзакции для Explorer
        const signature = result.data?.signature || result.signature
        const explorerUrl = signature ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : undefined
        
        setLiquidityModal(prev => ({
          ...prev,
          signature,
          explorerUrl
        }))
        
        // Записываем транзакцию в историю
        if (signature && user?.id) {
          try {
            await apiCall('/api/defi/farming/record-transaction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                signature,
                operation: 'add_liquidity',
                poolId: liquidityModal.pool.id,
                tokenAAmount: liquidityModal.amountA,
                tokenBAmount: liquidityModal.amountB,
                slippage: liquidityModal.slippage
              })
            })
          } catch (historyError) {
            console.warn('Failed to record transaction in history:', historyError)
            // Не прерываем процесс если запись в историю не удалась
          }
          
          // Проверяем если были корректировки баланса
          if (result.message && result.message.includes('auto-corrected')) {
            setBalanceAdjusted(true)
          }
        }
        
        
      } else {
        //  Remove liquidity using authenticated API  
        const response = await apiCall('/api/defi/farming', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'remove',
            poolId: liquidityModal.pool.id,
            lpTokenAmount: liquidityModal.amountA // LP tokens amount
          })
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to remove liquidity')
        }
        
        // Сохраняем signature транзакции для Explorer
        const signature = result.data?.signature || result.signature
        const explorerUrl = signature ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : undefined
        
        setLiquidityModal(prev => ({
          ...prev,
          signature,
          explorerUrl
        }))
        
        // Записываем транзакцию в историю
        if (signature && user?.id) {
          try {
            await apiCall('/api/defi/farming/record-transaction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                signature,
                operation: 'remove_liquidity',
                poolId: liquidityModal.pool.id,
                lpTokenAmount: liquidityModal.amountA
              })
            })
          } catch (historyError) {
            console.warn('Failed to record transaction in history:', historyError)
            // Не прерываем процесс если запись в историю не удалась
          }
        }
        
      }
      
      //  Обновляем все данные после операции
      await Promise.all([
        refreshBalances(),
        farmingPool.refreshData(), // Обновляем farming данные
        solFarmingPool.refreshData(), // Принудительно обновляем SOL farming данные
        usdcFarmingPool.refreshData() // Принудительно обновляем USDC farming данные
      ])
      
      setLiquidityModal(prev => ({ ...prev, step: 'success' }))
      hapticFeedback.notification('success')
      
      
      
      // Автозакрытие через 8 секунд (больше времени для просмотра информации)
      setTimeout(() => {
        setLiquidityModal(prev => ({ 
          ...prev, 
          isOpen: false,
          signature: undefined,
          explorerUrl: undefined 
        }))
      }, 8000)
      
    } catch (error) {
      
      setLiquidityModal(prev => ({ ...prev, step: 'error' }))
      hapticFeedback.notification('error')
    }
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(2)
  }

  const LoadingFallback = () => <FarmingPageSkeleton />

  const renderLiquidityModal = () => {
    if (!liquidityModal.isOpen || !liquidityModal.pool) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setLiquidityModal(prev => ({ ...prev, isOpen: false }))}
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
              {liquidityModal.action === 'add' ? 'Добавить ликвидность' : 'Удалить ликвидность'}
            </h2>
            <button
              onClick={() => setLiquidityModal(prev => ({ ...prev, isOpen: false }))}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Input Step */}
          {liquidityModal.step === 'input' && (
            <div className="space-y-4">
              
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {liquidityModal.pool.iconA}
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center -ml-2">
                      {liquidityModal.pool.iconB}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{liquidityModal.pool.name}</h3>
                    <p className="text-xs text-gray-400">{liquidityModal.pool.protocol} • {liquidityModal.pool.apy}% APY</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-gray-400">{liquidityModal.pool.tokenA}</label>
                      <span className="text-xs text-gray-500">
                        Баланс: {liquidityModal.pool.tokenA === 'TNG' ? (tngBalance.balance || 0).toFixed(2) : (solBalance.balance || 0).toFixed(6)} {liquidityModal.pool.tokenA}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={liquidityModal.amountA || ''}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 0
                        console.log(' TNG input changed:', value)
                        setLiquidityModal(prev => ({ ...prev, amountA: value }))
                        setLastChangedField('A') // Mark that A field was changed
                        console.log(' Set lastChangedField to A')
                      }}
                      placeholder="0.0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                    />
                    
                    {/* Percentage selection buttons for TNG */}
                    {liquidityModal.pool.tokenA === 'TNG' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Выбрать:</span>
                        <button
                          onClick={() => {
                            const amount = (tngBalance.balance || 0) * 0.25
                            setLiquidityModal(prev => ({ ...prev, amountA: amount }))
                            setLastChangedField('A')
                          }}
                          className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                          25%
                        </button>
                        <button
                          onClick={() => {
                            const amount = (tngBalance.balance || 0) * 0.5
                            setLiquidityModal(prev => ({ ...prev, amountA: amount }))
                            setLastChangedField('A')
                          }}
                          className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => {
                            const amount = (tngBalance.balance || 0) * 0.75
                            setLiquidityModal(prev => ({ ...prev, amountA: amount }))
                            setLastChangedField('A')
                          }}
                          className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                          75%
                        </button>
                        <button
                          onClick={() => {
                            const amount = (tngBalance.balance || 0)
                            setLiquidityModal(prev => ({ ...prev, amountA: amount }))
                            setLastChangedField('A')
                          }}
                          className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-gray-400">{liquidityModal.pool.tokenB}</label>
                      <span className="text-xs text-gray-500">
                        Баланс: {liquidityModal.pool.tokenB === 'SOL' ? (solBalance.balance || 0).toFixed(6) : 
                                 liquidityModal.pool.tokenB === 'USDC' ? (usdcBalance.balance || 0).toFixed(6) : 
                                 (tngBalance.balance || 0).toFixed(2)} {liquidityModal.pool.tokenB}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={liquidityModal.amountB || ''}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 0
                        console.log(' Token B input changed:', value)
                        setLiquidityModal(prev => ({ ...prev, amountB: value }))
                        setLastChangedField('B') // Mark that B field was changed
                        console.log(' Set lastChangedField to B')
                      }}
                      placeholder="0.0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </SimpleCard>

              {/* Slippage Configuration with Price Impact */}
              <SimpleCard className="p-3 border border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Проскальзывание</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{liquidityModal.slippage}%</span>
                      {(() => {
                        const farmingPool = liquidityModal.pool?.id === 'sol-tng-lp' ? solFarmingPool : usdcFarmingPool
                        const optimalSlippage = farmingPool.getOptimalSlippageForAmount(liquidityModal.amountA, liquidityModal.amountB)
                        if (optimalSlippage !== liquidityModal.slippage) {
                          return (
                            <button
                              onClick={() => setLiquidityModal(prev => ({ ...prev, slippage: optimalSlippage }))}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Авто: {optimalSlippage}%
                            </button>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>
                  
                  {/* Price Impact Warning */}
                  {(() => {
                    const farmingPool = liquidityModal.pool?.id === 'sol-tng-lp' ? solFarmingPool : usdcFarmingPool
                    const priceImpact = farmingPool.getPriceImpact(liquidityModal.amountA, liquidityModal.amountB)
                    if (priceImpact > 1) {
                      return (
                        <div className={`text-xs p-2 rounded ${priceImpact > 5 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Влияние на цену: {formatPrice(priceImpact)}%</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLiquidityModal(prev => ({ ...prev, slippage: 0.1 }))}
                      className={`px-2 py-1 text-xs rounded ${liquidityModal.slippage === 0.1 ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                      0.1%
                    </button>
                    <button
                      onClick={() => setLiquidityModal(prev => ({ ...prev, slippage: 0.5 }))}
                      className={`px-2 py-1 text-xs rounded ${liquidityModal.slippage === 0.5 ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                      0.5%
                    </button>
                    <button
                      onClick={() => setLiquidityModal(prev => ({ ...prev, slippage: 1.0 }))}
                      className={`px-2 py-1 text-xs rounded ${liquidityModal.slippage === 1.0 ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                      1.0%
                    </button>
                    <input
                      type="number"
                      value={liquidityModal.slippage}
                      onChange={(e) => {
                        const value = Math.max(0.1, Math.min(20, Number(e.target.value)))
                        setLiquidityModal(prev => ({ ...prev, slippage: value }))
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
                      placeholder="Custom"
                      step="0.1"
                      min="0.1"
                      max="20"
                    />
                  </div>
                </div>
              </SimpleCard>

              {liquidityModal.action === 'remove' && liquidityModal.pool.userLiquidity > 0 && (
                <SimpleCard className="p-3 border border-white/10">
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ваша ликвидность:</span>
                      <span className="text-white">${liquidityModal.pool.userLiquidity.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Доля пула:</span>
                      <span className="text-white">{(liquidityModal.pool.userShare * 100).toFixed(4)}%</span>
                    </div>
                  </div>
                </SimpleCard>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setLiquidityModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full"
                >
                  Отмена
                </SimpleButton>
                <SimpleButton
                  gradient={true}
                  onClick={() => setLiquidityModal(prev => ({ ...prev, step: 'confirm' }))}
                  disabled={liquidityModal.amountA <= 0}
                  className="w-full"
                >
                  Продолжить
                </SimpleButton>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {liquidityModal.step === 'confirm' && (
            <div className="space-y-4">
              <SimpleCard className="p-4 border border-white/10">
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="text-white font-semibold mb-2">
                      {liquidityModal.action === 'add' ? 'Добавляете' : 'Удаляете'}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-white">{liquidityModal.amountA} {liquidityModal.pool.tokenA}</p>
                      <p className="text-white">{liquidityModal.amountB} {liquidityModal.pool.tokenB}</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/10 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Курс:</span>
                      <span className="text-white">
                        {(() => {
                          if (exchangeRates && liquidityModal.pool) {
                            if (liquidityModal.pool.id === 'sol-tng-lp') {
                              return `1 TNG = ${exchangeRates.tngToSol.toFixed(6)} SOL`
                            } else {
                              return `1 TNG = ${exchangeRates.tngToUsdc.toFixed(6)} USDC`
                            }
                          }
                          return liquidityModal.pool ? `1 ${liquidityModal.pool.tokenA} = ? ${liquidityModal.pool.tokenB}` : '1 ? = ? ?'
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">LP токены:</span>
                      <span className="text-white">
                        {(() => {
                          const farmingPool = liquidityModal.pool?.id === 'sol-tng-lp' ? solFarmingPool : usdcFarmingPool
                          const calculation = farmingPool.calculateLiquidity(liquidityModal.amountA, liquidityModal.amountB, liquidityModal.slippage)
                          return calculation ? `~${formatPrice(calculation.lpTokensToReceive)} LP` : '0 LP'
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Доля пула:</span>
                      <span className="text-white">
                        {(() => {
                          const farmingPool = liquidityModal.pool?.id === 'sol-tng-lp' ? solFarmingPool : usdcFarmingPool
                          const calculation = farmingPool.calculateLiquidity(liquidityModal.amountA, liquidityModal.amountB, liquidityModal.slippage)
                          return calculation ? `${formatPrice(calculation.shareOfPool)}%` : '0%'
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Комиссия пула:</span>
                      <span className="text-white">{liquidityModal.pool?.fee}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Проскальзывание:</span>
                      <span className="text-white">{liquidityModal.slippage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Комиссии blockchain:</span>
                      <span className="text-green-400">Спонсируются </span>
                    </div>
                  </div>
                </div>
              </SimpleCard>

              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setLiquidityModal(prev => ({ ...prev, step: 'input' }))}
                  className="w-full"
                >
                  Назад
                </SimpleButton>
                <SimpleButton
                  gradient={true}
                  onClick={processLiquidity}
                  className="w-full"
                >
                  Подтвердить
                </SimpleButton>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {liquidityModal.step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto">
                <Droplets className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">
                  {liquidityModal.action === 'add' ? 'Добавление ликвидности' : 'Удаление ликвидности'}
                </h3>
                <p className="text-sm text-gray-400">Обработка транзакции...</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                />
              </div>
            </div>
          )}

          {/* Success Step */}
          {liquidityModal.step === 'success' && (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="text-white font-semibold mb-2">Ликвидность {liquidityModal.action === 'add' ? 'добавлена' : 'удалена'}!</h3>
                <p className="text-sm text-gray-400">
                  Операция в пуле {liquidityModal.pool?.name} выполнена успешно
                </p>
              </div>
              
              {/* Auto-correction warnings */}
              {amountsWereAdjusted && (
                <div className="bg-yellow-500/10 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-400">
                    ⚠️ Amounts были автоматически скорректированы под текущие резервы пула для успешной транзакции
                  </p>
                </div>
              )}
              
              {balanceAdjusted && (
                <div className="bg-blue-500/10 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-400">
                    💰 Amounts были скорректированы под ваш доступный баланс для успешной транзакции
                  </p>
                </div>
              )}

              {/* Transaction Info */}
              <div className="bg-green-500/10 rounded-lg p-3 space-y-3">
                <p className="text-sm text-green-400">
                  {liquidityModal.action === 'add' 
                    ? '🎉 Награды начнут начисляться через несколько минут'
                    : '💰 Токены поступят на ваш баланс'}
                </p>
                
                {/* Transaction Signature */}
                {liquidityModal.signature && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Подпись транзакции:</p>
                    <p className="text-xs font-mono text-gray-300 bg-gray-800/50 rounded p-2 break-all">
                      {liquidityModal.signature.slice(0, 20)}...{liquidityModal.signature.slice(-20)}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Explorer Button */}
                {liquidityModal.explorerUrl && (
                  <SimpleButton
                    onClick={() => {
                      window.open(liquidityModal.explorerUrl, '_blank')
                      hapticFeedback.impact('light')
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Посмотреть в Solana Explorer
                  </SimpleButton>
                )}
                
                {/* Close Button */}
                <SimpleButton
                  onClick={() => {
                    setLiquidityModal(prev => ({ 
                      ...prev, 
                      isOpen: false,
                      signature: undefined,
                      explorerUrl: undefined 
                    }))
                    hapticFeedback.impact('light')
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600"
                >
                  Закрыть
                </SimpleButton>
              </div>
            </div>
          )}
        </motion.div>
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
                          TNG <span className="text-solana-green">Фарминг</span>
                        </h1>
                        {insuranceStatus?.isInsured && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <Shield className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">Застрахован</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        SOL-TNG LP пулы на devnet
                        {insuranceStatus?.isInsured && (
                          <span className="text-green-400 ml-2">• Покрытие до ${insuranceStatus.coverageAmount.toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className="bg-solana-green/20 text-solana-green border-solana-green/30 text-xs">
                      {activePools} активных
                    </Badge>
                  </div>
                </div>

                <motion.div
                  className="flex items-center gap-4 text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>Ликвидность</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Высокий APY</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    <span>Награды</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* TNG Faucet (если нужно) */}
              {(tngBalance.balance || 0) < 50 && (
                <motion.div
                  className="px-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.4 }}
                >
                  <SimpleCard className="p-4 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-lg"></span>
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Нужны TNG токены?</h3>
                          <p className="text-xs text-gray-400">Получите 1000 TNG для LP операций</p>
                        </div>
                      </div>
                      <SimpleButton
                        onClick={handleGetTNG}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm"
                        disabled={tngBalance.loading}
                      >
                        {tngBalance.loading ? 'Загрузка...' : 'Получить TNG'}
                      </SimpleButton>
                    </div>
                  </SimpleCard>
                </motion.div>
              )}

              {/* Quick Add to SOL-TNG LP */}
              {(tngBalance.balance || 0) >= 50 && (solBalance.balance || 0) >= 0.1 && (
                <motion.div
                  className="px-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07, duration: 0.4 }}
                >
                  <SimpleCard className="p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <div className="flex items-center">
                            <SolanaLogo className="w-3 h-3" />
                            <Plus className="w-3 h-3 mx-1 text-emerald-400" />
                            <TNGLogo className="w-3 h-3" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-white font-medium">SOL-TNG Liquidity Pool</h3>
                          <p className="text-xs text-gray-400">45.7% APY • Лучший доход</p>
                        </div>
                      </div>
                      <SimpleButton
                        onClick={() => {
                          const solTngPool = pools.find(p => p.id === 'sol-tng-lp')
                          if (solTngPool) {
                            handleAddLiquidity(solTngPool)
                          }
                        }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
                        gradient={true}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Добавить в SOL-TNG LP
                      </SimpleButton>
                    </div>
                  </SimpleCard>
                </motion.div>
              )}

              {/* Farming Overview */}
              <motion.div
                className="px-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-green/10 to-emerald-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-6 h-6 text-solana-green" />
                      <h3 className="text-white font-semibold">Моя ликвидность</h3>
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        ${isBalanceVisible ? totalLiquidity.toFixed(2) : '••••'}
                      </p>
                      <p className="text-sm text-gray-400">Общая ликвидность</p>
                      {/* Debug info */}
                      {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs text-gray-500 mt-1">
                          SOL: {solUserLiquidity.toFixed(2)} | USDC: {usdcUserLiquidity.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-solana-green">
                        +{isBalanceVisible ? totalRewards.toFixed(4) : '••••'} LP
                      </p>
                      <p className="text-sm text-gray-400">Награды</p>
                      {/* Debug info */}
                      {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs text-gray-500 mt-1">
                          SOL: {solUserRewards.toFixed(4)} | USDC: {usdcUserRewards.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Активные пулы</p>
                      <p className="text-sm font-medium text-white">{activePools}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Средний APY</p>
                      <p className="text-sm font-medium text-white">{averageApy.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">TNG баланс</p>
                      <p className="text-sm font-medium text-white">{(tngBalance.balance || 0).toFixed(0)} TNG</p>
                    </div>
                  </div>

                  {/* Балансы токенов для LP */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">SOL</p>
                      <p className="text-sm font-medium text-white">{(solBalance.balance || 0).toFixed(3)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">TNG</p>
                      <p className="text-sm font-medium text-white">{(tngBalance.balance || 0).toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">USDC</p>
                      <p className="text-sm font-medium text-white">{(usdcBalance.balance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </SimpleCard>
              </motion.div>

              {/* Pools List */}
              <div className="px-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Все пулы</h3>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </motion.button>
                </div>
                
                <div className="space-y-3">
                  {pools.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-2">Загрузка пулов ликвидности...</p>
                      {farmingData.error && (
                        <p className="text-red-400 text-sm">{farmingData.error}</p>
                      )}
                    </div>
                  ) : (
                    pools.map((pool, index) => (
                    <motion.div
                      key={pool.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                    >
                      <SimpleCard 
                        className={`p-4 border transition-all duration-200 ${
                          pool.userLiquidity > 0 
                            ? 'border-solana-green/30 bg-solana-green/5' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Pool Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 flex items-center justify-center">
                                {pool.iconA}
                              </div>
                              <div className="w-8 h-8 flex items-center justify-center -ml-2">
                                {pool.iconB}
                              </div>
                            </div>
                            <div>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-white font-semibold ${pool.name.length > 10 ? 'text-sm' : 'text-base'}`}>{pool.name}</h4>
                                  {pool.userLiquidity > 0 && (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                      Ваш пул
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Live indicator for real pool data */}
                                  {((pool.id === 'sol-tng-lp' && solFarmingPool.poolData) || 
                                    (pool.id === 'tng-usdc-lp' && usdcFarmingPool.poolData)) && (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs animate-pulse">
                                       LIVE
                                    </Badge>
                                  )}
                                  {pool.isStable && (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                      Стабильный
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-400">{pool.protocol} • {pool.fee}% комиссия</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-solana-green">{formatAPY(pool.apy)}%</p>
                            <p className="text-xs text-gray-400">APY</p>
                          </div>
                        </div>

                        {/* Pool Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                          <div>
                            <p className="text-gray-500">TVL</p>
                            <p className="text-white font-medium">${formatLargeNumber(pool.tvl)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Объем 24ч</p>
                            <p className="text-white font-medium">${formatLargeNumber(pool.volume24h)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Доходы 24ч</p>
                            <p className="text-white font-medium">${formatLargeNumber(pool.fees24h)}</p>
                          </div>
                        </div>

                        {/* Real Pool Reserves (if available) */}
                        {pool.id === 'sol-tng-lp' && solFarmingPool.poolData && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                            <p className="text-green-400 text-xs font-medium mb-2"> Реальные резервы пула:</p>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-gray-400">TNG резерв</p>
                                <p className="text-white font-medium">
                                  {(parseFloat(solFarmingPool.poolData.tngReserve) / 1e9).toLocaleString()} TNG
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">SOL резерв</p>
                                <p className="text-white font-medium">
                                  {(parseFloat(solFarmingPool.poolData.otherReserve) / 1e9).toLocaleString()} SOL
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              LP Supply: {(parseFloat(solFarmingPool.poolData.lpSupply) / 1e9).toLocaleString()}
                            </div>
                          </div>
                        )}

                        {pool.id === 'tng-usdc-lp' && usdcFarmingPool.poolData && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                            <p className="text-green-400 text-xs font-medium mb-2"> Реальные резервы пула:</p>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-gray-400">TNG резерв</p>
                                <p className="text-white font-medium">
                                  {(parseFloat(usdcFarmingPool.poolData.tngReserve) / 1e9).toLocaleString()} TNG
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">USDC резерв</p>
                                <p className="text-white font-medium">
                                  {(parseFloat(usdcFarmingPool.poolData.otherReserve) / 1e6).toLocaleString()} USDC
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              LP Supply: {(parseFloat(usdcFarmingPool.poolData.lpSupply) / 1e9).toLocaleString()}
                            </div>
                          </div>
                        )}

                        {/* Success Message for recent transaction */}
                        {(liquidityModal as any).type === 'success' && (liquidityModal as any).pool?.id === pool.id && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <p className="text-green-400 text-xs font-medium">Ликвидность добавлена успешно!</p>
                            </div>
                            <div className="text-xs text-gray-400">
                              Добавлено: {liquidityModal.amountA} {pool.tokenA} + {liquidityModal.amountB} {pool.tokenB}
                            </div>
                          </div>
                        )}

                        {/* User Position */}
                        {pool.userLiquidity > 0 && (
                          <div className="bg-white/5 rounded-lg p-3 mb-3">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <p className="text-gray-400">Ваша ликвидность</p>
                                <p className="text-white font-medium">
                                  {isBalanceVisible ? `$${pool.userLiquidity.toFixed(2)}` : '$••••'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">Доля пула</p>
                                <p className="text-white font-medium">{(pool.userShare * 100).toFixed(4)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Награды</p>
                                <p className="text-green-400 font-medium">
                                  {isBalanceVisible ? `+${pool.rewards.toFixed(4)} LP` : '+••••'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <SimpleButton
                            size="sm"
                            gradient={true}
                            onClick={() => handleAddLiquidity(pool)}
                            className="flex-1"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Добавить
                          </SimpleButton>
                          
                          {pool.userLiquidity > 0 && (
                            <SimpleButton
                              size="sm"
                              onClick={() => handleRemoveLiquidity(pool)}
                              className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                              <Minus className="w-4 h-4 mr-1" />
                              Удалить
                            </SimpleButton>
                          )}
                          
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </motion.button>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))
                  )}
                </div>
              </div>

            </div>
          </PageLayout>

          {/* Liquidity Modal */}
          <AnimatePresence>
            {renderLiquidityModal()}
          </AnimatePresence>
        </>
      )}
    </ClientOnly>
  )
}


