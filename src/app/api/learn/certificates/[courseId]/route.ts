/**
 * Certificate Generation API - Генерация сертификатов
 * GET /api/learn/certificates/[courseId] - Получить сертификат
 * POST /api/learn/certificates/[courseId] - Сгенерировать сертификат
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { LearnService } from '@/lib/learn/learn.service'
import { withAuth } from '@/lib/auth'
import { ApiResponse } from '@/lib/learn/types'

export const GET = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { courseId } = await params
    
    const learnService = new LearnService()
    const certificate = await learnService.getCertificate(courseId, auth.userId)

    if (!certificate) {
      return NextResponse.json({
        success: false,
        error: 'Сертификат не найден или курс не завершен'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: certificate
    })

  } catch (error) {
    console.error('Error fetching certificate:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения сертификата'
    }, { status: 500 })
  }
})

export const POST = withAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string },
  { params }: { params: Promise<{ courseId: string }> }
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { courseId } = await params
    
    const learnService = new LearnService()
    const result = await learnService.generateCertificate(courseId, auth.userId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.certificate
    })

  } catch (error) {
    console.error('Error generating certificate:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка генерации сертификата'
    }, { status: 500 })
  }
})






