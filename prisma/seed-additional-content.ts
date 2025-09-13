/**
 * Additional Content Seed Script - Kazakhstan Edition
 * Дополнительный контент: квизы, ежедневные челленджи, детальные уроки
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📝 Creating additional Kazakhstan content...')

  try {
    await createDetailedLessonsWithQuizzes()
    await createDailyChallenges()
    await createCertificateTemplates()
    await createLeaderboardEntries()
    
    console.log('✅ Additional Kazakhstan content created successfully!')
  } catch (error) {
    console.error('❌ Error creating additional content:', error)
    throw error
  }
}

async function createDetailedLessonsWithQuizzes() {
  console.log('📚 Creating detailed lessons with quizzes...')

  // Найдем существующие курсы
  const blockchainCourse = await prisma.course.findUnique({
    where: { id: 'course-blockchain-kz-basics' },
    include: { lessons: true }
  })

  if (!blockchainCourse) return

  // Добавим квизы к существующим урокам
  for (const lesson of blockchainCourse.lessons) {
    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        title: `Квиз: ${lesson.title}`,
        description: `Проверьте свои знания по теме "${lesson.title}"`,
        timeLimit: 600, // 10 минут
        passingScore: 70,
        attemptsAllowed: 3,
        xpReward: 25,
        tokenReward: 50
      }
    })

    // Вопросы для квиза по введению в блокчейн
    if (lesson.title.includes('Введение в блокчейн')) {
      const questions = [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Какая программа развития цифровых технологий действует в Казахстане?',
          options: ['Цифровой Казахстан', 'Казахстан 2050', 'Нурлы жол', 'Болашак'],
          correctAnswer: 'Цифровой Казахстан',
          explanation: 'Программа "Цифровой Казахстан" направлена на развитие IT и цифровых технологий в стране.',
          points: 10,
          order: 1
        },
        {
          type: 'TRUE_FALSE',
          question: 'Криптовалюты в Казахстане являются законным средством платежа',
          options: ['Да', 'Нет'],
          correctAnswer: 'Нет',
          explanation: 'Криптовалюты НЕ являются законным средством платежа в РК, но разрешены как цифровые активы.',
          points: 10,
          order: 2
        },
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Какое ведомство регулирует деятельность криптообменников в Казахстане?',
          options: ['НБРК', 'АФРК', 'Минфин', 'Минэнерго'],
          correctAnswer: 'АФРК',
          explanation: 'Агентство РК по регулированию и развитию финансового рынка (АФРК) выдает лицензии криптообменникам.',
          points: 15,
          order: 3
        }
      ]

      for (const questionData of questions) {
        await prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            ...questionData
          }
        })
      }
    }

    // Вопросы для квиза по цифровому тенге
    if (lesson.title.includes('Цифровой тенге')) {
      const questions = [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Что такое CBDC?',
          options: [
            'Центральная биржа цифровых активов',
            'Цифровая валюта центрального банка', 
            'Блокчейн для банков',
            'Криптовалютная биржа'
          ],
          correctAnswer: 'Цифровая валюта центрального банка',
          explanation: 'CBDC (Central Bank Digital Currency) - цифровая валюта центрального банка.',
          points: 10,
          order: 1
        },
        {
          type: 'TRUE_FALSE',
          question: 'Цифровой тенге работает на децентрализованном блокчейне',
          options: ['Да', 'Нет'],
          correctAnswer: 'Нет',
          explanation: 'Цифровой тенге работает на централизованной платформе под контролем НБРК.',
          points: 10,
          order: 2
        }
      ]

      for (const questionData of questions) {
        await prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            ...questionData
          }
        })
      }
    }
  }

  // Создадим дополнительные детальные уроки
  const additionalLessons = [
    {
      courseId: 'course-blockchain-kz-basics',
      title: 'Практика: Создание криптокошелька',
      description: 'Пошаговое руководство по созданию и настройке криптокошелька для казахстанских пользователей.',
      type: 'PRACTICAL',
      order: 4,
      duration: 45,
      content: `# Создание криптокошелька в Казахстане

## Шаг 1: Выбор кошелька
Рекомендуемые кошельки для казахстанских пользователей:
- **MetaMask** - для Ethereum и EVM сетей
- **Phantom** - для Solana блокчейна
- **Trust Wallet** - мультивалютный мобильный кошелек

## Шаг 2: Установка и настройка
1. Скачайте приложение из официального источника
2. Создайте новый кошелек (не импортируйте)
3. Запишите seed-фразу на бумаге
4. Установите надежный PIN-код

## Шаг 3: Безопасность
- Никогда не делитесь seed-фразой
- Используйте двухфакторную аутентификацию
- Регулярно обновляйте приложение
- Создайте резервную копию

## Шаг 4: Первая транзакция
1. Пополните кошелек через обменник
2. Отправьте тестовую сумму
3. Проверьте комиссии и время
4. Изучите историю транзакций

## Важно для Казахстана:
- Ведите учет операций для налогов
- Используйте только лицензированные обменники
- Соблюдайте лимиты валютного законодательства`,
      xpReward: 100,
      tokenReward: 200
    },
    {
      courseId: 'course-defi-kz',
      title: 'DeFi стратегии для казахстанцев',
      description: 'Оптимальные стратегии заработка в DeFi с учетом местных особенностей и рисков.',
      type: 'TEXT',
      order: 1,
      duration: 60,
      content: `# DeFi стратегии для казахстанского рынка

## 1. Консервативная стратегия (низкий риск)
**Доходность: 5-12% годовых**
- Стейкинг стабильных токенов (USDC, USDT)
- Предоставление ликвидности в стабильные пулы
- Lending стейблкоинов на проверенных протоколах

**Плюсы:**
- Минимальные риски потерь
- Предсказуемая доходность
- Простота управления

**Минусы:**
- Низкая доходность
- Инфляционные риски
- Зависимость от курса доллара

## 2. Умеренная стратегия (средний риск)
**Доходность: 15-35% годовых**
- Стейкинг топовых криптовалют (ETH, SOL)
- Фарминг в проверенных пулах
- Диверсификация между протоколами

**Подходит для:**
- Пользователей с опытом в крипто
- Долгосрочных инвесторов
- Тех, кто может управлять рисками

## 3. Агрессивная стратегия (высокий риск)
**Доходность: 50-200%+ годовых**
- Фарминг новых токенов
- Участие в ликвидити майнинге
- Арбитраж между DEX

**Риски:**
- Импермаментные потери
- Смарт-контракт риски
- Волатильность токенов

## Налоговые аспекты в Казахстане:
- ИПН 10% с прибыли от продажи
- Учет всех операций для КГД
- Декларирование доходов свыше 20 МРП`,
      xpReward: 150,
      tokenReward: 300
    }
  ]

  for (const lessonData of additionalLessons) {
    await prisma.lesson.create({
      data: lessonData
    })
  }

  console.log('✅ Created detailed lessons with quizzes')
}

async function createDailyChallenges() {
  console.log('🎯 Creating daily challenges...')

  const challenges = [
    {
      title: 'Ежедневное обучение',
      description: 'Изучайте уроки каждый день и получайте бонусы',
      type: 'LESSON_COMPLETION',
      target: 1, // 1 урок в день
      xpReward: 25,
      tokenReward: 50,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
    },
    {
      title: 'Знаток квизов',
      description: 'Наберите более 80% в любом квизе',
      type: 'QUIZ_SCORE',
      target: 80, // 80% результат
      xpReward: 50,
      tokenReward: 100,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      title: 'Марафонец обучения',
      description: 'Изучайте курсы 7 дней подряд',
      type: 'STREAK',
      target: 7, // 7 дней подряд
      xpReward: 200,
      tokenReward: 500,
      badgeReward: 'streak_7_days',
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней
    },
    {
      title: 'Час знаний',
      description: 'Проведите 60 минут в обучении за день',
      type: 'TIME_SPENT',
      target: 60, // 60 минут
      xpReward: 75,
      tokenReward: 150,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      title: 'Казахстанский эксперт',
      description: 'Завершите все курсы о Казахстане',
      type: 'LESSON_COMPLETION',
      target: 15, // все уроки казахстанских курсов
      xpReward: 500,
      tokenReward: 2500,
      badgeReward: 'kazakhstan_expert',
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    }
  ]

  for (const challengeData of challenges) {
    await prisma.dailyChallenge.create({
      data: challengeData
    })
  }

  console.log('✅ Created daily challenges')
}

async function createCertificateTemplates() {
  console.log('🏆 Creating certificate templates...')

  // Получим системного пользователя и курсы
  const systemUser = await prisma.user.findUnique({ where: { telegramId: BigInt(1) } })
  const courses = await prisma.course.findMany({ take: 3 })

  if (!systemUser || courses.length === 0) return

  // Создадим примеры сертификатов
  for (const course of courses) {
    await prisma.certificate.create({
      data: {
        userId: systemUser.id,
        courseId: course.id,
        title: `Сертификат об окончании курса: ${course.title}`,
        description: `Подтверждает успешное завершение образовательного курса "${course.title}" в Solana SuperApp`,
        verificationUrl: `https://solana-superapp.kz/verify/${course.id}/${systemUser.id}`,
        imageUrl: `/certificates/${course.id}-template.png`,
        skills: [
          'Блокчейн технологии',
          'Криптовалюты',
          'Финансовая грамотность',
          'Цифровые активы'
        ],
        grade: 'Отлично',
        isVerified: true,
        issueDate: new Date()
      }
    })
  }

  console.log('✅ Created certificate templates')
}

async function createLeaderboardEntries() {
  console.log('🏅 Creating leaderboard entries...')

  // Получим тестовых пользователей
  const testUsers = await prisma.user.findMany({
    where: {
      telegramId: {
        gte: BigInt(12345000)
      }
    }
  })

  if (testUsers.length === 0) return

  // Создадим записи в рейтинге для каждого пользователя
  for (const [index, user] of testUsers.entries()) {
    const baseXp = 1000 - (index * 200) // Убывающий XP
    const baseTokens = 5000 - (index * 1000) // Убывающие токены

    // Общий рейтинг
    await prisma.leaderboard.create({
      data: {
        userId: user.id,
        category: null, // общий рейтинг
        totalXp: baseXp,
        totalTokens: baseTokens,
        coursesCompleted: 3 - index,
        currentStreak: 7 - index,
        longestStreak: 15 - (index * 2),
        globalRank: index + 1,
        categoryRank: null
      }
    })

    // Рейтинг по блокчейну
    await prisma.leaderboard.create({
      data: {
        userId: user.id,
        category: 'BLOCKCHAIN',
        totalXp: Math.floor(baseXp * 0.6),
        totalTokens: Math.floor(baseTokens * 0.6),
        coursesCompleted: 2 - Math.min(index, 1),
        currentStreak: 5 - index,
        longestStreak: 10 - index,
        globalRank: null,
        categoryRank: index + 1
      }
    })

    // Рейтинг по DeFi
    await prisma.leaderboard.create({
      data: {
        userId: user.id,
        category: 'DEFI',
        totalXp: Math.floor(baseXp * 0.4),
        totalTokens: Math.floor(baseTokens * 0.4),
        coursesCompleted: 1 - Math.min(index, 1),
        currentStreak: 3 - Math.min(index, 2),
        longestStreak: 8 - index,
        globalRank: null,
        categoryRank: index + 1
      }
    })
  }

  console.log('✅ Created leaderboard entries')
}

main()
  .catch((e) => {
    console.error('❌ Additional content seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
