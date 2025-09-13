/**
 * User Certificates API
 * GET /api/learn/user/certificates
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    const certificates = await prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            level: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      },
      orderBy: { issueDate: 'desc' }
    })

    // Форматируем данные сертификатов
    const formattedCertificates = certificates.map(cert => ({
      id: cert.id,
      title: cert.title,
      description: cert.description,
      course: {
        id: cert.course.id,
        title: cert.course.title,
        category: cert.course.category,
        level: cert.course.level
      },
      student: {
        name: cert.user.firstName + (cert.user.lastName ? ' ' + cert.user.lastName : ''),
        username: cert.user.username
      },
      skills: cert.skills,
      grade: cert.grade,
      issuedAt: cert.issueDate,
      isVerified: cert.isVerified,
      metadata: {
        completionDate: cert.issueDate,
        validUntil: null, // Сертификаты не истекают
        creditsEarned: 1, // За каждый курс 1 кредит
        institution: 'Solana SuperApp Learn'
      }
    }))

    // Группируем сертификаты по категориям
    const certificatesByCategory = formattedCertificates.reduce((acc, cert) => {
      const category = cert.course.category || 'other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(cert)
      return acc
    }, {} as Record<string, typeof formattedCertificates>)

    // Статистика сертификатов
    const stats = {
      total: certificates.length,
      verified: certificates.filter(c => c.isVerified).length,
      byCategory: Object.keys(certificatesByCategory).map(category => ({
        category,
        count: certificatesByCategory[category].length
      })),
      recentlyEarned: formattedCertificates.slice(0, 3)
    }

    console.log(' User certificates retrieved:', { 
      userId, 
      certificates: certificates.length,
      verified: stats.verified
    })

    return NextResponse.json({
      success: true,
      data: {
        certificates: formattedCertificates,
        certificatesByCategory,
        stats
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения сертификатов пользователя',
        code: 'CERTIFICATES_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

