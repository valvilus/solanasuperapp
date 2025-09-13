/**
 * Learn Content Seeder - Заполнение базы данных контентом курсов Solana
 * Solana SuperApp Learn-to-Earn System
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedLearnContent() {
  console.log(' Seeding learn content...')

  try {
    // 1. Создаем курс "Основы Solana Blockchain"
    const solanaBasicsCourse = await prisma.course.create({
      data: {
        title: 'Основы Solana Blockchain',
        description: 'Полный курс для изучения экосистемы Solana с нуля. Узнайте о принципах работы блокчейна, токенах, транзакциях и создании dApps.',
        shortDescription: 'Изучите основы Solana и начните работу с блокчейном',
        coverImage: '',
        category: 'BLOCKCHAIN',
        level: 'BEGINNER',
        duration: 480, // 8 часов
        lessonsCount: 6,
        learningObjectives: [
          'Понимать архитектуру Solana',
          'Создавать и отправлять транзакции',
          'Работать с SPL токенами',
          'Основы Anchor framework'
        ],
        prerequisites: [],
        totalRewardTokens: 500,
        certificateAvailable: true,
        difficultyScore: 3,
        estimatedTime: 480,
        isPopular: true,
        isFeatured: true,
        createdBy: 'system'
      }
    })

    // Создаем уроки для курса "Основы Solana"
    const lessons = [
      {
        title: 'Введение в Solana',
        description: 'Обзор экосистемы Solana и основных концепций',
        type: 'TEXT',
        content: `# Введение в Solana Blockchain

Добро пожаловать в мир Solana! В этом уроке мы изучим:

## Что такое Solana?
Solana - это высокопроизводительный блокчейн, способный обрабатывать тысячи транзакций в секунду.

## Ключевые особенности:
- **Proof of History (PoH)** - уникальный консенсус-механизм
- **Низкие комиссии** - менее $0.01 за транзакцию  
- **Быстрая обработка** - 400ms время блока
- **Масштабируемость** - до 65,000 TPS

## Экосистема Solana
- DeFi протоколы (Jupiter, Raydium)
- NFT маркетплейсы (Magic Eden)
- Web3 приложения
- GameFi проекты

В следующих уроках мы углубимся в практическое использование этих концепций.`,
        order: 1,
        duration: 15,
        xpReward: 50,
        tokenReward: 50
      },
      {
        title: 'Кошельки и транзакции',
        description: 'Как работать с кошельками Solana и отправлять транзакции',
        type: 'TEXT',
        content: `# Кошельки и транзакции в Solana

## Типы кошельков
1. **Phantom** - самый популярный браузерный кошелек
2. **Solflare** - мощный кошелек с множеством функций
3. **Ledger** - аппаратный кошелек для безопасности

## Создание транзакции
\`\`\`javascript
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const transaction = new Transaction();
\`\`\`

## Структура адресов
Адреса в Solana - это 32-байтовые публичные ключи в кодировке base58.

## Отправка SOL
Для отправки SOL используется SystemProgram:
\`\`\`javascript
import { SystemProgram } from '@solana/web3.js';

const transferInstruction = SystemProgram.transfer({
  fromPubkey: sender,
  toPubkey: recipient,
  lamports: amount
});
\`\`\``,
        order: 2,
        duration: 25,
        xpReward: 75,
        tokenReward: 75
      },
      {
        title: 'SPL токены',
        description: 'Работа с SPL токенами - стандартом токенов Solana',
        type: 'TEXT',
        content: `# SPL Токены в Solana

## Что такое SPL токены?
SPL (Solana Program Library) - стандарт токенов в экосистеме Solana, аналог ERC-20 в Ethereum.

## Основные концепции:
- **Mint** - "чеканка", контракт токена
- **Token Account** - аккаунт для хранения токенов
- **Associated Token Account** - стандартный адрес токен-аккаунта

## Создание токена
\`\`\`javascript
import { createMint } from '@solana/spl-token';

const mint = await createMint(
  connection,
  payer,
  mintAuthority,
  freezeAuthority,
  decimals
);
\`\`\`

## Перевод токенов
\`\`\`javascript
import { transfer } from '@solana/spl-token';

await transfer(
  connection,
  payer,
  source,
  destination,
  owner,
  amount
);
\`\`\`

## Популярные SPL токены:
- USDC - стейблкоин
- RAY - токен Raydium DEX
- SRM - токен Serum DEX`,
        order: 3,
        duration: 30,
        xpReward: 100,
        tokenReward: 100
      },
      {
        title: 'DeFi на Solana',
        description: 'Введение в децентрализованные финансы на Solana',
        type: 'TEXT',
        content: `# DeFi на Solana

## Что такое DeFi?
Децентрализованные финансы (DeFi) - финансовые услуги без посредников.

## Основные DeFi протоколы на Solana:

### Jupiter
- Агрегатор DEX
- Лучшие цены обмена
- Поддержка множества токенов

### Raydium
- Автоматизированный маркет-мейкер (AMM)
- Пулы ликвидности
- Фарминг и стейкинг

### Marinade
- Жидкий стейкинг SOL
- Получение mSOL токенов
- Дополнительная доходность

## Риски DeFi:
- Impermanent Loss
- Смарт-контракт риски
- Волатильность токенов

## Стратегии:
1. **HODL** - долгосрочное удержание
2. **Yield Farming** - фарминг доходности
3. **Liquidity Providing** - предоставление ликвидности`,
        order: 4,
        duration: 35,
        xpReward: 125,
        tokenReward: 125
      },
      {
        title: 'NFT на Solana',
        description: 'Создание, покупка и продажа NFT в экосистеме Solana',
        type: 'TEXT',
        content: `# NFT на Solana

## Что такое NFT?
Non-Fungible Token - уникальный цифровой актив, подтверждающий право собственности.

## Metaplex - стандарт NFT на Solana
Metaplex предоставляет инструменты для создания и управления NFT.

## Создание NFT коллекции
\`\`\`javascript
import { Metaplex } from '@metaplex-foundation/js';

const metaplex = Metaplex.make(connection);

const { nft } = await metaplex.nfts().create({
  name: "My NFT",
  description: "Description",
  image: "https://example.com/image.png",
});
\`\`\`

## Популярные NFT маркетплейсы:
- **Magic Eden** - крупнейший маркетплейс
- **OpenSea** - поддерживает Solana NFT
- **Solanart** - специализированный маркетплейс

## Типы NFT проектов:
1. **Art Collections** - художественные коллекции
2. **Gaming NFTs** - игровые предметы
3. **Utility NFTs** - NFT с функциональностью
4. **Music NFTs** - музыкальные произведения

## Royalties
Создатели получают процент с каждой перепродажи (обычно 5-10%).`,
        order: 5,
        duration: 40,
        xpReward: 150,
        tokenReward: 150
      },
      {
        title: 'Безопасность в Web3',
        description: 'Защита активов и безопасные практики в Web3',
        type: 'TEXT',
        content: `# Безопасность в Web3

## Основные угрозы:

### Фишинг
- Поддельные сайты
- Подозрительные ссылки
- Fake аккаунты в социальных сетях

### Скам проекты
- Rug pulls - исчезновение создателей
- Honeypot контракты
- Поддельные токены

## Правила безопасности:

### 1. Защита приватных ключей
- Никогда не делитесь seed фразой
- Используйте hardware кошельки
- Создавайте резервные копии

### 2. Проверка транзакций
- Внимательно читайте детали
- Проверяйте адреса получателей
- Используйте небольшие суммы для тестов

### 3. Исследование проектов
- Проверяйте команду проекта
- Читайте whitepaper
- Смотрите аудиты смарт-контрактов

## Инструменты безопасности:
- **Rugcheck.xyz** - проверка токенов
- **Solscan.io** - исследование транзакций
- **DeFiSafety** - рейтинги протоколов

## Что делать при взломе:
1. Немедленно переведите активы в безопасный кошелек
2. Отзовите все разрешения (approvals)
3. Смените все пароли и ключи`,
        order: 6,
        duration: 20,
        xpReward: 100,
        tokenReward: 100
      }
    ]

    // Создаем уроки
    for (const lessonData of lessons) {
      await prisma.lesson.create({
        data: {
          ...lessonData,
          courseId: solanaBasicsCourse.id,
          type: lessonData.type as any
        }
      })
    }

    // Создаем квизы для курса
    const quiz1 = await prisma.quiz.create({
      data: {
        courseId: solanaBasicsCourse.id,
        title: 'Тест: Основы Solana',
        description: 'Проверьте свои знания об основах Solana',
        type: 'MULTIPLE_CHOICE',
        timeLimit: 300,
        attemptsAllowed: 3,
        passingScore: 70,
        xpReward: 100,
        tokenReward: 50
      }
    })

    // Создаем вопросы для квиза
    const questions = [
      {
        question: 'Какой консенсус-механизм использует Solana?',
        correctAnswer: 'c',
        explanation: 'Solana использует уникальный механизм Proof of History (PoH) для достижения высокой производительности.',
        points: 25,
        order: 1,
        options: [
          { id: 'a', text: 'Proof of Work', isCorrect: false },
          { id: 'b', text: 'Proof of Stake', isCorrect: false },
          { id: 'c', text: 'Proof of History', isCorrect: true },
          { id: 'd', text: 'Proof of Authority', isCorrect: false }
        ]
      },
      {
        question: 'Какая максимальная пропускная способность Solana?',
        correctAnswer: 'd',
        explanation: 'Solana может обрабатывать до 65,000 транзакций в секунду.',
        points: 25,
        order: 2,
        options: [
          { id: 'a', text: '7 TPS', isCorrect: false },
          { id: 'b', text: '2,000 TPS', isCorrect: false },
          { id: 'c', text: '15,000 TPS', isCorrect: false },
          { id: 'd', text: '65,000 TPS', isCorrect: true }
        ]
      },
      {
        question: 'Что такое SPL токены?',
        correctAnswer: 'b',
        explanation: 'SPL (Solana Program Library) - это стандарт токенов в экосистеме Solana.',
        points: 25,
        order: 3,
        options: [
          { id: 'a', text: 'Тип кошелька Solana', isCorrect: false },
          { id: 'b', text: 'Стандарт токенов Solana', isCorrect: true },
          { id: 'c', text: 'Протокол DeFi', isCorrect: false },
          { id: 'd', text: 'NFT маркетплейс', isCorrect: false }
        ]
      },
      {
        question: 'Какой самый популярный кошелек для Solana?',
        correctAnswer: 'a',
        explanation: 'Phantom является самым популярным браузерным кошельком для Solana.',
        points: 25,
        order: 4,
        options: [
          { id: 'a', text: 'Phantom', isCorrect: true },
          { id: 'b', text: 'MetaMask', isCorrect: false },
          { id: 'c', text: 'Trust Wallet', isCorrect: false },
          { id: 'd', text: 'Coinbase Wallet', isCorrect: false }
        ]
      }
    ]

    for (const questionData of questions) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz1.id,
          question: questionData.question,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          points: questionData.points,
          order: questionData.order,
          options: questionData.options,
          type: 'MULTIPLE_CHOICE'
        }
      })
    }

    // 2. Создаем курс "DeFi на Solana"
    const defiCourse = await prisma.course.create({
      data: {
        title: 'DeFi на Solana: Jupiter и DEX',
        description: 'Углубленное изучение DeFi протоколов на Solana. Научитесь торговать на DEX, использовать Jupiter агрегатор и зарабатывать в yield farming.',
        shortDescription: 'Мастер-класс по DeFi торговле и yield farming',
        coverImage: '',
        category: 'DEFI',
        level: 'INTERMEDIATE',
        duration: 360, // 6 часов
        lessonsCount: 4,
        learningObjectives: [
          'Торговать на Jupiter DEX',
          'Понимать AMM алгоритмы',
          'Участвовать в liquidity mining',
          'Анализировать DeFi риски'
        ],
        prerequisites: [solanaBasicsCourse.id],
        totalRewardTokens: 750,
        certificateAvailable: true,
        difficultyScore: 6,
        estimatedTime: 360,
        isPopular: true,
        isFeatured: true,
        createdBy: 'system'
      }
    })

    // Создаем уроки для DeFi курса
    const defiLessons = [
      {
        title: 'Jupiter DEX Aggregator',
        description: 'Как использовать Jupiter для получения лучших цен',
        type: 'TEXT',
        content: `# Jupiter DEX Aggregator

## Что такое Jupiter?
Jupiter - это агрегатор DEX, который находит лучшие цены для обмена токенов.

## Преимущества:
- Лучшие цены обмена
- Низкие проскальзывания
- Поддержка множества DEX

## Как пользоваться:
1. Подключите кошелек
2. Выберите токены для обмена
3. Сравните маршруты
4. Подтвердите транзакцию`,
        order: 1,
        duration: 45,
        xpReward: 100,
        tokenReward: 100
      },
      {
        title: 'Yield Farming',
        description: 'Стратегии заработка в DeFi протоколах',
        type: 'TEXT',
        content: `# Yield Farming на Solana

## Основы Yield Farming:
Yield Farming - предоставление ликвидности в обмен на вознаграждения.

## Популярные протоколы:
- Raydium - AMM и фарминг
- Orca - пулы ликвидности
- Marinade - жидкий стейкинг

## Стратегии:
1. Одиночный стейкинг
2. LP токены фарминг
3. Leveraged yield farming`,
        order: 2,
        duration: 60,
        xpReward: 150,
        tokenReward: 150
      },
      {
        title: 'Риски DeFi',
        description: 'Понимание и управление рисками в DeFi',
        type: 'TEXT',
        content: `# Риски в DeFi

## Основные риски:
1. **Impermanent Loss** - потери от изменения цен
2. **Smart Contract Risk** - уязвимости в коде
3. **Liquidity Risk** - риск нехватки ликвидности

## Управление рисками:
- Диверсификация портфеля
- Исследование протоколов
- Постепенное увеличение позиций`,
        order: 3,
        duration: 40,
        xpReward: 125,
        tokenReward: 125
      },
      {
        title: 'Продвинутые стратегии',
        description: 'Сложные стратегии для опытных пользователей',
        type: 'TEXT',
        content: `# Продвинутые DeFi стратегии

## Арбитраж:
Получение прибыли от разности цен на разных DEX.

## Delta Neutral стратегии:
Хеджирование позиций для минимизации рисков.

## Автоматизация:
Использование ботов для оптимизации стратегий.`,
        order: 4,
        duration: 55,
        xpReward: 175,
        tokenReward: 175
      }
    ]

    for (const lessonData of defiLessons) {
      await prisma.lesson.create({
        data: {
          ...lessonData,
          courseId: defiCourse.id,
          type: lessonData.type as any
        }
      })
    }

    // 3. Создаем курс "NFT на Solana"
    const nftCourse = await prisma.course.create({
      data: {
        title: 'NFT Создание и Маркетплейс',
        description: 'Пошаговое руководство по созданию, минтингу и продаже NFT на Solana. Изучите Metaplex, создайте свою коллекцию и запустите успешный проект.',
        shortDescription: 'Создайте и продайте свою первую NFT коллекцию',
        coverImage: '',
        category: 'NFT',
        level: 'INTERMEDIATE',
        duration: 420, // 7 часов
        lessonsCount: 5,
        learningObjectives: [
          'Создавать NFT с помощью Metaplex',
          'Настраивать royalties и metadata',
          'Запускать NFT коллекции',
          'Продавать на маркетплейсах'
        ],
        prerequisites: [solanaBasicsCourse.id],
        totalRewardTokens: 600,
        certificateAvailable: true,
        difficultyScore: 5,
        estimatedTime: 420,
        isNew: true,
        createdBy: 'system'
      }
    })

    console.log(' Learn content seeded successfully!')
    console.log(`Created courses:`)
    console.log(`- ${solanaBasicsCourse.title} (${solanaBasicsCourse.id})`)
    console.log(`- ${defiCourse.title} (${defiCourse.id})`)
    console.log(`- ${nftCourse.title} (${nftCourse.id})`)

  } catch (error) {
    console.error(' Error seeding learn content:', error)
    throw error
  }
}

// Запускаем сидер
seedLearnContent()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export { seedLearnContent }
