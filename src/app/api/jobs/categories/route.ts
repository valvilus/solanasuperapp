import { NextRequest, NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/categories
export const GET = withOptionalAuth(async (request: NextRequest) => {
  try {
    const categoryStats = await prisma.job.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'OPEN' },
      orderBy: { _count: { id: 'desc' } }
    })

    const allCategories = [
      'BLOCKCHAIN_DEVELOPMENT',
      'FRONTEND_DEVELOPMENT', 
      'BACKEND_DEVELOPMENT',
      'MOBILE_DEVELOPMENT',
      'UI_UX_DESIGN',
      'SMART_CONTRACTS',
      'DEFI',
      'NFT',
      'MARKETING',
      'CONTENT_WRITING',
      'TRANSLATION',
      'COMMUNITY_MANAGEMENT',
      'PROJECT_MANAGEMENT',
      'CONSULTING',
      'AUDIT',
      'OTHER'
    ]

    const categoryLabels: Record<string, string> = {
      'BLOCKCHAIN_DEVELOPMENT': 'Blockchain разработка',
      'FRONTEND_DEVELOPMENT': 'Frontend разработка',
      'BACKEND_DEVELOPMENT': 'Backend разработка', 
      'MOBILE_DEVELOPMENT': 'Мобильная разработка',
      'UI_UX_DESIGN': 'UI/UX дизайн',
      'SMART_CONTRACTS': 'Смарт-контракты',
      'DEFI': 'DeFi проекты',
      'NFT': 'NFT проекты',
      'MARKETING': 'Маркетинг',
      'CONTENT_WRITING': 'Копирайтинг',
      'TRANSLATION': 'Переводы',
      'COMMUNITY_MANAGEMENT': 'Управление сообществом',
      'PROJECT_MANAGEMENT': 'Проект-менеджмент',
      'CONSULTING': 'Консалтинг',
      'AUDIT': 'Аудит',
      'OTHER': 'Другое'
    }

    const categories = allCategories.map(category => {
      const stat = categoryStats.find(s => s.category === category)
      return {
        id: category,
        name: categoryLabels[category] || category,
        count: stat?._count.id || 0,
        isActive: (stat?._count.id || 0) > 0
      }
    })

    const sortedCategories = categories.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      if (a.isActive && b.isActive) return b.count - a.count
      return a.name.localeCompare(b.name)
    })

    const topSkills = await prisma.$queryRaw`
      SELECT skill, COUNT(*) as count
      FROM (
        SELECT unnest(skills) as skill
        FROM jobs
        WHERE status = 'OPEN'
      ) as skills_unnested
      GROUP BY skill
      ORDER BY count DESC
      LIMIT 20
    ` as Array<{ skill: string; count: bigint }>

    const formattedSkills = topSkills.map(s => ({
      name: s.skill,
      count: Number(s.count)
    }))

    return NextResponse.json({
      success: true,
      data: {
        categories: sortedCategories,
        topSkills: formattedSkills,
        totalActiveJobs: categoryStats.reduce((sum, stat) => sum + stat._count.id, 0)
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка получения категорий' 
    }, { status: 500 })
  }
})
