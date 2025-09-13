'use client'

import { useState, useEffect } from 'react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Input } from '@/components/ui/input'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface FlashLoanPool {
  address: string
  assetMint: string
  availableLiquidity: string
  flashLoanFee: number
  assetSymbol: string
  assetDecimals: number
}

interface FlashLoanInterfaceProps {
  onFlashLoanExecuted?: (result: any) => void
}

export function FlashLoanInterface({ onFlashLoanExecuted }: FlashLoanInterfaceProps) {
  const { apiCall } = useCompatibleAuth()
  
  const [pools, setPools] = useState<FlashLoanPool[]>([])
  const [selectedPool, setSelectedPool] = useState<FlashLoanPool | null>(null)
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isRepaying, setIsRepaying] = useState(false)

  // Load available flash loan pools
  useEffect(() => {
    loadFlashLoanPools()
  }, [apiCall])

  const loadFlashLoanPools = async () => {
    try {
      setIsLoading(true)
      const response = await apiCall('/api/defi/flash-loans')
      const data = await response.json()

      if (data.success) {
        setPools(data.data.pools)
        if (data.data.pools.length > 0) {
          setSelectedPool(data.data.pools[0])
        }
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      console.error('Error loading flash loan pools:', error)
      hapticFeedback.notification('error')
    } finally {
      setIsLoading(false)
    }
  }

  const executeFlashLoan = async () => {
    if (!selectedPool || !amount || parseFloat(amount) <= 0) {
      hapticFeedback.notification('error')
      return
    }

    try {
      setIsExecuting(true)

      const response = await apiCall('/api/defi/flash-loans', {
        method: 'POST',
        body: JSON.stringify({
          action: 'execute',
          amount: (parseFloat(amount) * Math.pow(10, selectedPool.assetDecimals)).toString(),
          poolAddress: selectedPool.address,
        }),
      })

      const data = await response.json()

      if (data.success) {
        hapticFeedback.notification('success')
        setAmount('')
        
        if (onFlashLoanExecuted) {
          onFlashLoanExecuted(data.data)
        }
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      console.error('Flash loan error:', error)
      hapticFeedback.notification('error')
    } finally {
      setIsExecuting(false)
    }
  }

  const repayFlashLoan = async () => {
    if (!selectedPool) return
    try {
      setIsRepaying(true)
      const response = await apiCall('/api/defi/flash-loans', {
        method: 'POST',
        body: JSON.stringify({ action: 'repay', poolAddress: selectedPool.address })
      })
      const data = await response.json()
      if (data.success) {
        hapticFeedback.notification('success')
        if (onFlashLoanExecuted) onFlashLoanExecuted(data.data)
      } else {
        hapticFeedback.notification('error')
      }
    } catch (e) {
      hapticFeedback.notification('error')
    } finally {
      setIsRepaying(false)
    }
  }

  const calculateFee = () => {
    if (!amount || !selectedPool) return '0'
    const amountNum = parseFloat(amount)
    const fee = (amountNum * selectedPool.flashLoanFee) / 10000
    return fee.toFixed(6)
  }

  const formatLiquidity = (liquidity: string, decimals: number) => {
    const num = parseFloat(liquidity) / Math.pow(10, decimals)
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">⚡ Мгновенные займы</h3>
        <SimpleCard>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-400">Загрузка пулов мгновенных займов...</div>
          </div>
        </SimpleCard>
      </div>
    )
  }

  if (pools.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">⚡ Мгновенные займы</h3>
        <SimpleCard>
          <div className="text-center py-8">
            <div className="text-sm text-gray-400 mb-4">Нет доступных пулов для мгновенных займов</div>
            <SimpleButton onClick={loadFlashLoanPools}>
              Повторить
            </SimpleButton>
          </div>
        </SimpleCard>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">⚡ Мгновенные займы</h3>
      
      <SimpleCard className="p-4 border border-white/10">
        <div className="space-y-4">
          {/* Pool Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Выберите пул
            </label>
            <select
              value={selectedPool?.address || ''}
              onChange={(e) => {
                const pool = pools.find(p => p.address === e.target.value)
                setSelectedPool(pool || null)
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pools.map((pool) => (
                <option key={pool.address} value={pool.address} className="bg-gray-800">
                  {pool.assetSymbol} - {formatLiquidity(pool.availableLiquidity, pool.assetDecimals)} доступно
                </option>
              ))}
            </select>
          </div>

          {/* Pool Info */}
          {selectedPool && (
            <div className="bg-white/5 border border-white/10 p-3 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Актив:</span>
                  <span className="ml-2 font-medium text-white">{selectedPool.assetSymbol}</span>
                </div>
                <div>
                  <span className="text-gray-400">Комиссия:</span>
                  <span className="ml-2 font-medium text-white">{(selectedPool.flashLoanFee / 100).toFixed(2)}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Доступная ликвидность:</span>
                  <span className="ml-2 font-medium text-white">
                    {formatLiquidity(selectedPool.availableLiquidity, selectedPool.assetDecimals)} {selectedPool.assetSymbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Сумма займа
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Введите сумму в ${selectedPool?.assetSymbol || 'токенах'}`}
              step="0.000001"
              min="0"
              className="bg-gray-800 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Fee Calculation */}
          {amount && selectedPool && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md">
              <div className="text-sm">
                <div className="flex justify-between text-white">
                  <span>Сумма займа:</span>
                  <span className="font-medium">{amount} {selectedPool.assetSymbol}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Комиссия:</span>
                  <span className="font-medium">{calculateFee()} {selectedPool.assetSymbol}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 mt-2 text-white">
                  <span className="font-medium">К возврату:</span>
                  <span className="font-medium">
                    {(parseFloat(amount) + parseFloat(calculateFee())).toFixed(6)} {selectedPool.assetSymbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
            <div className="text-sm text-yellow-300">
              <strong>⚠️ Внимание:</strong> Мгновенные займы должны быть возвращены в той же транзакции. 
              Убедитесь, что у вас есть стратегия возврата займа + комиссии, иначе транзакция провалится.
            </div>
          </div>

          {/* Execute Button */}
          <SimpleButton
            onClick={executeFlashLoan}
            disabled={!selectedPool || !amount || parseFloat(amount) <= 0 || isExecuting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? 'Выполнение займа...' : 'Выполнить мгновенный заём'}
          </SimpleButton>

          {/* Repay Button */}
          <SimpleButton
            onClick={repayFlashLoan}
            disabled={!selectedPool || isRepaying}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRepaying ? 'Возврат займа...' : 'Вернуть мгновенный заём'}
          </SimpleButton>

          {/* Info */}
          <div className="text-xs text-gray-400 text-center">
            Мгновенные займы — это продвинутые DeFi операции. Используйте только если понимаете риски и имеете стратегию возврата.
          </div>
        </div>
      </SimpleCard>
    </div>
  )
}
