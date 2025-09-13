/**
 * Simplified Learn Contract Service
 * Direct integration with TNG Learn Smart Contract
 * Program ID: SJL8TzuoUi8LvNSD3jeoYxtrVTcdNUdWFTe17JAgCgB
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import TngLearnIDL from '@/lib/idl/tng_learn.json'

// Sponsor integration
function getSponsorPublicKey(): PublicKey {
  // This should be the sponsor wallet that pays for transactions
  return new PublicKey('3ZhvP2L97rjVXE89PdthCtAZHzMJmxiheueXbjExM6SQ') // From deployment info
}

// Constants
const PROGRAM_ID = new PublicKey('SJL8TzuoUi8LvNSD3jeoYxtrVTcdNUdWFTe17JAgCgB')
const TNG_MINT = new PublicKey('FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs') // Correct TNG mint from keys/tng-mint-info.json

// Types matching smart contract
export interface LearnCourse {
  courseId: number
  title: string
  description: string
  creator: PublicKey
  rewardAmount: number // TNG tokens in smallest units
  totalCompletions: number
  isActive: boolean
  createdAt: number
  bump: number
}

export interface LearnUserCourse {
  user: PublicKey
  courseId: number
  answerHash: string
  isCompleted: boolean
  completedAt: number
  isRewardClaimed: boolean
  claimedAt?: number
  bump: number
}

export interface LearnConfig {
  admin: PublicKey
  totalCourses: number
  totalRewardsDistributed: number
  isActive: boolean
  bump: number
}

export interface CreateCourseRequest {
  title: string
  description: string
  rewardAmount: number
}

export interface SubmitAnswerRequest {
  courseId: number
  answerHash: string
}

export class LearnContractService {
  private connection: Connection | null = null
  private program: Program | null = null
  private initialized = false

  constructor() {
    // Only initialize if we're not in build mode
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      // Skip initialization during build
      console.log('🔧 LearnContractService: Skipping initialization during build')
      return
    }

    this.initializeService()
  }

  private initializeService() {
    try {
      this.connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )
      
      // Dummy provider for read operations
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async () => { throw new Error('Read-only') },
        signAllTransactions: async () => { throw new Error('Read-only') }
      }
      
      const provider = new AnchorProvider(this.connection, dummyWallet as any, {})
      this.program = new Program(TngLearnIDL as any, PROGRAM_ID as any, provider as any)
      this.initialized = true
      console.log('✅ LearnContractService initialized successfully')
    } catch (error) {
      console.warn('⚠️ LearnContractService initialization failed:', error)
      // Continue without program for build compatibility
    }
  }

  private async ensureInitialized() {
    if (!this.initialized && typeof window !== 'undefined') {
      this.initializeService()
    }
    
    if (!this.program || !this.connection) {
      throw new Error('LearnContractService not properly initialized')
    }
  }

  // ============================================================================
  // PDA HELPERS
  // ============================================================================

  getLearnConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('learn_config')],
      PROGRAM_ID
    )
  }

  getCoursePDA(courseId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('course'), new BN(courseId).toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    )
  }

  getUserCoursePDA(user: PublicKey, courseId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('user_course'),
        user.toBuffer(),
        new BN(courseId).toArrayLike(Buffer, 'le', 8)
      ],
      PROGRAM_ID
    )
  }

  async getCourseVaultPDA(coursePDA: PublicKey): Promise<PublicKey> {
    return await getAssociatedTokenAddress(TNG_MINT, coursePDA, true)
  }

  // ============================================================================
  // READ METHODS - Direct blockchain calls
  // ============================================================================

  async getLearnConfig(): Promise<LearnConfig | null> {
    try {
      await this.ensureInitialized()
      const [configPDA] = this.getLearnConfigPDA()
      const config = await (this.program!.account as any).learnConfig.fetch(configPDA)
      
      return {
        admin: config.admin,
        totalCourses: config.totalCourses.toNumber(),
        totalRewardsDistributed: config.totalRewardsDistributed.toNumber(),
        isActive: config.isActive,
        bump: config.bump
      }
    } catch (error) {
      console.error(' Error fetching learn config:', error)
      return null
    }
  }

  async getCourse(courseId: number): Promise<LearnCourse | null> {
    try {
      await this.ensureInitialized()
      const [coursePDA] = this.getCoursePDA(courseId)
      const course = await (this.program!.account as any).course.fetch(coursePDA)
      
      return {
        courseId: course.courseId.toNumber(),
        title: course.title,
        description: course.description,
        creator: course.creator,
        rewardAmount: course.rewardAmount.toNumber(),
        totalCompletions: course.totalCompletions.toNumber(),
        isActive: course.isActive,
        createdAt: course.createdAt.toNumber(),
        bump: course.bump
      }
    } catch (error) {
      console.error(` Error fetching course ${courseId}:`, error)
      return null
    }
  }

  async getAllCourses(): Promise<LearnCourse[]> {
    try {
      const config = await this.getLearnConfig()
      if (!config) return []

      const courses: LearnCourse[] = []
      
      for (let i = 0; i < config.totalCourses; i++) {
        const course = await this.getCourse(i)
        if (course && course.isActive) {
          courses.push(course)
        }
      }
      
      return courses
    } catch (error) {
      console.error(' Error fetching all courses:', error)
      return []
    }
  }

  async getUserCourse(user: PublicKey, courseId: number): Promise<LearnUserCourse | null> {
    try {
      await this.ensureInitialized()
      const [userCoursePDA] = this.getUserCoursePDA(user, courseId)
      const userCourse = await (this.program!.account as any).userCourse.fetch(userCoursePDA)
      
      return {
        user: userCourse.user,
        courseId: userCourse.courseId.toNumber(),
        answerHash: userCourse.answerHash,
        isCompleted: userCourse.isCompleted,
        completedAt: userCourse.completedAt.toNumber(),
        isRewardClaimed: userCourse.isRewardClaimed,
        claimedAt: userCourse.claimedAt ? userCourse.claimedAt.toNumber() : undefined,
        bump: userCourse.bump
      }
    } catch (error) {
      console.error(` Error fetching user course ${user.toString()}-${courseId}:`, error)
      return null
    }
  }

  async getUserProgress(user: PublicKey): Promise<{
    completedCourses: number
    totalRewardsClaimed: number
    userCourses: LearnUserCourse[]
  }> {
    try {
      const config = await this.getLearnConfig()
      if (!config) return { completedCourses: 0, totalRewardsClaimed: 0, userCourses: [] }

      const userCourses: LearnUserCourse[] = []
      let completedCourses = 0
      let totalRewardsClaimed = 0

      for (let i = 0; i < config.totalCourses; i++) {
        const userCourse = await this.getUserCourse(user, i)
        if (userCourse) {
          userCourses.push(userCourse)
          
          if (userCourse.isCompleted) {
            completedCourses++
          }
          
          if (userCourse.isRewardClaimed) {
            const course = await this.getCourse(i)
            if (course) {
              totalRewardsClaimed += course.rewardAmount
            }
          }
        }
      }

      return {
        completedCourses,
        totalRewardsClaimed,
        userCourses
      }
    } catch (error) {
      console.error(' Error fetching user progress:', error)
      return { completedCourses: 0, totalRewardsClaimed: 0, userCourses: [] }
    }
  }

  // ============================================================================
  // TRANSACTION BUILDING - For frontend wallet integration
  // ============================================================================

  async buildCreateCourseTransaction(
    creator: PublicKey,
    courseData: CreateCourseRequest
  ): Promise<{
    transaction: Transaction
    courseId: number
    estimatedCost: number
  }> {
    try {
      await this.ensureInitialized()
      
      // Get next course ID
      const config = await this.getLearnConfig()
      const courseId = config ? config.totalCourses : 0
      
      const [coursePDA] = this.getCoursePDA(courseId)
      const [configPDA] = this.getLearnConfigPDA()
      const courseVault = await this.getCourseVaultPDA(coursePDA)
      const creatorTokenAccount = await getAssociatedTokenAddress(TNG_MINT, creator)

      const instruction = await this.program!.methods
        .createCourse(
          courseData.title,
          courseData.description,
          new BN(courseData.rewardAmount),
          new BN(courseId)
        )
        .accounts({
          course: coursePDA,
          courseVault,
          learnConfig: configPDA,
          creator,
          creatorTokenAccount,
          tngMint: TNG_MINT,
          payer: getSponsorPublicKey(), // Sponsor pays fees
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .instruction()

      const transaction = new Transaction().add(instruction)
      
      return {
        transaction,
        courseId,
        estimatedCost: courseData.rewardAmount // User needs to fund the course vault
      }
    } catch (error) {
      console.error(' Error building create course transaction:', error)
      throw error
    }
  }

  async buildSubmitAnswerTransaction(
    user: PublicKey,
    request: SubmitAnswerRequest
  ): Promise<Transaction> {
    try {
      await this.ensureInitialized()
      
      const [coursePDA] = this.getCoursePDA(request.courseId)
      const [userCoursePDA] = this.getUserCoursePDA(user, request.courseId)

      const instruction = await this.program!.methods
        .submitAnswer(new BN(request.courseId), request.answerHash)
        .accounts({
          userCourse: userCoursePDA,
          course: coursePDA,
          user,
          payer: getSponsorPublicKey(), // Sponsor pays fees
          systemProgram: PublicKey.default, // System program
        })
        .instruction()

      return new Transaction().add(instruction)
    } catch (error) {
      console.error(' Error building submit answer transaction:', error)
      throw error
    }
  }

  async buildClaimRewardTransaction(
    user: PublicKey,
    courseId: number
  ): Promise<Transaction> {
    try {
      await this.ensureInitialized()
      
      const [coursePDA] = this.getCoursePDA(courseId)
      const [userCoursePDA] = this.getUserCoursePDA(user, courseId)
      const [configPDA] = this.getLearnConfigPDA()
      const courseVault = await this.getCourseVaultPDA(coursePDA)
      const userTokenAccount = await getAssociatedTokenAddress(TNG_MINT, user)

      const instruction = await this.program!.methods
        .claimReward(new BN(courseId))
        .accounts({
          userCourse: userCoursePDA,
          course: coursePDA,
          courseVault,
          learnConfig: configPDA,
          user,
          userTokenAccount,
          tngMint: TNG_MINT,
          payer: getSponsorPublicKey(), // Sponsor pays fees
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: PublicKey.default, // System program
        })
        .instruction()

      return new Transaction().add(instruction)
    } catch (error) {
      console.error(' Error building claim reward transaction:', error)
      throw error
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  formatTNGAmount(lamports: number): string {
    return (lamports / 1_000_000_000).toFixed(4)
  }

  tngToLamports(tngAmount: number): number {
    return Math.floor(tngAmount * 1_000_000_000)
  }

  lamportsToTng(lamports: number): number {
    return lamports / 1_000_000_000
  }
}

// Singleton instance
export const learnContract = new LearnContractService()
export default learnContract
