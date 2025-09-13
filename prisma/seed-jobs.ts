/**
 * Jobs Seed Data - Казахстан, Solana, Superteam focused
 * Создает реалистичные данные для Jobs платформы
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Данные пользователей для работодателей и фрилансеров
const seedUsers = [
  // Работодатели (Казахстан + Solana проекты)
  {
    telegramId: BigInt(1001),
    username: 'superteam_kz',
    firstName: 'Superteam',
    lastName: 'Kazakhstan',
    languageCode: 'ru',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/1234567890/superteam.jpg'
  },
  {
    telegramId: BigInt(1002),
    username: 'solana_almaty',
    firstName: 'Solana',
    lastName: 'Almaty Hub',
    languageCode: 'ru',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/1234567891/solana_hub.jpg'
  },
  {
    telegramId: BigInt(1003),
    username: 'qazaq_defi',
    firstName: 'Qazaq',
    lastName: 'DeFi',
    languageCode: 'kk',
    isPremium: false,
    photoUrl: 'https://pbs.twimg.com/profile_images/1234567892/qazaq_defi.jpg'
  },
  {
    telegramId: BigInt(1004),
    username: 'astana_web3',
    firstName: 'Astana',
    lastName: 'Web3 Studio',
    languageCode: 'ru',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/1234567893/astana_web3.jpg'
  },
  {
    telegramId: BigInt(1005),
    username: 'tengri_labs',
    firstName: 'Tengri',
    lastName: 'Labs',
    languageCode: 'en',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/1234567894/tengri_labs.jpg'
  },
  
  // Фрилансеры
  {
    telegramId: BigInt(2001),
    username: 'aidos_dev',
    firstName: 'Aidos',
    lastName: 'Nurlan',
    languageCode: 'ru',
    isPremium: false,
    photoUrl: 'https://pbs.twimg.com/profile_images/2234567890/aidos.jpg'
  },
  {
    telegramId: BigInt(2002),
    username: 'dana_designer',
    firstName: 'Dana',
    lastName: 'Suleimenova',
    languageCode: 'ru',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/2234567891/dana.jpg'
  },
  {
    telegramId: BigInt(2003),
    username: 'arman_smart_contracts',
    firstName: 'Arman',
    lastName: 'Bekzhanov',
    languageCode: 'en',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/2234567892/arman.jpg'
  },
  {
    telegramId: BigInt(2004),
    username: 'aigerim_marketing',
    firstName: 'Aigerim',
    lastName: 'Kassymova',
    languageCode: 'ru',
    isPremium: false,
    photoUrl: 'https://pbs.twimg.com/profile_images/2234567893/aigerim.jpg'
  },
  {
    telegramId: BigInt(2005),
    username: 'bauyrzhan_audit',
    firstName: 'Bauyrzhan',
    lastName: 'Tolegenov',
    languageCode: 'en',
    isPremium: true,
    photoUrl: 'https://pbs.twimg.com/profile_images/2234567894/bauyrzhan.jpg'
  }
]

// Данные работ с казахстанским/Solana контекстом
const jobsData = [
  {
    title: 'Frontend разработчик для Solana DeFi платформы Qazaq Finance',
    description: `Ищем опытного React/Next.js разработчика для создания современного интерфейса DeFi платформы, ориентированной на казахстанский рынок.

**Что нужно сделать:**
- Создать интуитивный интерфейс для стейкинга, свапов и фарминга
- Интегрировать с Solana кошельками (Phantom, Solflare)
- Реализовать многоязычность (русский, казахский, английский)
- Адаптировать под мобильные устройства

**Требования:**
- 3+ лет опыта с React/Next.js
- Опыт интеграции с Web3 кошельками
- Знание TypeScript и современных инструментов
- Понимание UX/UI принципов для финансовых приложений
- Знание русского языка обязательно

**Будет плюсом:**
- Опыт работы с Solana Web3.js
- Портфолио DeFi проектов
- Знание казахского языка`,
    employerIndex: 0, // Superteam Kazakhstan
    category: 'FRONTEND_DEVELOPMENT',
    paymentAmount: BigInt(15000 * 1e6), // 15,000 USDC
    paymentToken: 'USDC',
    paymentType: 'FIXED',
    skills: ['React', 'Next.js', 'TypeScript', 'Solana Web3', 'Tailwind CSS', 'i18n'],
    requirements: ['3+ лет опыта React', 'Опыт Web3 интеграции', 'Знание русского языка'],
    location: 'Алматы (удаленно возможно)',
    estimatedTime: '6-8 недель'
  },
  {
    title: 'Smart Contract аудитор для казахстанских DeFi протоколов',
    description: `Tengri Labs ищет опытного аудитора смарт-контрактов для проверки безопасности наших DeFi протоколов на Solana.

**Задачи:**
- Аудит смарт-контрактов стейкинга и ликвидности
- Поиск уязвимостей и векторов атак
- Написание детальных отчетов на русском/английском
- Консультации по улучшению безопасности

**Требования:**
- 2+ года опыта аудита смарт-контрактов
- Глубокое знание Rust и Anchor framework
- Опыт с Solana программами
- Сертификации в области кибербезопасности приветствуются

**Предлагаем:**
- Работу с ведущими проектами Казахстана
- Долгосрочное сотрудничество
- Конкурентную оплату в SOL`,
    employerIndex: 4, // Tengri Labs
    category: 'AUDIT',
    paymentAmount: BigInt(25000 * 1e6), // 25,000 USDC
    paymentToken: 'SOL',
    paymentType: 'FIXED',
    skills: ['Rust', 'Anchor', 'Solana', 'Smart Contract Audit', 'Security', 'Vulnerability Assessment'],
    requirements: ['2+ года аудита', 'Знание Rust/Anchor', 'Опыт с Solana'],
    location: 'Удаленно',
    estimatedTime: '4-5 недель'
  },
  {
    title: 'UI/UX дизайнер для мобильного Solana кошелька "Qazaq Wallet"',
    description: `Создаем первый казахстанский мобильный кошелек для Solana экосистемы. Нужен талантливый дизайнер для создания интуитивного и красивого интерфейса.

**Что предстоит сделать:**
- Дизайн мобильного приложения с нуля
- Создать дизайн-систему в казахстанском стиле
- UX исследование целевой аудитории
- Прототипирование и тестирование интерфейсов
- Адаптация под культурные особенности региона

**Ищем:**
- Опытного UI/UX дизайнера с портфолио мобильных приложений
- Понимание Web3 UX паттернов
- Знание Figma, Adobe Creative Suite
- Опыт проведения UX исследований
- Знание особенностей казахстанского рынка

**Особенности проекта:**
- Первый кошелек такого масштаба в Казахстане
- Интеграция с местными платежными системами
- Поддержка казахского языка и культурных элементов`,
    employerIndex: 2, // Qazaq DeFi
    category: 'UI_UX_DESIGN',
    paymentAmount: BigInt(12000 * 1e6), // 12,000 USDC
    paymentToken: 'USDC',
    paymentType: 'MILESTONE',
    skills: ['UI/UX Design', 'Mobile Design', 'Figma', 'Prototyping', 'User Research', 'Web3 UX'],
    requirements: ['3+ лет UI/UX опыта', 'Портфолио мобильных приложений', 'Понимание Web3'],
    location: 'Алматы',
    estimatedTime: '8-10 недель'
  },
  {
    title: 'Разработчик Rust/Anchor для NFT маркетплейса "Baiterek Gallery"',
    description: `Астанинская студия создает NFT маркетплейс для продвижения казахстанского цифрового искусства. Ищем Rust разработчика для backend части.

**Технические задачи:**
- Разработка смарт-контрактов для NFT маркетплейса
- Реализация системы роялти для художников
- Интеграция с Metaplex стандартами
- Создание системы аукционов и фиксированных продаж
- Оптимизация газовых затрат

**Требования:**
- Опыт разработки на Rust 1+ год
- Знание Anchor framework и Solana архитектуры
- Понимание NFT стандартов и Metaplex
- Опыт с тестированием смарт-контрактов
- Английский язык для работы с документацией

**Культурный контекст:**
- Поддержка казахстанских художников и творцов
- Интеграция элементов национальной культуры
- Возможность стать частью культурной революции в Web3`,
    employerIndex: 3, // Astana Web3 Studio
    category: 'SMART_CONTRACTS',
    paymentAmount: BigInt(18000 * 1e6), // 18,000 USDC
    paymentToken: 'SOL',
    paymentType: 'MILESTONE',
    skills: ['Rust', 'Anchor', 'Solana', 'NFT', 'Metaplex', 'Smart Contracts'],
    requirements: ['1+ год Rust опыта', 'Знание Anchor', 'Понимание NFT стандартов'],
    location: 'Нур-Султан (Астана)',
    estimatedTime: '10-12 недель'
  },
  {
    title: 'Community Manager для Superteam Kazakhstan',
    description: `Superteam Kazakhstan расширяет свое присутствие в регионе и ищет энергичного комьюнити менеджера для развития Solana экосистемы в Казахстане.

**Обязанности:**
- Управление Telegram, Discord и Twitter сообществами
- Организация meetup'ов и хакатонов в Алматы и Астане
- Создание контента на русском и казахском языках
- Координация с глобальной командой Superteam
- Поиск и поддержка местных разработчиков
- Перевод материалов и документации

**Идеальный кандидат:**
- Опыт управления крипто/Web3 сообществами
- Отличное знание русского и казахского языков
- Понимание Solana экосистемы
- Навыки организации мероприятий
- Креативность в создании контента
- Связи в IT сообществе Казахстана

**Что предлагаем:**
- Работу с международной командой
- Возможность влиять на развитие Web3 в регионе
- Гибкий график и удаленную работу
- Участие в глобальных Superteam инициативах`,
    employerIndex: 0, // Superteam Kazakhstan
    category: 'COMMUNITY_MANAGEMENT',
    paymentAmount: BigInt(3000 * 1e6), // 3,000 USDC/месяц
    paymentToken: 'USDC',
    paymentType: 'HOURLY',
    skills: ['Community Management', 'Social Media', 'Content Creation', 'Event Organization', 'Russian', 'Kazakh'],
    requirements: ['Опыт управления сообществами', 'Знание казахского/русского', 'Понимание Web3'],
    location: 'Алматы/Астана (гибрид)',
    estimatedTime: 'Долгосрочно'
  },
  {
    title: 'Технический писатель для документации Solana проектов (рус/каз)',
    description: `Нужен технический писатель для создания качественной документации наших DeFi продуктов на русском и казахском языках.

**Задачи:**
- Написание технической документации для разработчиков
- Создание пользовательских гайдов и туториалов
- Перевод англоязычной документации
- Поддержание актуальности материалов
- Создание FAQ и базы знаний

**Требования:**
- Опыт технического письма в IT/блокчейн сфере
- Отличное владение русским и казахским языками
- Базовое понимание блокчейн технологий
- Умение объяснять сложные концепции простым языком
- Опыт работы с Markdown, GitBook или аналогами

**Будет плюсом:**
- Знание Solana экосистемы
- Опыт работы с DeFi протоколами
- Портфолио технических статей`,
    employerIndex: 1, // Solana Almaty Hub
    category: 'CONTENT_WRITING',
    paymentAmount: BigInt(4500 * 1e6), // 4,500 USDC
    paymentToken: 'USDC',
    paymentType: 'FIXED',
    skills: ['Technical Writing', 'Documentation', 'Russian', 'Kazakh', 'Blockchain', 'DeFi'],
    requirements: ['Опыт технического письма', 'Владение рус/каз языками', 'Понимание блокчейна'],
    location: 'Удаленно',
    estimatedTime: '6-8 недель'
  },
  {
    title: 'Backend разработчик (Node.js) для Solana аналитической платформы',
    description: `Создаем аналитическую платформу для отслеживания DeFi активности в Solana с фокусом на казахстанские проекты.

**Технический стек:**
- Node.js/Express.js backend
- PostgreSQL для хранения данных
- Redis для кеширования
- WebSocket для real-time данных
- Интеграция с Solana RPC

**Основные задачи:**
- Разработка API для получения on-chain данных
- Создание системы индексации транзакций
- Реализация real-time уведомлений
- Оптимизация производительности запросов
- Интеграция с внешними API (CoinGecko, Jupiter)

**Требования:**
- 2+ года опыта с Node.js
- Знание PostgreSQL и оптимизации БД
- Опыт работы с WebSocket
- Понимание RESTful API принципов
- Базовые знания блокчейн технологий`,
    employerIndex: 1, // Solana Almaty Hub
    category: 'BACKEND_DEVELOPMENT',
    paymentAmount: BigInt(13000 * 1e6), // 13,000 USDC
    paymentToken: 'USDC',
    paymentType: 'FIXED',
    skills: ['Node.js', 'Express.js', 'PostgreSQL', 'Redis', 'WebSocket', 'Solana RPC'],
    requirements: ['2+ года Node.js опыта', 'Знание PostgreSQL', 'Понимание блокчейна'],
    location: 'Алматы (удаленно возможно)',
    estimatedTime: '8-10 недель'
  },
  {
    title: 'Маркетинг менеджер для запуска Solana проекта в Казахстане',
    description: `Готовимся к запуску революционного DeFi протокола в Казахстане. Ищем опытного маркетолога для продвижения в регионе.

**Что предстоит делать:**
- Разработка маркетинговой стратегии для казахстанского рынка
- Создание контент-плана для социальных сетей
- Организация PR кампаний и медиа покрытия
- Работа с криптовалютными медиа и инфлюенсерами
- Анализ конкурентов и трендов рынка
- Координация с международной маркетинг командой

**Ищем:**
- Опыт маркетинга в криптовалютной/финтех индустрии
- Знание особенностей казахстанского рынка
- Связи в медиа и криптосообществе
- Креативность и аналитическое мышление
- Свободное владение русским и английским языками

**Предлагаем:**
- Участие в запуске инновационного продукта
- Конкурентную оплату + токены проекта
- Работу с международной командой`,
    employerIndex: 2, // Qazaq DeFi
    category: 'MARKETING',
    paymentAmount: BigInt(6000 * 1e6), // 6,000 USDC
    paymentToken: 'USDC',
    paymentType: 'MILESTONE',
    skills: ['Digital Marketing', 'Crypto Marketing', 'PR', 'Content Strategy', 'Social Media', 'Analytics'],
    requirements: ['Опыт крипто маркетинга', 'Знание KZ рынка', 'Связи в медиа'],
    location: 'Алматы',
    estimatedTime: '12 недель'
  }
]

// Данные заявок
const seedApplications = [
  {
    jobIndex: 0, // Frontend разработчик
    applicantIndex: 5, // Aidos
    coverLetter: `Привет! Меня зовут Айдос, я frontend разработчик из Алматы с 4-летним опытом работы с React и Next.js.

Особенно заинтересован этим проектом, потому что:
- Имею опыт интеграции с Web3 кошельками (работал над проектом для местной криптобиржи)
- Свободно владею русским и казахским языками
- Понимаю особенности казахстанского рынка и пользователей
- Уже работал с Solana Web3.js в личных проектах

В портфолио есть DeFi интерфейс для локального стартапа и мобильная адаптация для финтех приложения.

Готов начать работу на следующей неделе. Предлагаю созвониться для обсуждения деталей.

Рахмет!`,
    proposedRate: BigInt(14000 * 1e6),
    estimatedTime: '7 недель',
    portfolio: ['https://github.com/aidos-dev', 'https://portfolio.aidos-dev.kz']
  },
  {
    jobIndex: 1, // Smart Contract аудитор
    applicantIndex: 7, // Bauyrzhan
    coverLetter: `Здравствуйте!

Я Бауыржан, специализируюсь на аудите смарт-контрактов с 3-летним опытом. Провел аудиты для более чем 20 проектов, включая несколько на Solana.

Мой опыт включает:
- Аудит DeFi протоколов (стейкинг, AMM, lending)
- Глубокое знание Rust и Anchor framework
- Сертификация OSCP и CEH
- Опыт работы с казахстанскими финтех компаниями

Особенно привлекает возможность работать с Tengri Labs - знаю о ваших достижениях в области безопасности.

Могу предоставить примеры предыдущих аудит отчетов и рекомендации от клиентов.

С уважением, Бауыржан`,
    proposedRate: BigInt(23000 * 1e6),
    estimatedTime: '4 недели',
    portfolio: ['https://github.com/bauyrzhan-audit', 'https://bauyrzhan-security.com']
  },
  {
    jobIndex: 2, // UI/UX дизайнер
    applicantIndex: 6, // Dana
    coverLetter: `Сәлеметсіз бе!

Мен Дана, UI/UX дизайнермін. Қазақстанның алғашқы Solana әмиянын жасау жобасына қатысуға өте қызығушылық танытамын.

Менің тәжірибем:
- 5 жыл мобильді қосымшалар дизайны
- Web3 кошельков UX паттерндерін білемін (Phantom, Solflare зерттеген)
- Қазақстан нарығын жақсы білемін
- Мәдени ерекшеліктерді дизайнға енгізу тәжірибесі бар

Портфолиомда қазақстандық финтех қосымшалар және криптовалюта кошелек концепттері бар.

"Qazaq Wallet" жобасы - бұл тарихи мүмкіндік. Біздің мәдениетімізді Web3 әлеміне алып келу үшін бірге жұмыс істейік!

Құрметпен, Дана`,
    proposedRate: BigInt(11500 * 1e6),
    estimatedTime: '9 недель',
    portfolio: ['https://behance.net/dana-designer', 'https://dribbble.com/dana_suleimenova']
  }
]

async function seedJobs() {
  console.log(' Starting Jobs seeding...')

  try {
    // Создаем пользователей
    console.log(' Creating users...')
    const createdUsers = []
    
    for (const userData of seedUsers) {
      const user = await prisma.user.upsert({
        where: { telegramId: userData.telegramId },
        update: userData,
        create: userData
      })
      createdUsers.push(user)
    }

    console.log(` Created ${createdUsers.length} users`)

    // Создаем работы
    console.log(' Creating jobs...')
    const createdJobs = []
    
    for (const jobData of jobsData) {
      const employer = createdUsers[jobData.employerIndex]
      const job = await prisma.job.create({
        data: {
          userId: employer.id,
          title: jobData.title,
          description: jobData.description,
          requirements: jobData.requirements,
          skills: jobData.skills,
          paymentAmount: jobData.paymentAmount,
          paymentToken: jobData.paymentToken,
          paymentType: jobData.paymentType as any,
          category: jobData.category as any,
          location: jobData.location,
          estimatedTime: jobData.estimatedTime,
          status: 'OPEN'
        }
      })
      createdJobs.push(job)
    }

    console.log(` Created ${createdJobs.length} jobs`)

    // Создаем заявки
    console.log(' Creating applications...')
    let createdApplications = 0
    
    for (const appData of seedApplications) {
      const job = createdJobs[appData.jobIndex]
      const applicant = createdUsers[appData.applicantIndex]
      
      await prisma.jobApplication.create({
        data: {
          userId: applicant.id,
          jobId: job.id,
          coverLetter: appData.coverLetter,
          proposedRate: appData.proposedRate,
          estimatedTime: appData.estimatedTime,
          portfolio: appData.portfolio,
          status: 'PENDING'
        }
      })
      createdApplications++
    }

    console.log(` Created ${createdApplications} applications`)

    console.log(' Jobs seeding completed successfully!')
    
    // Выводим статистику
    const stats = await prisma.job.groupBy({
      by: ['category'],
      _count: { id: true }
    })
    
    console.log('\n Jobs by category:')
    for (const stat of stats) {
      console.log(`  ${stat.category}: ${stat._count.id}`)
    }

  } catch (error) {
    console.error(' Error seeding jobs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Запускаем сид только если файл выполняется напрямую
if (require.main === module) {
  seedJobs()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedJobs }
