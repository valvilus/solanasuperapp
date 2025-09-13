import { PrismaClient } from '@prisma/client'
import { getRepositoryManager } from './repositories'

// PrismaClient синглтон для Next.js
// Предотвращает создание множественных соединений в режиме разработки

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: (
      process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true'
        ? ['error', 'warn', 'query']
        : ['error']
    ) as any
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Обработчик медленных запросов в development режиме
if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true') {
  prisma.$on('query', (e: any) => {
    // Логируем только медленные запросы (более 200ms)
    if (e.duration > 200) {
      console.warn(` Медленный запрос (${e.duration}ms):`, {
        query: e.query,
        params: e.params,
        duration: e.duration,
        timestamp: e.timestamp
      })
    }
  })
}

// Хелперы для работы с пользователями Telegram
export const userHelpers = {
  // Найти или создать пользователя по Telegram данным
  async findOrCreateUser(telegramData: {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
    is_premium?: boolean
    photo_url?: string
  }) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramData.id) }
      })

      if (existingUser) {
        // Обновляем lastLoginAt и другие данные если они изменились
        return await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            lastLoginAt: new Date(),
            firstName: telegramData.first_name,
            lastName: telegramData.last_name,
            username: telegramData.username,
            languageCode: telegramData.language_code || 'ru',
            isPremium: telegramData.is_premium || false,
            photoUrl: telegramData.photo_url,
          }
        })
      }

      // Создаем нового пользователя
      return await prisma.user.create({
        data: {
          telegramId: BigInt(telegramData.id),
          firstName: telegramData.first_name,
          lastName: telegramData.last_name,
          username: telegramData.username,
          languageCode: telegramData.language_code || 'ru',
          isPremium: telegramData.is_premium || false,
          photoUrl: telegramData.photo_url,
          lastLoginAt: new Date(),
        }
      })
    } catch (error) {
      console.error('Ошибка при работе с пользователем:', error)
      throw error
    }
  },

  // Получить пользователя с его активностью
  async getUserWithActivity(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            signature: true,
            type: true,
            amount: true,
            token: true,
            status: true,
            description: true,
            createdAt: true,
            confirmedAt: true
          }
        },
        nfts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            mintAddress: true,
            name: true,
            description: true,
            imageUri: true,
            type: true,
            isForSale: true,
            price: true,
            createdAt: true
          }
        },
        courses: {
          include: { 
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                estimatedTime: true,
                rewardType: true,
                rewardAmount: true
              }
            }
          },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            progress: true,
            status: true,
            score: true,
            rewardClaimed: true,
            startedAt: true,
            completedAt: true,
            course: true
          }
        },
        jobs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            paymentAmount: true,
            paymentToken: true,
            paymentType: true,
            category: true,
            status: true,
            createdAt: true,
            closedAt: true
          }
        }
      }
    })
  }
}

// Хелперы для транзакций
export const transactionHelpers = {
  // Создать новую транзакцию
  async createTransaction(data: {
    userId: string
    signature: string
    type: any // TransactionType
    amount: bigint
    token?: string
    fromAddress?: string
    toAddress?: string
    description?: string
    metadata?: any
  }) {
    return await prisma.transaction.create({
      data: {
        ...data,
        status: 'PENDING'
      }
    })
  },

  // Обновить статус транзакции
  async updateTransactionStatus(
    signature: string, 
    status: 'CONFIRMED' | 'FAILED' | 'CANCELLED',
    confirmedAt?: Date
  ) {
    return await prisma.transaction.update({
      where: { signature },
      data: {
        status,
        confirmedAt: confirmedAt || (status === 'CONFIRMED' ? new Date() : undefined)
      }
    })
  }
}

// Хелперы для курсов
export const courseHelpers = {
  // Записать пользователя на курс
  async enrollUser(userId: string, courseId: string) {
    return await prisma.userCourse.create({
      data: {
        userId,
        courseId,
        status: 'IN_PROGRESS'
      }
    })
  },

  // Обновить прогресс курса
  async updateProgress(userId: string, courseId: string, progress: number, score?: number) {
    const status = progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS'
    const completedAt = progress >= 100 ? new Date() : undefined

    return await prisma.userCourse.update({
      where: {
        userId_courseId: { userId, courseId }
      },
      data: {
        progress,
        score,
        status,
        completedAt
      }
    })
  }
}

// Хелперы для DAO
export const daoHelpers = {
  // Создать голос
  async createVote(userId: string, proposalId: string, vote: 'FOR' | 'AGAINST' | 'ABSTAIN', weight: bigint, comment?: string) {
    return await prisma.dAOVote.create({
      data: {
        userId,
        proposalId,
        vote,
        weight,
        comment
      }
    })
  },

  // Получить результаты голосования
  async getProposalResults(proposalId: string) {
    const votes = await prisma.dAOVote.findMany({
      where: { proposalId }
    })

    const votesFor = votes
      .filter(v => v.vote === 'FOR')
      .reduce((sum, v) => sum + v.weight, BigInt(0))
    
    const votesAgainst = votes
      .filter(v => v.vote === 'AGAINST')
      .reduce((sum, v) => sum + v.weight, BigInt(0))

    return { votesFor, votesAgainst, totalVotes: votes.length }
  }
}

// Экспорт глобального репозитория менеджера
export const repositories = getRepositoryManager(prisma)

export default prisma
