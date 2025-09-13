'use client'

import { VoteType, CreateProposalForm } from '../types/dao.types'

/**
 * Pure On-Chain DAO Service - работает только с блокчейном
 */

type ApiCallFunction = (url: string, options?: RequestInit) => Promise<Response>

/**
 * Получить конфигурацию on-chain DAO
 */
export async function getOnChainDAOConfig(apiCall: ApiCallFunction): Promise<any> {
  console.log(' Getting on-chain DAO config...')
  
  const response = await apiCall('/api/dao/onchain/config')
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to get DAO config`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Инициализировать DAO контракт
 */
export async function initializeDAOContract(
  apiCall: ApiCallFunction,
  config: {
    authorityAddress: string
    payerAddress: string
    votingDurationDays?: number
    executionDelayHours?: number
    quorumThreshold?: string
    proposalThreshold?: string
  }
): Promise<any> {
  console.log(' Initializing DAO contract...')
  
  const response = await apiCall('/api/dao/onchain/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to initialize DAO`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Получить on-chain предложения
 */
export async function getOnChainProposals(apiCall: ApiCallFunction): Promise<any> {
  console.log(' Getting on-chain proposals...')
  
  const response = await apiCall('/api/dao/onchain/proposals')
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to get proposals`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Создать on-chain предложение
 */
export async function createOnChainProposal(
  apiCall: ApiCallFunction,
  proposalData: {
    title: string
    description: string
    actions: any[]
    payerAddress: string
  }
): Promise<any> {
  console.log(' Creating on-chain proposal...')
  
  const response = await apiCall('/api/dao/onchain/proposals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(proposalData)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to create proposal`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Голосовать on-chain
 */
export async function voteOnChain(
  apiCall: ApiCallFunction,
  voteData: {
    proposalId: number
    choice: string
    weight: number
    comment?: string
  }
): Promise<any> {
  console.log(' Voting on-chain for proposal:', voteData.proposalId)
  
  const response = await apiCall('/api/dao/onchain/vote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(voteData)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to vote`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Проверить статус инициализации DAO
 */
export async function checkDAOInitialization(apiCall: ApiCallFunction): Promise<boolean> {
  try {
    const config = await getOnChainDAOConfig(apiCall)
    return config.initialized === true
  } catch (error) {
    console.warn('DAO not initialized:', error)
    return false
  }
}

/**
 * Получить Treasury данные on-chain
 */
export async function getOnChainTreasury(apiCall: ApiCallFunction): Promise<any> {
  console.log(' Getting on-chain treasury data...')
  
  const response = await apiCall('/api/dao/treasury')
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    if (response.status === 503 && errorData.code === 'DAO_NOT_INITIALIZED') {
      throw new Error('DAO контракт не инициализирован')
    }
    
    throw new Error(errorData.error || `HTTP ${response.status}: Failed to get treasury`)
  }
  
  const responseData = await response.json()
  return responseData.data
}
