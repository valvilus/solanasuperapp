/**
 * Enhanced Wallet Hook - Hybrid Custodial + External Wallet Management
 * Solana SuperApp - Block 4: External Wallets
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useAuth } from '../contexts/AuthContext'

// =============================================================================
// TYPES
// =============================================================================

export interface WalletBalance {
  sol: number
  lamports: number
  usd?: number
  tng?: number
}

export interface WalletInfo {
  // Custodial wallet (от нашего backend)
  custodial: {
    address: string | null
    balance: WalletBalance | null
    isActive: boolean
  }
  
  // External wallet (от Solana Wallet Adapter)
  external: {
    address: string | null
    balance: WalletBalance | null
    isConnected: boolean
    isConnecting: boolean
    wallet: any | null // Wallet adapter instance
  }
  
  // Combined state
  activeWallet: 'custodial' | 'external' | null
  totalBalance: WalletBalance | null
}

export interface WalletActions {
  // External wallet actions
  connectExternalWallet: () => Promise<void>
  disconnectExternalWallet: () => Promise<void>
  selectWallet: (type: 'custodial' | 'external') => void
  
  // Balance actions
  refreshBalances: () => Promise<void>
  
  // Transfer actions (between custodial and external)
  transferToExternal: (amount: number) => Promise<boolean>
  transferToCustodial: (amount: number) => Promise<boolean>
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useWallet(): WalletInfo & WalletActions {
  const { user, isAuthenticated, apiCall } = useAuth()
  const { connection } = useConnection()
  const {
    wallet: externalWallet,
    publicKey: externalPublicKey,
    connected: externalConnected,
    connecting: externalConnecting,
    connect: connectExternal,
    disconnect: disconnectExternal,
    select: selectExternal
  } = useSolanaWallet()

  // State
  const [custodialBalance, setCustodialBalance] = useState<WalletBalance | null>(null)
  const [externalBalance, setExternalBalance] = useState<WalletBalance | null>(null)
  const [activeWallet, setActiveWallet] = useState<'custodial' | 'external' | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  // =============================================================================
  // CUSTODIAL WALLET INFO
  // =============================================================================

  const [custodialAddress, setCustodialAddress] = useState<string | null>(user?.walletAddress || null)

  // Получаем актуальный адрес кошелька из API если его нет
  const fetchCustodialAddress = useCallback(async () => {
    if (custodialAddress || !isAuthenticated) return custodialAddress

    try {
      const response = await apiCall('/api/wallet')

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.wallet?.publicKey) {
          setCustodialAddress(data.data.wallet.publicKey)
          return data.data.wallet.publicKey
        }
      }
    } catch (error) {
      console.error('Error fetching custodial address:', error)
    }

    return null
  }, [custodialAddress, isAuthenticated, apiCall])

  // Обновляем адрес при изменении пользователя
  useEffect(() => {
    if (user?.walletAddress) {
      setCustodialAddress(user.walletAddress)
    } else if (isAuthenticated && !custodialAddress) {
      fetchCustodialAddress()
    }
  }, [user?.walletAddress, isAuthenticated, custodialAddress, fetchCustodialAddress])

  // =============================================================================
  // EXTERNAL WALLET INFO
  // =============================================================================

  const externalAddress = externalPublicKey?.toString() || null

  // =============================================================================
  // BALANCE FETCHING
  // =============================================================================

  const fetchCustodialBalance = useCallback(async (): Promise<WalletBalance | null> => {
    if (!custodialAddress || !isAuthenticated) return null

    try {
      // Fetch SOL balance through API for consistency
      let sol = 0
      try {
        const solResponse = await apiCall('/api/tokens/sol/balance')
        const solData = await solResponse.json()
        if (solData && solData.success && solData.data && solData.data.balance) {
          sol = Number(solData.data.balance.sol) || 0
        }
      } catch (solError) {
        console.error('Error fetching SOL balance via API:', solError)
        // Fallback to direct RPC call if API fails
        const lamports = await connection.getBalance(new PublicKey(custodialAddress))
        sol = lamports / LAMPORTS_PER_SOL
      }
      
      const lamports = Math.round(sol * LAMPORTS_PER_SOL)

      // Get TNG balance from on-chain API
      let tngBalance = 0
      try {
        const response = await apiCall(`/api/tokens/tng/balance?_t=${Date.now()}`)
        const data = await response.json()
        console.log(' On-chain TNG balance response:', data)
        
        if (data && data.success && data.data && data.data.balance) {
          // On-chain balance is in lamports (9 decimals)
          const balanceAmount = data.data.balance.amount || '0'
          tngBalance = Math.max(0, Number(balanceAmount) / 1000000000)
          
          console.log(' TNG balance extracted:', {
            rawAmount: balanceAmount,
            tngBalance
          })
        }
      } catch (apiError) {
        console.error('Error fetching on-chain TNG balance:', apiError)
      }
      
      console.log(' Custodial balance fetched:', { sol, tng: tngBalance })

      return {
        sol,
        lamports,
        usd: sol * 200, // Mock SOL price
        tng: tngBalance
      }
    } catch (error) {
      console.error('Error fetching custodial balance:', error)
      return null
    }
  }, [custodialAddress, isAuthenticated, connection])

  const fetchExternalBalance = useCallback(async (): Promise<WalletBalance | null> => {
    if (!externalPublicKey || !externalConnected) return null

    try {
      const lamports = await connection.getBalance(externalPublicKey)
      const sol = lamports / LAMPORTS_PER_SOL

      return {
        sol,
        lamports,
        usd: sol * 200 // Mock SOL price
      }
    } catch (error) {
      console.error('Error fetching external balance:', error)
      return null
    }
  }, [externalPublicKey, externalConnected, connection])

  const refreshBalances = useCallback(async () => {
    // Добавляем проверку чтобы избежать спама
    if (balanceLoading) {
      console.log(' Balance refresh already in progress, skipping')
      return
    }

    setBalanceLoading(true)
    try {
      const [custodial, external] = await Promise.all([
        fetchCustodialBalance(),
        fetchExternalBalance()
      ])
      
      setCustodialBalance(custodial)
      setExternalBalance(external)
      
    } catch (error) {
      console.error('Error refreshing balances:', error)
    } finally {
      setBalanceLoading(false)
    }
  }, [fetchCustodialBalance, fetchExternalBalance, balanceLoading])

  // =============================================================================
  // WALLET ACTIONS
  // =============================================================================

  const connectExternalWallet = useCallback(async () => {
    try {
      console.log(' Connecting external wallet...')
      await connectExternal()
      setActiveWallet('external')
    } catch (error) {
      console.error('Error connecting external wallet:', error)
      throw error
    }
  }, [connectExternal])

  const disconnectExternalWallet = useCallback(async () => {
    try {
      console.log(' Disconnecting external wallet...')
      await disconnectExternal()
      setActiveWallet('custodial')
      setExternalBalance(null)
    } catch (error) {
      console.error('Error disconnecting external wallet:', error)
      throw error
    }
  }, [disconnectExternal])

  const selectWallet = useCallback((type: 'custodial' | 'external') => {
    setActiveWallet(type)
    
    // Save preference to localStorage
    try {
      localStorage.setItem('wallet_preference', type)
    } catch (error) {
      console.error('Error saving wallet preference:', error)
    }
  }, [])

  // =============================================================================
  // TRANSFER ACTIONS (between custodial and external)
  // =============================================================================

  const transferToExternal = useCallback(async (amount: number): Promise<boolean> => {
    try {
      console.log(` Transferring ${amount} SOL to external wallet...`)
      
      if (!custodialAddress || !externalAddress) {
        throw new Error('Both wallets must be available')
      }

      // TODO: Implement transfer from custodial to external
      // This would use our withdrawal service to send SOL to external wallet
      
      await refreshBalances()
      return true
    } catch (error) {
      console.error('Transfer to external failed:', error)
      return false
    }
  }, [custodialAddress, externalAddress, refreshBalances])

  const transferToCustodial = useCallback(async (amount: number): Promise<boolean> => {
    try {
      console.log(` Transferring ${amount} SOL to custodial wallet...`)
      
      if (!custodialAddress || !externalAddress || !externalWallet) {
        throw new Error('Both wallets must be available')
      }

      // TODO: Implement transfer from external to custodial
      // This would create a transaction from external wallet to custodial address
      
      await refreshBalances()
      return true
    } catch (error) {
      console.error('Transfer to custodial failed:', error)
      return false
    }
  }, [custodialAddress, externalAddress, externalWallet, refreshBalances])

  // =============================================================================
  // DERIVED STATE
  // =============================================================================

  const totalBalance = useMemo((): WalletBalance | null => {
    const custodialSol = custodialBalance?.sol || 0
    const externalSol = externalBalance?.sol || 0
    const custodialTng = custodialBalance?.tng || 0
    const externalTng = externalBalance?.tng || 0
    
    const totalSol = custodialSol + externalSol
    const totalTng = custodialTng + externalTng

    if (totalSol === 0 && totalTng === 0) return null

    return {
      sol: totalSol,
      lamports: Math.round(totalSol * LAMPORTS_PER_SOL),
      usd: totalSol * 200, // Mock price
      tng: totalTng
    }
  }, [custodialBalance, externalBalance])

  const walletInfo: WalletInfo = {
    custodial: {
      address: custodialAddress,
      balance: custodialBalance,
      isActive: activeWallet === 'custodial'
    },
    external: {
      address: externalAddress,
      balance: externalBalance,
      isConnected: externalConnected,
      isConnecting: externalConnecting,
      wallet: externalWallet
    },
    activeWallet,
    totalBalance
  }

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Auto-refresh balances when wallets change (with debouncing)
  useEffect(() => {
    if (custodialAddress || externalConnected) {
      
      // Добавляем небольшую задержку чтобы избежать спама при быстрых изменениях
      const timeoutId = setTimeout(() => {
        refreshBalances()
      }, 1000) // 1 секунда задержки
      
      return () => clearTimeout(timeoutId)
    }
  }, [custodialAddress, externalConnected, externalAddress]) // Убрали refreshBalances из зависимостей

  // Restore wallet preference from localStorage
  useEffect(() => {
    try {
      const preference = localStorage.getItem('wallet_preference') as 'custodial' | 'external'
      if (preference && (preference === 'custodial' || preference === 'external')) {
        setActiveWallet(preference)
      } else if (custodialAddress && !activeWallet) {
        setActiveWallet('custodial') // Default to custodial if available
      }
    } catch (error) {
      console.error('Error loading wallet preference:', error)
    }
  }, [custodialAddress, activeWallet])

  // Auto-switch to external when connected
  useEffect(() => {
    if (externalConnected && activeWallet !== 'external') {
      setActiveWallet('external')
    }
  }, [externalConnected, activeWallet])

  // Periodic balance refresh (every 60 seconds, увеличили интервал)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    // Создаем интервал только если пользователь подключен
    if (walletInfo.external.isConnected) {
      interval = setInterval(() => {
        if (!balanceLoading) {
          refreshBalances()
        }
      }, 60000) // Увеличили до 60 секунд чтобы снизить нагрузку
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [walletInfo.external.isConnected]) // Зависим только от состояния подключения

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    ...walletInfo,
    connectExternalWallet,
    disconnectExternalWallet,
    selectWallet,
    refreshBalances,
    transferToExternal,
    transferToCustodial
  }
}
