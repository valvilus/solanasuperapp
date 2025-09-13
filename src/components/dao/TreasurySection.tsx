'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Coins, TrendingUp, TrendingDown, DollarSign, ArrowRight, PieChart, ExternalLink } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TreasuryAsset {
  mint: string
  symbol: string
  name: string
  balance: number
  usdValue: number
  percentage: number
  icon: string
}

interface TreasurySectionProps {
  treasuryAddress: string
  totalValueUSD: number
  monthlyIncome: number
  monthlyExpenses: number
  growthRate: number
  assets: TreasuryAsset[]
  recentTransactions: Array<{
    id: string
    title: string
    description: string
    date: string
    type: string
  }>
  isLoading?: boolean
  className?: string
}

export function TreasurySection({
  treasuryAddress,
  totalValueUSD,
  monthlyIncome,
  monthlyExpenses,
  growthRate,
  assets,
  recentTransactions,
  isLoading = false,
  className = ''
}: TreasurySectionProps) {

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-24 bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-700 rounded"></div>
          </div>
          <div className="h-48 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  const netIncome = monthlyIncome - monthlyExpenses
  const isGrowthPositive = growthRate > 0

  // Функция для открытия Solana Explorer
  const openSolanaExplorer = (address: string, type: 'address' | 'tx' = 'address') => {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'https://explorer.solana.com' 
      : 'https://explorer.solana.com'
    
    const cluster = process.env.NODE_ENV === 'development' ? '?cluster=devnet' : ''
    const url = `${baseUrl}/${type}/${address}${cluster}`
    
    window.open(url, '_blank')
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-green-400" />
            <span>Казна DAO</span>
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-sm text-gray-400">
              Адрес: {treasuryAddress.substring(0, 8)}...{treasuryAddress.slice(-6)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openSolanaExplorer(treasuryAddress)}
              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Explore
            </Button>
          </div>
        </div>
        
        <Badge variant={isGrowthPositive ? "default" : "destructive"} className="text-xs">
          {isGrowthPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {isGrowthPositive ? '+' : ''}{growthRate.toFixed(1)}%
        </Badge>
      </div>

      {/* Treasury Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Value */}
        <SimpleCard className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Общая стоимость</p>
              <p className="text-2xl font-bold text-green-400">
                ${totalValueUSD.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400/60" />
          </div>
        </SimpleCard>

        {/* Monthly Income */}
        <SimpleCard className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Доходы/месяц</p>
              <p className="text-2xl font-bold text-blue-400">
                ${monthlyIncome.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400/60" />
          </div>
        </SimpleCard>

        {/* Net Income */}
        <SimpleCard className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Чистый доход</p>
              <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}
              </p>
            </div>
            {netIncome >= 0 ? 
              <TrendingUp className="w-8 h-8 text-green-400/60" /> : 
              <TrendingDown className="w-8 h-8 text-red-400/60" />
            }
          </div>
        </SimpleCard>
      </div>

      {/* Assets Portfolio */}
      <SimpleCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            <span>Активы казны</span>
          </h3>
          <Badge variant="outline" className="text-xs">
            {assets.length} активов
          </Badge>
        </div>

        <div className="space-y-3">
          {assets.map((asset, index) => (
            <motion.div
              key={asset.mint}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{asset.icon}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{asset.symbol}</span>
                    <Badge variant="outline" className="text-xs">
                      {asset.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{asset.name}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-white">
                  ${asset.usdValue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">
                  {asset.balance.toLocaleString()} {asset.symbol}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openSolanaExplorer(asset.mint)}
                  className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Explore Token
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </SimpleCard>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <SimpleCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Последние операции</h3>
            <Badge variant="outline" className="text-xs">
              {recentTransactions.length} операций
            </Badge>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-white">{tx.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {tx.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-1">{tx.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(tx.date).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      // В реальной ситуации здесь был бы реальный transaction signature
                      // Пока используем ID транзакции как заглушку
                      openSolanaExplorer(tx.id, 'tx')
                    }}
                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Explore
                  </Button>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        </SimpleCard>
      )}

      {/* Empty state */}
      {assets.length === 0 && (
        <SimpleCard className="p-8 text-center">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Казна пуста</h3>
          <p className="text-gray-400">
            Активы казны DAO будут отображены здесь после первых операций
          </p>
        </SimpleCard>
      )}
    </div>
  )
}

