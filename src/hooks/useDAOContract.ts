/**
 * useDAOContract Hook - Real on-chain DAO interactions
 * Integrates with deployed DAO contract for real blockchain operations
 * Solana SuperApp
 */

import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { DAOService, ProposalData, DAOConfig, ProposalAction } from '@/lib/onchain/dao.service'

export interface UseDAOContractReturn {
  // State
  daoConfig: DAOConfig | null
  proposals: ProposalData[]
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Actions
  refreshData: () => Promise<void>
  initializeDAO: (params: InitializeDAOParams) => Promise<boolean>
  createProposal: (params: CreateProposalParams) => Promise<boolean>
  vote: (params: VoteParams) => Promise<boolean>
  finalizeProposal: (proposalId: number) => Promise<boolean>
  executeAction: (proposalId: number, actionIndex: number) => Promise<boolean>
  fundTreasury: (amount: string) => Promise<boolean>
  
  // Utilities
  getUserVotingPower: () => Promise<string>
  hasUserVoted: (proposalId: number) => Promise<boolean>
  formatSOLAmount: (amount: string) => string
}

export interface InitializeDAOParams {
  votingDurationDays: number
  executionDelayHours: number
  quorumThreshold: string
  proposalThreshold: string
}

export interface CreateProposalParams {
  title: string
  description: string
  actions: ProposalAction[]
}

export interface VoteParams {
  proposalId: number
  choice: 'For' | 'Against' | 'Abstain'
  weight: string
}

export const useDAOContract = (): UseDAOContractReturn => {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { user, getAuthHeader } = useAuth()
  const { showSuccess, showError } = useNotifications()

  // State
  const [daoConfig, setDaoConfig] = useState<DAOConfig | null>(null)
  const [proposals, setProposals] = useState<ProposalData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [daoService, setDaoService] = useState<DAOService | null>(null)

  // Initialize DAO service
  useEffect(() => {
    if (connection) {
      const service = new DAOService(connection)
      setDaoService(service)
    }
  }, [connection])

  // Load initial data
  useEffect(() => {
    if (daoService) {
      refreshData()
    }
  }, [daoService])

  // Refresh all DAO data
  const refreshData = useCallback(async () => {
    if (!daoService) return

    setIsLoading(true)
    setError(null)

    try {
      // Check if DAO is initialized
      const initialized = await daoService.isDAOInitialized()
      setIsInitialized(initialized)

      if (initialized) {
        // Load DAO config and proposals in parallel
        const [config, proposalsData] = await Promise.all([
          daoService.getDAOConfig(),
          daoService.getAllProposals()
        ])

        setDaoConfig(config)
        setProposals(proposalsData)
      } else {
        setDaoConfig(null)
        setProposals([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load DAO data'
      setError(errorMessage)
      console.error('Error refreshing DAO data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [daoService])

  // Initialize DAO contract
  const initializeDAO = useCallback(async (params: InitializeDAOParams): Promise<boolean> => {
    if (!daoService || !publicKey || !signTransaction || !user) {
      showError('Ошибка', 'Подключите кошелек для инициализации DAO')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Get sponsor wallet as payer
      const sponsorAddress = process.env.NEXT_PUBLIC_SPONSOR_WALLET_ADDRESS
      if (!sponsorAddress) {
        throw new Error('Sponsor wallet not configured')
      }

      const payer = new PublicKey(sponsorAddress)
      const votingDuration = params.votingDurationDays * 24 * 60 * 60
      const executionDelay = params.executionDelayHours * 60 * 60

      // Build transaction
      const transaction = await daoService.buildInitializeDAOTransaction(
        publicKey,
        payer,
        votingDuration,
        executionDelay,
        params.quorumThreshold,
        params.proposalThreshold
      )

      // Sign transaction
      const signedTx = await signTransaction(transaction)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      showSuccess('Успех', 'DAO успешно инициализирован!')
      
      // Refresh data
      await refreshData()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize DAO'
      setError(errorMessage)
      showError('Ошибка', `Ошибка инициализации DAO: ${errorMessage}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [daoService, publicKey, signTransaction, user, connection, showError, showSuccess, refreshData])

  // Create proposal
  const createProposal = useCallback(async (params: CreateProposalParams): Promise<boolean> => {
    if (!daoService || !publicKey || !signTransaction || !user) {
      showError('Ошибка', 'Подключите кошелек для создания предложения')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Check user's voting power
      const votingPower = await daoService.getUserVotingPower(publicKey)
      if (!daoConfig || BigInt(votingPower) < BigInt(daoConfig.proposalThreshold)) {
        const required = daoService.formatSOLAmount(daoConfig?.proposalThreshold || '0')
        const current = daoService.formatSOLAmount(votingPower)
        throw new Error(`Недостаточно TNG для создания предложения. Требуется: ${required}, у вас: ${current}`)
      }

      // Get sponsor wallet as payer
      const sponsorAddress = process.env.NEXT_PUBLIC_SPONSOR_WALLET_ADDRESS
      if (!sponsorAddress) {
        throw new Error('Sponsor wallet not configured')
      }

      const payer = new PublicKey(sponsorAddress)

      // Build transaction
      const transaction = await daoService.buildCreateProposalTransaction(
        publicKey,
        params.title,
        params.description,
        params.actions
      )

      // Sign transaction
      const signedTx = await signTransaction(transaction)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      showSuccess('Успех', 'Предложение успешно создано!')
      
      // Refresh data
      await refreshData()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal'
      setError(errorMessage)
      showError('Ошибка', `Ошибка создания предложения: ${errorMessage}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [daoService, publicKey, signTransaction, user, daoConfig, connection, showError, showSuccess, refreshData])

  // Vote on proposal
  const vote = useCallback(async (params: VoteParams): Promise<boolean> => {
    if (!daoService || !publicKey || !signTransaction || !user) {
      showError('Ошибка', 'Подключите кошелек для голосования')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Check if user has already voted
      const [proposalPDA] = daoService.getProposalPDA(params.proposalId)
      const existingVote = await daoService.getVoteRecord(publicKey, proposalPDA)
      if (existingVote) {
        throw new Error('Вы уже проголосовали по этому предложению')
      }

      // Check user's voting power
      const votingPower = await daoService.getUserVotingPower(publicKey)
      if (BigInt(params.weight) > BigInt(votingPower)) {
        throw new Error('Вес голоса превышает доступный')
      }

      // Build transaction
      const transaction = await daoService.buildVoteTransaction(
        publicKey,
        params.proposalId,
        params.choice,
        params.weight
      )

      // Sign transaction
      const signedTx = await signTransaction(transaction)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      showSuccess('Успех', `Голос "${params.choice}" успешно подан!`)
      
      // Refresh data
      await refreshData()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote'
      setError(errorMessage)
      showError('Ошибка', `Ошибка голосования: ${errorMessage}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [daoService, publicKey, signTransaction, user, connection, showError, showSuccess, refreshData])

  // Finalize proposal
  const finalizeProposal = useCallback(async (proposalId: number): Promise<boolean> => {
    if (!daoService || !publicKey || !signTransaction) {
      showError('Ошибка', 'Подключите кошелек для завершения предложения')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Build transaction
      const transaction = await daoService.buildFinalizeProposalTransaction(proposalId)

      // Sign transaction
      const signedTx = await signTransaction(transaction)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      showSuccess('Успех', 'Предложение успешно завершено!')
      
      // Refresh data
      await refreshData()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize proposal'
      setError(errorMessage)
      showError('Ошибка', `Ошибка завершения предложения: ${errorMessage}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [daoService, publicKey, signTransaction, connection, showError, showSuccess, refreshData])

  // Execute action
  const executeAction = useCallback(async (proposalId: number, actionIndex: number): Promise<boolean> => {
    if (!daoService || !publicKey || !signTransaction) {
      showError('Ошибка', 'Подключите кошелек для исполнения действия')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Build transaction
      const transaction = await daoService.buildExecuteActionTransaction(
        publicKey,
        proposalId,
        actionIndex
      )

      // Sign transaction
      const signedTx = await signTransaction(transaction)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      showSuccess('Успех', 'Действие успешно исполнено!')
      
      // Refresh data
      await refreshData()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action'
      setError(errorMessage)
      showError('Ошибка', `Ошибка исполнения действия: ${errorMessage}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [daoService, publicKey, signTransaction, connection, showError, showSuccess, refreshData])

  // Fund treasury
  const fundTreasury = useCallback(async (amount: string): Promise<boolean> => {
    if (!daoService || !publicKey || !signTransaction) {
      showError('Ошибка', 'Подключите кошелек для пополнения казны')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Build transaction
      const transaction = await daoService.buildFundTreasuryTransaction(publicKey, amount)

      // Sign transaction
      const signedTx = await signTransaction(transaction)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      const formattedAmount = daoService.formatSOLAmount(amount)
      showSuccess('Успех', `Казна пополнена на ${formattedAmount} TNG!`)
      
      // Refresh data
      await refreshData()
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fund treasury'
      setError(errorMessage)
      showError('Ошибка', `Ошибка пополнения казны: ${errorMessage}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [daoService, publicKey, signTransaction, connection, showError, showSuccess, refreshData])

  // Get user voting power
  const getUserVotingPower = useCallback(async (): Promise<string> => {
    if (!daoService || !publicKey) return '0'
    return await daoService.getUserVotingPower(publicKey)
  }, [daoService, publicKey])

  // Check if user has voted on proposal
  const hasUserVoted = useCallback(async (proposalId: number): Promise<boolean> => {
    if (!daoService || !publicKey) return false
    
    try {
      const [proposalPDA] = daoService.getProposalPDA(proposalId)
      const voteRecord = await daoService.getVoteRecord(publicKey, proposalPDA)
      return voteRecord !== null
    } catch {
      return false
    }
  }, [daoService, publicKey])

  // Format utilities
  const formatSOLAmount = useCallback((amount: string): string => {
    return daoService?.formatSOLAmount(amount) || '0'
  }, [daoService])

  return {
    // State
    daoConfig,
    proposals,
    isLoading,
    isInitialized,
    error,
    
    // Actions
    refreshData,
    initializeDAO,
    createProposal,
    vote,
    finalizeProposal,
    executeAction,
    fundTreasury,
    
    // Utilities
    getUserVotingPower,
    hasUserVoted,
    formatSOLAmount
  }
}










