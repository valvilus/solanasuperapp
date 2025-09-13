/**
 * Simplified Learn Blockchain API
 * Direct integration with TNG Learn Smart Contract
 * 
 * GET  /api/learn-blockchain?action=config|courses|user-progress
 * POST /api/learn-blockchain (create_course, submit_answer, claim_reward)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { learnContract } from '@/lib/blockchain/learn-contract.service'
import { withAuth, optionalAuth } from '@/lib/auth'

// ============================================================================
// GET - READ OPERATIONS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'config': {
        const config = await learnContract.getLearnConfig()
        
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Learn platform not initialized'
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          data: {
            admin: config.admin.toString(),
            totalCourses: config.totalCourses,
            totalRewardsDistributed: learnContract.formatTNGAmount(config.totalRewardsDistributed),
            totalRewardsDistributedRaw: config.totalRewardsDistributed,
            isActive: config.isActive
          }
        })
      }

      case 'courses': {
        const courses = await learnContract.getAllCourses()
        
        const formattedCourses = courses.map(course => ({
          courseId: course.courseId,
          title: course.title,
          description: course.description,
          creator: course.creator.toString(),
          rewardAmount: learnContract.formatTNGAmount(course.rewardAmount),
          rewardAmountRaw: course.rewardAmount,
          totalCompletions: course.totalCompletions,
          isActive: course.isActive,
          createdAt: new Date(course.createdAt * 1000).toISOString()
        }))

        return NextResponse.json({
          success: true,
          data: {
            courses: formattedCourses,
            total: formattedCourses.length
          }
        })
      }

      case 'user-progress': {
        const auth = await optionalAuth(request)
        if (!auth?.userId) {
          return NextResponse.json({
            success: false,
            error: 'Authentication required for user progress'
          }, { status: 401 })
        }

        // Get user's wallet address from database
        const { prisma } = await import('@/lib/prisma')
        const user = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: { walletAddress: true }
        })

        if (!user?.walletAddress) {
          return NextResponse.json({
            success: false,
            error: 'User wallet not connected'
          }, { status: 400 })
        }

        const userPublicKey = new PublicKey(user.walletAddress)
        const progress = await learnContract.getUserProgress(userPublicKey)

        return NextResponse.json({
          success: true,
          data: {
            completedCourses: progress.completedCourses,
            totalRewardsClaimed: learnContract.formatTNGAmount(progress.totalRewardsClaimed),
            totalRewardsClaimedRaw: progress.totalRewardsClaimed,
            userCourses: progress.userCourses.map(uc => ({
              courseId: uc.courseId,
              isCompleted: uc.isCompleted,
              completedAt: uc.isCompleted ? new Date(uc.completedAt * 1000).toISOString() : null,
              isRewardClaimed: uc.isRewardClaimed,
              claimedAt: uc.claimedAt ? new Date(uc.claimedAt * 1000).toISOString() : null,
              answerHash: uc.answerHash
            }))
          }
        })
      }

      case 'course': {
        const courseIdParam = searchParams.get('courseId')
        if (!courseIdParam) {
          return NextResponse.json({
            success: false,
            error: 'courseId parameter required'
          }, { status: 400 })
        }

        const courseId = parseInt(courseIdParam)
        const course = await learnContract.getCourse(courseId)

        if (!course) {
          return NextResponse.json({
            success: false,
            error: 'Course not found'
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          data: {
            courseId: course.courseId,
            title: course.title,
            description: course.description,
            creator: course.creator.toString(),
            rewardAmount: learnContract.formatTNGAmount(course.rewardAmount),
            rewardAmountRaw: course.rewardAmount,
            totalCompletions: course.totalCompletions,
            isActive: course.isActive,
            createdAt: new Date(course.createdAt * 1000).toISOString()
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: config, courses, user-progress, course'
        }, { status: 400 })
    }

  } catch (error) {
    console.error(' Learn blockchain GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// POST - TRANSACTION BUILDING
// ============================================================================

export async function POST(request: NextRequest) {
  return await withAuth(async (request: NextRequest, auth: { userId: string }) => {
    try {
      const body = await request.json()
      const { action } = body

      // Get user's wallet address
      const { prisma } = await import('@/lib/prisma')
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { walletAddress: true }
      })

      if (!user?.walletAddress) {
        return NextResponse.json({
          success: false,
          error: 'User wallet not connected'
        }, { status: 400 })
      }

      const userPublicKey = new PublicKey(user.walletAddress)

      switch (action) {
        case 'create_course': {
          const { title, description, rewardAmount } = body
          
          if (!title || !description || !rewardAmount) {
            return NextResponse.json({
              success: false,
              error: 'Missing required fields: title, description, rewardAmount'
            }, { status: 400 })
          }

          const rewardInLamports = learnContract.tngToLamports(parseFloat(rewardAmount))
          
          const result = await learnContract.buildCreateCourseTransaction(
            userPublicKey,
            {
              title: title.slice(0, 100), // Smart contract limit
              description: description.slice(0, 500), // Smart contract limit
              rewardAmount: rewardInLamports
            }
          )

          return NextResponse.json({
            success: true,
            data: {
              transaction: result.transaction.serialize({ requireAllSignatures: false }).toString('base64'),
              courseId: result.courseId,
              estimatedCost: learnContract.formatTNGAmount(result.estimatedCost),
              estimatedCostRaw: result.estimatedCost,
              message: `Course "${title}" ready to create. Cost: ${learnContract.formatTNGAmount(result.estimatedCost)} TNG`
            }
          })
        }

        case 'submit_answer': {
          const { courseId, answerHash } = body
          
          if (courseId === undefined || !answerHash) {
            return NextResponse.json({
              success: false,
              error: 'Missing required fields: courseId, answerHash'
            }, { status: 400 })
          }

          const transaction = await learnContract.buildSubmitAnswerTransaction(
            userPublicKey,
            {
              courseId: parseInt(courseId),
              answerHash: answerHash.slice(0, 64) // Smart contract limit
            }
          )

          return NextResponse.json({
            success: true,
            data: {
              transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
              courseId: parseInt(courseId),
              message: `Ready to submit answer for course ${courseId}`
            }
          })
        }

        case 'claim_reward': {
          const { courseId } = body
          
          if (courseId === undefined) {
            return NextResponse.json({
              success: false,
              error: 'Missing required field: courseId'
            }, { status: 400 })
          }

          // Check if user completed the course
          const userCourse = await learnContract.getUserCourse(userPublicKey, parseInt(courseId))
          if (!userCourse?.isCompleted) {
            return NextResponse.json({
              success: false,
              error: 'Course not completed yet'
            }, { status: 400 })
          }

          if (userCourse.isRewardClaimed) {
            return NextResponse.json({
              success: false,
              error: 'Reward already claimed'
            }, { status: 400 })
          }

          const transaction = await learnContract.buildClaimRewardTransaction(
            userPublicKey,
            parseInt(courseId)
          )

          // Get course to show reward amount
          const course = await learnContract.getCourse(parseInt(courseId))
          const rewardAmount = course ? learnContract.formatTNGAmount(course.rewardAmount) : '0'

          return NextResponse.json({
            success: true,
            data: {
              transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
              courseId: parseInt(courseId),
              rewardAmount,
              rewardAmountRaw: course?.rewardAmount || 0,
              message: `Ready to claim ${rewardAmount} TNG reward for course ${courseId}`
            }
          })
        }

        default:
          return NextResponse.json({
            success: false,
            error: 'Invalid action. Use: create_course, submit_answer, claim_reward'
          }, { status: 400 })
      }

    } catch (error) {
      console.error(' Learn blockchain POST error:', error)
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  })(request)
}
