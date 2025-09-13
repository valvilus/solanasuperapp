import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import TngLearnIDL from '../idl/tng_learn.json'

// Конфигурация
const PROGRAM_ID = new PublicKey('SJL8TzuoUi8LvNSD3jeoYxtrVTcdNUdWFTe17JAgCgB')
const TNG_MINT = new PublicKey('FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs') // Correct TNG mint from keys/tng-mint-info.json

export interface Course {
  courseId: number
  title: string
  description: string
  creator: PublicKey
  rewardAmount: number
  totalCompletions: number
  isActive: boolean
  createdAt: number
  bump: number
}

export interface UserCourse {
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

export interface CreateCourseParams {
  title: string
  description: string
  rewardAmount: number
  courseId: number
}

export interface SubmitAnswerParams {
  courseId: number
  answerHash: string
}

export class TngLearnContractService {
  private connection: Connection
  private program: Program<any> | null = null
  private initialized = false

  constructor(connection: Connection) {
    this.connection = connection
    
    // Only initialize if we're not in build mode
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.log('🔧 TngLearnContractService: Skipping initialization during build')
      return
    }

    this.initializeService()
  }

  private initializeService() {
    try {
      // Создаем dummy provider для чтения данных
      const dummyWallet = {
        publicKey: SystemProgram.programId,
        signTransaction: async () => { throw new Error('Dummy wallet') },
        signAllTransactions: async () => { throw new Error('Dummy wallet') }
      }
      
      const provider = new AnchorProvider(
        this.connection,
        dummyWallet as any,
        { commitment: 'confirmed' }
      )

      this.program = new Program(TngLearnIDL as any, PROGRAM_ID as any, provider as any)
      this.initialized = true
      console.log('✅ TngLearnContractService initialized successfully')
    } catch (error) {
      console.warn('⚠️ TngLearnContractService initialization failed:', error)
    }
  }

  private async ensureInitialized() {
    if (!this.initialized && typeof window !== 'undefined') {
      this.initializeService()
    }
    
    if (!this.program) {
      throw new Error('TngLearnContractService not properly initialized')
    }
  }

  // ============================================================================
  // PDA Helpers
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

  async getCourseVaultAddress(course: PublicKey): Promise<PublicKey> {
    return await getAssociatedTokenAddress(TNG_MINT, course, true)
  }

  // ============================================================================
  // Read Methods
  // ============================================================================

  async isLearnPlatformInitialized(): Promise<boolean> {
    try {
      const [configPDA] = this.getLearnConfigPDA()
      await (this.program.account as any).learnConfig.fetch(configPDA)
      return true
    } catch (error) {
      return false
    }
  }

  async getLearnConfig(): Promise<LearnConfig | null> {
    try {
      const [configPDA] = this.getLearnConfigPDA()
      const config = await (this.program.account as any).learnConfig.fetch(configPDA)
      
      return {
        admin: config.admin,
        totalCourses: config.totalCourses.toNumber(),
        totalRewardsDistributed: config.totalRewardsDistributed.toNumber(),
        isActive: config.isActive,
        bump: config.bump
      }
    } catch (error) {
      console.error('Error fetching learn config:', error)
      return null
    }
  }

  async getCourse(courseId: number): Promise<Course | null> {
    try {
      const [coursePDA] = this.getCoursePDA(courseId)
      const course = await (this.program.account as any).course.fetch(coursePDA)
      
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
      console.error(`Error fetching course ${courseId}:`, error)
      return null
    }
  }

  async getAllCourses(): Promise<Course[]> {
    try {
      const config = await this.getLearnConfig()
      if (!config) return []

      const courses: Course[] = []
      
      // Получаем все курсы по ID (от 0 до totalCourses-1)
      for (let i = 0; i < config.totalCourses; i++) {
        const course = await this.getCourse(i)
        if (course) {
          courses.push(course)
        }
      }
      
      return courses.filter(course => course.isActive)
    } catch (error) {
      console.error('Error fetching all courses:', error)
      return []
    }
  }

  async getUserCourse(user: PublicKey, courseId: number): Promise<UserCourse | null> {
    try {
      const [userCoursePDA] = this.getUserCoursePDA(user, courseId)
      const userCourse = await (this.program.account as any).userCourse.fetch(userCoursePDA)
      
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
      console.error(`Error fetching user course ${user.toString()}-${courseId}:`, error)
      return null
    }
  }

  async getUserProgress(user: PublicKey): Promise<{
    completedCourses: number
    totalRewardsClaimed: number
    userCourses: UserCourse[]
  }> {
    try {
      const config = await this.getLearnConfig()
      if (!config) return { completedCourses: 0, totalRewardsClaimed: 0, userCourses: [] }

      const userCourses: UserCourse[] = []
      let completedCourses = 0
      let totalRewardsClaimed = 0

      // Проверяем все курсы пользователя
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
      console.error('Error fetching user progress:', error)
      return { completedCourses: 0, totalRewardsClaimed: 0, userCourses: [] }
    }
  }

  // ============================================================================
  // Transaction Building Methods
  // ============================================================================

  async buildCreateCourseTransaction(
    creator: PublicKey,
    payer: PublicKey,
    params: CreateCourseParams
  ): Promise<Transaction> {
    const [coursePDA] = this.getCoursePDA(params.courseId)
    const [configPDA] = this.getLearnConfigPDA()
    const courseVault = await this.getCourseVaultAddress(coursePDA)
    const creatorTokenAccount = await getAssociatedTokenAddress(TNG_MINT, creator)

    const instruction = await (this.program as any).methods
      .createCourse(
        params.title,
        params.description,
        new BN(params.rewardAmount),
        new BN(params.courseId)
      )
      .accounts({
        creator,
        creatorTokenAccount,
        courseVault,
        tngMint: TNG_MINT,
        payer,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction()

    const transaction = new Transaction().add(instruction)
    return transaction
  }

  async buildSubmitAnswerTransaction(
    user: PublicKey,
    payer: PublicKey,
    params: SubmitAnswerParams
  ): Promise<Transaction> {
    const [coursePDA] = this.getCoursePDA(params.courseId)
    const [userCoursePDA] = this.getUserCoursePDA(user, params.courseId)

    const instruction = await (this.program as any).methods
      .submitAnswer(new BN(params.courseId), params.answerHash)
      .accounts({
        user,
        payer,
        systemProgram: SystemProgram.programId,
      })
      .instruction()

    const transaction = new Transaction().add(instruction)
    return transaction
  }

  async buildClaimRewardTransaction(
    user: PublicKey,
    payer: PublicKey,
    courseId: number
  ): Promise<Transaction> {
    const [coursePDA] = this.getCoursePDA(courseId)
    const [userCoursePDA] = this.getUserCoursePDA(user, courseId)
    const [configPDA] = this.getLearnConfigPDA()
    const courseVault = await this.getCourseVaultAddress(coursePDA)
    const userTokenAccount = await getAssociatedTokenAddress(TNG_MINT, user)

    const instruction = await (this.program as any).methods
      .claimReward(new BN(courseId))
      .accounts({
        user,
        userTokenAccount,
        courseVault,
        tngMint: TNG_MINT,
        payer,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction()

    const transaction = new Transaction().add(instruction)
    return transaction
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  formatTNGAmount(amount: number): string {
    return (amount / 1e9).toFixed(4)
  }

  formatSOLAmount(lamports: number): string {
    return (lamports / 1e9).toFixed(4)
  }

  async getCourseVaultBalance(courseId: number): Promise<number> {
    try {
      const [coursePDA] = this.getCoursePDA(courseId)
      const courseVault = await this.getCourseVaultAddress(coursePDA)
      
      const balance = await this.connection.getTokenAccountBalance(courseVault)
      return parseInt(balance.value.amount)
    } catch (error) {
      console.error(`Error fetching course ${courseId} vault balance:`, error)
      return 0
    }
  }
}







