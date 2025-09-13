/**
 * Learn Data Mapper
 * Integration layer between Database, Blockchain, and Frontend
 * 
 * This mapper handles:
 * - ID system conversion (CUID  u64)
 * - Data format normalization
 * - Field mapping between layers
 * - Bi-directional synchronization
 */

import { 
  Course,
  BlockchainCourse,
  BlockchainUserCourse,
  UserProgress
} from '@/types/learn.types'
import { PublicKey } from '@solana/web3.js'
import { prisma } from '@/lib/prisma'

// ============================================================================
// MAPPING CONFIGURATION
// ============================================================================

/**
 * Course ID mapping between database and blockchain
 */
export class CourseIdMapper {
  private static idMap: Map<string, number> = new Map() // DB ID -> Blockchain ID
  private static reverseMap: Map<number, string> = new Map() // Blockchain ID -> DB ID

  /**
   * Generate blockchain ID from database ID
   */
  static async getBlockchainId(dbId: string): Promise<number> {
    if (this.idMap.has(dbId)) {
      return this.idMap.get(dbId)!
    }

    // Try to find existing mapping in database
    const course = await prisma.course.findUnique({
      where: { id: dbId },
      select: { id: true, createdAt: true }
    })

    if (!course) {
      throw new Error(`Course not found: ${dbId}`)
    }

    // Generate consistent blockchain ID from creation timestamp
    const blockchainId = Math.floor(course.createdAt.getTime() / 1000) % (2**32)
    
    this.idMap.set(dbId, blockchainId)
    this.reverseMap.set(blockchainId, dbId)
    
    return blockchainId
  }

  /**
   * Get database ID from blockchain ID
   */
  static getDatabaseId(blockchainId: number): string | null {
    return this.reverseMap.get(blockchainId) || null
  }

  /**
   * Register ID mapping
   */
  static registerMapping(dbId: string, blockchainId: number) {
    this.idMap.set(dbId, blockchainId)
    this.reverseMap.set(blockchainId, dbId)
  }
}

/**
 * User ID mapping between database and blockchain
 */
export class UserIdMapper {
  private static userMap: Map<string, string> = new Map() // DB User ID -> Wallet Address
  private static walletMap: Map<string, string> = new Map() // Wallet Address -> DB User ID

  /**
   * Get wallet address from user ID
   */
  static async getWalletAddress(userId: string): Promise<string | null> {
    if (this.userMap.has(userId)) {
      return this.userMap.get(userId)!
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    })

    if (user?.walletAddress) {
      this.userMap.set(userId, user.walletAddress)
      this.walletMap.set(user.walletAddress, userId)
      return user.walletAddress
    }

    return null
  }

  /**
   * Get user ID from wallet address
   */
  static async getUserId(walletAddress: string): Promise<string | null> {
    if (this.walletMap.has(walletAddress)) {
      return this.walletMap.get(walletAddress)!
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true }
    })

    if (user) {
      this.userMap.set(user.id, walletAddress)
      this.walletMap.set(walletAddress, user.id)
      return user.id
    }

    return null
  }
}

// ============================================================================
// DATA MAPPERS
// ============================================================================

export class LearnDataMapper {

  /**
   * Convert Database Course to Blockchain Course format
   */
  static async mapDatabaseToBlockchain(dbCourse: any): Promise<Omit<BlockchainCourse, 'bump'>> {
    const blockchainId = await CourseIdMapper.getBlockchainId(dbCourse.id)
    
    // Get creator wallet address
    let creatorAddress = 'Unknown'
    if (dbCourse.createdBy) {
      const address = await UserIdMapper.getWalletAddress(dbCourse.createdBy)
      creatorAddress = address || 'Unknown'
    }

    return {
      courseId: blockchainId,
      title: dbCourse.title.slice(0, 100), // Smart contract limit
      description: dbCourse.description.slice(0, 500), // Smart contract limit
      creator: creatorAddress,
      rewardAmount: this.convertTNGToBlockchainUnits(dbCourse.totalRewardTokens || 100),
      totalCompletions: dbCourse.studentsCount || 0,
      isActive: dbCourse.isActive || false,
      createdAt: Math.floor(new Date(dbCourse.createdAt).getTime() / 1000)
    }
  }

  /**
   * Convert Blockchain Course to unified Course format
   */
  static async mapBlockchainToUnified(
    blockchainCourse: BlockchainCourse,
    dbCourse?: any
  ): Promise<Course> {
    const dbId = CourseIdMapper.getDatabaseId(blockchainCourse.courseId)
    const creatorUserId = await UserIdMapper.getUserId(blockchainCourse.creator)

    // Base course data from blockchain
    const baseCourse = {
      id: dbId || `blockchain-${blockchainCourse.courseId}`,
      blockchainId: blockchainCourse.courseId,
      
      // Basic info
      title: blockchainCourse.title,
      description: blockchainCourse.description,
      shortDescription: blockchainCourse.description.slice(0, 200),
      coverImage: undefined,
      
      // Classification (defaults if no DB data)
      category: 'BLOCKCHAIN',
      level: 'BEGINNER',
      
      // Metrics
      duration: 60, // Default 1 hour
      lessonsCount: 1,
      studentsCount: blockchainCourse.totalCompletions,
      rating: 0,
      ratingCount: 0,
      
      // Content
      lessons: [],
      quizzes: [],
      prerequisites: [],
      learningObjectives: [],
      
      // Rewards (from blockchain)
      totalRewardTokens: this.convertBlockchainToTNGUnits(blockchainCourse.rewardAmount),
      xpReward: Math.floor(this.convertBlockchainToTNGUnits(blockchainCourse.rewardAmount) * 2),
      certificateAvailable: false,
      rewards: [{
        id: `reward-${blockchainCourse.courseId}`,
        type: 'TNG_TOKENS',
        amount: this.convertBlockchainToTNGUnits(blockchainCourse.rewardAmount),
        tokenSymbol: 'TNG',
        xpPoints: Math.floor(this.convertBlockchainToTNGUnits(blockchainCourse.rewardAmount) * 2),
        title: 'Course Completion Reward',
        description: 'TNG tokens for completing the course',
        isUnlocked: false
      }],
      
      // User progress (defaults)
      isEnrolled: false,
      isCompleted: false,
      progressPercentage: 0,
      totalXpEarned: 0,
      totalTokensEarned: BigInt(0),
      
      // Metadata
      createdAt: new Date(blockchainCourse.createdAt * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: creatorUserId || blockchainCourse.creator,
      difficultyScore: 1,
      estimatedTime: 60,
      completionRate: 0,
      
      // Flags
      isPopular: false,
      isNew: true,
      isFeatured: false,
      isActive: blockchainCourse.isActive,
      
      // Blockchain integration data
      blockchainData: {
        courseId: blockchainCourse.courseId,
        creator: blockchainCourse.creator,
        onchainRewardAmount: blockchainCourse.rewardAmount,
        totalCompletions: blockchainCourse.totalCompletions,
        isActiveOnchain: blockchainCourse.isActive
      }
    } as Course

    // Merge with database data if available
    if (dbCourse) {
      return {
        ...baseCourse,
        id: dbCourse.id,
        shortDescription: dbCourse.shortDescription || baseCourse.shortDescription,
        coverImage: dbCourse.coverImage || baseCourse.coverImage,
        category: dbCourse.category || baseCourse.category,
        level: dbCourse.level || baseCourse.level,
        duration: dbCourse.duration || baseCourse.duration,
        lessonsCount: dbCourse.lessonsCount || baseCourse.lessonsCount,
        rating: Number(dbCourse.rating) || baseCourse.rating,
        ratingCount: dbCourse.ratingCount || baseCourse.ratingCount,
        prerequisites: dbCourse.prerequisites || baseCourse.prerequisites,
        learningObjectives: dbCourse.learningObjectives || baseCourse.learningObjectives,
        certificateAvailable: dbCourse.certificateAvailable || baseCourse.certificateAvailable,
        difficultyScore: dbCourse.difficultyScore || baseCourse.difficultyScore,
        estimatedTime: dbCourse.estimatedTime || baseCourse.estimatedTime,
        completionRate: Number(dbCourse.completionRate) || baseCourse.completionRate,
        averageScore: dbCourse.averageScore ? Number(dbCourse.averageScore) : undefined,
        isPopular: dbCourse.isPopular || baseCourse.isPopular,
        isNew: dbCourse.isNew !== undefined ? dbCourse.isNew : baseCourse.isNew,
        isFeatured: dbCourse.isFeatured || baseCourse.isFeatured,
        updatedAt: dbCourse.updatedAt?.toISOString() || baseCourse.updatedAt,
        createdBy: dbCourse.createdBy || baseCourse.createdBy
      }
    }

    return baseCourse
  }

  /**
   * Map Database UserCourse to unified UserProgress
   */
  static async mapDatabaseUserCourseToProgress(
    dbUserCourses: any[],
    blockchainProgress?: {
      completedCourses: number
      totalRewardsClaimed: bigint
      userCourses: BlockchainUserCourse[]
    }
  ): Promise<UserProgress> {
    const totalCoursesEnrolled = dbUserCourses.length
    const totalCoursesCompleted = dbUserCourses.filter(uc => uc.isCompleted).length
    const totalLessonsCompleted = dbUserCourses.reduce((sum, uc) => sum + uc.lessonsCompleted, 0)
    const totalQuizzesCompleted = 0 // TODO: Add quiz progress tracking
    const totalTimeSpent = dbUserCourses.reduce((sum, uc) => sum + uc.totalTimeSpent, 0)
    const totalXpEarned = dbUserCourses.reduce((sum, uc) => sum + uc.totalXpEarned, 0)
    const totalTokensEarned = BigInt(dbUserCourses.reduce((sum, uc) => sum + uc.totalTokensEarned, 0))
    
    const averageQuizScore = 75 // TODO: Calculate from actual quiz attempts
    const currentStreak = Math.max(...dbUserCourses.map(uc => uc.streakDays))
    const longestStreak = currentStreak // TODO: Track historical streaks
    
    const lastActivity = dbUserCourses
      .map(uc => uc.lastAccessedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

    return {
      userId: dbUserCourses[0]?.userId || '',
      totalCoursesEnrolled,
      totalCoursesCompleted,
      totalLessonsCompleted,
      totalQuizzesCompleted,
      totalTimeSpent,
      totalXpEarned,
      totalTokensEarned: blockchainProgress?.totalRewardsClaimed || totalTokensEarned,
      certificatesEarned: [], // TODO: Load from database
      badgesEarned: [], // TODO: Load from database
      currentStreak,
      longestStreak,
      averageQuizScore,
      lastActivityAt: lastActivity?.toISOString() || new Date().toISOString(),
      globalRank: undefined,
      categoryRanks: {
        BLOCKCHAIN: 0,
        DEFI: 0,
        NFT: 0,
        TRADING: 0,
        DEVELOPMENT: 0,
        SECURITY: 0
      },
      blockchainProgress
    }
  }

  /**
   * Sync database course with blockchain data
   */
  static async syncDatabaseWithBlockchain(
    dbCourseId: string,
    blockchainCourse: BlockchainCourse
  ): Promise<void> {
    // Register ID mapping
    CourseIdMapper.registerMapping(dbCourseId, blockchainCourse.courseId)

    // Update database with blockchain data
    await prisma.course.update({
      where: { id: dbCourseId },
      data: {
        studentsCount: blockchainCourse.totalCompletions,
        isActive: blockchainCourse.isActive,
        // Don't overwrite other database fields
        updatedAt: new Date()
      }
    })
  }

  /**
   * Sync user progress between database and blockchain
   */
  static async syncUserProgress(
    userId: string,
    blockchainProgress: {
      completedCourses: number
      totalRewardsClaimed: bigint
      userCourses: BlockchainUserCourse[]
    }
  ): Promise<void> {
    for (const blockchainUserCourse of blockchainProgress.userCourses) {
      const dbCourseId = CourseIdMapper.getDatabaseId(blockchainUserCourse.courseId)
      
      if (dbCourseId) {
        // Update or create UserCourse record
        await prisma.userCourse.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId: dbCourseId
            }
          },
          update: {
            isCompleted: blockchainUserCourse.isCompleted,
            completedAt: blockchainUserCourse.isCompleted 
              ? new Date(blockchainUserCourse.completedAt * 1000)
              : null,
            rewardClaimed: blockchainUserCourse.isRewardClaimed,
            lastAccessedAt: new Date()
          },
          create: {
            userId,
            courseId: dbCourseId,
            isCompleted: blockchainUserCourse.isCompleted,
            completedAt: blockchainUserCourse.isCompleted 
              ? new Date(blockchainUserCourse.completedAt * 1000)
              : null,
            rewardClaimed: blockchainUserCourse.isRewardClaimed,
            progressPercentage: blockchainUserCourse.isCompleted ? 100 : 0,
            enrolledAt: new Date(),
            lastAccessedAt: new Date()
          }
        })
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert TNG tokens to blockchain units (smallest denomination)
   */
  private static convertTNGToBlockchainUnits(tngTokens: number): number {
    return Math.floor(tngTokens * 1_000_000_000) // Convert to lamports/smallest units
  }

  /**
   * Convert blockchain units to TNG tokens
   */
  private static convertBlockchainToTNGUnits(blockchainUnits: number): number {
    return Math.floor(blockchainUnits / 1_000_000_000) // Convert from lamports to TNG
  }

  /**
   * Validate PublicKey format
   */
  static isValidPublicKey(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  /**
   * Convert timestamp formats
   */
  static unixToISOString(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString()
  }

  static isoToUnix(isoString: string): number {
    return Math.floor(new Date(isoString).getTime() / 1000)
  }
}








