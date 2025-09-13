'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Gamepad2,
  Heart,
  Bell,
  BarChart3,
  Zap,
  Star,
  ArrowUpRight,
  Settings,
  Gift,
  Award,
  Calendar,
  Repeat
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface YieldOpportunity {
  id: string
  protocol: string
  pair: string
  apy: number
  tvl: number
  risk: 'low' | 'medium' | 'high'
  category: 'staking' | 'farming' | 'lending'
  featured: boolean
}

interface AutoInvestPlan {
  id: string
  name: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly'
  tokens: string[]
  isActive: boolean
  totalInvested: number
  currentValue: number
}

interface Achievement {
  id: string
  title: string
  description: string
  xp: number
  icon: string
  unlocked: boolean
  progress: number
  maxProgress: number
}

interface AdditionalFeaturesProps {
  onOpenYieldAggregator: () => void
  onOpenAnalytics: () => void
  onOpenAutoInvest: () => void
  onOpenGameification: () => void
  onOpenWatchlist: () => void
  onOpenNotifications: () => void
}

//  Mock данные удалены - компонент теперь получает данные через props или API

export function AdditionalFeatures({
  onOpenYieldAggregator,
  onOpenAnalytics,
  onOpenAutoInvest,
  onOpenGameification,
  onOpenWatchlist,
  onOpenNotifications
}: AdditionalFeaturesProps) {
  const [selectedTab, setSelectedTab] = useState<'yield' | 'auto' | 'analytics' | 'gaming'>('yield')

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="px-5 space-y-6">
      
      {/* Feature Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SimpleButton
            onClick={() => {
              hapticFeedback.impact('medium')
              onOpenWatchlist()
            }}
            className="flex items-center justify-center gap-2 h-14"
          >
            <Heart className="w-5 h-5" />
            Избранное
          </SimpleButton>
          
          <SimpleButton
            onClick={() => {
              hapticFeedback.impact('medium')
              onOpenNotifications()
            }}
            className="flex items-center justify-center gap-2 h-14"
          >
            <Bell className="w-5 h-5" />
            Уведомления
          </SimpleButton>
        </div>

        {/* Feature Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'yield', label: 'Yield', icon: TrendingUp },
            { id: 'auto', label: 'Авто-инвест', icon: Repeat },
            { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
            { id: 'gaming', label: 'Достижения', icon: Gamepad2 }
          ].map((tab) => {
            const isActive = selectedTab === tab.id
            const IconComponent = tab.icon
            
            return (
              <motion.button
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : 'text-gray-400 hover:text-white bg-white/5'
                }`}
                onClick={() => {
                  hapticFeedback.impact('light')
                  setSelectedTab(tab.id as any)
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

      {/* Yield Aggregator */}
      {selectedTab === 'yield' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Лучшие доходности</h3>
            <SimpleButton
              size="sm"
              onClick={() => {
                hapticFeedback.impact('medium')
                onOpenYieldAggregator()
              }}
            >
              Сравнить все
            </SimpleButton>
          </div>
          
          {/*  TODO: Заменить на реальные yield возможности */}
          {[].map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold">{opportunity.protocol}</h4>
                      {opportunity.featured && (
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{opportunity.pair}</p>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={getRiskBadgeColor(opportunity.risk)}>
                        {opportunity.risk === 'low' ? 'Низкий риск' : 
                         opportunity.risk === 'medium' ? 'Средний риск' : 'Высокий риск'}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        TVL: ${(opportunity.tvl / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{opportunity.apy}%</p>
                    <p className="text-xs text-gray-400">APY</p>
                    <SimpleButton
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        hapticFeedback.impact('medium')
                        // Navigate to specific protocol
                      }}
                    >
                      Инвестировать
                    </SimpleButton>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Auto-Invest Plans */}
      {selectedTab === 'auto' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Авто-инвест планы</h3>
            <SimpleButton
              size="sm"
              gradient={true}
              onClick={() => {
                hapticFeedback.impact('medium')
                onOpenAutoInvest()
              }}
            >
              Создать план
            </SimpleButton>
          </div>
          
          {/*  TODO: Заменить на реальные планы автоинвестирования */}
          {[].map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className="p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">{plan.name}</h4>
                      <Badge className={plan.isActive ? 
                        'bg-green-500/20 text-green-400 border-green-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }>
                        {plan.isActive ? 'Активен' : 'Остановлен'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      ${plan.amount} • {plan.frequency === 'weekly' ? 'Еженедельно' : 
                        plan.frequency === 'monthly' ? 'Ежемесячно' : 'Ежедневно'}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-medium">${plan.currentValue}</p>
                    <p className={`text-xs ${plan.currentValue >= plan.totalInvested ? 'text-green-400' : 'text-red-400'}`}>
                      {plan.currentValue >= plan.totalInvested ? '+' : ''}
                      ${(plan.currentValue - plan.totalInvested).toFixed(0)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {plan.tokens.map(token => (
                    <Badge key={token} className="bg-white/10 text-white border-white/20 text-xs">
                      {token}
                    </Badge>
                  ))}
                </div>
              </SimpleCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Analytics */}
      {selectedTab === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold text-white">DeFi Аналитика</h3>
          
          <SimpleCard className="p-6 border border-white/10">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-semibold">Доходность</h4>
                </div>
                <p className="text-2xl font-bold text-green-400">+12.4%</p>
                <p className="text-sm text-gray-400">За 30 дней</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-white font-semibold">Риск-профиль</h4>
                </div>
                <p className="text-2xl font-bold text-yellow-400">Средний</p>
                <p className="text-sm text-gray-400">Умеренный</p>
              </div>
            </div>
            
            <SimpleButton
              onClick={() => {
                hapticFeedback.impact('medium')
                onOpenAnalytics()
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Подробная аналитика
            </SimpleButton>
          </SimpleCard>
        </motion.div>
      )}

      {/* Gaming & Achievements */}
      {selectedTab === 'gaming' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Достижения</h3>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">2,400 XP</span>
            </div>
          </div>
          
          {/*  TODO: Заменить на реальные достижения */}
          {[].map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <SimpleCard className={`p-4 border transition-all duration-200 ${
                achievement.unlocked 
                  ? 'border-green-500/50 bg-green-500/5' 
                  : 'border-white/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${achievement.unlocked ? 'grayscale-0' : 'grayscale'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${achievement.unlocked ? 'text-green-400' : 'text-white'}`}>
                        {achievement.title}
                      </h4>
                      {achievement.unlocked && (
                        <Award className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                    
                    {!achievement.unlocked && (
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {achievement.unlocked ? 'Разблокировано' : 
                         `${achievement.progress}/${achievement.maxProgress}`}
                      </span>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400">{achievement.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ))}
          
          <SimpleButton
            gradient={true}
            onClick={() => {
              hapticFeedback.impact('medium')
              onOpenGameification()
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-4 h-4" />
            Все достижения
          </SimpleButton>
        </motion.div>
      )}
    </div>
  )
}


