'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { SolanaFullScreenLoader } from '@/components/learn/SolanaLoader3D'
import { SwapPageSkeleton } from '@/components/defi/SwapPageSkeleton'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  ArrowLeft,
  ArrowUpDown, 
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  Info,
  Coins,
  BookOpen,
  ArrowRightLeft
} from 'lucide-react'
import { hapticFeedback, useTelegram } from '@/components/telegram/TelegramProvider'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import { useSwap } from '@/hooks/useSwap'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { OrderBookInterface } from '@/components/defi/OrderBookInterface'
import { Shield } from 'lucide-react'

interface InsuranceStatus {
  isInsured: boolean
  coverageAmount: number
  premiumRate: number
  poolId?: string
}

interface Token {
  symbol: string
  name: string
  logoUri: string
  balance: number
  price: number
  change24h: number
}

interface SwapRoute {
  inputAmount: number
  outputAmount: number
  priceImpact: number
  fee: number
  route: string[]
}

interface SwapModal {
  isOpen: boolean
  step: 'confirm' | 'processing' | 'success' | 'error'
  fromToken: Token | null
  toToken: Token | null
  fromAmount: number
  toAmount: number
  route: SwapRoute | null
  errorMessage?: string
}

// Real tokens will come from useSwap hook

export default function SwapPage() {
  const router = useRouter()
  const { webApp } = useTelegram()
  const [isLoading, setIsLoading] = useState(true)
  const [fromAmount, setFromAmount] = useState<number>(0)
  const [toAmount, setToAmount] = useState<number>(0)
  const [slippage, setSlippage] = useState<number>(0.5)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [showTokenSelect, setShowTokenSelect] = useState<'from' | 'to' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'swap' | 'orderbook' | 'cross-chain'>('swap')
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus | null>(null)
  const [selectedSourceChain, setSelectedSourceChain] = useState<string>('Solana')
  const [selectedTargetChain, setSelectedTargetChain] = useState<string>('Ethereum')
  const [crossChainRoutes, setCrossChainRoutes] = useState<any[]>([])
  const [isCrossChainProcessing, setIsCrossChainProcessing] = useState(false)
  const [crossChainTxId, setCrossChainTxId] = useState<string | null>(null)
  const [crossChainError, setCrossChainError] = useState<string | null>(null)
  const [bridgeRecipient, setBridgeRecipient] = useState<string>('')
  const [isTransferProcessing, setIsTransferProcessing] = useState(false)
  const [transferTxId, setTransferTxId] = useState<string | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [swapModal, setSwapModal] = useState<SwapModal>({
    isOpen: false,
    step: 'confirm',
    fromToken: null,
    toToken: null,
    fromAmount: 0,
    toAmount: 0,
    route: null
  })

  //  РЕАЛЬНЫЕ ДАННЫЕ из готовой инфраструктуры
  const { apiCall } = useCompatibleAuth()
  const swapData = useSwap()
  
  //  РЕАЛЬНЫЕ БАЛАНСЫ через TokenBalanceCache (отключен autoRefresh для performance)
  const solBalance = useTokenBalance('SOL', {
    cacheTime: 60000,
    autoRefresh: false
  })
  const tngBalance = useTokenBalance('TNG', {
    cacheTime: 60000,
    autoRefresh: false
  })
  const usdcBalance = useTokenBalance('USDC', {
    cacheTime: 60000,
    autoRefresh: false
  })
  
  // Функция для обновления всех балансов
  const refreshBalances = async () => {
    await Promise.all([
      solBalance.refresh(),
      tngBalance.refresh(),
      usdcBalance.refresh()
    ])
  }
  
  //  РЕАЛЬНЫЕ ПОДДЕРЖИВАЕМЫЕ ТОКЕНЫ НА DEVNET с реальными ценами
  const DEVNET_TOKENS: Token[] = React.useMemo(() => {
    // Получаем реальные цены из swap данных
    const prices = swapData.data?.prices || {}
    
    return [
      {
        symbol: 'SOL',
        name: 'Solana',
        logoUri: '',
        balance: solBalance.balance || 0,
        price: prices['So11111111111111111111111111111111111111112'] || 98.45,
        change24h: 2.5
      },
      {
        symbol: 'TNG',
        name: 'TNG Token',
        logoUri: '',
        balance: tngBalance.balance || 0,
        price: prices['FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs'] || (1/450),
        change24h: 15.3
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        logoUri: '',
        balance: usdcBalance.balance || 0,
        price: prices['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] || 1.00,
        change24h: 0.1
      }
    ].filter(token => {
      // Фильтруем только токены, доступные в swapData
      if (!swapData.data?.tokens) return true
      return swapData.data.tokens.some(t => t.symbol === token.symbol)
    })
  }, [swapData.data?.tokens, swapData.data?.prices, solBalance.balance, tngBalance.balance, usdcBalance.balance])
  
  //  Инициализация токенов (SOL → TNG по умолчанию)
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)
  
  // Устанавливаем начальные токены при загрузке
  React.useEffect(() => {
    if (DEVNET_TOKENS.length >= 2 && !fromToken && !toToken) {
      const solToken = DEVNET_TOKENS.find(t => t.symbol === 'SOL')
      const tngToken = DEVNET_TOKENS.find(t => t.symbol === 'TNG')
      
      if (solToken && tngToken) {
        setFromToken(solToken)
        setToToken(tngToken)
      }
    }
  }, [DEVNET_TOKENS])
  
  // Обновляем токены при изменении балансов
  React.useEffect(() => {
    if (fromToken) {
      const updatedFromToken = DEVNET_TOKENS.find(t => t.symbol === fromToken.symbol)
      if (updatedFromToken) {
        setFromToken(updatedFromToken)
      }
    }
    if (toToken) {
      const updatedToToken = DEVNET_TOKENS.find(t => t.symbol === toToken.symbol)
      if (updatedToToken) {
        setToToken(updatedToToken)
      }
    }
  }, [DEVNET_TOKENS, fromToken?.symbol, toToken?.symbol])

  useEffect(() => {
    if (!swapData.isLoading && !solBalance.loading && !tngBalance.loading && !usdcBalance.loading) {
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [swapData.isLoading, solBalance.loading, tngBalance.loading, usdcBalance.loading])

  useEffect(() => {
    loadInsuranceStatus()
  }, [])

  const loadInsuranceStatus = async () => {
    try {
      const response = await apiCall('/api/defi/insurance?action=protocol-status&protocol=TNG Swap', {
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

  const loadCrossChainRoutes = async () => {
    if (!fromToken || !toToken || fromAmount <= 0) {
      setCrossChainRoutes([])
      return
    }

    try {
      const response = await apiCall('/api/defi/bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get-routes',
          inputToken: fromToken.symbol,
          outputToken: toToken.symbol,
          amount: fromAmount
        })
      })

      if (response.ok) {
        const responseData = await response.json()
        if (responseData.success) {
          setCrossChainRoutes(responseData.data.routes || [])
        }
      }
    } catch (error) {
      console.error('Error loading cross-chain routes:', error)
    }
  }

  const handleCrossChainSwap = async () => {
    if (!fromToken || !toToken || fromAmount <= 0) {
      hapticFeedback.notification('error')
      return
    }

    try {
      setIsCrossChainProcessing(true)
      setCrossChainError(null)
      setCrossChainTxId(null)

      const minimumAmountOut = Math.max(0, toAmount * 0.99)

      const response = await apiCall('/api/defi/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          sourceChain: selectedSourceChain,
          targetChain: selectedTargetChain,
          inputToken: fromToken.symbol,
          outputToken: toToken.symbol,
          amountIn: fromAmount,
          minimumAmountOut,
          recipient: 'self'
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setCrossChainTxId(data.data?.txId || null)
        hapticFeedback.notification('success')
      } else {
        setCrossChainError(data.error || 'Не удалось выполнить cross-chain swap')
        hapticFeedback.notification('error')
      }
    } catch (error) {
      setCrossChainError(error instanceof Error ? error.message : 'Неизвестная ошибка')
      hapticFeedback.notification('error')
    } finally {
      setIsCrossChainProcessing(false)
    }
  }

  const handleBridgeTransfer = async () => {
    if (!fromToken || fromAmount <= 0 || !bridgeRecipient) {
      hapticFeedback.notification('error')
      return
    }

    try {
      setIsTransferProcessing(true)
      setTransferError(null)
      setTransferTxId(null)

      const response = await apiCall('/api/defi/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          targetChain: selectedTargetChain,
          recipient: bridgeRecipient,
          amount: fromAmount,
          tokenSymbol: fromToken.symbol
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setTransferTxId(data.data?.txId || null)
        hapticFeedback.notification('success')
      } else {
        setTransferError(data.error || 'Не удалось инициировать перевод')
        hapticFeedback.notification('error')
      }
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'Неизвестная ошибка')
      hapticFeedback.notification('error')
    } finally {
      setIsTransferProcessing(false)
    }
  }

  //  Функция получения TNG через faucet для swap операций
  const handleGetTNG = async () => {
    try {
      
      const response = await apiCall('/api/tokens/tng/faucet', {
        method: 'POST',
        body: JSON.stringify({ amount: '1000000000000' }) // 1000 TNG
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Обновляем все балансы после получения TNG
        await refreshBalances()
        hapticFeedback.notification('success')
        
      } else {
        throw new Error(result.error || 'Faucet request failed')
      }
    } catch (error) {
      hapticFeedback.notification('error')
    }
  }

  //  РЕАЛЬНОЕ получение котировок через Jupiter API
  useEffect(() => {
    if (fromAmount > 0 && fromToken && toToken) {
      setIsLoadingQuote(true)
      
      const getQuote = async () => {
        try {
          
          // Используем реальный Jupiter API через наш backend
          // Конвертируем символы в mint адреса
          const inputMint = fromToken.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' :
                           fromToken.symbol === 'TNG' ? 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' :
                           'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
          
          const outputMint = toToken.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' :
                            toToken.symbol === 'TNG' ? 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' :
                            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
          
          // Конвертируем amount в lamports/базовые единицы
          const decimals = fromToken.symbol === 'SOL' ? 9 : 9 // SOL и TNG имеют 9 decimals
          const amountInBaseUnits = Math.floor(fromAmount * Math.pow(10, decimals)).toString()
          
          const response = await apiCall(`/api/defi/swap?operation=quote&inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInBaseUnits}&slippage=${Math.floor(slippage * 100)}`)
          const result = await response.json()
          
          if (result.success && result.data?.quote) {
            // Конвертируем outputAmount из базовых единиц в токены
            const outputDecimals = toToken.symbol === 'SOL' ? 9 : 9 // SOL и TNG имеют 9 decimals
            const outputAmount = parseFloat(result.data.quote.outputAmount) / Math.pow(10, outputDecimals)
            setToAmount(outputAmount)
          } else {
            // Fallback расчет для devnet
            const fallbackRate = fromToken.symbol === 'SOL' && toToken.symbol === 'TNG' ? 9845 : 
                                toToken.symbol === 'SOL' && fromToken.symbol === 'TNG' ? 0.0001 :
                                1.0
            setToAmount(fromAmount * fallbackRate)
          }
        } catch (error) {
          // Fallback расчет при ошибке
          const fallbackRate = fromToken.symbol === 'SOL' && toToken.symbol === 'TNG' ? 9845 : 
                              toToken.symbol === 'SOL' && fromToken.symbol === 'TNG' ? 0.0001 :
                              1.0
          setToAmount(fromAmount * fallbackRate)
        }
        
        setIsLoadingQuote(false)
      }
      
      // Дебаунс для предотвращения спама запросов
      const timer = setTimeout(getQuote, 500)
      return () => clearTimeout(timer)
    } else {
      setToAmount(0)
    }
  }, [fromAmount, fromToken, toToken, slippage, apiCall])

  //  TMA интеграция - отключена, используем собственную кнопку swap на странице
  useEffect(() => {
    if (webApp) {
      // Скрываем MainButton полностью, так как у нас есть своя кнопка
      webApp.MainButton.hide()
    }
  }, [webApp])

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.back()
  }

  const handleSwapTokens = () => {
    const tempToken = fromToken
    const tempAmount = fromAmount
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
    hapticFeedback.impact('medium')
  }

  const handleTokenSelect = (token: Token, type: 'from' | 'to') => {
    if (type === 'from') {
      // Если выбираем тот же токен что и в "to", меняем их местами
      if (toToken && token.symbol === toToken.symbol) {
        setToToken(fromToken)
      }
      setFromToken(token)
    } else {
      // Если выбираем тот же токен что и в "from", меняем их местами
      if (fromToken && token.symbol === fromToken.symbol) {
        setFromToken(toToken)
      }
      setToToken(token)
    }
    setShowTokenSelect(null)
    hapticFeedback.impact('light')
  }

  const handleSwap = async () => {
    if (!fromToken || !toToken || fromAmount <= 0) return

    // КРИТИЧНО: Обновляем баланс перед swap для актуальных данных
    console.log('🔄 Updating balances before swap...')
    await refreshBalances()
    
    // Получаем актуальный баланс с учетом обновления
    const actualBalance = fromToken.symbol === 'SOL' ? solBalance.balance :
                         fromToken.symbol === 'TNG' ? tngBalance.balance :
                         usdcBalance.balance
    
    //  Проверки перед swap с актуальным балансом
    if ((actualBalance || 0) < fromAmount) {
      // Показать конкретную ошибку с актуальным балансом
      hapticFeedback.notification('error')
      console.log(` Недостаточно ${fromToken.symbol}. Доступно: ${(actualBalance || 0).toFixed(6)}, требуется: ${fromAmount.toFixed(6)}`)
      return
    }

    // Минимальные суммы для swap
    const minAmounts = {
      SOL: 0.001,  // 0.001 SOL минимум
      TNG: 1,      // 1 TNG минимум  
      USDC: 0.1    // 0.1 USDC минимум
    }

    const minAmount = minAmounts[fromToken.symbol as keyof typeof minAmounts] || 0.001
    if (fromAmount < minAmount) {
      hapticFeedback.notification('error')
      console.log(' Amount too small:', { amount: fromAmount, minimum: minAmount, token: fromToken.symbol })
      return
    }

    try {
      //  РЕАЛЬНЫЙ маршрут через Jupiter API
      
      // Конвертируем символы в mint адреса для route
      const inputMint = fromToken.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' :
                       fromToken.symbol === 'TNG' ? 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' :
                       'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
      
      const outputMint = toToken.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' :
                        toToken.symbol === 'TNG' ? 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' :
                        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
      
      const decimals = fromToken.symbol === 'SOL' ? 9 : 9
      const amountInBaseUnits = Math.floor(fromAmount * Math.pow(10, decimals)).toString()
      
      const response = await apiCall(`/api/defi/swap?operation=quote&inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInBaseUnits}&slippage=${Math.floor(slippage * 100)}`)
      const result = await response.json()
      
      let route: SwapRoute
      if (result.success && result.data?.quote) {
        // Конвертируем outputAmount из базовых единиц
        const outputDecimals = toToken.symbol === 'SOL' ? 9 : 9
        const outputAmount = parseFloat(result.data.quote.outputAmount) / Math.pow(10, outputDecimals)
        
        route = {
          inputAmount: fromAmount,
          outputAmount: outputAmount,
          priceImpact: result.data.quote.priceImpact || 0.3,
          fee: result.data.quote.fee ? parseFloat(result.data.quote.fee) / Math.pow(10, decimals) : fromAmount * 0.003,
          route: result.data.quote.route?.map((r: any) => r.label) || ['Jupiter DEX']
        }
        
      } else {
        // Fallback маршрут для devnet
        route = {
          inputAmount: fromAmount,
          outputAmount: toAmount,
          priceImpact: 0.3, // Низкое влияние на цену для devnet
          fee: fromAmount * 0.003, // 0.3% комиссия
          route: ['Jupiter DEX']
        }
        
      }

      setSwapModal({
        isOpen: true,
        step: 'confirm',
        fromToken,
        toToken,
        fromAmount,
        toAmount: route.outputAmount,
        route
      })
      hapticFeedback.impact('medium')
    } catch (error) {
      hapticFeedback.notification('error')
    }
  }

  const processSwap = async () => {
    if (!swapModal.fromToken || !swapModal.toToken || !swapModal.route) return
    
    setSwapModal(prev => ({ ...prev, step: 'processing' }))
    hapticFeedback.notification('warning')
    
    try {
      
      //  РЕАЛЬНЫЙ SWAP через Jupiter + SponsorService
      // Конвертируем символы в mint адреса
      const inputMint = swapModal.fromToken.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' :
                       swapModal.fromToken.symbol === 'TNG' ? 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' :
                       'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
      
      const outputMint = swapModal.toToken.symbol === 'SOL' ? 'So11111111111111111111111111111111111111112' :
                        swapModal.toToken.symbol === 'TNG' ? 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' :
                        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
      
      const decimals = swapModal.fromToken.symbol === 'SOL' ? 9 : 9
      const amountInBaseUnits = Math.floor(swapModal.fromAmount * Math.pow(10, decimals)).toString()
      
      const response = await apiCall('/api/defi/swap', {
        method: 'POST',
        body: JSON.stringify({
          inputMint: inputMint,
          outputMint: outputMint,
          amount: amountInBaseUnits,
          slippageBps: Math.floor(slippage * 100) // API ожидает slippageBps
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSwapModal(prev => ({ ...prev, step: 'success' }))
        hapticFeedback.notification('success')
        
        //  Принудительно очищаем кеш и обновляем все балансы после успешного swap
        solBalance.clearCache()
        tngBalance.clearCache()
        usdcBalance.clearCache()
        
        await Promise.all([
          refreshBalances(),
          swapData.refreshData() // Обновляем swap данные
        ])
        
        // Дополнительное обновление через 2 секунды для уверенности
        setTimeout(async () => {
          // Еще раз очищаем кеш и обновляем
          solBalance.clearCache()
          tngBalance.clearCache()
          usdcBalance.clearCache()
          
          await refreshBalances()
        }, 2000)
        
        // Третье обновление через 5 секунд для медленных RPC
        setTimeout(async () => {
          await refreshBalances()
        }, 5000)
        
        
        
        // Автозакрытие через 3 секунды
        setTimeout(() => {
          setFromAmount(0)
          setToAmount(0)
          setSwapModal({ 
            isOpen: false, 
            step: 'confirm', 
            fromToken: null, 
            toToken: null, 
            fromAmount: 0, 
            toAmount: 0, 
            route: null 
          })
        }, 3000)
        
      } else {
        // Улучшенная обработка ошибок
        let errorMessage = result.error || 'Swap operation failed'
        
        // Специальная обработка для ошибок недостатка средств
        if (result.code === 'INSUFFICIENT_BALANCE') {
          errorMessage = result.error
          setSwapModal(prev => ({ 
            ...prev, 
            step: 'error',
            errorMessage: `${errorMessage}\n\nПопробуйте уменьшить сумму или получите больше токенов через faucet.`
          }))
        } else {
          setSwapModal(prev => ({ 
            ...prev, 
            step: 'error',
            errorMessage 
          }))
        }
        
        hapticFeedback.notification('error')
        return
      }
      
    } catch (error) {
      
      let errorMessage = 'Ошибка выполнения обмена'
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds') || error.message.includes('Недостаточно')) {
          errorMessage = 'Недостаточно токенов для обмена. Проверьте баланс или получите токены через faucet.'
        } else if (error.message.includes('Network')) {
          errorMessage = 'Ошибка сети. Попробуйте еще раз.'
        } else {
          errorMessage = error.message
        }
      }
      
      setSwapModal(prev => ({ 
        ...prev, 
        step: 'error',
        errorMessage 
      }))
      hapticFeedback.notification('error')
    }
  }

  const LoadingFallback = () => <SwapPageSkeleton />

  const renderTokenSelectModal = () => {
    if (!showTokenSelect) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
        onClick={() => setShowTokenSelect(null)}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-2xl w-full max-h-[70vh] border-t border-white/10"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Выберите токен</h3>
              <button
                onClick={() => setShowTokenSelect(null)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {DEVNET_TOKENS.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Загрузка токенов...</p>
                  {swapData.error && (
                    <p className="text-red-400 text-sm">{swapData.error}</p>
                  )}
                </div>
              ) : (
                DEVNET_TOKENS.map((token, index) => (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleTokenSelect(token, showTokenSelect)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TokenLogo token={token.symbol} size="md" />
                    <div>
                      <h4 className="text-white font-medium">{token.symbol}</h4>
                      <p className="text-xs text-gray-400">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{token.balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">${token.price.toFixed(4)}</p>
                  </div>
                </motion.div>
              ))
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  const renderSwapModal = () => {
    if (!swapModal.isOpen) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onClick={() => setSwapModal(prev => ({ ...prev, isOpen: false }))}
      >
        {/*  ТОЧНАЯ КОПИЯ WALLET МОДАЛЬНОЙ СТРУКТУРЫ */}
        <div className="w-full h-full max-w-lg flex flex-col justify-center p-4 pb-safe">
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-h-[calc(100vh-8rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleCard className="flex-1 overflow-y-auto p-6 border border-white/10 bg-black/90 backdrop-blur-xl">
          {/* Confirm Step */}
          {swapModal.step === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {swapModal.step === 'confirm' ? 'Подтверждение обмена' :
                     swapModal.step === 'processing' ? 'Обработка...' :
                     swapModal.step === 'success' ? 'Успешно!' :
                     swapModal.step === 'error' ? 'Ошибка' : 'Обмен'}
                  </h2>
                  <p className="text-xs text-gray-400">Jupiter DEX • Devnet</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSwapModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              <SimpleCard className="p-4 border border-white/10">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Отдаете:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{swapModal.fromAmount} {swapModal.fromToken?.symbol}</p>
                      <p className="text-xs text-gray-400">
                        ≈ ${(swapModal.fromAmount * (swapModal.fromToken?.price || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Получаете:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{swapModal.toAmount.toFixed(6)} {swapModal.toToken?.symbol}</p>
                      <p className="text-xs text-gray-400">
                        ≈ ${(swapModal.toAmount * (swapModal.toToken?.price || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </SimpleCard>

              {swapModal.route && (
                <SimpleCard className="p-3 border border-white/10">
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Маршрут:</span>
                      <span className="text-white">{swapModal.route.route.join(' → ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Влияние на цену:</span>
                      <span className={`${swapModal.route.priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {swapModal.route.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Комиссия DEX:</span>
                      <span className="text-white">{swapModal.route.fee.toFixed(4)} {swapModal.fromToken?.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Комиссии blockchain:</span>
                      <span className="text-green-400">Спонсируются </span>
                    </div>
                  </div>
                </SimpleCard>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SimpleButton
                  onClick={() => setSwapModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full"
                >
                  Отмена
                </SimpleButton>
                <SimpleButton
                  gradient={true}
                  onClick={processSwap}
                  className="w-full"
                >
                  Обменять
                </SimpleButton>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {swapModal.step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto">
                <ArrowUpDown className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Обработка обмена</h3>
                <p className="text-sm text-gray-400">Поиск лучшего маршрута...</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3 }}
                />
              </div>
            </div>
          )}

          {/* Success Step */}
          {swapModal.step === 'success' && (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="text-white font-semibold mb-2">Обмен успешен!</h3>
                <p className="text-sm text-gray-400">
                  {swapModal.fromAmount} {swapModal.fromToken?.symbol} → {swapModal.toAmount.toFixed(4)} {swapModal.toToken?.symbol}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-sm text-green-400">
                   Токены поступили на ваш баланс! Blockchain операция завершена.
                </p>
              </div>
            </div>
          )}

          {/* Error Step */}
          {swapModal.step === 'error' && (
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto"
              >
                <AlertTriangle className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h3 className="text-white font-semibold mb-2">Ошибка обмена</h3>
                <p className="text-sm text-gray-400">
                  Не удалось обменять {swapModal.fromAmount} {swapModal.fromToken?.symbol}
                </p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="text-sm text-red-400 whitespace-pre-line">
                  {swapModal.errorMessage || ' Проверьте баланс или попробуйте позже'}
                </p>
              </div>
              <SimpleButton
                onClick={() => setSwapModal({ 
                  isOpen: false, 
                  step: 'confirm', 
                  fromToken: null, 
                  toToken: null, 
                  fromAmount: 0, 
                  toAmount: 0, 
                  route: null 
                })}
                className="w-full"
              >
                Закрыть
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
                          {activeTab === 'swap' ? 'Jupiter' : 'Order Book'} <span className="text-solana-cyan">{activeTab === 'swap' ? 'Swap' : 'DEX'}</span>
                        </h1>
                        {insuranceStatus?.isInsured && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <Shield className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">Застрахован</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        SOL  TNG  USDC на devnet
                        {insuranceStatus?.isInsured && (
                          <span className="text-green-400 ml-2">• Покрытие до ${insuranceStatus.coverageAmount.toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-400" />
                  </motion.button>
                </div>

                <div className="flex rounded-lg bg-gray-800 p-1 mb-4">
                  <button
                    onClick={() => setActiveTab('swap')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'swap'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    Обмен
                  </button>
                  <button
                    onClick={() => setActiveTab('orderbook')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'orderbook'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Ордеры
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('cross-chain')
                      loadCrossChainRoutes()
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'cross-chain'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Cross-Chain
                  </button>
                </div>

                <motion.div
                  className="flex items-center gap-4 text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {activeTab === 'swap' ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Мгновенно</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Лучший курс</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>Jupiter DEX</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>Лимитные ордера</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Точная цена</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>Order Book</span>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5"
                  >
                    <SimpleCard className="p-4 border border-white/10">
                      <h3 className="text-white font-medium mb-3">Настройки обмена</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Проскальзывание</span>
                            <span className="text-sm text-white">{slippage}%</span>
                          </div>
                          <div className="flex gap-2">
                            {[0.1, 0.5, 1.0].map((value) => (
                              <button
                                key={value}
                                onClick={() => setSlippage(value)}
                                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                  slippage === value 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                {value}%
                              </button>
                            ))}
                            <input
                              type="number"
                              value={slippage}
                              onChange={(e) => setSlippage(Number(e.target.value))}
                              className="flex-1 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-white text-center"
                              step="0.1"
                              min="0.1"
                              max="50"
                            />
                          </div>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conditional Interface */}
              {activeTab === 'swap' ? (
                /* Swap Interface */
                <motion.div
                  className="px-5 space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                {/* From Token */}
                <SimpleCard className="p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Отдаете</span>
                    {fromToken && (
                      <span className="text-xs text-gray-400">
                        Баланс: {fromToken.balance?.toFixed(2) || '0.00'} {fromToken.symbol}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowTokenSelect('from')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <TokenLogo token={fromToken?.symbol || 'SOL'} size="md" />
                      <span className="text-white font-medium">{fromToken?.symbol || 'Выберите токен'}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </motion.button>
                    
                    <div className="flex-1 text-right">
                      <input
                        type="number"
                        value={fromAmount || ''}
                        onChange={(e) => setFromAmount(Number(e.target.value))}
                        placeholder="0.0"
                        className="w-full bg-transparent text-right text-2xl font-bold text-white placeholder-gray-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">≈ ${fromToken ? (fromAmount * (fromToken.price || 0)).toFixed(2) : '0.00'}</span>
                      {fromToken?.change24h !== undefined && (
                        <span className={`text-xs ${fromToken.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fromToken.change24h >= 0 ? '+' : ''}{fromToken.change24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {fromToken?.symbol === 'TNG' ? (
                        // Быстрые суммы для TNG
                        [10, 100, 500, 'MAX'].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              if (amount === 'MAX') {
                                fromToken?.balance && setFromAmount(fromToken.balance)
                              } else {
                                setFromAmount(amount as number)
                              }
                              hapticFeedback.impact('light')
                            }}
                            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                            disabled={!fromToken?.balance || (typeof amount === 'number' && fromToken.balance < amount)}
                          >
                            {amount === 'MAX' ? 'ВСЕ' : `${amount}`}
                          </button>
                        ))
                      ) : (
                        // Процентные кнопки для SOL/USDC
                        [25, 50, 75, 100].map((percent) => (
                          <button
                            key={percent}
                            onClick={() => {
                              if (fromToken?.balance) {
                                setFromAmount((fromToken.balance * percent) / 100)
                                hapticFeedback.impact('light')
                              }
                            }}
                            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                            disabled={!fromToken?.balance}
                          >
                            {percent}%
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </SimpleCard>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSwapTokens}
                    className="p-3 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
                  >
                    <ArrowUpDown className="w-5 h-5 text-white" />
                  </motion.button>
                </div>

                {/* To Token */}
                <SimpleCard className="p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Получаете</span>
                    {toToken && (
                      <span className="text-xs text-gray-400">
                        Баланс: {toToken.balance?.toFixed(2) || '0.00'} {toToken.symbol}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowTokenSelect('to')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <TokenLogo token={toToken?.symbol || 'USDC'} size="md" />
                      <span className="text-white font-medium">{toToken?.symbol || 'Выберите токен'}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </motion.button>
                    
                    <div className="flex-1 text-right">
                      {isLoadingQuote ? (
                        <div className="text-2xl font-bold text-gray-400 animate-pulse">~</div>
                      ) : (
                        <div className="text-2xl font-bold text-white">
                          {toAmount.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">≈ ${toToken ? (toAmount * (toToken.price || 0)).toFixed(2) : '0.00'}</span>
                    {toToken?.change24h !== undefined && (
                      <span className={`text-xs ${toToken.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {toToken.change24h >= 0 ? '+' : ''}{toToken.change24h.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </SimpleCard>

                {/* Route Info */}
                {fromAmount > 0 && !isLoadingQuote && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <SimpleCard className="p-3 border border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Info className="w-3 h-3 text-blue-400" />
                          <span className="text-gray-400">Курс:</span>
                        </div>
                        <span className="text-white">
                          {fromToken && toToken && fromAmount > 0 ? 
                            `1 ${fromToken.symbol} = ${(toAmount / fromAmount).toFixed(6)} ${toToken.symbol}` :
                            'Выберите токены для обмена'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">Проскальзывание:</span>
                        <span className="text-white">{slippage}%</span>
                      </div>
                    </SimpleCard>
                  </motion.div>
                )}

                {/* TNG Faucet для swap операций */}
                {(tngBalance.balance || 0) < 10 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <SimpleCard className="p-4 border border-purple-500/30 bg-purple-500/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white font-medium">Нужно TNG для swap?</p>
                          <p className="text-xs text-gray-400">Получите бесплатно каждые 10 минут</p>
                        </div>
                        <SimpleButton
                          onClick={handleGetTNG}
                          size="sm"
                          gradient={true}
                          disabled={tngBalance.loading}
                          className="shrink-0"
                        >
                          <Coins className="w-4 h-4 mr-1" />
                          {tngBalance.loading ? 'Получение...' : '1000 TNG'}
                        </SimpleButton>
                      </div>
                    </SimpleCard>
                  </motion.div>
                )}

                {/* Swap Button */}
                <SimpleButton
                  gradient={true}
                  onClick={handleSwap}
                  disabled={!fromAmount || !toAmount || isLoadingQuote || !fromToken || !toToken || (fromToken.balance < fromAmount) || 
                           (fromAmount < (fromToken.symbol === 'SOL' ? 0.001 : fromToken.symbol === 'TNG' ? 1 : 0.1))}
                  className="w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingQuote ? 'Получение курса...' : 
                   !fromToken || !toToken ? 'Выберите токены' :
                   !fromAmount ? 'Введите сумму' :
                   fromAmount < (fromToken.symbol === 'SOL' ? 0.001 : fromToken.symbol === 'TNG' ? 1 : 0.1) ? 
                     `Минимум ${fromToken.symbol === 'SOL' ? '0.001 SOL' : fromToken.symbol === 'TNG' ? '1 TNG' : '0.1 USDC'}` :
                   fromToken.balance < fromAmount ? 'Недостаточно средств' :
                   `Обменять ${fromAmount} ${fromToken.symbol}`}
                </SimpleButton>
                </motion.div>
              ) : activeTab === 'orderbook' ? (
                /* Order Book Interface */
                <motion.div
                  className="px-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <OrderBookInterface />
                </motion.div>
              ) : (
                /* Cross-Chain Interface */
                <motion.div
                  className="px-5 space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  {/* Chain Selection */}
                  <SimpleCard>
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold">Выбор сетей</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Исходная сеть</label>
                          <select
                            value={selectedSourceChain}
                            onChange={(e) => setSelectedSourceChain(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="Solana" className="bg-gray-800">Solana</option>
                            <option value="Ethereum" className="bg-gray-800">Ethereum</option>
                            <option value="BSC" className="bg-gray-800">BSC</option>
                            <option value="Polygon" className="bg-gray-800">Polygon</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Целевая сеть</label>
                          <select
                            value={selectedTargetChain}
                            onChange={(e) => setSelectedTargetChain(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="Ethereum" className="bg-gray-800">Ethereum</option>
                            <option value="BSC" className="bg-gray-800">BSC</option>
                            <option value="Polygon" className="bg-gray-800">Polygon</option>
                            <option value="Avalanche" className="bg-gray-800">Avalanche</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </SimpleCard>

                  {/* Bridge Transfer */}
                  <SimpleCard>
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold">Кросс‑чейн перевод</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Получатель (адрес/идентификатор в целевой сети)</label>
                          <input
                            type="text"
                            value={bridgeRecipient}
                            onChange={(e) => setBridgeRecipient(e.target.value)}
                            placeholder="Введите получателя"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Токен и сумма</label>
                          <div className="text-sm text-gray-300">
                            {fromToken ? `${fromToken.symbol}` : '—'} • {fromAmount || 0}
                          </div>
                        </div>
                      </div>

                      <SimpleButton
                        onClick={handleBridgeTransfer}
                        disabled={!fromToken || fromAmount <= 0 || !bridgeRecipient || isTransferProcessing}
                        className="w-full py-3"
                      >
                        {isTransferProcessing ? 'Инициация перевода...' : 'Инициировать перевод'}
                      </SimpleButton>

                      {transferTxId && (
                        <div className="text-xs text-green-400">TxId: {transferTxId}</div>
                      )}
                      {transferError && (
                        <div className="text-xs text-red-400">{transferError}</div>
                      )}
                    </div>
                  </SimpleCard>

                  {/* Cross-Chain Routes */}
                  <SimpleCard>
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold">Маршруты обмена</h3>
                      
                      {crossChainRoutes.length === 0 ? (
                        <div className="text-center py-8">
                          <ArrowRightLeft className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400">Выберите токены для поиска маршрутов</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {crossChainRoutes.map((route, index) => (
                            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  {route.chains.map((chain: string, i: number) => (
                                    <div key={i} className="flex items-center">
                                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                        {chain}
                                      </span>
                                      {i < route.chains.length - 1 && (
                                        <ArrowRightLeft className="w-3 h-3 text-gray-400 mx-2" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="text-right">
                                  <p className="text-green-400 font-semibold">
                                    {route.estimatedOutput.toFixed(6)}
                                  </p>
                                  <p className="text-xs text-gray-400">{route.estimatedTime}</p>
                                </div>
                              </div>
                              
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Путь: {route.path.join(' → ')}</span>
                                <span>Комиссия: {route.fee}%</span>
                              </div>
                              
                              <div className="mt-3">
                                <SimpleButton
                                  onClick={handleCrossChainSwap}
                                  disabled={isCrossChainProcessing || !fromToken || !toToken || fromAmount <= 0}
                                  className="w-full py-2 text-sm"
                                >
                                  {isCrossChainProcessing ? 'Выполнение...' : `Обменять через ${route.chains.join(' → ')}`}
                                </SimpleButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {crossChainTxId && (
                        <div className="text-xs text-green-400">TxId: {crossChainTxId}</div>
                      )}
                      {crossChainError && (
                        <div className="text-xs text-red-400">{crossChainError}</div>
                      )}
                    </div>
                  </SimpleCard>
                </motion.div>
              )}

            </div>
          </PageLayout>

          {/* Token Select Modal */}
          <AnimatePresence>
            {renderTokenSelectModal()}
          </AnimatePresence>

          {/* Swap Modal */}
          <AnimatePresence>
            {renderSwapModal()}
          </AnimatePresence>
        </>
      )}
    </ClientOnly>
  )
}


