/**
 * Transaction History Hook - Load and process wallet transaction history
 * Solana SuperApp - Refactored from wallet page
 */

'use client'

import { useCallback, useState } from 'react'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { useTransactions } from '@/hooks/useTransactions'

export interface RecentTransaction {
  id: string
  type: 'receive' | 'send' | 'swap'
  token: string
  amount: string
  usdAmount: string
  address: string
  fromUsername?: string
  toUsername?: string
  isAnonymous?: boolean
  from?: string
  to?: string
  time: string
  status: 'confirmed' | 'pending' | 'failed'
  signature?: string
  explorerUrl?: string
  fee?: string
  memo?: string
  isOnchain?: boolean
}

export function useTransactionHistory() {
  const { apiCall } = useCompatibleAuth()
  const { getRecentTransactions } = useTransactions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to get on-chain transfer history
  const getOnchainTransferHistory = useCallback(async (asset?: 'SOL' | 'TNG', limit: number = 5) => {
    try {
      const params = new URLSearchParams()
      if (asset) params.append('asset', asset)
      params.append('limit', limit.toString())

      const response = await apiCall(`/api/onchain/transfers?${params.toString()}`)
      const data = await response.json()
      
      return data.success ? data.data.transfers : []
    } catch (error) {
      return []
    }
  }, [apiCall])

  const formatTransactionTime = useCallback((timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return 'Только что'
    if (minutes < 60) return `${minutes} мин назад`
    if (hours < 24) return `${hours} ч назад`
    if (days < 7) return `${days} дн назад`
    
    return timestamp.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
  }, [])

  // Helper function to generate explorer URL
  const getExplorerUrl = useCallback((signature: string) => {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  }, [])

  const loadTransactionHistory = useCallback(async (): Promise<RecentTransaction[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const [recentTxsResult, onchainHistoryResult] = await Promise.allSettled([
        getRecentTransactions(3),
        getOnchainTransferHistory()
      ])

      const recentTxs = recentTxsResult.status === 'fulfilled' ? recentTxsResult.value : []
      const onchainHistory = onchainHistoryResult.status === 'fulfilled' ? onchainHistoryResult.value : []

      // Transform recent transactions
      const transformedTxs = recentTxs.map(tx => ({
        id: tx.id,
        type: tx.type,
        token: tx.token,
        amount: tx.amount,
        usdAmount: tx.usdAmount,
        address: tx.from || tx.to || 'Неизвестно',
        fromUsername: tx.fromUsername,
        toUsername: tx.toUsername,
        isAnonymous: tx.isAnonymous || false,
        from: tx.from,
        to: tx.to,
        time: formatTransactionTime(tx.timestamp),
        status: tx.status,
        signature: tx.signature,
        explorerUrl: tx.signature ? getExplorerUrl(tx.signature) : undefined
      }))

      // Transform on-chain transfers
      const onchainTxs = onchainHistory.map((transfer: any) => {
        const isFaucet = (transfer as any).purpose === 'FAUCET'
        const isDeposit = (transfer as any).purpose === 'DEPOSIT'
        const amountInTokens = parseFloat(transfer.amount) / 1e9
        const tokenPrice = transfer.asset === 'SOL' ? 200.45 : 0.01
        
        const txType: 'send' | 'receive' = isFaucet || isDeposit ? 'receive' : 'send'
        
        return {
          id: `onchain_${transfer.id}`,
          type: txType,
          token: transfer.asset,
          amount: txType === 'receive' 
            ? `+${amountInTokens.toFixed(transfer.asset === 'SOL' ? 9 : 2)}`
            : `-${amountInTokens.toFixed(transfer.asset === 'SOL' ? 9 : 9)}`,
          usdAmount: txType === 'receive'
            ? `+$${(amountInTokens * tokenPrice).toFixed(2)}`
            : `-$${(amountInTokens * tokenPrice).toFixed(2)}`,
          address: transfer.toAddress || (transfer as any).fromAddress,
          from: isFaucet ? 'Фосет TNG' : (transfer as any).fromAddress,
          to: transfer.toAddress,
          time: formatTransactionTime(new Date(transfer.createdAt)),
          status: transfer.status.toLowerCase() as 'confirmed' | 'pending' | 'failed',
          signature: transfer.signature,
          explorerUrl: transfer.explorerUrl || (transfer.signature ? getExplorerUrl(transfer.signature) : undefined),
          fee: transfer.fee ? (parseFloat(transfer.fee) / 1e9).toString() : undefined,
          memo: isFaucet ? 'Получено из фосета TNG' : transfer.memo,
          isOnchain: true
        }
      })

      // Combine and sort transactions
      const allTransactions = [...transformedTxs, ...onchainTxs]
        .sort((a, b) => {
          const timeA = a.time.includes('назад') ? new Date() : new Date(a.time)
          const timeB = b.time.includes('назад') ? new Date() : new Date(b.time)
          return timeB.getTime() - timeA.getTime()
        })
        .slice(0, 5)

      return allTransactions
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка загрузки истории транзакций'
      setError(errorMsg)
      return []
    } finally {
      setLoading(false)
    }
  }, [getRecentTransactions, getOnchainTransferHistory, formatTransactionTime, getExplorerUrl])

  return {
    loadTransactionHistory,
    loading,
    error,
    clearError: () => setError(null)
  }
}
