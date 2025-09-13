'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  Shield, 
  Calculator,
  ChevronRight,
  Star,
  Users
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

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
}

interface StakingSectionProps {
  validators: Validator[]
  userStaked: number
  totalRewards: number
  onStake: (validatorId: string, amount: number) => void
  onUnstake: (amount: number) => void
  onSelectValidator: (validator: Validator) => void
}

//  Mock данные удалены - компонент теперь требует реальные данные через props

export function StakingSection({ 
  validators = [], //  Требует реальные данные
  userStaked = 0,
  totalRewards = 0,
  onStake,
  onUnstake,
  onSelectValidator
}: StakingSectionProps) {
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null)
  const [stakeAmount, setStakeAmount] = useState<number>(0)
  const [showCalculator, setShowCalculator] = useState(false)

  const handleValidatorSelect = (validator: Validator) => {
    hapticFeedback.impact('light')
    setSelectedValidator(validator)
    onSelectValidator(validator)
  }

  const handleStake = () => {
    if (selectedValidator && stakeAmount > 0) {
      hapticFeedback.impact('medium')
      onStake(selectedValidator.id, stakeAmount)
      setStakeAmount(0)
    }
  }

  const calculateRewards = (amount: number, apr: number) => {
    return (amount * apr) / 100 / 365 // Daily rewards
  }

  return (
    <div className="px-5 space-y-6">
      
      {/* Staking Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SimpleCard className="p-6 border border-white/10 bg-gradient-to-br from-solana-purple/10 to-solana-green/5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-solana-purple" />
                <h3 className="text-white font-semibold">Мой стейкинг</h3>
              </div>
              <p className="text-2xl font-bold text-white">{userStaked.toFixed(2)} SOL</p>
              <p className="text-sm text-gray-400">≈ ${(userStaked * 98.45).toFixed(2)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-solana-green" />
                <h3 className="text-white font-semibold">Награды</h3>
              </div>
              <p className="text-2xl font-bold text-solana-green">+{totalRewards.toFixed(4)} SOL</p>
              <p className="text-sm text-gray-400">За все время</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xs text-gray-400">APR</p>
              <p className="text-sm font-medium text-white">~7.2%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Разморозка</p>
              <p className="text-sm font-medium text-white">2-3 эпохи</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Мин. сумма</p>
              <p className="text-sm font-medium text-white">0.01 SOL</p>
            </div>
          </div>
        </SimpleCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="grid grid-cols-3 gap-3">
          <SimpleButton
            gradient={true}
            size="sm"
            onClick={() => {
              hapticFeedback.impact('medium')
              // Open stake modal
            }}
            className="flex flex-col items-center gap-1 h-16"
          >
            <Coins className="w-5 h-5" />
            <span className="text-xs">Застейкать</span>
          </SimpleButton>
          
          <SimpleButton
            size="sm"
            onClick={() => {
              hapticFeedback.impact('medium')
              // Open unstake modal
            }}
            className="flex flex-col items-center gap-1 h-16"
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs">Анстейк</span>
          </SimpleButton>
          
          <SimpleButton
            size="sm"
            onClick={() => {
              hapticFeedback.impact('light')
              setShowCalculator(!showCalculator)
            }}
            className="flex flex-col items-center gap-1 h-16"
          >
            <Calculator className="w-5 h-5" />
            <span className="text-xs">Калькулятор</span>
          </SimpleButton>
        </div>
      </motion.div>

      {/* Calculator */}
      {showCalculator && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SimpleCard className="p-4 border border-white/10">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Калькулятор доходности
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Сумма для стейкинга (SOL)</label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  placeholder="0.00"
                />
              </div>
              {stakeAmount > 0 && selectedValidator && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">Доход в день</p>
                      <p className="text-white font-medium">
                        {calculateRewards(stakeAmount, selectedValidator.apr).toFixed(6)} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Доход в год</p>
                      <p className="text-solana-green font-medium">
                        {(stakeAmount * selectedValidator.apr / 100).toFixed(3)} SOL
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SimpleCard>
        </motion.div>
      )}

      {/* Validators List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Валидаторы</h3>
        <div className="space-y-3">
          {validators.map((validator, index) => (
            <motion.div
              key={validator.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.3 }}
            >
              <SimpleCard 
                className={`p-4 border transition-all duration-200 ${
                  selectedValidator?.id === validator.id 
                    ? 'border-solana-purple/50 bg-solana-purple/5' 
                    : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => handleValidatorSelect(validator)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">{validator.name}</h4>
                      {validator.uptime > 99.5 && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Топ
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{validator.description}</p>
                    
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">APR</p>
                        <p className="text-solana-green font-medium">{validator.apr}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Комиссия</p>
                        <p className="text-white">{validator.commission}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Аптайм</p>
                        <p className="text-white">{validator.uptime}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Стейкеры</p>
                        <p className="text-gray-300">{(validator.totalStaked / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {validator.uptime > 99.5 && (
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stake Button */}
      {selectedValidator && stakeAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 z-10"
        >
          <SimpleButton
            gradient={true}
            onClick={handleStake}
            className="w-full py-4 text-base font-semibold"
          >
            Застейкать {stakeAmount} SOL в {selectedValidator.name}
          </SimpleButton>
        </motion.div>
      )}
    </div>
  )
}


