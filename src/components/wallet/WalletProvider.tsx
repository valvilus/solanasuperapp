/**
 * Solana Wallet Provider - External Wallet Integration
 * Solana SuperApp - Block 4: External Wallets
 */

'use client'

import React, { FC, useMemo, useEffect } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
// Import only stable and popular wallet adapters
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus'
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger'
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase'
import { clusterApiUrl } from '@solana/web3.js'

interface SolanaWalletProviderProps {
  children: React.ReactNode
}

export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({ children }) => {
  // CSS is loaded via globals.css to avoid HMR issues with Turbopack

  // Network configuration
  const network = process.env.NODE_ENV === 'development' 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Mainnet

  // RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(WalletAdapterNetwork.Devnet)
    }
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(WalletAdapterNetwork.Mainnet)
  }, [])

  // Supported wallets configuration - only stable adapters
  const wallets = useMemo(
    () => [
      // Primary wallets - наиболее популярные и стабильные
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      
      // Secondary wallets - дополнительные опции
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new CoinbaseWalletAdapter()
    ],
    [network]
  )

  console.log(' Solana Wallet Provider initialized:', {
    network,
    endpoint,
    walletsCount: wallets.length
  })

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
