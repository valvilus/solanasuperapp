/**
 * Wallet Selector - Choose between Custodial and External Wallets
 * Solana SuperApp - Block 4: External Wallets
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  ExternalLink, 
  Shield, 
  Zap, 
  ArrowLeftRight,
  Check,
  AlertCircle,
  Settings,
  Smartphone,
  Globe
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { formatTokenBalance } from '@/lib/formatters'

interface WalletSelectorProps {
  onClose?: () => void
  compact?: boolean
}

export function WalletSelector({ onClose, compact = false }: WalletSelectorProps) {
  const {
    custodial,
    external,
    activeWallet,
    connectExternalWallet,
    disconnectExternalWallet,
    selectWallet
  } = useWallet()
  
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const [isConnecting, setIsConnecting] = useState(false)

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleConnectExternal = async () => {
    try {
      setIsConnecting(true)
      hapticFeedback.impact('medium')
      
      // First try direct connection via our hook
      await connectExternalWallet()
      
      // If that doesn't open modal, try the wallet modal
      setTimeout(() => {
        setWalletModalVisible(true)
      }, 100)
      
    } catch (error) {
      console.error(' Error connecting external wallet:', error)
      // Fallback: open wallet modal directly
      setWalletModalVisible(true)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectExternal = async () => {
    try {
      hapticFeedback.impact('light')
      await disconnectExternalWallet()
    } catch (error) {
      console.error(' Error disconnecting wallet:', error)
    }
  }

  const handleSelectWallet = (type: 'custodial' | 'external') => {
    hapticFeedback.selection()
    selectWallet(type)
    onClose?.()
  }

  // =============================================================================
  // WALLET OPTIONS DATA
  // =============================================================================

  const walletOptions = [
    {
      id: 'custodial',
      title: 'Встроенный кошелек',
      subtitle: 'Управляется приложением',
      icon: Shield,
      address: custodial.address,
      balance: custodial.balance,
      isActive: activeWallet === 'custodial',
      isAvailable: !!custodial.address,
      features: ['Мгновенные переводы', 'Без комиссий', 'Автобэкап'],
      color: 'from-solana-purple/20 to-solana-purple/5',
      borderColor: 'border-solana-purple/30',
      pros: ['Простота использования', 'Нет потери ключей', 'Быстрые операции'],
      cons: ['Нет полного контроля', 'Доверие к платформе']
    },
    {
      id: 'external',
      title: 'Внешний кошелек',
      subtitle: 'Phantom, Solflare, и др.',
      icon: ExternalLink,
      address: external.address,
      balance: external.balance,
      isActive: activeWallet === 'external',
      isAvailable: external.isConnected,
      features: ['Полный контроль', 'Ваши ключи', 'DeFi доступ'],
      color: 'from-solana-green/20 to-solana-green/5',
      borderColor: 'border-solana-green/30',
      pros: ['Полный контроль', 'Децентрализация', 'Совместимость с DeFi'],
      cons: ['Риск потери ключей', 'Комиссии сети']
    }
  ]

  if (compact) {
    return <CompactWalletSelector walletOptions={walletOptions} onSelect={handleSelectWallet} />
  }

  // =============================================================================
  // FULL SELECTOR UI
  // =============================================================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-xl font-bold text-white mb-2">Выберите кошелек</h2>
        <p className="text-sm text-gray-400">
          Используйте встроенный или подключите внешний кошелек
        </p>
      </motion.div>

      {/* Wallet Options */}
      <div className="space-y-3">
        {walletOptions.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SimpleCard 
              className={`p-4 cursor-pointer transition-all duration-200 ${
                option.isActive 
                  ? `bg-gradient-to-br ${option.color} ${option.borderColor} border-2` 
                  : 'border border-white/10 hover:border-white/20'
              }`}
              onClick={() => {
                if (option.id === 'external' && !option.isAvailable) {
                  handleConnectExternal()
                } else if (option.isAvailable) {
                  handleSelectWallet(option.id as 'custodial' | 'external')
                }
              }}
            >
              <div className="flex items-start justify-between">
                {/* Left side - Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-sm">{option.title}</h3>
                      {option.isActive && (
                        <Check className="w-4 h-4 text-solana-green" />
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2">{option.subtitle}</p>
                    
                    {/* Address and Balance */}
                    {option.address ? (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-mono">
                          {option.address.slice(0, 4)}...{option.address.slice(-4)}
                        </p>
                        {option.balance && (
                          <p className="text-xs text-solana-cyan font-medium">
                            {formatTokenBalance(option.balance.sol, 'SOL', 'visual')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-orange-400">Не подключен</p>
                    )}

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {option.features.slice(0, 2).map((feature) => (
                        <Badge 
                          key={feature}
                          className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-300 border-white/10"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side - Status */}
                <div className="flex flex-col items-end gap-2">
                  {option.isAvailable ? (
                    <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                      Активен
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Не подключен
                    </Badge>
                  )}
                </div>
              </div>
            </SimpleCard>
          </motion.div>
        ))}
      </div>

      {/* External Wallet Actions */}
      {!external.isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SimpleButton
            onClick={handleConnectExternal}
            disabled={isConnecting}
            gradient={true}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {isConnecting ? 'Подключение...' : 'Подключить внешний кошелек'}
          </SimpleButton>
        </motion.div>
      )}

      {external.isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <SimpleButton
            onClick={handleDisconnectExternal}
            className="flex-1"
          >
            Отключить
          </SimpleButton>
          <SimpleButton
            onClick={() => console.log('TODO: Transfer between wallets')}
            gradient={true}
            className="flex-1"
          >
            <ArrowLeftRight className="w-4 h-4 mr-1" />
            Перевод
          </SimpleButton>
        </motion.div>
      )}

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4"
      >
        <SimpleCard className="p-3 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-200 font-medium mb-1">Совет</p>
              <p className="text-xs text-blue-300/80 leading-relaxed">
                Встроенный кошелек удобен для быстрых операций. Внешний кошелек дает полный контроль над средствами.
              </p>
            </div>
          </div>
        </SimpleCard>
      </motion.div>
    </div>
  )
}

// =============================================================================
// COMPACT SELECTOR COMPONENT
// =============================================================================

interface CompactWalletSelectorProps {
  walletOptions: any[]
  onSelect: (type: 'custodial' | 'external') => void
}

function CompactWalletSelector({ walletOptions, onSelect }: CompactWalletSelectorProps) {
  return (
    <div className="flex gap-2">
      {walletOptions.map((option) => (
        <motion.button
          key={option.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (option.id === 'external' && !option.isAvailable) {
              // TODO: Add connect external logic here
              console.log('Connect external wallet')
            } else if (option.isAvailable) {
              onSelect(option.id)
            }
          }}
          disabled={!option.isAvailable}
          className={`flex-1 p-3 rounded-lg border transition-all duration-200 ${
            option.isActive 
              ? `bg-gradient-to-br ${option.color} ${option.borderColor} border-2` 
              : 'border-white/10 hover:border-white/20'
          } ${!option.isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex flex-col items-center gap-2">
            <option.icon className="w-5 h-5 text-white" />
            <span className="text-xs text-white font-medium">{option.title}</span>
            {option.isActive && (
              <Check className="w-3 h-3 text-solana-green" />
            )}
          </div>
        </motion.button>
      ))}
    </div>
  )
}
