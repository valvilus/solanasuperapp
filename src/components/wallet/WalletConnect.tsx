/**
 * Wallet Connect Button - Smart connection component
 * Solana SuperApp - Block 4: External Wallets
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { SimpleButton } from '@/components/ui/simple-button'
import { WalletSelector } from './WalletSelector'
import { 
  Wallet, 
  ExternalLink, 
  Shield,
  ChevronDown,
  Zap
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { formatTokenBalance, formatUSDValue } from '@/lib/formatters'

interface WalletConnectProps {
  variant?: 'default' | 'compact' | 'minimal'
  showBalance?: boolean
  className?: string
}

export function WalletConnect({ 
  variant = 'default', 
  showBalance = true,
  className = '' 
}: WalletConnectProps) {
  const {
    custodial,
    external,
    activeWallet,
    totalBalance,
    connectExternalWallet
  } = useWallet()
  
  const [showSelector, setShowSelector] = useState(false)

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleWalletClick = () => {
    hapticFeedback.impact('light')
    setShowSelector(true)
  }

  const handleQuickConnect = async () => {
    try {
      hapticFeedback.impact('medium')
      await connectExternalWallet()
    } catch (error) {
      console.error(' Quick connect failed:', error)
    }
  }

  // =============================================================================
  // RENDER STATES
  // =============================================================================

  // No wallets connected
  if (!custodial.address && !external.isConnected) {
    return (
      <div className={className}>
        <SimpleButton
          onClick={handleWalletClick}
          gradient={true}
          className="w-full"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Подключить кошелек
        </SimpleButton>
        
        {showSelector && (
          <WalletSelectorModal 
            onClose={() => setShowSelector(false)}
          />
        )}
      </div>
    )
  }

  // Minimal variant - just show active wallet
  if (variant === 'minimal') {
    const activeWalletInfo = activeWallet === 'external' ? external : custodial
    
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleWalletClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${className}`}
      >
        {activeWallet === 'external' ? (
          <ExternalLink className="w-4 h-4 text-solana-green" />
        ) : (
          <Shield className="w-4 h-4 text-solana-purple" />
        )}
        <span className="text-xs text-white">
          {activeWalletInfo.address?.slice(0, 4)}...{activeWalletInfo.address?.slice(-4)}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
        
        {showSelector && (
          <WalletSelectorModal onClose={() => setShowSelector(false)} />
        )}
      </motion.button>
    )
  }

  // Compact variant - show balance + quick selector
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Balance display */}
        {showBalance && totalBalance && (
          <div className="text-center">
            <p className="text-lg font-bold text-white">
              {formatTokenBalance(totalBalance.sol, 'SOL', 'visual')}
            </p>
            <p className="text-xs text-gray-400">
              ≈ {formatUSDValue(totalBalance.usd || 0)}
            </p>
          </div>
        )}

        {/* Quick wallet selector */}
        <div className="flex gap-2">
          <WalletButton
            type="custodial"
            isActive={activeWallet === 'custodial'}
            isAvailable={custodial.isActive}
            onClick={() => setShowSelector(true)}
          />
          <WalletButton
            type="external"
            isActive={activeWallet === 'external'}
            isAvailable={external.isConnected}
            onClick={external.isConnected ? () => setShowSelector(true) : handleQuickConnect}
          />
        </div>

        {showSelector && (
          <WalletSelectorModal onClose={() => setShowSelector(false)} />
        )}
      </div>
    )
  }

  // Default variant - full wallet info
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Active wallet info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-lg bg-gradient-to-br from-white/5 to-white/2 border border-white/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeWallet === 'external' ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana-green/20 to-solana-green/5 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-solana-green" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana-purple/20 to-solana-purple/5 flex items-center justify-center">
                <Shield className="w-4 h-4 text-solana-purple" />
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-white">
                {activeWallet === 'external' ? 'Внешний кошелек' : 'Встроенный кошелек'}
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {activeWallet === 'external' 
                  ? `${external.address?.slice(0, 6)}...${external.address?.slice(-6)}`
                  : `${custodial.address?.slice(0, 6)}...${custodial.address?.slice(-6)}`
                }
              </p>
            </div>
          </div>

          {showBalance && (
            <div className="text-right">
              <p className="text-sm font-bold text-white">
                {totalBalance ? formatTokenBalance(totalBalance.sol, 'SOL', 'visual') : '0.00 SOL'}
              </p>
              <p className="text-xs text-gray-400">
                ≈ {formatUSDValue(totalBalance?.usd || 0)}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <SimpleButton
          onClick={handleWalletClick}
          className="flex-1"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Сменить
        </SimpleButton>
        
        {!external.isConnected && (
          <SimpleButton
            onClick={handleQuickConnect}
            gradient={true}
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            Подключить
          </SimpleButton>
        )}
      </div>

      {showSelector && (
        <WalletSelectorModal onClose={() => setShowSelector(false)} />
      )}
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface WalletButtonProps {
  type: 'custodial' | 'external'
  isActive: boolean
  isAvailable: boolean
  onClick: () => void
}

function WalletButton({ type, isActive, isAvailable, onClick }: WalletButtonProps) {
  const Icon = type === 'external' ? ExternalLink : Shield
  const color = type === 'external' ? 'solana-green' : 'solana-purple'
  
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={!isAvailable && !isActive}
      className={`flex-1 p-2 rounded-lg border transition-all duration-200 ${
        isActive 
          ? `bg-gradient-to-br from-${color}/20 to-${color}/5 border-${color}/30` 
          : 'border-white/10 hover:border-white/20'
      } ${!isAvailable && !isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex flex-col items-center gap-1">
        <Icon className={`w-4 h-4 ${isActive ? `text-${color}` : 'text-gray-400'}`} />
        <span className="text-xs text-white">
          {type === 'external' ? 'Внешний' : 'Встроенный'}
        </span>
      </div>
    </motion.button>
  )
}

// Modal wrapper for WalletSelector
interface WalletSelectorModalProps {
  onClose: () => void
}

function WalletSelectorModal({ onClose }: WalletSelectorModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-[#0A0A0F] rounded-2xl p-5 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <WalletSelector onClose={onClose} />
      </motion.div>
    </motion.div>
  )
}
