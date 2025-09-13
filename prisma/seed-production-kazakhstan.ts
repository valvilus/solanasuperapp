/**
 * Production Seed Script - Kazakhstan Edition
 * Полное заполнение базы данных казахстанскими данными для продакшена
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🇰🇿 Starting Kazakhstan production database seeding...')

  try {
    // 1. Создаем базовые активы
    await createAssets()
    
    // 2. Создаем курсы и уроки
    await createCoursesAndLessons()
    
    // 3. Создаем NFT коллекции
    await createNFTCollections()
    
    // 4. Создаем вакансии
    await createJobsAndVacancies()
    
    // 5. Создаем DeFi пулы
    await createDeFiPools()
    
    // 6. Создаем достижения и значки
    await createAchievementsAndBadges()
    
    // 7. Создаем тестовых пользователей
    await createTestUsers()
    
    // 8. Создаем DAO предложения
    await createDAOProposals()

    console.log('✅ Kazakhstan production seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

async function createAssets() {
  console.log('💰 Creating Kazakhstan assets...')
  
  // SOL - базовый токен
  await prisma.asset.upsert({
    where: { symbol: 'SOL' },
    update: {},
    create: {
      symbol: 'SOL',
      name: 'Solana',
      mintAddress: null,
      decimals: 9,
      isOnchain: true,
      logoUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png',
      description: 'Нативный токен блокчейна Solana',
      isActive: true
    }
  })

  // TNG - Казахстанский Тенге токен
  await prisma.asset.upsert({
    where: { symbol: 'TNG' },
    update: {},
    create: {
      symbol: 'TNG',
      name: 'Kazakhstan Tenge Token',
      mintAddress: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      decimals: 9,
      isOnchain: true,
      logoUrl: '/tng-logo.png',
      description: 'Цифровой токен, привязанный к казахстанскому тенге (1 TNG = 1 KZT)',
      isActive: true
    }
  })

  // USDC - для международных операций
  await prisma.asset.upsert({
    where: { symbol: 'USDC' },
    update: {},
    create: {
      symbol: 'USDC',
      name: 'USD Coin',
      mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      isOnchain: true,
      logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      description: 'Стабильная монета доллара США',
      isActive: true
    }
  })

  // Создаем курсы валют (1 USD = 450 KZT приблизительно)
  const solAsset = await prisma.asset.findUnique({ where: { symbol: 'SOL' } })
  const tngAsset = await prisma.asset.findUnique({ where: { symbol: 'TNG' } })
  const usdcAsset = await prisma.asset.findUnique({ where: { symbol: 'USDC' } })

  if (solAsset && tngAsset) {
    await prisma.rate.upsert({
      where: { 
        baseAssetId_quoteAssetId_timestamp: {
          baseAssetId: solAsset.id,
          quoteAssetId: tngAsset.id,
          timestamp: new Date()
        }
      },
      update: {},
      create: {
        baseAssetId: solAsset.id,
        quoteAssetId: tngAsset.id,
        rate: 44325, // 1 SOL ≈ 44,325 TNG (98.5 USD * 450 KZT)
        source: 'MANUAL',
        provider: 'Kazakhstan Central Bank',
        confidence: 0.95,
        timestamp: new Date()
      }
    })
  }
}

async function createCoursesAndLessons() {
  console.log('📚 Creating Kazakhstan blockchain courses...')

  // Курс 1: Основы блокчейна в Казахстане
  const blockchainBasics = await prisma.course.create({
    data: {
      id: 'course-blockchain-kz-basics',
      title: 'Основы блокчейна в Казахстане',
      description: 'Изучите основы блокчейн технологий и их применение в Республике Казахстан. Узнайте о регулировании криптовалют, цифровых тенге и перспективах развития финтеха в стране.',
      shortDescription: 'Блокчейн технологии в контексте Казахстана',
      category: 'BLOCKCHAIN',
      level: 'BEGINNER',
      duration: 180,
      estimatedTime: 180,
      totalRewardTokens: 1000,
      certificateAvailable: true,
      coverImage: '/courses/kz-blockchain-basics.jpg',
      learningObjectives: [
        'Понимание основ блокчейн технологий',
        'Знание регулирования крипто в Казахстане',
        'Умение использовать цифровые кошельки',
        'Понимание DeFi и его применения'
      ],
      prerequisites: ['Базовые знания интернета', 'Умение пользоваться мобильными приложениями'],
      isActive: true,
      isFeatured: true,
      isPopular: true,
      studentsCount: 245,
      rating: 4.7,
      createdBy: 'system'
    }
  })

  // Уроки для курса основ блокчейна
  const lessons1 = [
    {
      title: 'Введение в блокчейн и Казахстан',
      description: 'История развития блокчейн технологий в мире и Казахстане. Государственные инициативы и стратегия цифровизации.',
      type: 'VIDEO',
      order: 1,
      duration: 25,
      content: `# Блокчейн в Казахстане
      
Республика Казахстан активно развивает цифровые технологии в рамках программы "Цифровой Казахстан".

## Ключевые инициативы:
- Цифровой тенге (CBDC) - цифровая валюта Национального Банка
- Регулирование криптовалют и майнинга
- Развитие финтех сектора
- Blockchain-based электронное правительство

## Нормативная база:
- Закон "О платежах и платежных системах"
- Постановления НБРК о цифровых активах
- Налоговое регулирование крипто операций`,
      xpReward: 50,
      tokenReward: 100
    },
    {
      title: 'Цифровой тенге и CBDC',
      description: 'Проект цифрового тенге Национального банка Казахстана. Отличия от криптовалют и перспективы внедрения.',
      type: 'VIDEO',
      order: 2,
      duration: 30,
      content: `# Цифровой тенге (Digital Tenge)
      
Национальный банк Казахстана разрабатывает цифровую валюту центрального банка (CBDC).

## Особенности цифрового тенге:
- Полностью контролируется НБРК
- Обеспечен государственными гарантиями
- Работает на централизованной blockchain платформе
- Интеграция с банковской системой страны

## Преимущества:
- Мгновенные переводы 24/7
- Низкие комиссии
- Прозрачность операций
- Безопасность и надежность`,
      xpReward: 75,
      tokenReward: 150
    },
    {
      title: 'Регулирование криптовалют в РК',
      description: 'Актуальное законодательство Казахстана по криптовалютам, майнингу и цифровым активам.',
      type: 'TEXT',
      order: 3,
      duration: 20,
      content: `# Криптовалютное регулирование в Казахстане
      
## Текущий статус:
- Криптовалюты НЕ являются законным средством платежа
- Разрешены операции с крипто как с цифровыми активами
- Майнинг легализован с 2020 года
- Налогообложение операций с крипто

## Лицензирование:
- Обменники должны получать лицензии АФРК
- Майнинг фермы регистрируются в Минэнерго
- Криптокошельки не подлежат лицензированию

## Налоги:
- ИПН с операций продажи крипто
- КПН для юридических лиц
- Освобождение от НДС`,
      xpReward: 60,
      tokenReward: 120
    }
  ]

  for (const [index, lessonData] of lessons1.entries()) {
    await prisma.lesson.create({
      data: {
        courseId: blockchainBasics.id,
        ...lessonData,
        order: index + 1
      }
    })
  }

  // Курс 2: DeFi и финтех в Казахстане  
  const defiKazakhstan = await prisma.course.create({
    data: {
      id: 'course-defi-kz',
      title: 'DeFi и финтех в Казахстане',
      description: 'Децентрализованные финансы (DeFi) в контексте казахстанского финансового рынка. Изучите возможности заработка, стейкинга и кредитования в крипто экосистеме.',
      shortDescription: 'DeFi протоколы и финтех решения для Казахстана',
      category: 'DEFI',
      level: 'INTERMEDIATE',
      duration: 240,
      estimatedTime: 240,
      totalRewardTokens: 1500,
      certificateAvailable: true,
      coverImage: '/courses/kz-defi.jpg',
      learningObjectives: [
        'Понимание DeFi протоколов',
        'Навыки стейкинга и фарминга',
        'Управление рисками в DeFi',
        'Интеграция с традиционным банкингом'
      ],
      prerequisites: ['Знание основ блокчейна', 'Опыт работы с кошельками'],
      isActive: true,
      isFeatured: true,
      studentsCount: 156,
      rating: 4.5,
      createdBy: 'system'
    }
  })

  // Курс 3: NFT и цифровое искусство Казахстана
  const nftKazakhstan = await prisma.course.create({
    data: {
      id: 'course-nft-kz-art',
      title: 'NFT и цифровое искусство Казахстана',
      description: 'Создание, продажа и коллекционирование NFT с казахстанской тематикой. Изучите культурное наследие через призму blockchain технологий.',
      shortDescription: 'NFT маркетплейсы и цифровое искусство Казахстана',
      category: 'NFT',
      level: 'BEGINNER',
      duration: 150,
      estimatedTime: 150,
      totalRewardTokens: 800,
      certificateAvailable: true,
      coverImage: '/courses/kz-nft-art.jpg',
      learningObjectives: [
        'Создание NFT коллекций',
        'Понимание авторских прав',
        'Маркетинг NFT проектов',
        'Сохранение культурного наследия'
      ],
      prerequisites: ['Креативные навыки', 'Базовые знания блокчейна'],
      isActive: true,
      studentsCount: 89,
      rating: 4.3,
      createdBy: 'system'
    }
  })

  console.log('✅ Created Kazakhstan courses and lessons')
}

async function createNFTCollections() {
  console.log('🎨 Creating Kazakhstan NFT collections...')

  // Создаем системного пользователя для NFT
  const systemUser = await prisma.user.upsert({
    where: { telegramId: BigInt(1) },
    update: {},
    create: {
      telegramId: BigInt(1),
      username: 'system',
      firstName: 'System',
      lastName: 'Creator',
      languageCode: 'ru',
      isPremium: true
    }
  })

  // Коллекция 1: Казахстанские достопримечательности
  const landmarksCollection = await prisma.nFTCollection.create({
    data: {
      name: 'Достопримечательности Казахстана',
      description: 'Цифровая коллекция знаковых мест и архитектурных памятников Республики Казахстан',
      slug: 'kazakhstan-landmarks',
      imageUri: '/nft/collections/kz-landmarks.jpg',
      bannerUri: '/nft/collections/kz-landmarks-banner.jpg',
      creatorId: systemUser.id,
      isVerified: true,
      totalSupply: 20,
      floorPrice: BigInt(500000000000) // 500 TNG
    }
  })

  // NFT предметы для коллекции достопримечательностей
  const landmarks = [
    { name: 'Байтерек', description: 'Символ современного Нур-Султана', price: BigInt(1000000000000) },
    { name: 'Хан Шатыр', description: 'Крупнейший шатер в мире', price: BigInt(800000000000) },
    { name: 'Мавзолей Ходжи Ахмеда Ясауи', description: 'Жемчужина Туркестана', price: BigInt(1200000000000) },
    { name: 'Чарынский каньон', description: 'Казахстанский Гранд Каньон', price: BigInt(900000000000) },
    { name: 'Озеро Балхаш', description: 'Уникальное полупресноводное озеро', price: BigInt(700000000000) }
  ]

  for (const landmark of landmarks) {
    await prisma.nFT.create({
      data: {
        name: landmark.name,
        description: landmark.description,
        imageUri: `/nft/landmarks/${landmark.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        type: 'ART',
        status: 'FOR_SALE',
        collectionId: landmarksCollection.id,
        ownerId: systemUser.id,
        creatorId: systemUser.id,
        isForSale: true,
        price: landmark.price,
        currency: 'TNG'
      }
    })
  }

  // Коллекция 2: Казахстанские национальные символы
  const symbolsCollection = await prisma.nFTCollection.create({
    data: {
      name: 'Национальные символы Казахстана',
      description: 'Геральдика, орнаменты и традиционные символы казахского народа',
      slug: 'kazakhstan-symbols',
      imageUri: '/nft/collections/kz-symbols.jpg',
      bannerUri: '/nft/collections/kz-symbols-banner.jpg',
      creatorId: systemUser.id,
      isVerified: true,
      totalSupply: 15,
      floorPrice: BigInt(600000000000) // 600 TNG
    }
  })

  console.log('✅ Created Kazakhstan NFT collections')
}

async function createJobsAndVacancies() {
  console.log('💼 Creating Kazakhstan job opportunities...')

  const systemUser = await prisma.user.findUnique({ where: { telegramId: BigInt(1) } })

  if (!systemUser) return

  const jobs = [
    {
      title: 'Blockchain разработчик (Алматы)',
      description: 'Требуется опытный разработчик для создания DeFi протоколов на Solana. Удаленная работа с офисом в Алматы.',
      requirements: [
        'Опыт разработки на Rust/JavaScript',
        'Знание Solana/Anchor framework', 
        'Понимание DeFi протоколов',
        'Английский язык - средний уровень'
      ],
      skills: ['Rust', 'Solana', 'DeFi', 'Smart Contracts', 'JavaScript'],
      paymentAmount: BigInt(800000000000000), // 800,000 TNG (800k KZT)
      paymentToken: 'TNG',
      paymentType: 'FIXED' as const,
      category: 'DEVELOPMENT' as const,
      location: 'Алматы (гибрид)',
      estimatedTime: '3 месяца'
    },
    {
      title: 'Финтех аналитик (Нур-Султан)',
      description: 'Анализ криптовалютных рынков и подготовка отчетов для казахстанских инвесторов.',
      requirements: [
        'Высшее экономическое образование',
        'Опыт анализа финансовых рынков',
        'Знание основ блокчейна и DeFi',
        'Аналитическое мышление'
      ],
      skills: ['Financial Analysis', 'DeFi', 'Market Research', 'Excel', 'Python'],
      paymentAmount: BigInt(600000000000000), // 600,000 TNG
      paymentToken: 'TNG', 
      paymentType: 'FIXED' as const,
      category: 'CONSULTING' as const,
      location: 'Нур-Султан',
      estimatedTime: '2 месяца'
    },
    {
      title: 'NFT художник (Удаленно)',
      description: 'Создание арт коллекций с казахстанской тематикой для NFT маркетплейса.',
      requirements: [
        'Портфолио цифрового искусства',
        'Знание казахской культуры и истории',
        'Навыки работы в Photoshop/Illustrator',
        'Понимание NFT трендов'
      ],
      skills: ['Digital Art', 'NFT Design', 'Photoshop', 'Cultural Knowledge'],
      paymentAmount: BigInt(400000000000000), // 400,000 TNG
      paymentToken: 'TNG',
      paymentType: 'MILESTONE' as const, 
      category: 'DESIGN' as const,
      location: 'Удаленная работа',
      estimatedTime: '6 недель'
    },
    {
      title: 'Криптовалютный маркетолог (Шымкент)',
      description: 'Продвижение blockchain проектов на казахстанском рынке. Работа с локальными сообществами.',
      requirements: [
        'Опыт в digital marketing',
        'Понимание криптовалютного рынка',
        'Знание казахского и русского языков',
        'Навыки работы с социальными сетями'
      ],
      skills: ['Marketing', 'Social Media', 'Crypto', 'Community Management'],
      paymentAmount: BigInt(500000000000000), // 500,000 TNG
      paymentToken: 'TNG',
      paymentType: 'FIXED' as const,
      category: 'MARKETING' as const,
      location: 'Шымкент',
      estimatedTime: '4 месяца'
    }
  ]

  for (const jobData of jobs) {
    await prisma.job.create({
      data: {
        ...jobData,
        userId: systemUser.id,
        status: 'OPEN'
      }
    })
  }

  console.log('✅ Created Kazakhstan job opportunities')
}

async function createDeFiPools() {
  console.log('🏦 Creating Kazakhstan DeFi pools...')

  // Стейкинг пулы с TNG
  const stakingPools = [
    {
      name: 'TNG Стейкинг Пул',
      description: 'Базовый стейкинг пул для TNG токенов с фиксированным APY',
      tokenMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      rewardMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      apy: 12.5, // 12.5% годовых
      minimumStake: BigInt(10000000000000), // 10,000 TNG
      lockupPeriod: 30, // 30 дней
      totalStaked: BigInt(5000000000000000), // 5,000,000 TNG
      maxCapacity: BigInt(50000000000000000), // 50,000,000 TNG
      isActive: true,
      isRecommended: true,
      riskLevel: 'LOW' as const
    },
    {
      name: 'TNG-SOL LP Стейкинг',
      description: 'Стейкинг LP токенов пары TNG-SOL с повышенным APY',
      tokenMint: 'LP_TNG_SOL_MOCK', // Мок адрес LP токена
      rewardMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      apy: 28.7, // 28.7% годовых за риск
      minimumStake: BigInt(1000000000000), // 1,000 TNG эквивалент
      lockupPeriod: 0, // Без блокировки
      totalStaked: BigInt(800000000000000), // 800,000 TNG эквивалент
      maxCapacity: BigInt(10000000000000000), // 10,000,000 TNG эквивалент
      isActive: true,
      isRecommended: false,
      riskLevel: 'MEDIUM' as const
    }
  ]

  for (const poolData of stakingPools) {
    await prisma.stakingPool.create({
      data: poolData
    })
  }

  // Lending пулы
  const lendingPools = [
    {
      name: 'TNG Lending Pool',
      symbol: 'lTNG',
      description: 'Пул для кредитования и заимствования TNG токенов',
      tokenMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      tokenSymbol: 'TNG',
      tokenDecimals: 9,
      totalSupply: BigInt(2000000000000000), // 2,000,000 TNG
      totalBorrowed: BigInt(400000000000000), // 400,000 TNG
      supplyApy: 8.5, // 8.5% для поставщиков ликвидности
      borrowApy: 12.0, // 12% для заемщиков
      utilizationRate: 20.0, // 20% утилизация
      ltv: 75.0, // 75% LTV
      liquidationThreshold: 85.0, // 85% порог ликвидации
      isActive: true,
      isPaused: false
    },
    {
      name: 'SOL Lending Pool',
      symbol: 'lSOL',
      description: 'Пул для кредитования и заимствования SOL',
      tokenMint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
      tokenSymbol: 'SOL',
      tokenDecimals: 9,
      totalSupply: BigInt(50000000000), // 50 SOL
      totalBorrowed: BigInt(15000000000), // 15 SOL
      supplyApy: 5.2, // 5.2% для поставщиков
      borrowApy: 8.8, // 8.8% для заемщиков
      utilizationRate: 30.0, // 30% утилизация
      ltv: 70.0, // 70% LTV
      liquidationThreshold: 80.0, // 80% порог ликвидации
      isActive: true,
      isPaused: false
    }
  ]

  for (const poolData of lendingPools) {
    await prisma.lendingPool.create({
      data: poolData
    })
  }

  // Farming пулы
  const farmingPools = [
    {
      name: 'TNG-SOL Farm',
      description: 'Фарминг пул для пары TNG-SOL с высоким APY',
      tokenAMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
      tokenBMint: 'So11111111111111111111111111111111111111112',
      lpTokenMint: 'LP_TNG_SOL_MOCK',
      apy: 45.8, // 45.8% APY
      tvl: BigInt(1500000000000000), // 1.5M TNG эквивалент
      volume24h: BigInt(75000000000000), // 75K TNG объем за 24ч
      fees24h: BigInt(187500000000), // 187.5 TNG комиссий за 24ч
      feePercent: 0.25, // 0.25% комиссия
      isActive: true,
      isStable: false,
      riskLevel: 'MEDIUM' as const
    }
  ]

  for (const poolData of farmingPools) {
    await prisma.farmingPool.create({
      data: poolData
    })
  }

  console.log('✅ Created Kazakhstan DeFi pools')
}

async function createAchievementsAndBadges() {
  console.log('🏆 Creating Kazakhstan achievements and badges...')

  const systemUser = await prisma.user.findUnique({ where: { telegramId: BigInt(1) } })
  if (!systemUser) return

  // Создаем достижения
  const achievements = [
    {
      title: 'Первые шаги в блокчейне',
      description: 'Завершили первый курс по блокчейн технологиям',
      iconUrl: '/achievements/first-steps.png',
      category: 'LEARNING' as const,
      rarity: 'COMMON' as const,
      maxProgress: 1,
      xpReward: 100,
      tokenReward: 500
    },
    {
      title: 'Знаток криптовалют Казахстана',
      description: 'Изучили регулирование криптовалют в РК',
      iconUrl: '/achievements/crypto-expert-kz.png',
      category: 'COMPLETION' as const,
      rarity: 'UNCOMMON' as const,
      maxProgress: 1,
      xpReward: 250,
      tokenReward: 1000
    },
    {
      title: 'DeFi энтузиаст',
      description: 'Освоили все DeFi протоколы платформы',
      iconUrl: '/achievements/defi-enthusiast.png',
      category: 'COMPLETION' as const,
      rarity: 'RARE' as const,
      maxProgress: 1,
      xpReward: 500,
      tokenReward: 2500
    },
    {
      title: 'NFT коллекционер',
      description: 'Собрали 10 NFT из казахстанских коллекций',
      iconUrl: '/achievements/nft-collector.png',
      category: 'SOCIAL' as const,
      rarity: 'UNCOMMON' as const,
      maxProgress: 10,
      xpReward: 300,
      tokenReward: 1500
    },
    {
      title: 'Стейкинг мастер',
      description: 'Застейкали более 100,000 TNG токенов',
      iconUrl: '/achievements/staking-master.png',
      category: 'COMPLETION' as const,
      rarity: 'EPIC' as const,
      maxProgress: 1,
      xpReward: 1000,
      tokenReward: 5000
    }
  ]

  for (const achievement of achievements) {
    await prisma.achievement.create({
      data: {
        ...achievement,
        userId: systemUser.id
      }
    })
  }

  // Создаем значки
  const badges = [
    {
      title: 'Новичок',
      description: 'Завершили регистрацию и создали кошелек',
      imageUrl: '/badges/newcomer.png',
      category: 'COMPLETION' as const,
      rarity: 'COMMON' as const,
      maxProgress: 1,
      progress: 1,
      xpReward: 50,
      tokenReward: 100
    },
    {
      title: 'Студент недели',
      description: 'Изучали курсы 7 дней подряд',
      imageUrl: '/badges/student-of-week.png',
      category: 'STREAK' as const,
      rarity: 'UNCOMMON' as const,
      maxProgress: 7,
      progress: 7,
      xpReward: 200,
      tokenReward: 750
    },
    {
      title: 'Казахстанский патриот',
      description: 'Завершили все курсы о Казахстане',
      imageUrl: '/badges/kz-patriot.png',
      category: 'SPECIAL' as const,
      rarity: 'RARE' as const,
      maxProgress: 1,
      progress: 1,
      xpReward: 400,
      tokenReward: 2000
    }
  ]

  for (const badge of badges) {
    await prisma.badge.create({
      data: {
        ...badge,
        userId: systemUser.id
      }
    })
  }

  console.log('✅ Created Kazakhstan achievements and badges')
}

async function createTestUsers() {
  console.log('👥 Creating test users...')

  const testUsers = [
    {
      telegramId: BigInt(12345001),
      username: 'aidar_almaty',
      firstName: 'Айдар',
      lastName: 'Токтаров',
      languageCode: 'kk',
      isPremium: false
    },
    {
      telegramId: BigInt(12345002),
      username: 'dana_astana',
      firstName: 'Дана',
      lastName: 'Нурсултанова', 
      languageCode: 'ru',
      isPremium: true
    },
    {
      telegramId: BigInt(12345003),
      username: 'arman_shymkent',
      firstName: 'Арман',
      lastName: 'Казыбеков',
      languageCode: 'ru',
      isPremium: false
    }
  ]

  for (const userData of testUsers) {
    await prisma.user.create({
      data: userData
    })
  }

  console.log('✅ Created test users')
}

async function createDAOProposals() {
  console.log('🗳️ Creating Kazakhstan DAO proposals...')

  const systemUser = await prisma.user.findUnique({ where: { telegramId: BigInt(1) } })
  if (!systemUser) return

  const proposals = [
    {
      title: 'Развитие DeFi в Казахстане',
      description: 'Предлагаем выделить средства из казны DAO на развитие DeFi протоколов в Казахстане. Планируется создание новых продуктов для местного рынка.',
      type: 'TREASURY' as const,
      votingStartsAt: new Date(),
      votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      quorumRequired: BigInt(100000000000000), // 100,000 TNG
      status: 'ACTIVE' as const,
      creatorId: systemUser.id
    },
    {
      title: 'Партнерство с казахстанскими банками',
      description: 'Инициатива по установлению партнерских отношений с местными банками для интеграции blockchain решений.',
      type: 'GOVERNANCE' as const,
      votingStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
      votingEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 дней
      quorumRequired: BigInt(150000000000000), // 150,000 TNG
      status: 'DRAFT' as const,
      creatorId: systemUser.id
    }
  ]

  for (const proposalData of proposals) {
    await prisma.dAOProposal.create({
      data: proposalData
    })
  }

  console.log('✅ Created Kazakhstan DAO proposals')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
