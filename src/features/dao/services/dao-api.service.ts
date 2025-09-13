'use client'

import { VoteType, CreateProposalForm, Proposal, Vote } from '../types/dao.types'

/**
 * DAO API Service - использует внешний apiCall для авторизации
 */

type ApiCallFunction = (url: string, options?: RequestInit) => Promise<Response>

/**
 * Получить список предложений с фильтрами (только on-chain)
 */
export async function getProposals(
  apiCall: ApiCallFunction,
  params: {
    limit?: number
    offset?: number
    status?: string
    type?: string
    search?: string
    sortBy?: string
    sortOrder?: string
  } = {}
): Promise<{ proposals: Proposal[], totalCount: number, hasMore: boolean }> {
  const queryParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString())
    }
  })
  
  const endpoint = `/api/dao/onchain/proposals?${queryParams.toString()}`
  console.log(' Getting ON-CHAIN proposals with params:', params)
  
  const response = await apiCall(endpoint)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Специальная обработка случая, когда DAO не инициализирован
    if (response.status === 503 && errorData.code === 'DAO_NOT_INITIALIZED') {
      throw new Error('DAO контракт не инициализирован. Пожалуйста, обратитесь к администратору.')
    }
    
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  
  return {
    proposals: responseData.data.proposals || [],
    totalCount: responseData.data.totalCount || 0,
    hasMore: responseData.data.hasMore || false
  }
}

/**
 * Получить статистику DAO (только on-chain)
 */
export async function getDAOStats(
  apiCall: ApiCallFunction,
  includeTrends: boolean = true
): Promise<any> {
  const endpoint = `/api/dao/stats?includeTrends=${includeTrends}`
  console.log(' Getting on-chain DAO stats...')
  
  const response = await apiCall(endpoint)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Специальная обработка случая, когда DAO не инициализирован
    if (response.status === 503 && errorData.code === 'DAO_NOT_INITIALIZED') {
      throw new Error('DAO контракт не инициализирован. Пожалуйста, обратитесь к администратору.')
    }
    
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Получить список участников DAO
 */
export async function getDAOMembers(
  apiCall: ApiCallFunction,
  params: {
    limit?: number
    offset?: number
    search?: string
    sortBy?: string
  } = {}
): Promise<any> {
  const queryParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString())
    }
  })
  
  const endpoint = `/api/dao/members?${queryParams.toString()}`
  console.log(' Getting DAO members...')
  
  const response = await apiCall(endpoint)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Получить данные казны DAO
 */
export async function getDAOTreasury(
  apiCall: ApiCallFunction
): Promise<any> {
  const endpoint = `/api/dao/treasury`
  console.log(' Getting DAO treasury...')
  
  const response = await apiCall(endpoint)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Создать новое предложение
 */
export async function createProposal(
  apiCall: ApiCallFunction,
  proposalData: CreateProposalForm
): Promise<any> {
  const endpoint = `/api/dao/proposals`
  console.log(' Creating proposal...')
  
  const response = await apiCall(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(proposalData)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Проголосовать по предложению
 */
export async function voteOnProposal(
  apiCall: ApiCallFunction,
  proposalId: string,
  voteData: {
    vote: VoteType
    weight?: number
    comment?: string
  }
): Promise<any> {
  const endpoint = `/api/dao/proposals/${proposalId}/vote`
  console.log(' Voting on proposal:', proposalId)
  
  const response = await apiCall(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(voteData)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  return responseData.data
}

/**
 * Получить детали предложения
 */
export async function getProposalDetails(
  apiCall: ApiCallFunction,
  proposalId: string
): Promise<any> {
  const endpoint = `/api/dao/proposals/${proposalId}`
  console.log(' Getting proposal details:', proposalId)
  
  const response = await apiCall(endpoint)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }
  
  const responseData = await response.json()
  return responseData.data
}
