/**
 * Learn Blockchain Hook
 * Direct integration with TNG Learn Smart Contract
 * Simplified, focused on blockchain operations only
 */

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { useCompatibleAuth } from './useCompatibleAuth'

// Types matching API responses
export interface BlockchainCourse {
  courseId: number
  title: string
  description: string
  creator: string
  rewardAmount: string // Formatted TNG amount
  rewardAmountRaw: number
  totalCompletions: number
  isActive: boolean
  createdAt: string
}

export interface UserCourseProgress {
  courseId: number
  isCompleted: boolean
  completedAt: string | null
  isRewardClaimed: boolean
  claimedAt: string | null
  answerHash: string
}

export interface UserProgress {
  completedCourses: number
  totalRewardsClaimed: string // Formatted TNG amount
  totalRewardsClaimedRaw: number
  userCourses: UserCourseProgress[]
}

export interface LearnConfig {
  admin: string
  totalCourses: number
  totalRewardsDistributed: string // Formatted TNG amount
  totalRewardsDistributedRaw: number
  isActive: boolean
}

export interface CreateCourseForm {
  title: string
  description: string
  rewardAmount: number // TNG tokens
}

interface UseLearnBlockchainReturn {
  // Data
  courses: BlockchainCourse[]
  userProgress: UserProgress | null
  config: LearnConfig | null
  
  // Loading states
  isLoading: boolean
  isLoadingCourses: boolean
  isLoadingProgress: boolean
  isSubmitting: boolean
  
  // Error state
  error: string | null
  
  // Actions
  loadCourses: () => Promise<void>
  loadUserProgress: () => Promise<void>
  loadConfig: () => Promise<void>
  createCourse: (form: CreateCourseForm) => Promise<{ success: boolean; courseId?: number }>
  submitAnswer: (courseId: number, answerHash: string) => Promise<{ success: boolean }>
  claimReward: (courseId: number) => Promise<{ success: boolean; rewardAmount?: string }>
  clearError: () => void
  refreshAll: () => Promise<void>
}

export function useLearnBlockchain(): UseLearnBlockchainReturn {
  const { publicKey, sendTransaction } = useWallet()
  const { isAuthenticated } = useCompatibleAuth()
  
  // State
  const [courses, setCourses] = useState<BlockchainCourse[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [config, setConfig] = useState<LearnConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Error handling
  const handleError = useCallback((error: any, context: string) => {
    console.error(` ${context}:`, error)
    const message = error?.message || error?.toString() || 'An unexpected error occurred'
    setError(`${context}: ${message}`)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadConfig = useCallback(async () => {
    try {
      clearError()
      setIsLoading(true)
      
      const response = await fetch('/api/learn-blockchain?action=config')
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load config')
      }
      
      setConfig(result.data)
    } catch (error) {
      handleError(error, 'Loading config')
    } finally {
      setIsLoading(false)
    }
  }, [handleError, clearError])

  const loadCourses = useCallback(async () => {
    try {
      clearError()
      setIsLoadingCourses(true)
      
      const response = await fetch('/api/learn-blockchain?action=courses')
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load courses')
      }
      
      setCourses(result.data.courses || [])
    } catch (error) {
      handleError(error, 'Loading courses')
    } finally {
      setIsLoadingCourses(false)
    }
  }, [handleError, clearError])

  const loadUserProgress = useCallback(async () => {
    if (!isAuthenticated) {
      setUserProgress(null)
      return
    }

    try {
      clearError()
      setIsLoadingProgress(true)
      
      const response = await fetch('/api/learn-blockchain?action=user-progress')
      const result = await response.json()
      
      if (!result.success) {
        if (result.error.includes('Authentication required')) {
          setUserProgress(null)
          return
        }
        throw new Error(result.error || 'Failed to load user progress')
      }
      
      setUserProgress(result.data)
    } catch (error) {
      handleError(error, 'Loading user progress')
      setUserProgress(null)
    } finally {
      setIsLoadingProgress(false)
    }
  }, [isAuthenticated, handleError, clearError])

  // ============================================================================
  // BLOCKCHAIN OPERATIONS
  // ============================================================================

  const createCourse = useCallback(async (form: CreateCourseForm): Promise<{ success: boolean; courseId?: number }> => {
    if (!publicKey || !sendTransaction) {
      setError('Wallet not connected')
      return { success: false }
    }

    if (!isAuthenticated) {
      setError('Please log in first')
      return { success: false }
    }

    try {
      clearError()
      setIsSubmitting(true)
      
      // Build transaction
      const response = await fetch('/api/learn-blockchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_course',
          ...form
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to build transaction')
      }
      
      // Deserialize and send transaction
      const transaction = Transaction.from(Buffer.from(result.data.transaction, 'base64'))
      
      const { connection } = await import('@/lib/solana')
      const signature = await sendTransaction(transaction, connection)
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      console.log(' Course created successfully:', {
        signature,
        courseId: result.data.courseId
      })
      
      // Refresh data
      await Promise.all([loadCourses(), loadConfig()])
      
      return { 
        success: true, 
        courseId: result.data.courseId 
      }
      
    } catch (error) {
      handleError(error, 'Creating course')
      return { success: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [publicKey, sendTransaction, isAuthenticated, clearError, handleError, loadCourses, loadConfig])

  const submitAnswer = useCallback(async (courseId: number, answerHash: string): Promise<{ success: boolean }> => {
    if (!publicKey || !sendTransaction) {
      setError('Wallet not connected')
      return { success: false }
    }

    if (!isAuthenticated) {
      setError('Please log in first')
      return { success: false }
    }

    try {
      clearError()
      setIsSubmitting(true)
      
      // Build transaction
      const response = await fetch('/api/learn-blockchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_answer',
          courseId,
          answerHash
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to build transaction')
      }
      
      // Deserialize and send transaction
      const transaction = Transaction.from(Buffer.from(result.data.transaction, 'base64'))
      
      const { connection } = await import('@/lib/solana')
      const signature = await sendTransaction(transaction, connection)
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      console.log(' Answer submitted successfully:', {
        signature,
        courseId
      })
      
      // Refresh user progress
      await loadUserProgress()
      
      return { success: true }
      
    } catch (error) {
      handleError(error, 'Submitting answer')
      return { success: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [publicKey, sendTransaction, isAuthenticated, clearError, handleError, loadUserProgress])

  const claimReward = useCallback(async (courseId: number): Promise<{ success: boolean; rewardAmount?: string }> => {
    if (!publicKey || !sendTransaction) {
      setError('Wallet not connected')
      return { success: false }
    }

    if (!isAuthenticated) {
      setError('Please log in first')
      return { success: false }
    }

    try {
      clearError()
      setIsSubmitting(true)
      
      // Build transaction
      const response = await fetch('/api/learn-blockchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_reward',
          courseId
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to build transaction')
      }
      
      // Deserialize and send transaction
      const transaction = Transaction.from(Buffer.from(result.data.transaction, 'base64'))
      
      const { connection } = await import('@/lib/solana')
      const signature = await sendTransaction(transaction, connection)
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      console.log(' Reward claimed successfully:', {
        signature,
        courseId,
        rewardAmount: result.data.rewardAmount
      })
      
      // Refresh user progress and config
      await Promise.all([loadUserProgress(), loadConfig()])
      
      return { 
        success: true,
        rewardAmount: result.data.rewardAmount
      }
      
    } catch (error) {
      handleError(error, 'Claiming reward')
      return { success: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [publicKey, sendTransaction, isAuthenticated, clearError, handleError, loadUserProgress, loadConfig])

  // ============================================================================
  // REFRESH ALL DATA
  // ============================================================================

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadConfig(),
      loadCourses(),
      loadUserProgress()
    ])
  }, [loadConfig, loadCourses, loadUserProgress])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load initial data
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // Load user progress when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      loadUserProgress()
    } else {
      setUserProgress(null)
    }
  }, [isAuthenticated, loadUserProgress])

  return {
    // Data
    courses,
    userProgress,
    config,
    
    // Loading states
    isLoading,
    isLoadingCourses,
    isLoadingProgress,
    isSubmitting,
    
    // Error state
    error,
    
    // Actions
    loadCourses,
    loadUserProgress,
    loadConfig,
    createCourse,
    submitAnswer,
    claimReward,
    clearError,
    refreshAll
  }
}







