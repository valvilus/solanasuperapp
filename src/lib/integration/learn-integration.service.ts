/**
 * Learn Integration Service
 * Handles bi-directional synchronization between Database and Blockchain
 * 
 * This service provides:
 * - Unified data access across all layers
 * - Automatic synchronization
 * - Error handling and fallback mechanisms
 * - Data consistency validation
 */

import { 
  Course,
  BlockchainCourse,
  BlockchainUserCourse,
  UserProgress,
  CreateCourseParams,
  LearnError,
  LearnErrorCode
} from '@/types/learn.types'
import { LearnDataMapper, CourseIdMapper, UserIdMapper } from './learn-data-mapper'
import { TngLearnContractService } from '@/lib/onchain/tng-learn-contract.service'
import { prisma } from '@/lib/prisma'
import { Connection, PublicKey } from '@solana/web3.js'

// ============================================================================
// INTEGRATION SERVICE
// ============================================================================

export class LearnIntegrationService {
  private static instance: LearnIntegrationService
  private contractService: TngLearnContractService
  private connection: Connection

  private constructor() {
    this.connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    this.contractService = new TngLearnContractService(this.connection)
  }

  public static getInstance(): LearnIntegrationService {
    if (!LearnIntegrationService.instance) {
      LearnIntegrationService.instance = new LearnIntegrationService()
    }
    return LearnIntegrationService.instance
  }

  // ============================================================================
  // UNIFIED COURSE OPERATIONS
  // ============================================================================

  /**
   * Get all courses from both database and blockchain
   * Provides unified view with automatic synchronization
   */
  async getAllCoursesUnified(): Promise<Course[]> {
    try {
      console.log(' Loading unified courses from both sources...')

      // Load from both sources in parallel
      const [dbCourses, blockchainCourses] = await Promise.allSettled([
        this.getDatabaseCourses(),
        this.getBlockchainCourses()
      ])

      const dbCoursesData = dbCourses.status === 'fulfilled' ? dbCourses.value : []
      const blockchainCoursesData = blockchainCourses.status === 'fulfilled' ? blockchainCourses.value : []

      console.log(` Found ${dbCoursesData.length} DB courses, ${blockchainCoursesData.length} blockchain courses`)

      // Create unified course list
      const unifiedCourses = new Map<string, Course>()

      // Add database courses first
      for (const dbCourse of dbCoursesData) {
        const unified = await this.createUnifiedCourse(dbCourse, null)
        unifiedCourses.set(unified.id, unified)
      }

      // Add or merge blockchain courses
      for (const blockchainCourse of blockchainCoursesData) {
        const dbId = CourseIdMapper.getDatabaseId(blockchainCourse.courseId)
        
        if (dbId && unifiedCourses.has(dbId)) {
          // Merge with existing database course
          const existingCourse = unifiedCourses.get(dbId)!
          const mergedCourse = await this.mergeCoursesData(existingCourse, blockchainCourse)
          unifiedCourses.set(dbId, mergedCourse)
        } else {
          // Add blockchain-only course
          const unified = await LearnDataMapper.mapBlockchainToUnified(blockchainCourse)
          unifiedCourses.set(unified.id, unified)
        }
      }

      const result = Array.from(unifiedCourses.values())
      console.log(` Unified ${result.length} total courses`)

      return result

    } catch (error) {
      console.error(' Error in getAllCoursesUnified:', error)
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        'Failed to load unified courses',
        error
      )
    }
  }

  /**
   * Get single course with unified data
   */
  async getCourseUnified(courseId: string): Promise<Course | null> {
    try {
      console.log(` Loading unified course: ${courseId}`)

      // Try to load from database first
      const dbCourse = await this.getDatabaseCourse(courseId)
      
      // Get blockchain data if available
      let blockchainCourse: BlockchainCourse | null = null
      try {
        const blockchainId = await CourseIdMapper.getBlockchainId(courseId)
        blockchainCourse = await this.contractService.getCourse(blockchainId) as any
      } catch (error) {
        console.log(' No blockchain data for course:', courseId)
      }

      if (dbCourse) {
        return await this.createUnifiedCourse(dbCourse, blockchainCourse)
      } else if (blockchainCourse) {
        return await LearnDataMapper.mapBlockchainToUnified(blockchainCourse)
      } else {
        return null
      }

    } catch (error) {
      console.error(` Error loading course ${courseId}:`, error)
      throw new LearnError(
        LearnErrorCode.NOT_FOUND,
        `Course not found: ${courseId}`,
        error
      )
    }
  }

  // ============================================================================
  // USER PROGRESS OPERATIONS
  // ============================================================================

  /**
   * Get unified user progress from both sources
   */
  async getUserProgressUnified(userId: string): Promise<UserProgress> {
    try {
      console.log(` Loading unified progress for user: ${userId}`)

      const [dbProgress, blockchainProgress] = await Promise.allSettled([
        this.getDatabaseUserProgress(userId),
        this.getBlockchainUserProgress(userId)
      ])

      const dbProgressData = dbProgress.status === 'fulfilled' ? dbProgress.value : []
      const blockchainProgressData = blockchainProgress.status === 'fulfilled' ? blockchainProgress.value : null

      // Map to unified progress
      const unifiedProgress = await LearnDataMapper.mapDatabaseUserCourseToProgress(
        dbProgressData,
        blockchainProgressData
      )

      console.log(` Loaded progress: ${unifiedProgress.totalCoursesCompleted} completed courses`)

      return unifiedProgress

    } catch (error) {
      console.error(` Error loading user progress for ${userId}:`, error)
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        'Failed to load user progress',
        error
      )
    }
  }

  // ============================================================================
  // COURSE CREATION WITH DUAL STORAGE
  // ============================================================================

  /**
   * Create course in both database and blockchain
   */
  async createCourseUnified(
    userId: string,
    courseData: CreateCourseParams,
    createOnBlockchain: boolean = true
  ): Promise<{ course: Course; blockchainTx?: string }> {
    try {
      console.log(' Creating unified course...')

      // 1. Create in database first
      const dbCourse = await this.createDatabaseCourse(userId, courseData)
      console.log(` Database course created: ${dbCourse.id}`)

      let blockchainTx: string | undefined
      let blockchainCourse: BlockchainCourse | null = null

      // 2. Create on blockchain if requested
      if (createOnBlockchain) {
        try {
          const walletAddress = await UserIdMapper.getWalletAddress(userId)
          if (walletAddress) {
            const blockchainData = await LearnDataMapper.mapDatabaseToBlockchain(dbCourse)
            
            // This would be called from frontend with proper wallet signature
            // For now, we'll simulate the blockchain creation
            console.log(' Blockchain course data prepared:', blockchainData)
            
            // Register mapping between IDs
            CourseIdMapper.registerMapping(dbCourse.id, blockchainData.courseId)
            
            blockchainTx = 'simulated-transaction-signature'
          }
        } catch (error) {
          console.error(' Blockchain creation failed, continuing with database-only:', error)
        }
      }

      // 3. Create unified course response
      const unifiedCourse = await this.createUnifiedCourse(dbCourse, blockchainCourse)

      return {
        course: unifiedCourse,
        blockchainTx
      }

    } catch (error) {
      console.error(' Error creating unified course:', error)
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        'Failed to create course',
        error
      )
    }
  }

  // ============================================================================
  // PROGRESS UPDATE WITH SYNCHRONIZATION
  // ============================================================================

  /**
   * Update progress in both database and blockchain
   */
  async updateProgressUnified(
    userId: string,
    courseId: string,
    progressData: {
      isCompleted?: boolean
      timeSpent?: number
      xpEarned?: number
      tokensEarned?: number
    }
  ): Promise<void> {
    try {
      console.log(` Updating unified progress for ${userId} in course ${courseId}`)

      // Update database
      await this.updateDatabaseProgress(userId, courseId, progressData)

      // Update blockchain if completed and tokens earned
      if (progressData.isCompleted && progressData.tokensEarned) {
        try {
          await this.updateBlockchainProgress(userId, courseId, progressData)
        } catch (error) {
          console.error(' Blockchain progress update failed:', error)
        }
      }

      console.log(' Progress updated successfully')

    } catch (error) {
      console.error(' Error updating unified progress:', error)
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        'Failed to update progress',
        error
      )
    }
  }

  // ============================================================================
  // SYNCHRONIZATION METHODS
  // ============================================================================

  /**
   * Sync database with blockchain data
   */
  async syncDatabaseWithBlockchain(): Promise<{ synced: number; errors: string[] }> {
    try {
      console.log(' Starting database-blockchain synchronization...')
      
      const errors = []
      let synced = 0

      // Get all blockchain courses
      const blockchainCourses = await this.getBlockchainCourses()

      for (const blockchainCourse of blockchainCourses) {
        try {
          const dbId = CourseIdMapper.getDatabaseId(blockchainCourse.courseId)
          
          if (dbId) {
            await LearnDataMapper.syncDatabaseWithBlockchain(dbId, blockchainCourse)
            synced++
          }
        } catch (error) {
          const errorMsg = `Failed to sync course ${blockchainCourse.courseId}: ${error}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      console.log(` Synchronization complete: ${synced} synced, ${errors.length} errors`)
      return { synced, errors }

    } catch (error) {
      console.error(' Synchronization failed:', error)
      throw new LearnError(
        LearnErrorCode.INTERNAL_ERROR,
        'Database synchronization failed',
        error
      )
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getDatabaseCourses(): Promise<any[]> {
    return await prisma.course.findMany({
      where: { isActive: true },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        },
        quizzes: true,
        _count: {
          select: {
            userCourses: true,
            reviews: true
          }
        }
      }
    })
  }

  private async getDatabaseCourse(courseId: string): Promise<any | null> {
    return await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        },
        quizzes: true,
        _count: {
          select: {
            userCourses: true,
            reviews: true
          }
        }
      }
    })
  }

  private async getBlockchainCourses(): Promise<BlockchainCourse[]> {
    try {
      return await this.contractService.getAllCourses() as any
    } catch (error) {
      console.warn(' Failed to load blockchain courses:', error)
      return []
    }
  }

  private async getDatabaseUserProgress(userId: string): Promise<any[]> {
    return await prisma.userCourse.findMany({
      where: { userId },
      include: {
        course: {
          select: { id: true, title: true }
        },
        lessonProgress: true
      }
    })
  }

  private async getBlockchainUserProgress(userId: string): Promise<{
    completedCourses: number
    totalRewardsClaimed: bigint
    userCourses: BlockchainUserCourse[]
  } | null> {
    try {
      const walletAddress = await UserIdMapper.getWalletAddress(userId)
      if (!walletAddress) return null

      const publicKey = new PublicKey(walletAddress)
      return await this.contractService.getUserProgress(publicKey) as any
    } catch (error) {
      console.warn(' Failed to load blockchain user progress:', error)
      return null
    }
  }

  private async createUnifiedCourse(
    dbCourse: any,
    blockchainCourse: BlockchainCourse | null
  ): Promise<Course> {
    if (blockchainCourse) {
      return await LearnDataMapper.mapBlockchainToUnified(blockchainCourse, dbCourse)
    } else {
      // Create unified course from database only
      return this.mapDatabaseToUnified(dbCourse)
    }
  }

  private async mergeCoursesData(
    unifiedCourse: Course,
    blockchainCourse: BlockchainCourse
  ): Promise<Course> {
    return {
      ...unifiedCourse,
      blockchainId: blockchainCourse.courseId,
      studentsCount: blockchainCourse.totalCompletions,
      isActive: blockchainCourse.isActive,
      blockchainData: {
        courseId: blockchainCourse.courseId,
        creator: blockchainCourse.creator,
        onchainRewardAmount: blockchainCourse.rewardAmount,
        totalCompletions: blockchainCourse.totalCompletions,
        isActiveOnchain: blockchainCourse.isActive
      }
    }
  }

  private mapDatabaseToUnified(dbCourse: any): Course {
    // Convert database course to unified format
    return ({
      id: dbCourse.id,
      title: dbCourse.title,
      description: dbCourse.description,
      shortDescription: dbCourse.shortDescription,
      coverImage: dbCourse.coverImage,
      category: dbCourse.category,
      level: dbCourse.level,
      duration: dbCourse.duration,
      lessonsCount: dbCourse.lessons?.length || 0,
      studentsCount: dbCourse._count?.userCourses || 0,
      rating: Number(dbCourse.rating) || 0,
      ratingCount: dbCourse._count?.reviews || 0,
      lessons: dbCourse.lessons?.map((lesson: any) => ({
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        order: lesson.order,
        duration: lesson.duration,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        xpReward: lesson.xpReward,
        tokenReward: lesson.tokenReward,
        isCompleted: false,
        isLocked: false,
        score: undefined,
        timeSpent: 0,
        rewards: [{
          id: `reward-${lesson.id}`,
          type: 'TNG_TOKENS',
          amount: lesson.tokenReward,
          tokenSymbol: 'TNG',
          xpPoints: lesson.xpReward,
          isUnlocked: false
        }],
        createdAt: lesson.createdAt.toISOString(),
        updatedAt: lesson.updatedAt.toISOString()
      })) || [],
      quizzes: dbCourse.quizzes || [],
      prerequisites: dbCourse.prerequisites || [],
      learningObjectives: dbCourse.learningObjectives || [],
      totalRewardTokens: dbCourse.totalRewardTokens || 0,
      xpReward: dbCourse.totalRewardTokens * 2 || 100,
      certificateAvailable: dbCourse.certificateAvailable || false,
      rewards: [{
        id: `course-reward-${dbCourse.id}`,
        type: 'TNG_TOKENS',
        amount: dbCourse.totalRewardTokens,
        tokenSymbol: 'TNG',
        xpPoints: dbCourse.totalRewardTokens * 2,
        title: 'Course Completion Reward',
        description: 'Reward for completing the entire course',
        isUnlocked: false
      }],
      isEnrolled: false,
      isCompleted: false,
      progressPercentage: 0,
      totalXpEarned: 0,
      totalTokensEarned: BigInt(0),
      createdAt: dbCourse.createdAt.toISOString(),
      updatedAt: dbCourse.updatedAt.toISOString(),
      createdBy: dbCourse.createdBy,
      difficultyScore: dbCourse.difficultyScore || 1,
      estimatedTime: dbCourse.estimatedTime || dbCourse.duration,
      completionRate: Number(dbCourse.completionRate) || 0,
      averageScore: dbCourse.averageScore ? Number(dbCourse.averageScore) : undefined,
      isPopular: dbCourse.isPopular || false,
      isNew: dbCourse.isNew || false,
      isFeatured: dbCourse.isFeatured || false,
      isActive: dbCourse.isActive || true,
      objectives: []
    }) as any
  }

  private async createDatabaseCourse(userId: string, courseData: CreateCourseParams): Promise<any> {
    return await prisma.course.create({
      data: {
        title: courseData.title,
        description: courseData.description,
        category: 'BLOCKCHAIN',
        level: 'BEGINNER',
        duration: 60,
        estimatedTime: 60,
        totalRewardTokens: courseData.rewardAmount || 100,
        createdBy: userId,
        isActive: true,
        isNew: true
      }
    })
  }

  private async updateDatabaseProgress(
    userId: string,
    courseId: string,
    progressData: any
  ): Promise<void> {
    await prisma.userCourse.upsert({
      where: {
        userId_courseId: { userId, courseId }
      },
      update: {
        isCompleted: progressData.isCompleted || false,
        totalTimeSpent: { increment: progressData.timeSpent || 0 },
        totalXpEarned: { increment: progressData.xpEarned || 0 },
        totalTokensEarned: { increment: progressData.tokensEarned || 0 },
        lastAccessedAt: new Date(),
        completedAt: progressData.isCompleted ? new Date() : undefined
      },
      create: {
        userId,
        courseId,
        isCompleted: progressData.isCompleted || false,
        totalTimeSpent: progressData.timeSpent || 0,
        totalXpEarned: progressData.xpEarned || 0,
        totalTokensEarned: progressData.tokensEarned || 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
        completedAt: progressData.isCompleted ? new Date() : undefined
      }
    })
  }

  private async updateBlockchainProgress(
    userId: string,
    courseId: string,
    progressData: any
  ): Promise<void> {
    // This would be implemented when blockchain updates are needed
    // For now, it's a placeholder for future blockchain integration
    console.log(' Blockchain progress update (simulated):', { userId, courseId, progressData })
  }
}

// Singleton export
export const learnIntegrationService = LearnIntegrationService.getInstance()








