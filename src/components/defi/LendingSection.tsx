'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  Percent,
  Timer,
  Image as ImageIcon,
  Coins,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface LendingPool {
  id: string
  token: string
  totalSupply: number
  totalBorrow: number
  supplyAPY: number
  borrowAPY: number
  collateralFactor: number
  liquidationThreshold: number
  utilizationRate: number
}

interface LoanOffer {
  id: string
  amount: number
  token: string
  duration: number // days
  interestRate: number // annual %
  collateralType: 'SOL' | 'NFT' | 'USDC'
  collateralRatio: number
  lender: string
  status: 'active' | 'funded' | 'repaid'
}

interface LendingSectionProps {
  pools: LendingPool[]
  userDeposits: any[]
  userLoans: any[]
  onSupply: (poolId: string, amount: number) => void
  onBorrow: (poolId: string, amount: number) => void
  onRepay: (loanId: string, amount: number) => void
}

//  Mock данные удалены - компонент теперь требует реальные данные через props

export function LendingSection({ 
  pools = [], //  Требует реальные данные
  userDeposits = [],
  userLoans = [],
  onSupply,
  onBorrow,
  onRepay
}: LendingSectionProps) {
  const [activeTab, setActiveTab] = useState<'supply' | 'borrow' | 'nft-fi'>('supply')
  const [selectedPool, setSelectedPool] = useState<LendingPool | null>(null)
  const [amount, setAmount] = useState<number>(0)

  const handleAction = (action: 'supply' | 'borrow') => {
    if (selectedPool && amount > 0) {
      hapticFeedback.impact('medium')
      if (action === 'supply') {
        onSupply(selectedPool.id, amount)
      } else {
        onBorrow(selectedPool.id, amount)
      }
      setAmount(0)
    }
  }

  const getHealthColor = (utilization: number) => {
    if (utilization < 0.5) return 'text-green-400'
    if (utilization < 0.8) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="px-5 space-y-6">
      
      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-yellow-500/10 to-orange-500/5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Мои депозиты</h3>
              </div>
              <p className="text-2xl font-bold text-white">$1,250.00</p>
              <p className="text-sm text-green-400">+$12.50 доходы</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-semibold">Мои займы</h3>
              </div>
              <p className="text-2xl font-bold text-white">$850.00</p>
              <p className="text-sm text-gray-400">Под 75% залог</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Здоровье позиции</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-green-400 rounded-full" />
                </div>
                <span className="text-sm text-green-400 font-medium">75%</span>
              </div>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/* Action Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="flex bg-gray-900/50 rounded-2xl p-1 backdrop-blur-sm border border-gray-800/50">
          {[
            { id: 'supply', label: 'Депозит', icon: ArrowUpRight },
            { id: 'borrow', label: 'Займ', icon: ArrowDownLeft },
            { id: 'nft-fi', label: 'NFT-Fi', icon: ImageIcon }
          ].map((tab) => {
            const isActive = activeTab === tab.id
            const IconComponent = tab.icon
            
            return (
              <motion.button
                key={tab.id}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => {
                  hapticFeedback.impact('light')
                  setActiveTab(tab.id as any)
                }}
                whileTap={{ scale: 0.96 }}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Supply Tab */}
      {activeTab === 'supply' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold text-white">Выдать кредит</h3>
          <p className="text-sm text-gray-400">Депонируйте токены и получайте проценты</p>
          
          {pools.map((pool, index) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard 
                className={`p-4 border transition-all duration-200 ${
                  selectedPool?.id === pool.id 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => {
                  hapticFeedback.impact('light')
                  setSelectedPool(pool)
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{pool.token}</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{pool.token} Pool</h4>
                      <p className="text-xs text-gray-400">
                        Ликвидность: ${pool.totalSupply.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-400">{pool.supplyAPY}%</p>
                    <p className="text-xs text-gray-400">APY</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">Использование</p>
                    <p className={`font-medium ${getHealthColor(pool.utilizationRate)}`}>
                      {(pool.utilizationRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Всего займов</p>
                    <p className="text-white">${pool.totalBorrow.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Залог</p>
                    <p className="text-white">{(pool.collateralFactor * 100)}%</p>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Borrow Tab */}
      {activeTab === 'borrow' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold text-white">Взять займ</h3>
          <p className="text-sm text-gray-400">Получите кредит под залог ваших активов</p>
          
          {pools.map((pool, index) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{pool.token}</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">Займ {pool.token}</h4>
                      <p className="text-xs text-gray-400">
                        Доступно: ${(pool.totalSupply - pool.totalBorrow).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-400">{pool.borrowAPY}%</p>
                    <p className="text-xs text-gray-400">APY</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-gray-500">LTV</p>
                    <p className="text-white">{(pool.collateralFactor * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ликвидация</p>
                    <p className="text-red-400">{(pool.liquidationThreshold * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Использование</p>
                    <p className={`font-medium ${getHealthColor(pool.utilizationRate)}`}>
                      {(pool.utilizationRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                <SimpleButton
                  size="sm"
                  onClick={() => {
                    hapticFeedback.impact('medium')
                    onBorrow(pool.id, 0)
                  }}
                  className="w-full"
                >
                  Взять займ {pool.token}
                </SimpleButton>
              </SimpleCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* NFT-Fi Tab */}
      {activeTab === 'nft-fi' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold text-white">NFT как залог</h3>
          <p className="text-sm text-gray-400">Используйте NFT для получения займов</p>
          
          <SimpleCard className="p-6 border border-white/10 text-center">
            <div className="mb-4">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-white font-semibold mb-2">NFT кредитование</h4>
              <p className="text-sm text-gray-400 mb-4">
                Получите займ под залог ваших NFT с мгновенной оценкой
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              {/*  TODO: Заменить на реальные займы */}
              {[].map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="text-left">
                    <p className="text-white font-medium">{loan.amount} {loan.token}</p>
                    <p className="text-xs text-gray-400">
                      {loan.duration} дней • {loan.interestRate}% APR
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      {loan.collateralType}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      LTV: {(1/loan.collateralRatio * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <SimpleButton
              gradient={true}
              onClick={() => {
                hapticFeedback.impact('medium')
                // Open NFT lending modal
              }}
              className="w-full"
            >
              Подключить NFT кошелек
            </SimpleButton>
          </SimpleCard>
        </motion.div>
      )}

      {/* Risk Warning */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <SimpleCard className="p-4 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-yellow-400 font-medium mb-1">Предупреждение о рисках</h4>
              <p className="text-sm text-gray-300">
                Займы под залог могут быть ликвидированы при снижении стоимости залога. 
                Внимательно следите за здоровьем позиции.
              </p>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}


