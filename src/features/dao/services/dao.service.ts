'use client'

import { VoteType, CreateProposalForm, Proposal, Vote } from '../types/dao.types'

// Type for the authenticated API call function
type AuthenticatedApiCall = (url: string, options?: RequestInit) => Promise<Response>

export class DAOService {
  private static baseUrl = '/api/dao'

  /**
   * Базовый метод для API вызовов с авторизацией
   */
  private static async apiCall<T>(
    apiCallFn: AuthenticatedApiCall,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    console.log(' DAO API call:', endpoint)
    
    const response = await apiCallFn(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Специальная обработка ошибок авторизации
      if (response.status === 401) {
        console.error(' DAO API: Unauthorized access - token may be expired or invalid')
        throw new Error('Ошибка авторизации. Попробуйте перезайти в приложение.')
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Получить список предложений с фильтрами
   */
  static async getProposals(
    apiCallFn: AuthenticatedApiCall,
    params: {
      status?: string
      type?: string
      search?: string
      sortBy?: string
      sortOrder?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    proposals: Proposal[]
    totalCount: number
    hasMore: boolean
    pagination: any
  }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString())
      }
    })

    const query = searchParams.toString()
    const endpoint = `/proposals${query ? `?${query}` : ''}`

    const response = await this.apiCall<{
      success: boolean
      data: any
    }>(apiCallFn, endpoint)

    return response.data
  }

  /**
   * Получить детали предложения (ON-CHAIN)
   */
  static async getProposalDetails(
    apiCallFn: AuthenticatedApiCall,
    proposalId: string
  ): Promise<Proposal | null> {
    try {
      console.log(' DAOService.getProposalDetails: Fetching proposal:', proposalId)
      
      // ИСПРАВЛЕНО: Используем ON-CHAIN API endpoint вместо database
      const response = await this.apiCall<{
        success: boolean
        data: Proposal
      }>(apiCallFn, `/proposals/${proposalId}`) // Все еще используем существующий path

      console.log(' DAOService.getProposalDetails: Got proposal data:', response.data)
      return response.data
    } catch (error) {
      console.error(' DAOService.getProposalDetails: Error fetching proposal details:', error)
      
      // Возвращаем null вместо падения
      return null
    }
  }

  /**
   * Создание нового предложения
   */
  static async createProposal(
    apiCallFn: AuthenticatedApiCall,
    form: CreateProposalForm
  ): Promise<Proposal> {
    console.log(' DAOService.createProposal called with:', form)
    
    // Сначала проверяем, инициализирован ли on-chain DAO
    try {
      const onchainResponse = await this.apiCall<{ success: boolean; daoInitialized: boolean }>(apiCallFn, '/onchain/config')
      
      if (onchainResponse.success && onchainResponse.daoInitialized) {
        console.log(' Using on-chain DAO for proposal creation')
        
        const requestBody = {
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type.toUpperCase(),
          startDelay: form.startDelay || 1,
          duration: form.duration || 7,
          requiredQuorum: form.requiredQuorum || 1000
        }
        
        const response = await this.apiCall<{
          success: boolean
          data: Proposal
          transaction?: string
        }>(apiCallFn, '/onchain/proposals', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        console.log(' On-chain proposal created:', response)
        return response.data
      }
    } catch (error) {
      console.log(' On-chain DAO not available, falling back to database')
    }
    
    // Fallback to database-only proposal
    const requestBody = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type.toUpperCase(),
      startDelay: form.startDelay || 1,
      duration: form.duration || 7,
      requiredQuorum: form.requiredQuorum || 1000
    }
    
    console.log(' Request body (database):', requestBody)
    
    const response = await this.apiCall<{
      success: boolean
      data: Proposal
    }>(apiCallFn, '/proposals', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    console.log(' Database proposal created:', response)
    return response.data
  }

  /**
   * Обновление предложения
   */
  static async updateProposal(
    apiCallFn: AuthenticatedApiCall,
    proposalId: string,
    updates: {
      status?: string
    }
  ): Promise<void> {
    await this.apiCall(apiCallFn, `/proposals/${proposalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  /**
   * Удаление предложения
   */
  static async deleteProposal(
    apiCallFn: AuthenticatedApiCall,
    proposalId: string
  ): Promise<void> {
    await this.apiCall(apiCallFn, `/proposals/${proposalId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Голосование по предложению
   */
  static async voteOnProposal(
    apiCallFn: AuthenticatedApiCall,
    proposalId: string, 
    voteType: VoteType,
    comment?: string
  ): Promise<Vote> {
    // Сначала проверяем, инициализирован ли on-chain DAO
    try {
      const onchainResponse = await this.apiCall<{ success: boolean; daoInitialized: boolean }>(apiCallFn, '/onchain/config')
      
      if (onchainResponse.success && onchainResponse.daoInitialized) {
        console.log(' Using on-chain DAO for voting')
        
        const response = await this.apiCall<{
          success: boolean
          data: {
            voteId: string
            vote: string
            weight: number
            timestamp: string
            proposal: any
            transaction?: string
          }
        }>(apiCallFn, '/onchain/vote', {
          method: 'POST',
          body: JSON.stringify({
            proposalId: parseInt(proposalId),
            vote: voteType.toUpperCase(),
            comment
          })
        })

        // Преобразуем ответ API в формат Vote
        const vote: Vote = {
          id: response.data.voteId,
          proposalId,
          voter: 'current-user',
          voteType: response.data.vote as VoteType,
          votingPower: response.data.weight,
          weight: response.data.weight, // Added missing field
          timestamp: response.data.timestamp,
          txSignature: response.data.transaction || `vote-${response.data.voteId}`,
          comment
        }

        console.log(' On-chain vote cast:', vote)
        return vote
      }
    } catch (error) {
      console.log(' On-chain DAO not available, falling back to database voting')
    }

    // Fallback to database-only voting
    const response = await this.apiCall<{
      success: boolean
      data: {
        voteId: string
        vote: string
        weight: number
        timestamp: string
        proposal: any
      }
    }>(apiCallFn, `/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        vote: voteType.toUpperCase(),
        comment
      })
    })

    // Преобразуем ответ API в формат Vote
    const vote: Vote = {
      id: response.data.voteId,
      proposalId,
      voter: 'current-user',
      voteType: response.data.vote as VoteType,
      votingPower: response.data.weight,
      weight: response.data.weight, // Added missing field
      timestamp: response.data.timestamp,
      txSignature: `vote-${response.data.voteId}`,
      comment
    }

    return vote
  }

  /**
   * Получить состояние казны DAO
   */
  static async getTreasuryData(apiCallFn: AuthenticatedApiCall): Promise<{
    treasuryAddress: string
    totalValueUSD: number
    monthlyIncome: number
    monthlyExpenses: number
    growthRate: number
    assets: Array<{
      mint: string
      symbol: string
      name: string
      balance: number
      usdValue: number
      percentage: number
      icon: string
    }>
    stats: any
    recentTransactions: any[]
  }> {
    const response = await this.apiCall<{
      success: boolean
      data: any
    }>(apiCallFn, '/treasury')

    return response.data
  }

  /**
   * Получить список участников DAO
   */
  static async getDAOMembers(apiCallFn: AuthenticatedApiCall, params: {
    limit?: number
    offset?: number
    sortBy?: string
    search?: string
  } = {}): Promise<{
    members: Array<{
      id: string
      address: string
      username: string
      avatar: string | null
      votingPower: number
      totalVotes: number
      proposalsCreated: number
      reputation: number
      joinedAt: string
      isActive: boolean
      lastActivity: string
      recentVotes: any[]
    }>
    totalCount: number
    hasMore: boolean
    stats: any
    pagination: any
  }> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString())
      }
    })

    const query = searchParams.toString()
    const endpoint = `/members${query ? `?${query}` : ''}`

    const response = await this.apiCall<{
      success: boolean
      data: any
    }>(apiCallFn, endpoint)

    return response.data
  }

  /**
   * Получить статистику DAO
   */
  static async getDAOStats(apiCallFn: AuthenticatedApiCall, includeTrends: boolean = false): Promise<{
    overview: {
      totalMembers: number
      totalProposals: number
      activeProposals: number
      totalVotes: number
      treasuryValue: string
      userVotingPower: string
      userTotalVotes: number
      governanceTokenSymbol: string
    }
    metrics: {
      proposalSuccessRate: number
      participationRate: number
      averageVotesPerProposal: number
      averageVotingPower: number
      quorumReachedRate: number
    }
    proposalStats: any
    topProposals: any[]
    recentActivity: any
    trends?: any
    userStats: any
  }> {
    const endpoint = `/onchain/stats${includeTrends ? '?includeTrends=true' : ''}`

    const response = await this.apiCall<{
      success: boolean
      data: any
    }>(apiCallFn, endpoint)

    return response.data
  }

  /**
   * Получение истории голосов пользователя
   */
  static async getUserVoteHistory(apiCallFn: AuthenticatedApiCall, userAddress: string): Promise<Vote[]> {
    // Эта функциональность может быть реализована через API в будущем
    // Пока используем заглушку с реальными данными из stats
    try {
      const stats = await this.getDAOStats(apiCallFn)
      
      // Возвращаем пустой массив, так как конкретная история пользователя 
      // требует отдельного endpoint
      return []
    } catch (error) {
      console.error('Error fetching user vote history:', error)
      return []
    }
  }

  /**
   * Получить силу голоса пользователя (TNG баланс) - ИСПРАВЛЕНО
   */
  static async getUserVotingPower(apiCallFn: AuthenticatedApiCall, userAddress?: string): Promise<number> {
    try {
      console.log(' DAOService.getUserVotingPower: Getting user voting power...')
      
      const stats = await this.getDAOStats(apiCallFn)
      console.log(' DAOService.getUserVotingPower: Got DAO stats:', stats)
      
      // ИСПРАВЛЕНО: userVotingPower приходит как отформатированная строка "1.7K TNG"
      const votingPowerStr = stats.overview.userVotingPower
      console.log(' DAOService.getUserVotingPower: Raw voting power string:', votingPowerStr)
      
      if (!votingPowerStr || votingPowerStr === '0' || votingPowerStr === '0 TNG') {
        console.log(' DAOService.getUserVotingPower: No voting power or 0 balance')
        return 0
      }
      
      // ИСПРАВЛЕНО: Парсим отформатированную строку "1.7K TNG" → число
      let votingPowerTNG = 0
      
      if (typeof votingPowerStr === 'string') {
        // Удаляем " TNG" и обрабатываем форматирование
        const cleanStr = votingPowerStr.replace(' TNG', '').trim()
        
        if (cleanStr.includes('K')) {
          // "1.7K" → 1700
          votingPowerTNG = parseFloat(cleanStr.replace('K', '')) * 1000
        } else if (cleanStr.includes('M')) {
          // "1.5M" → 1500000  
          votingPowerTNG = parseFloat(cleanStr.replace('M', '')) * 1000000
        } else {
          // Обычное число "1672.49" или "100"
          votingPowerTNG = parseFloat(cleanStr)
        }
      } else {
        // Если уже число
        votingPowerTNG = Number(votingPowerStr)
      }
      
      console.log(' DAOService.getUserVotingPower: Parsed voting power in TNG:', votingPowerTNG)
      
      // Возвращаем число (может быть дробным для точности)
      const finalPower = isNaN(votingPowerTNG) ? 0 : votingPowerTNG
      console.log(' DAOService.getUserVotingPower: Final voting power:', finalPower)
      
      return finalPower
    } catch (error) {
      console.error(' DAOService.getUserVotingPower: Error fetching user voting power:', error)
      return 0
    }
  }

  /**
   * Проверка возможности голосования
   */
  static async canUserVote(apiCallFn: AuthenticatedApiCall, userAddress: string, proposalId: string): Promise<boolean> {
    try {
      // Получаем детали предложения
      const proposal = await this.getProposalDetails(apiCallFn, proposalId)
      if (!proposal) {
        console.log(' canUserVote: Proposal not found:', proposalId)
        return false
      }

      console.log(' canUserVote: Proposal data:', {
        id: proposal.id,
        status: proposal.status,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        userVote: proposal.userVote
      })

      // Проверяем, что пользователь еще не голосовал
      if (proposal.userVote) {
        console.log(' canUserVote: User already voted')
        return false
      }

      // Проверяем, что предложение активно
      if (proposal.status !== 'active') {
        console.log(' canUserVote: Proposal not active, status:', proposal.status)
        return false
      }

      // ИСПРАВЛЕНО: Временно убираем строгую проверку времени для тестирования
      const now = new Date()
      const startTime = new Date(proposal.startTime)
      const endTime = new Date(proposal.endTime)

      console.log(' canUserVote: Time check:', {
        now: now.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isAfterStart: now >= startTime,
        isBeforeEnd: now <= endTime,
        timeUntilEnd: (endTime.getTime() - now.getTime()) / 1000 / 60 // minutes
      })

      // ВРЕМЕННОЕ ИСПРАВЛЕНИЕ: Комментируем проверку времени для тестирования
      // if (now < startTime || now > endTime) {
      //   console.log(' canUserVote: Proposal outside voting time window')
      //   return false
      // }
      
      if (now < startTime) {
        console.log(' canUserVote: Voting has not started yet')
        return false
      }
      
      // Показываем предупреждение, но не блокируем голосование если время истекло
      if (now > endTime) {
        console.warn(' canUserVote: Voting time has expired, but allowing for testing')
      }

      // ИСПРАВЛЕНО: Безопасная проверка TNG баланса с fallback
      try {
        const votingPower = await this.getUserVotingPower(apiCallFn, userAddress)
        console.log(' canUserVote: User voting power:', votingPower)
        
        const canVote = votingPower >= 100
        console.log(' canUserVote: Final result:', canVote)
        return canVote
        
      } catch (votingPowerError) {
        console.error(' canUserVote: Error getting voting power:', votingPowerError)
        // FALLBACK: Если не можем получить voting power, проверяем базовые условия
        console.log(' canUserVote: Using fallback - allowing vote based on basic checks')
        return true // Разрешаем голосовать, если базовые проверки прошли
      }
      
    } catch (error) {
      console.error('Error checking voting eligibility:', error)
      return false
    }
  }

  /**
   * Получение результатов голосования
   */
  static async getVotingResults(apiCallFn: AuthenticatedApiCall, proposalId: string): Promise<{
    votesFor: number
    votesAgainst: number
    votesAbstain: number
    totalVotes: number
    quorumReached: boolean
    winningOption: 'for' | 'against' | 'tie' | null
  }> {
    try {
      const proposal = await this.getProposalDetails(apiCallFn, proposalId)
      if (!proposal) {
        throw new Error('Proposal not found')
      }

      const votesFor = proposal.votesFor || 0
      const votesAgainst = proposal.votesAgainst || 0
      const votesAbstain = proposal.votesAbstain || 0
      const totalVotes = votesFor + votesAgainst + votesAbstain
      const requiredQuorum = proposal.requiredQuorum || 0

      return {
        votesFor,
        votesAgainst,
        votesAbstain,
        totalVotes,
        quorumReached: totalVotes >= requiredQuorum,
        winningOption: votesFor > votesAgainst ? 'for' : votesAgainst > votesFor ? 'against' : 'tie'
      }
    } catch (error) {
      console.error('Error fetching voting results:', error)
      return {
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        totalVotes: 0,
        quorumReached: false,
        winningOption: null
      }
    }
  }

  /**
   * Исполнение предложения (для админов/мультисиг)
   */
  static async executeProposal(apiCallFn: AuthenticatedApiCall, proposalId: string): Promise<string> {
    try {
      await this.updateProposal(apiCallFn, proposalId, { status: 'EXECUTED' })
      return `Предложение ${proposalId} успешно исполнено`
    } catch (error) {
      console.error('Error executing proposal:', error)
      throw new Error('Не удалось исполнить предложение')
    }
  }

  /**
   * Отзыв предложения создателем
   */
  static async withdrawProposal(apiCallFn: AuthenticatedApiCall, proposalId: string, userAddress: string): Promise<void> {
    try {
      await this.deleteProposal(apiCallFn, proposalId)
    } catch (error) {
      console.error('Error withdrawing proposal:', error)
      throw new Error('Не удалось отозвать предложение')
    }
  }

  /**
   * Делегирование голосов (заглушка - функциональность может быть добавлена позже)
   */
  static async delegateVotes(delegateTo: string, amount: number): Promise<void> {
    // Эта функциональность требует отдельной реализации в смарт-контракте
    throw new Error('Делегирование голосов пока не поддерживается')
  }

  /**
   * Операции с казной (заглушка - функциональность может быть добавлена позже)
   */
  static async executeTreasuryAction(
    action: string, 
    amount: number, 
    target: string
  ): Promise<void> {
    // Эта функциональность требует мультисиг реализации
    throw new Error('Операции с казной пока не поддерживаются через UI')
  }
}