'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, Settings, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { Token, SwapQuote } from '@/features/defi/types'
import { formatTokenAmount, formatCurrency } from '@/features/defi/utils'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { SimpleCard } from '@/components/ui/simple-card'
import { Button } from '@/components/ui/button'
import { TokenLogo } from '@/components/wallet/TokenLogos'

interface SwapInterfaceProps {
  tokens: Token[]
  fromToken: Token | null
  toToken: Token | null
  amount: number
  quote: SwapQuote | null
  isLoadingQuote: boolean
  slippage: number
  onFromTokenSelect: (token: Token) => void
  onToTokenSelect: (token: Token) => void
  onAmountChange: (amount: number) => void
  onSwapTokens: () => void
  onSlippageChange: (slippage: number) => void
  onSwap: () => void
}

export function SwapInterface({
  tokens,
  fromToken,
  toToken,
  amount,
  quote,
  isLoadingQuote,
  slippage,
  onFromTokenSelect,
  onToTokenSelect,
  onAmountChange,
  onSwapTokens,
  onSlippageChange,
  onSwap
}: SwapInterfaceProps) {

  const [showSettings, setShowSettings] = useState(false)
  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null)

  const handleSwapClick = () => {
    hapticFeedback?.impact?.('medium')
    onSwapTokens()
  }

  const handleSettingsClick = () => {
    hapticFeedback?.impact?.('light')
    setShowSettings(!showSettings)
  }

  const handleTokenSelect = (token: Token) => {
    hapticFeedback?.selection?.()
    if (showTokenSelector === 'from') {
      onFromTokenSelect(token)
    } else {
      onToTokenSelect(token)
    }
    setShowTokenSelector(null)
  }

  const handleSwapExecute = () => {
    hapticFeedback?.impact?.('heavy')
    onSwap()
  }

  const canSwap = fromToken && toToken && amount > 0 && quote && !isLoadingQuote

  return (
    <div className="px-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Обмен токенов</h3>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSettingsClick}
          className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </motion.button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SimpleCard className="p-4">
              <h4 className="text-white font-semibold mb-3">Настройки обмена</h4>
              
              <div className="space-y-4">
                {/* Slippage Settings */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Допустимое проскальзывание
                  </label>
                  <div className="flex space-x-2">
                    {[0.1, 0.5, 1.0].map((value) => (
                      <button
                        key={value}
                        onClick={() => onSlippageChange(value)}
                        className={`
                          px-3 py-2 rounded-lg text-xs font-medium transition-colors
                          ${slippage === value
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                          }
                        `}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap Interface */}
      <SimpleCard className="p-6">
        {/* From Token */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Отдаете</label>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowTokenSelector('from')}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                >
                  {fromToken ? (
                    <>
                      <TokenLogo 
                        token={fromToken.symbol} 
                        className="w-8 h-8" 
                      />
                      <span className="text-white font-medium">{fromToken.symbol}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Выберите токен</span>
                  )}
                </button>
                
                <div className="text-right">
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-transparent text-white text-right text-xl font-semibold outline-none w-32"
                  />
                  {fromToken && amount > 0 && (
                    <p className="text-sm text-gray-400">
                      ${(amount * fromToken.price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              
              {fromToken && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Доступно: {formatTokenAmount(1000, fromToken.decimals)} {fromToken.symbol}</span>
                  <span>${fromToken.price.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSwapClick}
              className="p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-gray-900"
            >
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowUpDown className="w-5 h-5 text-white" />
              </motion.div>
            </motion.button>
          </div>

          {/* To Token */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Получаете</label>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowTokenSelector('to')}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                >
                  {toToken ? (
                    <>
                      <TokenLogo 
                        token={toToken.symbol} 
                        className="w-8 h-8" 
                      />
                      <span className="text-white font-medium">{toToken.symbol}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Выберите токен</span>
                  )}
                </button>
                
                <div className="text-right">
                  {isLoadingQuote ? (
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-700 rounded w-20 mb-1"></div>
                      <div className="h-4 bg-gray-700 rounded w-16"></div>
                    </div>
                  ) : quote && toToken ? (
                    <>
                      <p className="text-white text-xl font-semibold">
                        {formatTokenAmount(quote.outputAmount, toToken.decimals)}
                      </p>
                      <p className="text-sm text-gray-400">
                        ${(quote.outputAmount * toToken.price).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xl">0.00</p>
                  )}
                </div>
              </div>
              
              {toToken && (
                <div className="flex justify-end text-xs text-gray-400">
                  <span>${toToken.price.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {quote && fromToken && toToken && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gray-800/30 rounded-xl space-y-2"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Курс</span>
              <span className="text-white">
                1 {fromToken.symbol} = {(quote.outputAmount / quote.inputAmount).toFixed(6)} {toToken.symbol}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Проскальзывание</span>
              <span className="text-white">{(quote.slippage * 100).toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Комиссия</span>
              <span className="text-white">${quote.fee.toFixed(4)}</span>
            </div>
            
            {quote.priceImpact > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Влияние на цену</span>
                <span className={`${quote.priceImpact > 1 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwapExecute}
          disabled={!canSwap}
          className="w-full mt-6 h-14 text-lg font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingQuote ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span>Получение котировки...</span>
            </div>
          ) : !fromToken || !toToken ? (
            'Выберите токены'
          ) : amount === 0 ? (
            'Введите сумму'
          ) : (
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Обменять</span>
            </div>
          )}
        </Button>
      </SimpleCard>

      {/* Token Selector Modal */}
      <AnimatePresence>
        {showTokenSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowTokenSelector(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-gray-900 rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">Выберите токен</h3>
              
              <div className="space-y-2">
                {tokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleTokenSelect(token)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <TokenLogo 
                        token={token.symbol} 
                        className="w-10 h-10" 
                      />
                      <div className="text-left">
                        <h4 className="text-white font-medium">{token.name}</h4>
                        <p className="text-sm text-gray-400">{token.symbol}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white font-medium">${token.price.toFixed(4)}</p>
                      <p className={`text-sm ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



















































