'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { TokenBalance } from '@/features/defi/types'
import { formatCurrency, formatTokenAmount, formatPercentage } from '@/features/defi/utils'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { SimpleCard } from '@/components/ui/simple-card'

interface PortfolioSectionProps {
  tokens: TokenBalance[]
  showDetails: boolean
  isLoading: boolean
  onToggleDetails: () => void
  onRefresh: () => void
  onTokenClick: (token: TokenBalance['token']) => void
}

export function PortfolioSection({
  tokens,
  showDetails,
  isLoading,
  onToggleDetails,
  onRefresh,
  onTokenClick
}: PortfolioSectionProps) {

  const handleToggleDetails = () => {
    hapticFeedback?.impact?.('light')
    onToggleDetails()
  }

  const handleRefresh = () => {
    hapticFeedback?.impact?.('medium')
    onRefresh()
  }

  const handleTokenClick = (token: TokenBalance['token']) => {
    hapticFeedback?.selection?.()
    onTokenClick(token)
  }

  return (
    <div className="px-5 space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Мои активы</h3>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleDetails}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
          >
            {showDetails ? (
              <EyeOff className="w-4 h-4 text-gray-400" />
            ) : (
              <Eye className="w-4 h-4 text-gray-400" />
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Tokens List */}
      <div className="space-y-3">
        {tokens.map((tokenBalance, index) => {
          const { token, balance, usdValue, change24h } = tokenBalance
          const isPositive = change24h >= 0
          
          return (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <SimpleCard
                className="p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                onClick={() => handleTokenClick(token)}
              >
                <div className="flex items-center justify-between">
                  {/* Token Info */}
                  <div className="flex items-center space-x-4">
                    {/* Token Icon */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                      
                      {/* Price change indicator */}
                      <div className={`
                        absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
                        ${isPositive ? 'bg-green-500' : 'bg-red-500'}
                      `}>
                        {isPositive ? (
                          <TrendingUp className="w-2 h-2 text-white" />
                        ) : (
                          <TrendingDown className="w-2 h-2 text-white" />
                        )}
                      </div>
                    </div>
                    
                    {/* Token Details */}
                    <div>
                      <h4 className="font-semibold text-white">{token.name}</h4>
                      <p className="text-sm text-gray-400">{token.symbol}</p>
                      {showDetails && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTokenAmount(balance, token.decimals)} {token.symbol}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Token Values */}
                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {formatCurrency(usdValue)}
                    </p>
                    <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(change24h)}
                    </p>
                    {showDetails && (
                      <p className="text-xs text-gray-400 mt-1">
                        ${token.price.toFixed(token.price < 1 ? 4 : 2)}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Extended Details */}
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-800/50"
                  >
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="text-center">
                        <p className="text-gray-400">24ч изменение</p>
                        <p className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(token.change24h)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-gray-400">Объем 24ч</p>
                        <p className="text-white font-medium">
                          {formatCurrency(token.volume24h)}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-gray-400">Рын. кап.</p>
                        <p className="text-white font-medium">
                          {formatCurrency(token.marketCap)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </SimpleCard>
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {tokens.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Портфолио пусто
          </h3>
          <p className="text-sm text-gray-500">
            Купите или обменяйте токены, чтобы начать работу с DeFi
          </p>
        </motion.div>
      )}
    </div>
  )
}



















































