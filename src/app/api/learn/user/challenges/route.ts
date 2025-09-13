/**
 * User Daily Challenges API - Получение и управление ежедневными челленджами
 * GET /api/learn/user/challenges - получить активные челленджи
 * POST /api/learn/user/challenges - принять челлендж
 * Solana SuperApp Learn-to-Earn System
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId

    // Получаем или создаем ежедневные челленджи
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Проверяем есть ли уже челленджи на сегодня
    let userChallenges = await prisma.userChallenge.findMany({
      where: {
        userId,
        startedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        challenge: true
      }
    })

    // Если нет - создаем новые
    if (userChallenges.length === 0) {
      userChallenges = await generateDailyChallenges(userId)
    }

    // Обновляем прогресс челленджей
    const challengesWithProgress = await Promise.all(
      userChallenges.map(async (userChallenge) => {
        const currentProgress = await calculateChallengeProgress(userId, userChallenge)
        const isCompleted = currentProgress >= userChallenge.challenge.target

        // Обновляем прогресс в базе
        if (userChallenge.currentProgress !== currentProgress || userChallenge.isCompleted !== isCompleted) {
          await prisma.userChallenge.update({
            where: { id: userChallenge.id },
            data: {
              currentProgress,
              isCompleted,
              completedAt: isCompleted && !userChallenge.completedAt ? new Date() : userChallenge.completedAt
            }
          })
        }

        return {
          id: userChallenge.id,
          title: userChallenge.challenge.title,
          description: userChallenge.challenge.description,
          type: userChallenge.challenge.type,
          targetValue: userChallenge.challenge.target,
          currentProgress,
          isCompleted,
          reward: {
            xp: userChallenge.challenge.xpReward,
            tokens: userChallenge.challenge.tokenReward
          },
          expiresAt: tomorrow.toISOString(),
          icon: getChallengeIcon(userChallenge.challenge.type)
        }
      })
    )

    console.log(' Daily challenges retrieved:', { 
      userId, 
      challenges: challengesWithProgress.length,
      completed: challengesWithProgress.filter(c => c.isCompleted).length
    })

    return NextResponse.json({
      success: true,
      data: {
        challenges: challengesWithProgress,
        summary: {
          total: challengesWithProgress.length,
          completed: challengesWithProgress.filter(c => c.isCompleted).length,
          available: challengesWithProgress.filter(c => !c.isCompleted).length
        }
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка получения ежедневных челленджей',
        code: 'CHALLENGES_FETCH_ERROR'
      },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Completing challenge...')

    const userId = auth.userId
    const { challengeId } = await request.json()

    // Находим челлендж
    const userChallenge = await prisma.userChallenge.findUnique({
      where: { id: challengeId },
      include: { 
        user: true,
        challenge: true
      }
    })

    if (!userChallenge || userChallenge.userId !== userId) {
      return NextResponse.json(
        { error: 'Челлендж не найден', code: 'CHALLENGE_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (userChallenge.isCompleted) {
      return NextResponse.json(
        { error: 'Челлендж уже завершен', code: 'CHALLENGE_ALREADY_COMPLETED' },
        { status: 400 }
      )
    }

    // Проверяем прогресс
    const currentProgress = await calculateChallengeProgress(userId, userChallenge)
    const isCompleted = currentProgress >= userChallenge.challenge.target

    if (!isCompleted) {
      return NextResponse.json(
        { error: 'Челлендж еще не выполнен', code: 'CHALLENGE_NOT_READY' },
        { status: 400 }
      )
    }

    // Завершаем челлендж и выдаем награды
    await prisma.userChallenge.update({
      where: { id: challengeId },
      data: {
        currentProgress,
        isCompleted: true,
        completedAt: new Date()
      }
    })

    // Начисляем TNG токены (если есть кошелек)
    if (userChallenge.challenge.tokenReward > 0 && userChallenge.user.walletAddress) {
      try {
        const { TNGTokenService } = await import('@/lib/onchain/tng-token.service')
        const { PublicKey, Connection } = await import('@solana/web3.js')
        
        const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com')
        const tngService = new TNGTokenService(connection)
        const userPublicKey = new PublicKey(userChallenge.user.walletAddress)
        
        const mintResult = await tngService.mintTNGTokens(
          userPublicKey,
          BigInt(userChallenge.challenge.tokenReward * 1000000000) // конвертируем в минимальные единицы
        )

        if (!mintResult.success) {
          console.error('Failed to mint TNG tokens for challenge:', mintResult.error)
        }
      } catch (error) {
      }
    }

    console.log(' Challenge completed:', { 
      challengeId, 
      userId,
      xpReward: userChallenge.challenge.xpReward,
      tokenReward: userChallenge.challenge.tokenReward
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Челлендж завершен!',
        rewards: {
          xp: userChallenge.challenge.xpReward,
          tokens: userChallenge.challenge.tokenReward
        }
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка завершения челленджа',
        code: 'CHALLENGE_COMPLETION_ERROR'
      },
      { status: 500 }
    )
  }
})

// Генерация ежедневных челленджей
async function generateDailyChallenges(userId: string) {
  // Сначала создаем или получаем шаблоны челленджей
  const challengeTemplates = [
    {
      title: 'Урок дня',
      description: 'Завершите 1 урок сегодня',
      type: 'LESSON_COMPLETION' as const,
      target: 1,
      xpReward: 50,
      tokenReward: 25
    },
    {
      title: 'Квиз-мастер',
      description: 'Наберите 90%+ в любом квизе',
      type: 'QUIZ_SCORE' as const,
      target: 90,
      xpReward: 75,
      tokenReward: 40
    },
    {
      title: 'Час знаний',
      description: 'Проведите 30 минут в обучении',
      type: 'TIME_SPENT' as const,
      target: 30,
      xpReward: 100,
      tokenReward: 50
    }
  ]

  // Выбираем случайные 3 челленджа
  const shuffled = challengeTemplates.sort(() => 0.5 - Math.random())
  const selectedTemplates = shuffled.slice(0, 3)

  // Создаем челленджи в таблице DailyChallenge
  const today = new Date()
  today.setHours(23, 59, 59, 999) // Устанавливаем время истечения на конец дня

  const dailyChallenges = await Promise.all(
    selectedTemplates.map(template => 
      prisma.dailyChallenge.create({
        data: {
          title: template.title,
          description: template.description,
          type: template.type,
          target: template.target,
          xpReward: template.xpReward,
          tokenReward: template.tokenReward,
          isActive: true,
          expiresAt: today
        }
      })
    )
  )

  // Создаем пользовательские челленджи
  const userChallenges = await Promise.all(
    dailyChallenges.map(challenge => 
      prisma.userChallenge.create({
        data: {
          userId,
          challengeId: challenge.id,
          currentProgress: 0,
          isCompleted: false
        },
        include: {
          challenge: true
        }
      })
    )
  )

  return userChallenges
}

// Расчет прогресса челленджа
async function calculateChallengeProgress(userId: string, userChallenge: any): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (userChallenge.challenge.type) {
    case 'LESSON_COMPLETION':
      return await prisma.lessonProgress.count({
        where: {
          userId,
          isCompleted: true,
          completedAt: { gte: today }
        }
      })

    case 'QUIZ_SCORE':
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: {
          userId,
          startedAt: { gte: today }
        }
      })
      const maxScore = Math.max(...quizAttempts.map(qa => Number(qa.percentage)), 0)
      return maxScore

    case 'TIME_SPENT':
      const lessons = await prisma.lessonProgress.findMany({
        where: {
          userId,
          lastAccessedAt: { gte: today }
        }
      })
      // Примерно считаем время (каждый урок = 15 минут)
      return lessons.length * 15

    default:
      return 0
  }
}

// Иконки для типов челленджей
function getChallengeIcon(type: string): string {
  switch (type) {
    case 'LESSON_COMPLETION': return ''
    case 'QUIZ_SCORE': return ''
    case 'TIME_SPENT': return ''
    default: return ''
  }
}

