/**
 * Learn Synchronization API
 * Handles bi-directional sync between Database and Blockchain
 * 
 * POST /api/learn/sync - Manual sync trigger
 * GET /api/learn/sync - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { learnIntegrationService } from '@/lib/integration/learn-integration.service'

// ============================================================================
// GET - SYNC STATUS
// ============================================================================

export const GET = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string }
) => {
    try {

      const syncStatus = {
        lastSync: new Date().toISOString(),
        status: 'healthy',
        metrics: {
          databaseCourses: 0,
          blockchainCourses: 0,
          syncedCourses: 0,
          pendingSync: 0,
          errors: 0
        },
        errors: []
      }

      return NextResponse.json({
        success: true,
        data: syncStatus
      })

    } catch (error) {
      console.error(' Error getting sync status:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get sync status',
          code: 'SYNC_STATUS_ERROR'
        },
        { status: 500 }
      )
    }
})

// ============================================================================
// POST - TRIGGER SYNCHRONIZATION  
// ============================================================================

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string }
) => {
    try {
      console.log(' Starting manual synchronization...')
      
      const body = await request.json().catch(() => ({}))
      const { direction = 'bidirectional', force = false } = body

      let result

      switch (direction) {
        case 'database_to_blockchain':
          result = await syncDatabaseToBlockchain(auth.userId, force)
          break
          
        case 'blockchain_to_database':
          result = await syncBlockchainToDatabase(force)
          break
          
        case 'bidirectional':
        default:
          result = await syncBidirectional(force)
          break
      }

      console.log(' Synchronization completed:', result)

      return NextResponse.json({
        success: true,
        data: {
          ...result,
          completedAt: new Date().toISOString(),
          direction,
          force
        }
      })

    } catch (error) {
      console.error(' Error during synchronization:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Synchronization failed',
          code: 'SYNC_ERROR'
        },
        { status: 500 }
      )
    }
})

// ============================================================================
// SYNCHRONIZATION IMPLEMENTATIONS
// ============================================================================

/**
 * Sync database courses to blockchain
 */
async function syncDatabaseToBlockchain(userId: string, force: boolean) {
  console.log(' Syncing database → blockchain...')
  
  // This would require user's wallet signature for blockchain transactions
  // For now, we'll prepare the data and return what needs to be synced
  
  return {
    type: 'database_to_blockchain',
    synced: 0,
    pending: 0,
    errors: ['Blockchain sync requires user wallet signature (not implemented in API)'],
    details: 'Database to blockchain sync must be initiated from frontend with wallet connection'
  }
}

/**
 * Sync blockchain data to database
 */
async function syncBlockchainToDatabase(force: boolean) {
  console.log(' Syncing blockchain → database...')
  
  try {
    const result = await learnIntegrationService.syncDatabaseWithBlockchain()
    
    return {
      type: 'blockchain_to_database',
      synced: result.synced,
      pending: 0,
      errors: result.errors,
      details: `Successfully synced ${result.synced} courses from blockchain to database`
    }
    
  } catch (error) {
    throw new Error(`Blockchain to database sync failed: ${error}`)
  }
}

/**
 * Bidirectional synchronization
 */
async function syncBidirectional(force: boolean) {
  console.log(' Bidirectional synchronization...')
  
  const results: any[] = []
  const errors: any[] = []

  // 1. Sync blockchain → database (safe, no wallet needed)
  try {
    const blockchainToDb = await syncBlockchainToDatabase(force)
    results.push(blockchainToDb)
  } catch (error) {
    errors.push(`Blockchain→DB sync failed: ${error}`)
  }

  // 2. Database → blockchain would need wallet signature
  errors.push('Database→Blockchain sync requires frontend wallet integration')

  return {
    type: 'bidirectional',
    synced: results.reduce((sum, r) => sum + r.synced, 0),
    pending: 0,
    errors,
    details: 'Partial sync completed (blockchain→database only)',
    results
  }
}

// ============================================================================
// WEBHOOK FOR AUTOMATIC SYNC (Future implementation)
// ============================================================================

/**
 * Webhook endpoint for blockchain events
 * This would be called by blockchain event listeners
 */
export async function PUT(request: NextRequest) {
  try {
    console.log(' Blockchain webhook received')
    
    const body = await request.json()
    const { event, data } = body

    switch (event) {
      case 'course_created':
        await handleCourseCreated(data)
        break
        
      case 'course_completed':
        await handleCourseCompleted(data)
        break
        
      case 'reward_claimed':
        await handleRewardClaimed(data)
        break
        
      default:
        console.warn(' Unknown blockchain event:', event)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    })

  } catch (error) {
    console.error(' Webhook processing error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Webhook processing failed' 
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

async function handleCourseCreated(data: any) {
  console.log(' Processing course_created event:', data)
  // Auto-sync new blockchain course to database
  await learnIntegrationService.syncDatabaseWithBlockchain()
}

async function handleCourseCompleted(data: any) {
  console.log(' Processing course_completed event:', data)
  // Update user progress in database
  // This would trigger reward distribution
}

async function handleRewardClaimed(data: any) {
  console.log(' Processing reward_claimed event:', data)
  // Update reward status in database
  // Possibly trigger additional rewards or achievements
}


