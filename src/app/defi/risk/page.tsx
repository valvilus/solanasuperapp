'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Shield, AlertTriangle, TrendingDown, TrendingUp, Activity, Eye, EyeOff, RefreshCw, Target, BarChart3, PieChart, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Progress } from '@/components/ui/progress'
import { MainPageSkeleton } from '@/components/ui/MainPageSkeleton'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface RiskMetrics {
  portfolioValue: number
  var95: number
  var99: number
  expectedShortfall: number
  maxDrawdown: number
  volatility: number
  beta: number
  sharpeRatio: number
  informationRatio: number
}

interface RiskAlert {
  id: string
  type: 'LIQUIDATION_RISK' | 'PROTOCOL_RISK' | 'PORTFOLIO_RISK' | 'MARKET_RISK'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  actionRequired: string
  affectedPositions?: string[]
  threshold?: number
  currentValue?: number
  createdAt: Date
  isActive: boolean
}

interface StressScenario {
  name: string
  description: string
  portfolioImpact: number
  impactPercent: number
  probability: number
}

export default function RiskManagementPage() {
  const router = useRouter()
  const { apiCall } = useCompatibleAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'stress' | 'protocols'>('overview')
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)
  
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    portfolioValue: 0,
    var95: 0,
    var99: 0,
    expectedShortfall: 0,
    maxDrawdown: 0,
    volatility: 0,
    beta: 0,
    sharpeRatio: 0,
    informationRatio: 0
  })
  
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([])
  const [stressScenarios, setStressScenarios] = useState<StressScenario[]>([])
  const [protocolRisks, setProtocolRisks] = useState<any[]>([])

  useEffect(() => {
    loadRiskData()
  }, [])

  const loadRiskData = async () => {
    try {
      setIsLoading(true)
      
      // Mock data for demonstration
      setRiskMetrics({
        portfolioValue: 15420.50,
        var95: 2313.08,
        var99: 3084.10,
        expectedShortfall: 3547.32,
        maxDrawdown: 0.28,
        volatility: 0.65,
        beta: 1.15,
        sharpeRatio: 0.78,
        informationRatio: 0.52
      })

      setRiskAlerts([
        {
          id: '1',
          type: 'LIQUIDATION_RISK',
          severity: 'HIGH',
          title: 'Высокий риск ликвидации',
          description: 'Позиция в SOL требует внимания. Health Factor: 1.25',
          actionRequired: 'Добавьте залог или погасите часть долга',
          affectedPositions: ['SOL'],
          threshold: 1.3,
          currentValue: 1.25,
          createdAt: new Date(),
          isActive: true
        },
        {
          id: '2',
          type: 'PORTFOLIO_RISK',
          severity: 'MEDIUM',
          title: 'Высокая концентрация активов',
          description: 'SOL составляет 65% портфеля',
          actionRequired: 'Рассмотрите диверсификацию',
          affectedPositions: ['SOL'],
          threshold: 50,
          currentValue: 65,
          createdAt: new Date(),
          isActive: true
        },
        {
          id: '3',
          type: 'MARKET_RISK',
          severity: 'MEDIUM',
          title: 'Высокая волатильность рынка',
          description: 'Индекс волатильности: 85',
          actionRequired: 'Будьте осторожны с новыми позициями',
          threshold: 80,
          currentValue: 85,
          createdAt: new Date(),
          isActive: true
        }
      ])

      setStressScenarios([
        {
          name: 'Crypto Market Crash',
          description: 'Major cryptocurrency market decline (-50%)',
          portfolioImpact: -6168.20,
          impactPercent: -40,
          probability: 0.05
        },
        {
          name: 'DeFi Protocol Exploit',
          description: 'Major DeFi protocol security breach',
          portfolioImpact: -2313.08,
          impactPercent: -15,
          probability: 0.08
        },
        {
          name: 'Regulatory Crackdown',
          description: 'Strict cryptocurrency regulations',
          portfolioImpact: -3855.13,
          impactPercent: -25,
          probability: 0.12
        }
      ])

      setProtocolRisks([
        {
          protocol: 'TNG Lending',
          riskLevel: 'LOW',
          riskScore: 85,
          auditScore: 85,
          tvlChange24h: -5.2,
          volumeChange24h: 12.3
        },
        {
          protocol: 'TNG Swap',
          riskLevel: 'MEDIUM',
          riskScore: 72,
          auditScore: 80,
          tvlChange24h: 8.1,
          volumeChange24h: 25.6
        },
        {
          protocol: 'TNG Farming',
          riskLevel: 'MEDIUM',
          riskScore: 68,
          auditScore: 75,
          tvlChange24h: -2.1,
          volumeChange24h: 5.4
        }
      ])
    } catch (error) {
      console.error('Error loading risk data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/defi')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400'
      case 'HIGH': return 'text-orange-400'
      case 'MEDIUM': return 'text-yellow-400'
      case 'LOW': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/10 border-red-500/20'
      case 'HIGH': return 'bg-orange-500/10 border-orange-500/20'
      case 'MEDIUM': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'LOW': return 'bg-green-500/10 border-green-500/20'
      default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400'
      case 'HIGH': return 'text-orange-400'
      case 'MEDIUM': return 'text-yellow-400'
      case 'LOW': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const LoadingFallback = () => <MainPageSkeleton />

  if (isLoading) {
    return <LoadingFallback />
  }

  return (
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
                <h1 className="text-xl font-bold text-white">
                  Risk <span className="text-red-400">Management</span>
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Управление рисками портфеля</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={loadRiskData}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </motion.button>
            </div>
          </div>

          <motion.div
            className="flex items-center gap-4 text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Защищено</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>Мониторинг 24/7</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{riskAlerts.length} активных алертов</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Portfolio Value */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SimpleCard>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-400">Стоимость портфеля</p>
              <p className="text-3xl font-bold text-white">
                {isBalanceVisible ? formatCurrency(riskMetrics.portfolioValue) : '••••••'}
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-400">VaR 95%: {isBalanceVisible ? formatCurrency(riskMetrics.var95) : '••••'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-gray-400">Max DD: {(riskMetrics.maxDrawdown * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </SimpleCard>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="px-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex bg-white/5 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Обзор', icon: BarChart3 },
              { id: 'alerts', label: 'Алерты', icon: AlertTriangle },
              { id: 'stress', label: 'Стресс-тесты', icon: Zap },
              { id: 'protocols', label: 'Протоколы', icon: Shield }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  hapticFeedback.impact('light')
                }}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-xs">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Risk Metrics */}
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Метрики риска</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Коэффициент Шарпа</p>
                      <p className="text-lg font-bold text-green-400">{riskMetrics.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Бета</p>
                      <p className="text-lg font-bold text-blue-400">{riskMetrics.beta.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Волатильность</p>
                      <p className="text-lg font-bold text-yellow-400">{(riskMetrics.volatility * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Info Ratio</p>
                      <p className="text-lg font-bold text-purple-400">{riskMetrics.informationRatio.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </SimpleCard>

              {/* VaR Breakdown */}
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Value at Risk</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">VaR 95% (1 день)</span>
                        <span className="text-green-400">{formatCurrency(riskMetrics.var95)}</span>
                      </div>
                      <Progress value={(riskMetrics.var95 / riskMetrics.portfolioValue) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">VaR 99% (1 день)</span>
                        <span className="text-orange-400">{formatCurrency(riskMetrics.var99)}</span>
                      </div>
                      <Progress value={(riskMetrics.var99 / riskMetrics.portfolioValue) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Expected Shortfall</span>
                        <span className="text-red-400">{formatCurrency(riskMetrics.expectedShortfall)}</span>
                      </div>
                      <Progress value={(riskMetrics.expectedShortfall / riskMetrics.portfolioValue) * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              </SimpleCard>
            </motion.div>
          ) : activeTab === 'alerts' ? (
            <motion.div
              key="alerts"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {riskAlerts.length === 0 ? (
                <SimpleCard>
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-400">Активных алертов нет</p>
                    <p className="text-sm text-gray-500 mt-1">Ваш портфель находится в безопасной зоне</p>
                  </div>
                </SimpleCard>
              ) : (
                <div className="space-y-3">
                  {riskAlerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <SimpleCard>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className={`w-4 h-4 ${getSeverityColor(alert.severity)}`} />
                                <h4 className="text-white font-semibold text-sm">{alert.title}</h4>
                                <div className={`px-2 py-1 rounded-full text-xs border ${getSeverityBg(alert.severity)}`}>
                                  <span className={getSeverityColor(alert.severity)}>{alert.severity}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-400 mb-2">{alert.description}</p>
                              <p className="text-xs text-blue-400">{alert.actionRequired}</p>
                            </div>
                          </div>
                          
                          {alert.threshold && alert.currentValue && (
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Пороговое значение: {alert.threshold}</span>
                                <span>Текущее: {alert.currentValue}</span>
                              </div>
                              <Progress 
                                value={Math.min((alert.currentValue / alert.threshold) * 100, 100)} 
                                className="h-1" 
                              />
                            </div>
                          )}
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'stress' ? (
            <motion.div
              key="stress"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Стресс-сценарии</h3>
                  <p className="text-sm text-gray-400">Влияние различных рыночных событий на ваш портфель</p>
                </div>
              </SimpleCard>

              <div className="space-y-3">
                {stressScenarios.map((scenario, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <SimpleCard>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold">{scenario.name}</h4>
                            <p className="text-sm text-gray-400">{scenario.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-400">
                              {formatCurrency(scenario.portfolioImpact)}
                            </p>
                            <p className="text-sm text-red-400">{scenario.impactPercent}%</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">
                            Вероятность: {(scenario.probability * 100).toFixed(1)}%
                          </span>
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">Высокое влияние</span>
                          </div>
                        </div>
                      </div>
                    </SimpleCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="protocols"
              className="px-5 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SimpleCard>
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Риски протоколов</h3>
                  <p className="text-sm text-gray-400">Оценка безопасности используемых DeFi протоколов</p>
                </div>
              </SimpleCard>

              <div className="space-y-3">
                {protocolRisks.map((protocol, index) => (
                  <motion.div
                    key={protocol.protocol}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <SimpleCard>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold">{protocol.protocol}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-sm ${getRiskLevelColor(protocol.riskLevel)}`}>
                                {protocol.riskLevel} RISK
                              </span>
                              <span className="text-xs text-gray-400">
                                Аудит: {protocol.auditScore}/100
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">{protocol.riskScore}</div>
                            <div className="text-xs text-gray-400">Risk Score</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-gray-400">TVL 24h</p>
                            <div className="flex items-center gap-1">
                              {protocol.tvlChange24h > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-400" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-400" />
                              )}
                              <span className={protocol.tvlChange24h > 0 ? 'text-green-400' : 'text-red-400'}>
                                {protocol.tvlChange24h > 0 ? '+' : ''}{protocol.tvlChange24h.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400">Volume 24h</p>
                            <div className="flex items-center gap-1">
                              {protocol.volumeChange24h > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-400" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-400" />
                              )}
                              <span className={protocol.volumeChange24h > 0 ? 'text-green-400' : 'text-red-400'}>
                                {protocol.volumeChange24h > 0 ? '+' : ''}{protocol.volumeChange24h.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <Progress value={protocol.riskScore} className="h-2" />
                      </div>
                    </SimpleCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  )
}
