/**
 * Learn Service - Центральный сервис для Learn-to-Earn системы
 * Интегрирован со смарт-контрактами TNG Learn
 * Solana SuperApp
 */

import { Connection, PublicKey, Keypair, ComputeBudgetProgram } from '@solana/web3.js'
import { prisma } from '@/lib/prisma'
import { CustodialWalletService } from '@/lib/wallet'

// Smart contract integration
import * as anchor from "@coral-xyz/anchor"
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor"
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import bundledLearnIdl from '@/lib/idl/tng_learn.json'
import fs from 'fs'
import path from 'path'

// Constants
const LEARN_PROGRAM_ID = new PublicKey('SJL8TzuoUi8LvNSD3jeoYxtrVTcdNUdWFTe17JAgCgB')
const TNG_MINT = new PublicKey(process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs')

// Types
export interface Course {
  id: string
  title: string
  description: string
  shortDescription?: string
  coverImage?: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: 'blockchain' | 'defi' | 'nft' | 'development' | 'other'
  duration: number // minutes
  totalRewardTokens: number
  certificateAvailable: boolean
  isActive: boolean
  lessons: Lesson[]
  studentsCount: number
  rating: number
  createdBy: string
  createdAt: string
  // User progress
  isEnrolled?: boolean
  isCompleted?: boolean
  progressPercentage?: number
}

export interface Lesson {
  id: string
  courseId: string
  title: string
  description: string
  type: 'video' | 'text' | 'interactive' | 'quiz'
  order: number
  duration: number // minutes
  content?: string
  videoUrl?: string
  coverImage?: string
  transcript?: string
  xpReward: number
  tokenReward: number
  // User progress
  isCompleted?: boolean
  isLocked?: boolean
  completedAt?: string
  quiz?: Quiz
}

export interface Quiz {
  id: string
  lessonId: string
  title: string
  description: string
  timeLimit?: number // minutes
  passingScore: number // percentage
  maxAttempts?: number
  questions: QuizQuestion[]
  // User progress
  attemptsUsed?: number
  bestScore?: number
  isPassed?: boolean
  availableAttempts?: number
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'text' | 'code'
  question: string
  options?: string[]
  correctAnswer: any
  explanation?: string
  points: number
  order: number
}

export interface QuizAnswer {
  questionId: string
  answer: string | boolean | string[]
  timeSpent?: number
}

export interface LearningProgress {
  totalXp: number
  totalTokens: number
  completedCourses: number
  completedLessons: number
  currentStreak: number
  achievements: string[]
}

// Simple wallet wrapper for server-side usage
class SimpleWallet {
  constructor(public payer: Keypair) {}
  
  get publicKey() {
    return this.payer.publicKey
  }
  
  async signTransaction(tx: any) {
    tx.partialSign(this.payer)
    return tx
  }
  
  async signAllTransactions(txs: any[]) {
    return txs.map(tx => {
      tx.partialSign(this.payer)
      return tx
    })
  }
}

export class LearnService {
  private connection: Connection
  private program?: Program
  private sponsorKeypair!: Keypair
  private walletService: CustodialWalletService
  private idl: any

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    
    this.walletService = new CustodialWalletService(prisma)
    this.loadIdl()
    this.initializeSponsorKeypair()
    this.initializeProgram()
  }

  private loadIdl() {
    try {
      const localIdlPath = path.join(process.cwd(), 'smart-contracts', 'tng-learn', 'target', 'idl', 'tng_learn.json')
      if (fs.existsSync(localIdlPath)) {
        const raw = fs.readFileSync(localIdlPath, 'utf8')
        this.idl = JSON.parse(raw)
        console.log(' Loaded on-disk TNG Learn IDL from target build')
        return
      }
    } catch {}
    this.idl = bundledLearnIdl as any
  }

  private initializeSponsorKeypair() {
    if (!process.env.SPONSOR_PRIVATE_KEY) {
      throw new Error('SPONSOR_PRIVATE_KEY not found in environment variables')
    }
    
    try {
      let sponsorKey: number[]
      
      try {
        sponsorKey = JSON.parse(process.env.SPONSOR_PRIVATE_KEY)
      } catch {
        try {
          const base64Key = process.env.SPONSOR_PRIVATE_KEY
          const buffer = Buffer.from(base64Key, 'base64')
          sponsorKey = Array.from(buffer)
        } catch {
          throw new Error('SPONSOR_PRIVATE_KEY must be either JSON array or base64 string')
        }
      }
      
      this.sponsorKeypair = Keypair.fromSecretKey(new Uint8Array(sponsorKey))
      console.log(' Learn Service initialized with sponsor:', this.sponsorKeypair.publicKey.toBase58())
    } catch (error) {
      console.error('SPONSOR_PRIVATE_KEY parsing error:', error)
      throw new Error(`Invalid SPONSOR_PRIVATE_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private initializeProgram() {
    try {
      const provider = new AnchorProvider(
        this.connection,
        new SimpleWallet(this.sponsorKeypair) as any,
        { commitment: 'confirmed' }
      )

      const idlAddress = (this.idl as any)?.address
      let initializedProgramId: string | undefined

      // Attempt 1: If IDL has correct address, use (idl, provider)
      if (idlAddress && idlAddress === LEARN_PROGRAM_ID.toString()) {
        try {
          this.program = new (Program as any)(this.idl as any, provider as any)
          initializedProgramId = (this.program as any).programId?.toString?.()
        } catch {}
      }

      // Attempt 2: Explicit (idl, programId, provider)
      if (!this.program) {
        try {
          this.program = new (Program as any)(this.idl as any, LEARN_PROGRAM_ID, provider as any)
          initializedProgramId = (this.program as any).programId?.toString?.()
        } catch {}
      }

      // Attempt 3: Fallback to (idl, provider)
      if (!this.program) {
        this.program = new (Program as any)(this.idl as any, provider as any)
        initializedProgramId = (this.program as any).programId?.toString?.()
      }

      if (initializedProgramId && initializedProgramId !== LEARN_PROGRAM_ID.toString()) {
        console.warn(' Program ID mismatch:', { idl: initializedProgramId, expected: LEARN_PROGRAM_ID.toString() })
      }
      console.log(' TNG Learn Program initialized:', initializedProgramId || LEARN_PROGRAM_ID.toString())
    } catch (error) {
      console.error('Failed to initialize TNG Learn program:', error)
      // Continue without smart contract integration for fallback
    }
  }

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  /**
   * Get all courses with optional filtering
   */
  async getCourses(filters: {
    category?: string
    level?: string
    search?: string
    userId?: string
    limit?: number
    offset?: number
  } = {}): Promise<Course[]> {
    try {
      const {
        category,
        level,
        search,
        userId,
        limit = 20,
        offset = 0
      } = filters

      const where: any = { isActive: true }

      if (category && category !== 'all') {
        where.category = category.toUpperCase()
      }

      if (level && level !== 'all') {
        where.level = level.toUpperCase()
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } }
        ]
      }

      const courses = await prisma.course.findMany({
        where,
        include: {
          userCourses: userId ? {
            where: { userId },
            select: {
              isCompleted: true,
              progressPercentage: true,
              lastAccessedAt: true,
              totalXpEarned: true,
              totalTokensEarned: true
            }
          } : false,
          lessons: {
            select: {
              id: true,
              title: true,
              type: true,
              order: true,
              duration: true,
              xpReward: true,
              tokenReward: true
            },
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              userCourses: true,
              reviews: true
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { studentsCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      })

      return courses.map(course => this.mapCourseToDto(course, userId))
    } catch (error) {
      console.error('Error getting courses:', error)
      return []
    }
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId: string, userId?: string): Promise<Course | null> {
    try {
      // Handle special hardcoded Solana course
      if (courseId === 'course-solana-complete') {
        return this.getSolanaCourse(userId)
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          userCourses: userId ? {
            where: { userId }
          } : false,
          lessons: {
            include: {
              userProgress: userId ? {
                where: { userId }
              } : false
            },
            orderBy: { order: 'asc' }
          },
          quizzes: {
            include: {
              questions: {
                orderBy: { order: 'asc' }
              },
              attempts: userId ? {
                where: { userId },
                orderBy: { startedAt: 'desc' },
                take: 1
              } : false
            }
          },
          _count: {
            select: {
              userCourses: true,
              reviews: true
            }
          }
        }
      })

      if (!course) return null

      return this.mapCourseToDto(course, userId)
    } catch (error) {
      console.error('Error getting course by ID:', error)
      return null
    }
  }

  /**
   * Create new course (admin/instructor only)
   */
  async createCourse(data: {
    title: string
    description: string
    shortDescription?: string
    category: string
    level: string
    duration: number
    totalRewardTokens: number
    certificateAvailable?: boolean
    coverImage?: string
    createdBy: string
  }): Promise<{ success: boolean; courseId?: string; error?: string }> {
    try {
      // Generate stable ASCII courseId if not provided
      const courseIdGenerated = `course_${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(2, 10)}`
      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: data.createdBy },
        select: { id: true }
      })

      if (!user) {
        return { success: false, error: 'Пользователь не найден' }
      }

      const course = await prisma.course.create({
        data: {
          id: courseIdGenerated,
          title: data.title,
          description: data.description,
          shortDescription: data.shortDescription || data.description.substring(0, 200),
          category: data.category.toUpperCase() as any,
          level: data.level.toUpperCase() as any,
          duration: data.duration,
          estimatedTime: data.duration, // используем duration как estimatedTime
          totalRewardTokens: data.totalRewardTokens,
          certificateAvailable: data.certificateAvailable || false,
          coverImage: data.coverImage || '',
          createdBy: data.createdBy,
          learningObjectives: [], // пустой массив по умолчанию
          prerequisites: [], // пустой массив по умолчанию
          isActive: true,
          studentsCount: 0,
          rating: 0
        }
      })

      // Create on-chain course if smart contract is available
      if (this.program) {
        try {
          const onChainResult = await this.createOnChainCourse(
            course.id,
            data.title, 
            data.description, 
            data.totalRewardTokens
          )
          
          // Store on-chain ID for future reference
          await prisma.course.update({
            where: { id: course.id },
            data: { 
              onChainId: onChainResult.onChainId,
              onChainTx: onChainResult.transaction
            }
          })
          
          console.log(' Course created on-chain:', onChainResult)
        } catch (error) {
          console.error('Failed to create on-chain course, continuing with database only:', error)
        }
      }

      return { success: true, courseId: course.id }
    } catch (error) {
      console.error('Error creating course:', error)
      return { success: false, error: 'Ошибка создания курса' }
    }
  }

  /**
   * Enroll user in course
   */
  async enrollUser(courseId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course) {
        return { success: false, error: 'Курс не найден' }
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.userCourse.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      if (existingEnrollment) {
        return { success: false, error: 'Пользователь уже записан на курс' }
      }

      // Create enrollment
      await prisma.userCourse.create({
        data: {
          userId,
          courseId,
          enrolledAt: new Date(),
          progressPercentage: 0,
          totalXpEarned: 0,
          totalTokensEarned: 0
        }
      })

      // Update course students count
      await prisma.course.update({
        where: { id: courseId },
        data: {
          studentsCount: {
            increment: 1
          }
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error enrolling user:', error)
      return { success: false, error: 'Ошибка записи на курс' }
    }
  }

  /**
   * Обеспечить запись пользователя на курс (тихая версия без ошибок)
   */
  async ensureUserEnrolledSilent(courseId: string, userId: string): Promise<void> {
    try {
      // Проверяем существующую запись
      const existingEnrollment = await prisma.userCourse.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      if (existingEnrollment) {
        console.log(`✅ User ${userId} already enrolled in course ${courseId}`)
        return // Пользователь уже записан
      }

      // Создаем запись на курс
      await prisma.userCourse.create({
        data: {
          userId,
          courseId,
          enrolledAt: new Date(),
          progressPercentage: 0,
          totalXpEarned: 0,
          totalTokensEarned: 0
        }
      })

      // Обновляем счетчик студентов курса
      await prisma.course.update({
        where: { id: courseId },
        data: {
          studentsCount: {
            increment: 1
          }
        }
      })

      console.log(`🎓 User ${userId} auto-enrolled in course ${courseId}`)
    } catch (error) {
      console.error('Error auto-enrolling user:', error)
      // Не бросаем ошибку, чтобы не блокировать доступ к уроку
    }
  }

  /**
   * Get lesson by ID без автоматической записи (для избежания рекурсии)
   */
  async getLessonByIdWithoutAutoEnroll(lessonId: string, userId?: string): Promise<Lesson | null> {
    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          course: {
            include: {
              userCourses: userId ? {
                where: { userId }
              } : false
            }
          },
          userProgress: userId ? {
            where: { userId }
          } : false,
          quizzes: {
            include: {
              questions: {
                select: {
                  id: true,
                  type: true,
                  question: true,
                  options: true,
                  points: true,
                  order: true
                  // Не включаем correctAnswer для безопасности
                },
                orderBy: { order: 'asc' }
              },
              attempts: userId ? {
                where: { userId },
                orderBy: { startedAt: 'desc' }
              } : false
            }
          }
        }
      })

      if (!lesson) return null

      const userCourse = userId ? lesson.course.userCourses[0] : null
      const progress = userId ? lesson.userProgress[0] : null
      const quiz = lesson.quizzes?.[0] // Всегда берем первый квиз урока

      // Check if quiz is passed
      let isQuizPassed = false
      if (quiz && userId) {
        const latestAttempt = quiz.attempts?.[0]
        isQuizPassed = latestAttempt?.isPassed || false
      }

      return {
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type.toLowerCase() as any,
        order: lesson.order,
        duration: lesson.duration,
        content: (lesson.content ?? undefined),
        videoUrl: (lesson.videoUrl ?? undefined),
        xpReward: lesson.xpReward,
        tokenReward: lesson.tokenReward,
        isCompleted: progress?.isCompleted || false,
        isLocked: !userCourse,
        completedAt: progress?.completedAt?.toISOString(),
        quiz: quiz ? ({
          id: quiz.id,
          lessonId: quiz.lessonId,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.attemptsAllowed,
          questions: quiz.questions,
          isPassed: isQuizPassed,
          bestScore: quiz.attempts?.[0]?.percentage || 0,
          attemptsUsed: quiz.attempts?.length || 0,
          availableAttempts: (quiz.attemptsAllowed || 3) - (quiz.attempts?.length || 0)
        } as any) : undefined
      }
    } catch (error) {
      console.error('Error getting lesson by ID:', error)
      return null
    }
  }

  // ============================================================================
  // LESSON MANAGEMENT
  // ============================================================================

  /**
   * Get lesson by ID (с автоматической записью на курс)
   */
  async getLessonById(lessonId: string, userId?: string): Promise<Lesson | null> {
    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          course: {
            include: {
              userCourses: userId ? {
                where: { userId }
              } : false
            }
          },
          userProgress: userId ? {
            where: { userId }
          } : false,
          quizzes: {
            include: {
              questions: {
                select: {
                  id: true,
                  type: true,
                  question: true,
                  options: true,
                  points: true,
                  order: true
                  // Не включаем correctAnswer для безопасности
                },
                orderBy: { order: 'asc' }
              },
              attempts: userId ? {
                where: { userId },
                orderBy: { startedAt: 'desc' }
              } : false
            }
          }
        }
      })

      if (!lesson) return null

      // Автоматическая запись на курс при доступе к уроку
      if (userId && lesson.course) {
        console.log(`🎓 Auto-enrolling user ${userId} in course ${lesson.course.id} via lesson access`)
        await this.ensureUserEnrolledSilent(lesson.course.id, userId)
        
        // Перезагружаем lesson с обновленными данными userCourses
        return this.getLessonByIdWithoutAutoEnroll(lessonId, userId)
      }

      if (!lesson) return null

      const userCourse = userId ? lesson.course.userCourses[0] : null
      const progress = userId ? lesson.userProgress[0] : null
      const quiz = lesson.quizzes?.[0] // Всегда берем первый квиз урока

      // Check if quiz is passed
      let isQuizPassed = false
      if (quiz && userId) {
        const latestAttempt = quiz.attempts?.[0]
        isQuizPassed = latestAttempt?.isPassed || false
      }

      return {
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type.toLowerCase() as any,
        order: lesson.order,
        duration: lesson.duration,
        content: (lesson.content ?? undefined),
        videoUrl: (lesson.videoUrl ?? undefined),
        xpReward: lesson.xpReward,
        tokenReward: lesson.tokenReward,
        isCompleted: progress?.isCompleted || false,
        isLocked: !userCourse,
        completedAt: progress?.completedAt?.toISOString(),
        quiz: quiz ? ({
          id: quiz.id,
          lessonId: quiz.lessonId,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.attemptsAllowed,
          questions: quiz.questions,
          isPassed: isQuizPassed,
          bestScore: quiz.attempts?.[0]?.percentage || 0,
          attemptsUsed: quiz.attempts?.length || 0,
          availableAttempts: (quiz.attemptsAllowed || 3) - (quiz.attempts?.length || 0)
        } as any) : undefined
      }
    } catch (error) {
      console.error('Error getting lesson by ID:', error)
      return null
    }
  }

  /**
   * Complete lesson and award rewards
   */
  async completeLesson(
    lessonId: string, 
    userId: string, 
    timeSpent: number = 0
  ): Promise<{ success: boolean; error?: string; data?: any; code?: string }> {
    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          course: {
            include: {
              userCourses: {
                where: { userId }
              }
            }
          },
          quizzes: {
            include: {
              attempts: {
                where: { userId },
                orderBy: { startedAt: 'desc' }
              }
            }
          }
        }
      })

      if (!lesson) {
        return { success: false, error: 'Урок не найден' }
      }

      const userCourse = lesson.course.userCourses[0]
      if (!userCourse) {
        return { success: false, error: 'Необходимо записаться на курс' }
      }

      // Check if already completed
      const existingProgress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: { userId, lessonId }
        }
      })

      if (existingProgress?.isCompleted) {
        return { success: false, error: 'Урок уже завершен' }
      }

      //  NEW: Check if lesson has quiz and if it's passed
      const quiz = lesson.quizzes?.[0]
      if (quiz) {
        const latestAttempt = quiz.attempts?.[0]
        const isQuizPassed = latestAttempt?.isPassed || false
        
        if (!isQuizPassed) {
          return { 
            success: false, 
            error: `Для завершения урока необходимо пройти квиз с результатом не менее ${quiz.passingScore}%`,
            code: 'QUIZ_NOT_PASSED',
            data: {
              quizId: quiz.id,
              requiredScore: quiz.passingScore,
              currentScore: latestAttempt?.percentage || 0,
              attemptsUsed: quiz.attempts?.length || 0,
              maxAttempts: quiz.attemptsAllowed || 3
            }
          }
        }
        
        console.log(` Quiz passed (${latestAttempt?.percentage}% >= ${quiz.passingScore}%), proceeding with lesson completion`)
      }

      // Mark lesson as completed
      const timeSpentMinutes = timeSpent && timeSpent > 0 ? Math.round(timeSpent / 60) : lesson.duration

      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: { userId, lessonId }
        },
        create: {
          userId,
          lessonId,
          userCourseId: userCourse.id,
          isCompleted: true,
          completedAt: new Date(),
          timeSpent: timeSpentMinutes,
          startedAt: new Date()
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
          timeSpent: timeSpentMinutes
        }
      })

      // Calculate course progress
      const totalLessons = await prisma.lesson.count({
        where: { courseId: lesson.courseId }
      })

      const completedLessons = await prisma.lessonProgress.count({
        where: {
          userId,
          lesson: { courseId: lesson.courseId },
          isCompleted: true
        }
      })

      const progressPercentage = Math.round((completedLessons / totalLessons) * 100)

      // Update course progress and award XP
      const totalXpEarned = (userCourse.totalXpEarned || 0) + lesson.xpReward

      await prisma.userCourse.update({
        where: { id: userCourse.id },
        data: {
          totalXpEarned,
          progressPercentage,
          lastAccessedAt: new Date()
        }
      })

      // Award TNG tokens through smart contract
      let tokensEarned = 0
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      })

      if (user?.walletAddress && lesson.tokenReward > 0) {
        tokensEarned = lesson.tokenReward
        
        try {
          const userWallet = await this.walletService.getOrCreateUserWallet(userId)
          const userKeypair = await this.walletService.getUserKeypair(userId)
          if (userWallet.success && userWallet.data && userKeypair.success && userKeypair.data) {
            // First submit answer on-chain, then claim reward
            const answerHash = `lesson_${lessonId}_${userId}_${Date.now()}`
            await this.submitAnswerOnChain(
              new PublicKey(userWallet.data.publicKey),
              userKeypair.data,
              lesson.courseId,
              answerHash
            )
            
            // Then claim reward
            await this.awardTokensOnChain(
              new PublicKey(userWallet.data.publicKey),
              userKeypair.data,
              lesson.courseId,
              tokensEarned,
              'lesson_completion'
            )
            
            // Update tokens in database
            await prisma.userCourse.update({
              where: { id: userCourse.id },
              data: {
                totalTokensEarned: (userCourse.totalTokensEarned || 0) + tokensEarned
              }
            })
          }
        } catch (error) {
          console.warn(' On-chain operation failed (continuing with database-only for MVP):', error?.message || error)
          // For MVP, we continue without blockchain integration but keep database tokens
          console.log(' Tokens will be awarded in database only for MVP demo')
          
          // Update tokens in database even if blockchain fails (for MVP)
          try {
            await prisma.userCourse.update({
              where: { id: userCourse.id },
              data: {
                totalTokensEarned: (userCourse.totalTokensEarned || 0) + tokensEarned
              }
            })
          } catch (dbError) {
            console.error('Database token update failed:', dbError)
            tokensEarned = 0
          }
        }
      }

      return {
        success: true,
        data: {
          xpEarned: lesson.xpReward,
          tokensEarned,
          progressPercentage,
          completedLessons,
          totalLessons,
          courseCompleted: progressPercentage === 100
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error)
      return { success: false, error: 'Ошибка завершения урока' }
    }
  }

  // ============================================================================
  // QUIZ MANAGEMENT
  // ============================================================================

  /**
   * Submit quiz answers and calculate score
   */
  async submitQuiz(
    quizId: string,
    userId: string,
    answers: QuizAnswer[]
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          },
          lesson: {
            include: {
              course: {
                include: {
                  userCourses: {
                    where: { userId }
                  }
                }
              }
            }
          }
        }
      })

      if (!quiz) {
        return { success: false, error: 'Квиз не найден' }
      }

      const userCourse = quiz.lesson?.course.userCourses[0]
      if (!userCourse) {
        return { success: false, error: 'Необходимо записаться на курс' }
      }

      // Calculate score
      let totalPoints = 0
      let earnedPoints = 0
      const detailedAnswers: any = {}

      for (const question of quiz.questions) {
        totalPoints += question.points
        
        const userAnswer = answers.find(a => a.questionId === question.id)
        if (!userAnswer) continue

        detailedAnswers[question.id] = {
          question: question.question,
          userAnswer: userAnswer.answer,
          isCorrect: false,
          points: 0
        }

        // Check if answer is correct
        let isCorrect = false
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          isCorrect = String(userAnswer.answer) === String(question.correctAnswer)
        } else {
          isCorrect = String(userAnswer.answer).toLowerCase().trim() === 
                     String(question.correctAnswer).toLowerCase().trim()
        }

        if (isCorrect) {
          earnedPoints += question.points
          detailedAnswers[question.id].isCorrect = true
          detailedAnswers[question.id].points = question.points
        }
      }

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const isPassed = scorePercentage >= quiz.passingScore

      // Save quiz attempt
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          percentage: scorePercentage,
          isPassed,
          completedAt: new Date(),
          timeSpent: 0 // Frontend should provide this
        }
      })

      // Award rewards if passed
      let xpEarned = 0
      let tokensEarned = 0

      if (isPassed) {
        // XP depends on score
        xpEarned = Math.round(50 + (scorePercentage - quiz.passingScore) * 2)
        
        // Update course progress
        await prisma.userCourse.update({
          where: { id: userCourse.id },
          data: {
            totalXpEarned: (userCourse.totalXpEarned || 0) + xpEarned,
            lastAccessedAt: new Date()
          }
        })

        // Award TNG tokens
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { walletAddress: true }
        })

        if (user?.walletAddress) {
          tokensEarned = Math.floor(xpEarned * 0.7) // 1 XP = 0.7 TNG for quizzes
          
          try {
            const userWallet = await this.walletService.getOrCreateUserWallet(userId)
            const userKeypair = await this.walletService.getUserKeypair(userId)
            if (userWallet.success && userWallet.data && userKeypair.success && userKeypair.data) {
              // First submit answer on-chain, then claim reward
              const answerHash = `quiz_${quizId}_${userId}_${Date.now()}_${scorePercentage}`
              await this.submitAnswerOnChain(
                new PublicKey(userWallet.data.publicKey),
                userKeypair.data,
                (quiz.lesson?.courseId || userCourse.courseId),
                answerHash
              )
              
              // Then claim reward
              await this.awardTokensOnChain(
                new PublicKey(userWallet.data.publicKey),
                userKeypair.data,
                (quiz.lesson?.courseId || userCourse.courseId),
                tokensEarned,
                'quiz_completion'
              )
              
              await prisma.userCourse.update({
                where: { id: userCourse.id },
                data: {
                  totalTokensEarned: (userCourse.totalTokensEarned || 0) + tokensEarned
                }
              })
            }
          } catch (error) {
            console.error('Error awarding tokens for quiz completion:', error)
            tokensEarned = 0
          }
        }
      }

      return {
        success: true,
        data: {
          attemptId: attempt.id,
          score: earnedPoints,
          totalPoints,
          percentage: scorePercentage,
          isPassed,
          passingScore: quiz.passingScore,
          xpEarned,
          tokensEarned,
          detailedAnswers
        }
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
      return { success: false, error: 'Ошибка отправки квиза' }
    }
  }

  // ============================================================================
  // USER PROGRESS & STATS
  // ============================================================================

  /**
   * Get user learning progress
   */
  async getUserProgress(userId: string): Promise<LearningProgress> {
    try {
      const [userCourses, completedLessons] = await Promise.all([
        prisma.userCourse.findMany({
          where: { userId },
          include: {
            course: {
              select: { title: true }
            }
          }
        }),
        prisma.lessonProgress.count({
          where: {
            userId,
            isCompleted: true
          }
        })
      ])

      const totalXp = userCourses.reduce((sum, uc) => sum + (uc.totalXpEarned || 0), 0)
      const totalTokens = userCourses.reduce((sum, uc) => sum + Number(uc.totalTokensEarned || 0), 0)
      const completedCourses = userCourses.filter(uc => uc.isCompleted).length

      return {
        totalXp,
        totalTokens,
        completedCourses,
        completedLessons,
        currentStreak: 0, // TODO: Calculate streak
        achievements: [] // TODO: Calculate achievements
      }
    } catch (error) {
      console.error('Error getting user progress:', error)
      return {
        totalXp: 0,
        totalTokens: 0,
        completedCourses: 0,
        completedLessons: 0,
        currentStreak: 0,
        achievements: []
      }
    }
  }

  // ============================================================================
  // SMART CONTRACT INTEGRATION
  // ============================================================================

  /**
   * Create course on-chain (for TNG rewards)
   */
  private async createOnChainCourse(
    courseId: string,
    title: string,
    description: string,
    rewardAmount: number
  ): Promise<{ onChainId: number; transaction: string }> {
    if (!this.program) throw new Error('Program not initialized')

    try {
      // Sanitize inputs to satisfy contract constraints and transaction size limits
      const safeCourseId = String(courseId).trim()
      // Reduce limits to ensure transaction fits within 1232 bytes
      const safeTitle = String(title).slice(0, 50)  // Reduced from 100 to 50
      const safeDescription = String(description).slice(0, 200)  // Reduced from 500 to 200
      if (!safeCourseId) throw new Error('Invalid courseId for PDA seeds')
      
      // Log sanitized parameters for debugging
      console.log(' Creating course with sanitized params:', {
        courseId: safeCourseId,
        titleLength: safeTitle.length,
        descriptionLength: safeDescription.length,
        rewardAmount
      })
      // Use courseId directly as string hash for seeds
      const courseIdBuffer = Buffer.from(safeCourseId, 'utf8')
      
      // Derive PDAs using courseId string (same as Rust) but ensure 'course' matches exactly
      const seedPrefix = Buffer.from('course')
      const [coursePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [seedPrefix, courseIdBuffer],
        (this.program as any).programId
      )

      const [learnConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('learn_config')],
        (this.program as any).programId
      )

      // Get token accounts
      const creatorTokenAccount = await anchor.utils.token.associatedAddress({
        mint: TNG_MINT,
        owner: this.sponsorKeypair.publicKey
      })

      const courseVault = await anchor.utils.token.associatedAddress({
        mint: TNG_MINT,
        owner: coursePda
      })

      // Build transaction manually to optimize size
      const transaction = new anchor.web3.Transaction()
      
      // Add compute budget instruction to optimize transaction
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000, // Reasonable limit for course creation
        })
      )

      // Create course instruction
      const createCourseIx = await (this.program as any).methods
        .createCourse(safeTitle, safeDescription, new BN(Math.max(1, Math.floor(rewardAmount * 1_000_000_000))), safeCourseId)
        .accounts({
          course: coursePda,
          courseVault: courseVault,
          learnConfig: learnConfigPda,
          creator: this.sponsorKeypair.publicKey,
          creatorTokenAccount: creatorTokenAccount,
          tngMint: TNG_MINT,
          payer: this.sponsorKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction()

      transaction.add(createCourseIx)

      // Get transaction size for debugging
      try {
        const serializedSize = transaction.serializeMessage().length
        console.log(` Transaction size: ${serializedSize} bytes (limit: 1232 bytes)`)
        
        if (serializedSize > 1200) {
          console.warn(' Transaction size is approaching limit, optimization may be needed')
        }
      } catch (sizeError) {
        console.warn('Could not determine transaction size:', sizeError)
      }

      // Get recent blockhash and send transaction with optimized settings
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      const tx = await (this.program.provider as anchor.AnchorProvider).sendAndConfirm(
        transaction, 
        [this.sponsorKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      )

      console.log(' Course created on-chain:', { courseId: safeCourseId, transaction: tx })
      return { onChainId: 0, transaction: tx } // onChainId deprecated, use courseId
    } catch (error) {
      // Check if it's a transaction size error and try with even smaller parameters
      if (error instanceof Error && error.message.includes('Transaction too large')) {
        console.log(' Transaction too large, retrying with minimal parameters...')
        
        try {
          // Re-derive necessary variables for retry
          const safeCourseId = String(courseId).trim()
          const courseIdBuffer = Buffer.from(safeCourseId, 'utf8')
          const seedPrefix = Buffer.from('course')
          const [coursePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [seedPrefix, courseIdBuffer],
            (this.program as any).programId
          )
          const [learnConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from('learn_config')],
            (this.program as any).programId
          )
          const creatorTokenAccount = await anchor.utils.token.associatedAddress({
            mint: TNG_MINT,
            owner: this.sponsorKeypair.publicKey
          })
          const courseVault = await anchor.utils.token.associatedAddress({
            mint: TNG_MINT,
            owner: coursePda
          })

          // Use minimal string lengths for emergency fallback
          const minimalTitle = String(title).slice(0, 20)
          const minimalDescription = String(description).slice(0, 50)
          
          console.log(' Retrying with minimal params:', {
            courseId: safeCourseId,
            titleLength: minimalTitle.length,
            descriptionLength: minimalDescription.length
          })

          const transaction = new anchor.web3.Transaction()
          
          const createCourseIx = await (this.program as any).methods
            .createCourse(minimalTitle, minimalDescription, new BN(Math.max(1, Math.floor(rewardAmount * 1_000_000_000))), safeCourseId)
            .accounts({
              course: coursePda,
              courseVault: courseVault,
              learnConfig: learnConfigPda,
              creator: this.sponsorKeypair.publicKey,
              creatorTokenAccount: creatorTokenAccount,
              tngMint: TNG_MINT,
              payer: this.sponsorKeypair.publicKey,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .instruction()

          transaction.add(createCourseIx)

          // Get recent blockhash for retry transaction
          const { blockhash: retryBlockhash } = await this.connection.getLatestBlockhash('confirmed')
          transaction.recentBlockhash = retryBlockhash
          transaction.feePayer = this.sponsorKeypair.publicKey

          const tx = await (this.program.provider as anchor.AnchorProvider).sendAndConfirm(
            transaction, 
            [this.sponsorKeypair],
            {
              commitment: 'confirmed',
              maxRetries: 3,
            }
          )

          console.log(' Course created on-chain with minimal params:', { courseId: safeCourseId, transaction: tx })
          console.log(' Note: Title and description were truncated due to transaction size limits')
          return { onChainId: 0, transaction: tx }
        } catch (retryError) {
          console.error(' Failed even with minimal parameters:', retryError)
        }
      }

      try {
        // Extra diagnostics for PDA mismatch
        const [expectedCoursePda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from('course'), Buffer.from(String(courseId).trim(), 'utf8')],
          this.program.programId
        )
        console.error('On-chain createCourse failed. PDA diagnostics:', {
          courseId: String(courseId),
          pda: expectedCoursePda.toBase58()
        })
      } catch {}
      console.error('Error creating course on-chain:', error)
      throw error
    }
  }

  /**
   * Generate consistent numeric ID from string courseId
   */
  private generateOnChainId(courseId: string): number {
    let hash = 0
    for (let i = 0; i < courseId.length; i++) {
      const char = courseId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) % 1000000 // Keep within safe range
  }

  /**
   * Award TNG tokens on-chain via claim_reward
   */
  private async awardTokensOnChain(
    userPublicKey: PublicKey,
    userKeypair: Keypair,
    courseId: string,
    amount: number,
    reason: string
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized')

    try {
      const courseIdBuffer = Buffer.from(courseId, 'utf8')
      
      // Derive PDAs
      const [coursePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('course'), courseIdBuffer],
        this.program.programId
      )

      const [userCoursePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('user_course'),
          userPublicKey.toBuffer(),
          courseIdBuffer
        ],
        this.program.programId
      )

      const [learnConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('learn_config')],
        this.program.programId
      )

      // Get token accounts
      const courseVault = await anchor.utils.token.associatedAddress({
        mint: TNG_MINT,
        owner: coursePda
      })

      const userTokenAccount = await anchor.utils.token.associatedAddress({
        mint: TNG_MINT,
        owner: userPublicKey
      })

      const tx = await this.program.methods
        .claimReward(courseId)
        .accounts({
          userCourse: userCoursePda,
          course: coursePda,
          courseVault: courseVault,
          learnConfig: learnConfigPda,
          user: userPublicKey,
          userTokenAccount: userTokenAccount,
          tngMint: TNG_MINT,
          payer: this.sponsorKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([this.sponsorKeypair, userKeypair])
        .rpc()

      console.log(` Awarded ${amount} TNG for ${reason}:`, tx)
      return tx
    } catch (error) {
      console.error(`Error awarding tokens for ${reason}:`, error)
      throw error
    }
  }

  /**
   * Submit answer on-chain before claiming reward
   */
  private async submitAnswerOnChain(
    userPublicKey: PublicKey,
    userKeypair: Keypair,
    courseId: string,
    answerHash: string
  ): Promise<string> {
    if (!this.program) throw new Error('Program not initialized')

    try {
      const courseIdBuffer = Buffer.from(courseId, 'utf8')
      
      // Derive PDAs
      const [coursePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('course'), courseIdBuffer],
        this.program.programId
      )

      const [userCoursePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('user_course'),
          userPublicKey.toBuffer(),
          courseIdBuffer
        ],
        this.program.programId
      )

      const tx = await this.program.methods
        .submitAnswer(courseId, answerHash)
        .accounts({
          userCourse: userCoursePda,
          course: coursePda,
          user: userPublicKey,
          payer: this.sponsorKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([this.sponsorKeypair, userKeypair])
        .rpc()

      console.log(' Answer submitted on-chain:', tx)
      return tx
    } catch (error) {
      console.error('Error submitting answer on-chain:', error)
      throw error
    }
  }

  // ============================================================================
  // LESSON AND QUIZ MANAGEMENT
  // ============================================================================

  /**
   * Create new lesson
   */
  async createLesson(data: {
    courseId: string
    title: string
    description: string
    type: string
    duration: number
    content?: string
    videoUrl?: string
    xpReward: number
    tokenReward: number
    order: number
    createdBy: string
  }): Promise<{ success: boolean; lesson?: any; error?: string }> {
    try {
      const lesson = await prisma.lesson.create({
        data: {
          courseId: data.courseId,
          title: data.title,
          description: data.description,
          type: data.type.toUpperCase() as any,
          duration: data.duration,
          content: data.content,
          videoUrl: data.videoUrl,
          xpReward: data.xpReward,
          tokenReward: data.tokenReward,
          order: data.order,
          // 'isActive' not present on schema for Quiz; removed
        }
      })

      return { success: true, lesson }
    } catch (error) {
      console.error('Error creating lesson:', error)
      return { success: false, error: 'Ошибка создания урока' }
    }
  }

  /**
   * Create new quiz
   */
  async createQuiz(data: {
    lessonId: string
    title: string
    description: string
    timeLimit?: number
    passingScore: number
    attemptsAllowed?: number
    questions: any[]
    createdBy: string
  }): Promise<{ success: boolean; quiz?: any; error?: string }> {
    try {
      console.log(`🎯 LearnService.createQuiz called with:`, {
        lessonId: data.lessonId,
        title: data.title,
        questionsCount: data.questions?.length || 0,
        questions: data.questions
      })

      const quiz = await prisma.quiz.create({
        data: {
          lessonId: data.lessonId,
          title: data.title,
          description: data.description,
          timeLimit: data.timeLimit,
          passingScore: data.passingScore,
          attemptsAllowed: data.attemptsAllowed ?? 3
        }
      })

      console.log(`✅ Quiz created in database with ID: ${quiz.id}`)

      // Create questions
      if (data.questions && data.questions.length > 0) {
        console.log(`📝 Creating ${data.questions.length} questions for quiz ${quiz.id}`)
        
        const questionsData = data.questions.map((q, index) => ({
          quizId: quiz.id,
          type: (q.type?.toUpperCase?.() || 'MULTIPLE_CHOICE') as any,
          question: q.question,
          options: q.options ?? undefined,
          correctAnswer: String(q.correctAnswer ?? ''),
          explanation: q.explanation ?? undefined,
          points: q.points || 1,
          order: index + 1
        }))

        console.log(`📝 Questions data:`, questionsData)

        await prisma.quizQuestion.createMany({
          data: questionsData as any
        })

        console.log(`✅ ${data.questions.length} questions created for quiz ${quiz.id}`)
      } else {
        console.log(`⚠️ No questions provided for quiz ${quiz.id}`)
      }

      return { success: true, quiz }
    } catch (error) {
      console.error('❌ Error creating quiz:', error)
      return { success: false, error: 'Ошибка создания квиза' }
    }
  }

  // ============================================================================
  // CERTIFICATE SYSTEM
  // ============================================================================

  /**
   * Get certificate for completed course
   */
  async getCertificate(courseId: string, userId: string): Promise<any | null> {
    try {
      const userCourse = await prisma.userCourse.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: {
          course: true,
          user: true
        }
      })

      if (!userCourse || !userCourse.isCompleted) {
        return null
      }

      // Check if certificate already exists
      let certificate = await prisma.certificate.findUnique({
        where: { userId_courseId: { userId, courseId } }
      })

      if (!certificate) {
        // Generate certificate
        certificate = await this.generateCertificateRecord(courseId, userId)
      }

      return {
        id: certificate.id,
        courseTitle: userCourse.course.title,
        studentName: userCourse.user.firstName + ' ' + (userCourse.user.lastName || ''),
        completedAt: userCourse.completedAt,
        verificationUrl: certificate.verificationUrl,
        grade: certificate.grade || 'Pass'
      }
    } catch (error) {
      console.error('Error getting certificate:', error)
      return null
    }
  }

  /**
   * Generate certificate
   */
  async generateCertificate(courseId: string, userId: string): Promise<{ success: boolean; certificate?: any; error?: string }> {
    try {
      // Check if course is completed
      const userCourse = await prisma.userCourse.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { course: true, user: true }
      })

      if (!userCourse || !userCourse.isCompleted) {
        return { success: false, error: 'Курс не завершен' }
      }

      // Check if certificate already exists
      let certificate = await prisma.certificate.findUnique({
        where: { userId_courseId: { userId, courseId } }
      })

      if (certificate) {
        return { success: true, certificate }
      }

      // Generate new certificate
      certificate = await this.generateCertificateRecord(courseId, userId)

      return { success: true, certificate }
    } catch (error) {
      console.error('Error generating certificate:', error)
      return { success: false, error: 'Ошибка генерации сертификата' }
    }
  }

  private async generateCertificateRecord(courseId: string, userId: string) {
    return await prisma.certificate.create({
      data: {
        userId,
        courseId,
        title: 'Certificate of Completion',
        description: 'Successfully completed the course',
        verificationUrl: null,
        imageUrl: null,
        blockchainTxId: null,
        issueDate: new Date(),
        skills: []
      }
    })
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapCourseToDto(course: any, userId?: string): Course {
    const userCourse = userId ? course.userCourses[0] : null

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      coverImage: course.coverImage,
      level: course.level.toLowerCase(),
      category: course.category.toLowerCase(),
      duration: course.duration,
      totalRewardTokens: course.totalRewardTokens,
      certificateAvailable: course.certificateAvailable,
      isActive: course.isActive,
      studentsCount: course._count?.userCourses || course.studentsCount,
      rating: Number(course.rating) || 0,
      createdBy: course.createdBy,
      createdAt: course.createdAt.toISOString(),
      lessons: course.lessons?.map((lesson: any) => ({
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        type: lesson.type.toLowerCase(),
        order: lesson.order,
        duration: lesson.duration,
        xpReward: lesson.xpReward,
        tokenReward: lesson.tokenReward,
        isCompleted: false, // Will be populated separately if needed
        isLocked: !userCourse
      })) || [],
      isEnrolled: !!userCourse,
      isCompleted: userCourse?.isCompleted || false,
      progressPercentage: userCourse?.progressPercentage || 0
    }
  }

  /**
   * Get hardcoded Solana course (special case)
   */
  private async getSolanaCourse(userId?: string): Promise<Course> {
    // Return a hardcoded Solana course for demo purposes
    const isEnrolled = userId ? true : false // Simplified for now
    
    return {
      id: 'course-solana-complete',
      title: 'Полный курс Solana разработки',
      description: 'Изучите основы блокчейна Solana, создание смарт-контрактов и DApps',
      shortDescription: 'Полный курс по разработке на Solana',
      coverImage: '',
      level: 'intermediate',
      category: 'blockchain',
      duration: 480,
      totalRewardTokens: 500,
      certificateAvailable: true,
      isActive: true,
      studentsCount: 157,
      rating: 4.8,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      lessons: [
        {
          id: 'lesson-solana-intro',
          courseId: 'course-solana-complete',
          title: 'Введение в Solana',
          description: 'Основы блокчейна Solana',
          type: 'video',
          order: 1,
          duration: 30,
          xpReward: 50,
          tokenReward: 25,
          isCompleted: false,
          isLocked: !isEnrolled
        },
        {
          id: 'lesson-solana-accounts',
          courseId: 'course-solana-complete',
          title: 'Система аккаунтов',
          description: 'Как работают аккаунты в Solana',
          type: 'video',
          order: 2,
          duration: 45,
          xpReward: 75,
          tokenReward: 35,
          isCompleted: false,
          isLocked: !isEnrolled
        }
      ],
      isEnrolled,
      isCompleted: false,
      progressPercentage: 0
    }
  }

  // ============================================================================
  // QUIZ METHODS
  // ============================================================================

  static async startQuiz(quizId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Logic to start a quiz
      return { success: true }
    } catch (error) {
      console.error('Error starting quiz:', error)
      return { success: false, error: 'Failed to start quiz' }
    }
  }

  static async submitQuizAnswers(
    quizId: string, 
    userId: string, 
    answers: any[]
  ): Promise<{ success: boolean; error?: string; score?: number; isPassed?: boolean; percentage?: number; xpEarned?: number }> {
    try {
      // Logic to submit quiz answers
      const score = 85;
      const percentage = score;
      const isPassed = score >= 70;
      const xpEarned = isPassed ? 100 : 50;
      
      return { 
        success: true, 
        score, 
        isPassed, 
        percentage, 
        xpEarned 
      }
    } catch (error) {
      console.error('Error submitting quiz answers:', error)
      return { success: false, error: 'Failed to submit quiz answers' }
    }
  }

  // ============================================================================
  // FAVORITES METHODS
  // ============================================================================

  static async addToFavorites(courseId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Logic to add course to favorites
      return { success: true }
    } catch (error) {
      console.error('Error adding to favorites:', error)
      return { success: false, error: 'Failed to add to favorites' }
    }
  }

  static async removeFromFavorites(courseId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Logic to remove course from favorites
      return { success: true }
    } catch (error) {
      console.error('Error removing from favorites:', error)
      return { success: false, error: 'Failed to remove from favorites' }
    }
  }

  // ============================================================================
  // CERTIFICATE METHODS
  // ============================================================================

  static async downloadCertificate(courseId: string, userId: string): Promise<{ success: boolean; error?: string; url?: string }> {
    try {
      // Logic to generate and download certificate
      return { success: true, url: `/api/certificates/${courseId}/${userId}` }
    } catch (error) {
      console.error('Error downloading certificate:', error)
      return { success: false, error: 'Failed to download certificate' }
    }
  }

  // ============================================================================
  // REVIEW METHODS
  // ============================================================================

  static async submitCourseReview(
    courseId: string, 
    userId: string, 
    rating: number, 
    comment: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Logic to submit course review
      return { success: true }
    } catch (error) {
      console.error('Error submitting course review:', error)
      return { success: false, error: 'Failed to submit course review' }
    }
  }

  // ============================================================================
  // ACHIEVEMENTS METHODS
  // ============================================================================

  static async checkAchievements(userId: string): Promise<any[]> {
    try {
      // Logic to check user achievements
      return []
    } catch (error) {
      console.error('Error checking achievements:', error)
      return []
    }
  }

  // ============================================================================
  // ADDITIONAL METHODS
  // ============================================================================

  static async exportProgress(userId: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Logic to export user progress
      return { success: true, data: {} }
    } catch (error) {
      console.error('Error exporting progress:', error)
      return { success: false, error: 'Failed to export progress' }
    }
  }

  static async resetCourseProgress(courseId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Logic to reset course progress
      return { success: true }
    } catch (error) {
      console.error('Error resetting course progress:', error)
      return { success: false, error: 'Failed to reset course progress' }
    }
  }

  static async createCourse(courseData: any): Promise<{ success: boolean; error?: string; courseId?: string }> {
    try {
      // Logic to create a new course
      return { success: true, courseId: 'new-course-id' }
    } catch (error) {
      console.error('Error creating course:', error)
      return { success: false, error: 'Failed to create course' }
    }
  }
}
