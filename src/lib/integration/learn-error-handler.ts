/**
 * Learn Integration Error Handler
 * Handles errors and provides fallback mechanisms for Learn system integration
 */

import { LearnError, LearnErrorCode } from '@/types/learn.types'

// ============================================================================
// ERROR HANDLING STRATEGIES
// ============================================================================

export enum FallbackStrategy {
  DATABASE_ONLY = 'database_only',
  BLOCKCHAIN_ONLY = 'blockchain_only', 
  CACHED_DATA = 'cached_data',
  PARTIAL_DATA = 'partial_data',
  FAIL_FAST = 'fail_fast'
}

export interface IntegrationErrorContext {
  operation: string
  source: 'database' | 'blockchain' | 'api' | 'integration'
  userId?: string
  courseId?: string
  additionalData?: Record<string, any>
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

export class LearnIntegrationErrorHandler {
  private static errorLog: Array<{
    timestamp: string
    error: LearnError
    context: IntegrationErrorContext
    resolution: string
  }> = []

  /**
   * Handle integration errors with appropriate fallback strategy
   */
  static async handleError(
    error: any,
    context: IntegrationErrorContext,
    strategy: FallbackStrategy = FallbackStrategy.PARTIAL_DATA
  ): Promise<{
    success: boolean
    data?: any
    fallbackUsed: boolean
    warnings: string[]
  }> {
    const learnError = this.normalizeError(error, context)
    
    // Log the error
    this.logError(learnError, context)
    
    console.error(` Integration error in ${context.operation}:`, learnError.message)

    switch (strategy) {
      case FallbackStrategy.DATABASE_ONLY:
        return await this.fallbackToDatabase(context)
        
      case FallbackStrategy.BLOCKCHAIN_ONLY:
        return await this.fallbackToBlockchain(context)
        
      case FallbackStrategy.CACHED_DATA:
        return await this.fallbackToCachedData(context)
        
      case FallbackStrategy.PARTIAL_DATA:
        return await this.fallbackToPartialData(context)
        
      case FallbackStrategy.FAIL_FAST:
      default:
        throw learnError
    }
  }

  /**
   * Fallback to database-only data
   */
  private static async fallbackToDatabase(context: IntegrationErrorContext) {
    console.log(' Falling back to database-only data...')
    
    try {
      const { prisma } = await import('@/lib/prisma')
      
      switch (context.operation) {
        case 'getCourses':
          const courses = await prisma.course.findMany({
            where: { isActive: true },
            include: {
              lessons: true,
              _count: { select: { userCourses: true } }
            }
          })
          
          return {
            success: true,
            data: courses,
            fallbackUsed: true,
            warnings: ['Blockchain data unavailable, showing database-only courses']
          }
          
        case 'getUserProgress':
          if (!context.userId) {
            throw new Error('User ID required for progress fallback')
          }
          
          const progress = await prisma.userCourse.findMany({
            where: { userId: context.userId },
            include: { course: true, lessonProgress: true }
          })
          
          return {
            success: true,
            data: progress,
            fallbackUsed: true,
            warnings: ['Blockchain progress unavailable, showing database-only progress']
          }
          
        default:
          throw new Error(`No database fallback available for operation: ${context.operation}`)
      }
      
    } catch (fallbackError) {
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        `Database fallback failed: ${fallbackError}`,
        { originalError: context, fallbackError }
      )
    }
  }

  /**
   * Fallback to blockchain-only data (limited functionality)
   */
  private static async fallbackToBlockchain(context: IntegrationErrorContext) {
    console.log(' Falling back to blockchain-only data...')
    
    try {
      const { TngLearnContractService } = await import('@/lib/onchain/tng-learn-contract.service')
      const { Connection } = await import('@solana/web3.js')
      
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )
      
      const contractService = new TngLearnContractService(connection)
      
      switch (context.operation) {
        case 'getCourses':
          const blockchainCourses = await contractService.getAllCourses()
          
          return {
            success: true,
            data: blockchainCourses,
            fallbackUsed: true,
            warnings: ['Database unavailable, showing blockchain-only courses (limited metadata)']
          }
          
        default:
          throw new Error(`No blockchain fallback available for operation: ${context.operation}`)
      }
      
    } catch (fallbackError) {
      throw new LearnError(
        LearnErrorCode.BLOCKCHAIN_ERROR,
        `Blockchain fallback failed: ${fallbackError}`,
        { originalError: context, fallbackError }
      )
    }
  }

  /**
   * Fallback to cached data
   */
  private static async fallbackToCachedData(context: IntegrationErrorContext) {
    console.log(' Falling back to cached data...')
    
    // In a real implementation, this would use Redis or similar cache
    // For now, we'll return empty data with appropriate warnings
    
    return {
      success: true,
      data: this.getEmptyDataForOperation(context.operation),
      fallbackUsed: true,
      warnings: ['Live data unavailable, cache is empty. Please try again later.']
    }
  }

  /**
   * Fallback to partial data (best effort)
   */
  private static async fallbackToPartialData(context: IntegrationErrorContext) {
    console.log(' Attempting partial data recovery...')
    
    const warnings = []
    let data: any = null

    // Try database first
    try {
      const dbResult = await this.fallbackToDatabase(context)
      data = dbResult.data
      warnings.push('Some blockchain features may be unavailable')
    } catch (dbError) {
      warnings.push('Database unavailable')
      
      // Try blockchain as last resort  
      try {
        const blockchainResult = await this.fallbackToBlockchain(context)
        data = blockchainResult.data
        warnings.push('Limited to blockchain data only')
      } catch (blockchainError) {
        warnings.push('All data sources unavailable')
        data = this.getEmptyDataForOperation(context.operation)
      }
    }

    return {
      success: true,
      data,
      fallbackUsed: true,
      warnings
    }
  }

  /**
   * Get empty data structure for operation
   */
  private static getEmptyDataForOperation(operation: string): any {
    switch (operation) {
      case 'getCourses':
        return []
      case 'getUserProgress':
        return {
          totalCoursesEnrolled: 0,
          totalCoursesCompleted: 0,
          totalLessonsCompleted: 0,
          totalQuizzesCompleted: 0,
          totalTimeSpent: 0,
          totalXpEarned: 0,
          totalTokensEarned: BigInt(0),
          certificatesEarned: [],
          badgesEarned: [],
          currentStreak: 0,
          longestStreak: 0,
          averageQuizScore: 0,
          lastActivityAt: new Date().toISOString(),
          globalRank: undefined,
          categoryRanks: {
            BLOCKCHAIN: 0,
            DEFI: 0,
            NFT: 0,
            TRADING: 0,
            DEVELOPMENT: 0,
            SECURITY: 0
          }
        }
      default:
        return null
    }
  }

  /**
   * Normalize different error types to LearnError
   */
  private static normalizeError(error: any, context: IntegrationErrorContext): LearnError {
    if (error instanceof LearnError) {
      return error
    }
    
    if (error instanceof Error) {
      // Map common error types
      if (error.message.includes('fetch')) {
        return new LearnError(
          LearnErrorCode.INTERNAL_ERROR,
          `Network error in ${context.operation}: ${error.message}`,
          context
        )
      }
      
      if (error.message.includes('not found')) {
        return new LearnError(
          LearnErrorCode.NOT_FOUND,
          error.message,
          context
        )
      }
      
      return new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        `${context.operation} failed: ${error.message}`,
        context
      )
    }
    
    return new LearnError(
      LearnErrorCode.INTERNAL_ERROR,
      `Unknown error in ${context.operation}`,
      { error, context }
    )
  }

  /**
   * Log error for monitoring and debugging
   */
  private static logError(error: LearnError, context: IntegrationErrorContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error,
      context,
      resolution: 'pending'
    }
    
    this.errorLog.push(logEntry)
    
    // Keep only last 100 errors in memory
    if (this.errorLog.length > 100) {
      this.errorLog.shift()
    }
    
    // In production, this would send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (Sentry, etc.)
      console.error('[LEARN_INTEGRATION_ERROR]', {
        operation: context.operation,
        source: context.source,
        error: error.message,
        code: error.code,
        userId: context.userId,
        courseId: context.courseId
      })
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats() {
    const now = Date.now()
    const lastHour = now - (60 * 60 * 1000)
    const last24Hours = now - (24 * 60 * 60 * 1000)
    
    const recentErrors = this.errorLog.filter(log => 
      new Date(log.timestamp).getTime() > lastHour
    )
    
    const dailyErrors = this.errorLog.filter(log => 
      new Date(log.timestamp).getTime() > last24Hours
    )
    
    const errorsBySource = this.errorLog.reduce((acc, log) => {
      const source = log.context.source
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      total: this.errorLog.length,
      lastHour: recentErrors.length,
      last24Hours: dailyErrors.length,
      bySource: errorsBySource,
      mostCommon: this.getMostCommonErrors()
    }
  }

  /**
   * Get most common error types
   */
  private static getMostCommonErrors() {
    const errorCounts = this.errorLog.reduce((acc, log) => {
      const operation = log.context.operation
      acc[operation] = (acc[operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([operation, count]) => ({ operation, count }))
  }

  /**
   * Clear error log (for testing/debugging)
   */
  static clearErrorLog(): void {
    this.errorLog = []
  }
}








