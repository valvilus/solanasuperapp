'use client'

import { 
  Course, 
  Lesson, 
  Quiz, 
  QuizQuestion,
  QuizOption,
  CourseReward,
  LessonReward,
  QuizReward,
  Resource 
} from '../types'

// =============================================================================
// SOLANA COURSE COMPLETE DATA
// =============================================================================

export const solanaCourseQuizzes: Quiz[] = [
  // Quiz 1: Основы Solana
  {
    id: 'quiz-solana-basics',
    lessonId: 'lesson-solana-intro',
    title: 'Квиз: Основы блокчейна Solana',
    description: 'Проверьте свои знания об архитектуре и принципах работы Solana',
    type: 'MULTIPLE_CHOICE',
    timeLimit: 300, // 5 минут
    attemptsAllowed: 3,
    passingScore: 70,
    isRandomized: true,
    attempts: [],
    isCompleted: false,
    rewards: [
      {
        id: 'quiz-reward-1',
        type: 'TNG_TOKENS',
        amount: 50,
        tokenSymbol: 'TNG',
        xpPoints: 100,
        minimumScore: 70,
        isUnlocked: false
      }
    ],
    questions: [
      {
        id: 'q1-1',
        quizId: 'quiz-solana-basics',
        type: 'MULTIPLE_CHOICE',
        question: 'Какой алгоритм консенсуса использует Solana?',
        explanation: 'Solana использует Proof of History (PoH) в сочетании с Proof of Stake для достижения высокой производительности.',
        points: 20,
        order: 1,
        options: [
          { id: 'o1-1', text: 'Proof of Work', isCorrect: false },
          { id: 'o1-2', text: 'Proof of History + Proof of Stake', isCorrect: true },
          { id: 'o1-3', text: 'Только Proof of Stake', isCorrect: false },
          { id: 'o1-4', text: 'Delegated Proof of Stake', isCorrect: false }
        ],
        correctAnswer: 'o1-2'
      },
      {
        id: 'q1-2',
        quizId: 'quiz-solana-basics',
        type: 'MULTIPLE_CHOICE',
        question: 'Какая скорость транзакций теоретически возможна в Solana?',
        explanation: 'Теоретически Solana может обрабатывать до 65,000 транзакций в секунду.',
        points: 20,
        order: 2,
        options: [
          { id: 'o2-1', text: '7 TPS', isCorrect: false },
          { id: 'o2-2', text: '2,000 TPS', isCorrect: false },
          { id: 'o2-3', text: '65,000 TPS', isCorrect: true },
          { id: 'o2-4', text: '1,000,000 TPS', isCorrect: false }
        ],
        correctAnswer: 'o2-3'
      },
      {
        id: 'q1-3',
        quizId: 'quiz-solana-basics',
        type: 'MULTIPLE_CHOICE',
        question: 'Что такое SOL?',
        explanation: 'SOL - это нативная криптовалюта блокчейна Solana, используемая для оплаты транзакций и стейкинга.',
        points: 15,
        order: 3,
        options: [
          { id: 'o3-1', text: 'Протокол смарт-контрактов', isCorrect: false },
          { id: 'o3-2', text: 'Нативная криптовалюта Solana', isCorrect: true },
          { id: 'o3-3', text: 'Алгоритм консенсуса', isCorrect: false },
          { id: 'o3-4', text: 'Кошелек для Solana', isCorrect: false }
        ],
        correctAnswer: 'o3-2'
      },
      {
        id: 'q1-4',
        quizId: 'quiz-solana-basics',
        type: 'TRUE_FALSE',
        question: 'Solana поддерживает смарт-контракты, написанные только на Rust?',
        explanation: 'Неверно. Хотя Rust является основным языком, Solana также поддерживает C и C++.',
        points: 15,
        order: 4,
        correctAnswer: false
      },
      {
        id: 'q1-5',
        quizId: 'quiz-solana-basics',
        type: 'MULTIPLE_CHOICE',
        question: 'Как называются смарт-контракты в экосистеме Solana?',
        explanation: 'В экосистеме Solana смарт-контракты называются "Programs" (программы).',
        points: 30,
        order: 5,
        options: [
          { id: 'o5-1', text: 'Smart Contracts', isCorrect: false },
          { id: 'o5-2', text: 'Programs', isCorrect: true },
          { id: 'o5-3', text: 'Validators', isCorrect: false },
          { id: 'o5-4', text: 'Accounts', isCorrect: false }
        ],
        correctAnswer: 'o5-2'
      }
    ],
    // Недостающие поля
    xpReward: 100,
    tokenReward: 50,
    isPassed: false,
    attemptsUsed: 0,
    bestScore: undefined,
    availableAttempts: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Quiz 2: SPL Токены
  {
    id: 'quiz-spl-tokens',
    lessonId: 'lesson-spl-tokens',
    title: 'Квиз: SPL Токены и стандарты',
    description: 'Проверьте знания о SPL токенах и стандартах Solana',
    type: 'MULTIPLE_CHOICE',
    timeLimit: 240,
    attemptsAllowed: 3,
    passingScore: 75,
    isRandomized: true,
    attempts: [],
    isCompleted: false,
    rewards: [
      {
        id: 'quiz-reward-2',
        type: 'TNG_TOKENS',
        amount: 75,
        tokenSymbol: 'TNG',
        xpPoints: 150,
        minimumScore: 75,
        isUnlocked: false
      }
    ],
    questions: [
      {
        id: 'q2-1',
        quizId: 'quiz-spl-tokens',
        type: 'MULTIPLE_CHOICE',
        question: 'Что означает SPL в контексте Solana?',
        explanation: 'SPL расшифровывается как Solana Program Library - библиотека стандартных программ.',
        points: 25,
        order: 1,
        options: [
          { id: 'o2-1-1', text: 'Solana Programming Language', isCorrect: false },
          { id: 'o2-1-2', text: 'Solana Program Library', isCorrect: true },
          { id: 'o2-1-3', text: 'Smart Program Logic', isCorrect: false },
          { id: 'o2-1-4', text: 'Staking Pool Library', isCorrect: false }
        ],
        correctAnswer: 'o2-1-2'
      },
      {
        id: 'q2-2',
        quizId: 'quiz-spl-tokens',
        type: 'MULTIPLE_CHOICE',
        question: 'Сколько десятичных знаков по умолчанию у SPL токена?',
        explanation: 'По умолчанию SPL токены имеют 9 десятичных знаков, как и SOL.',
        points: 20,
        order: 2,
        options: [
          { id: 'o2-2-1', text: '6', isCorrect: false },
          { id: 'o2-2-2', text: '8', isCorrect: false },
          { id: 'o2-2-3', text: '9', isCorrect: true },
          { id: 'o2-2-4', text: '18', isCorrect: false }
        ],
        correctAnswer: 'o2-2-3'
      },
      {
        id: 'q2-3',
        quizId: 'quiz-spl-tokens',
        type: 'TRUE_FALSE',
        question: 'Создание нового SPL токена требует много SOL для оплаты?',
        explanation: 'Неверно. Создание SPL токена стоит очень мало - примерно 0.00144 SOL.',
        points: 15,
        order: 3,
        correctAnswer: false
      },
      {
        id: 'q2-4',
        quizId: 'quiz-spl-tokens',
        type: 'MULTIPLE_CHOICE',
        question: 'Что такое Mint Account в контексте SPL токенов?',
        explanation: 'Mint Account содержит метаданные о токене и контролирует его эмиссию.',
        points: 40,
        order: 4,
        options: [
          { id: 'o2-4-1', text: 'Кошелек для хранения токенов', isCorrect: false },
          { id: 'o2-4-2', text: 'Аккаунт с метаданными токена', isCorrect: true },
          { id: 'o2-4-3', text: 'Программа для торговли', isCorrect: false },
          { id: 'o2-4-4', text: 'Валидатор сети', isCorrect: false }
        ],
        correctAnswer: 'o2-4-2'
      }
    ],
    // Недостающие поля
    xpReward: 80,
    tokenReward: 40,
    isPassed: false,
    attemptsUsed: 0,
    bestScore: undefined,
    availableAttempts: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Quiz 3: Программирование на Anchor
  ({
    id: 'quiz-anchor-programming',
    lessonId: 'lesson-anchor-intro',
    title: 'Квиз: Введение в Anchor Framework',
    description: 'Проверьте знания основ программирования с Anchor',
    type: 'MULTIPLE_CHOICE',
    timeLimit: 360,
    attemptsAllowed: 2,
    passingScore: 80,
    isRandomized: false,
    attempts: [],
    isCompleted: false,
    rewards: [
      {
        id: 'quiz-reward-3',
        type: 'TNG_TOKENS',
        amount: 100,
        tokenSymbol: 'TNG',
        xpPoints: 200,
        minimumScore: 80,
        isUnlocked: false
      }
    ],
    questions: [
      {
        id: 'q3-1',
        quizId: 'quiz-anchor-programming',
        type: 'MULTIPLE_CHOICE',
        question: 'Что такое Anchor Framework?',
        explanation: 'Anchor - это фреймворк для разработки Solana программ, упрощающий написание смарт-контрактов.',
        points: 20,
        order: 1,
        options: [
          { id: 'o3-1-1', text: 'Кошелек для Solana', isCorrect: false },
          { id: 'o3-1-2', text: 'Фреймворк для разработки программ', isCorrect: true },
          { id: 'o3-1-3', text: 'DeFi протокол', isCorrect: false },
          { id: 'o3-1-4', text: 'Алгоритм консенсуса', isCorrect: false }
        ],
        correctAnswer: 'o3-1-2'
      },
      {
        id: 'q3-2',
        quizId: 'quiz-anchor-programming',
        type: 'CODE_COMPLETION',
        question: 'Какая макрокоманда используется для определения программы в Anchor?',
        explanation: 'Макрос #[program] используется для определения модуля программы в Anchor.',
        points: 30,
        order: 2,
        codeTemplate: 'use anchor_lang::prelude::*;\n\n_____\nmod my_program {\n    use super::*;\n}',
        expectedOutput: '#[program]',
        correctAnswer: '#[program]'
      },
      {
        id: 'q3-3',
        quizId: 'quiz-anchor-programming',
        type: 'TRUE_FALSE',
        question: 'Anchor автоматически генерирует IDL (Interface Definition Language)?',
        explanation: 'Верно. Anchor автоматически генерирует IDL файлы для взаимодействия с программой.',
        points: 20,
        order: 3,
        correctAnswer: true
      },
      {
        id: 'q3-4',
        quizId: 'quiz-anchor-programming',
        type: 'MULTIPLE_CHOICE',
        question: 'Что означает атрибут #[derive(Accounts)] в Anchor?',
        explanation: 'Этот атрибут автоматически генерирует код для валидации и десериализации аккаунтов.',
        points: 30,
        order: 4,
        options: [
          { id: 'o3-4-1', text: 'Создает новые аккаунты', isCorrect: false },
          { id: 'o3-4-2', text: 'Валидирует и десериализует аккаунты', isCorrect: true },
          { id: 'o3-4-3', text: 'Удаляет аккаунты', isCorrect: false },
          { id: 'o3-4-4', text: 'Шифрует данные аккаунтов', isCorrect: false }
        ],
        correctAnswer: 'o3-4-2'
      }
    ],
    // Недостающие поля
    xpReward: 200,
    tokenReward: 100,
    isPassed: false,
    attemptsUsed: 0,
    bestScore: undefined,
    availableAttempts: 2
  }) as any
]

export const solanaCourseResources: Resource[] = [
  {
    id: 'resource-1',
    title: 'Официальная документация Solana',
    type: 'link',
    url: 'https://docs.solana.com/',
    description: 'Полная техническая документация по Solana'
  },
  {
    id: 'resource-2',
    title: 'Anchor Framework Documentation',
    type: 'link',
    url: 'https://www.anchor-lang.com/',
    description: 'Документация по фреймворку Anchor'
  },
  {
    id: 'resource-3',
    title: 'Solana Cookbook',
    type: 'link',
    url: 'https://solanacookbook.com/',
    description: 'Практические примеры кода для Solana'
  },
  {
    id: 'resource-4',
    title: 'SPL Token Program',
    type: 'link',
    url: 'https://spl.solana.com/token',
    description: 'Документация по SPL токенам'
  },
  {
    id: 'resource-5',
    title: 'Solana Explorer',
    type: 'tool',
    url: 'https://explorer.solana.com/',
    description: 'Исследователь блокчейна Solana'
  }
]

export const solanaCourseLessons = [
  // Урок 1: Введение в Solana
  {
    id: 'lesson-solana-intro',
    courseId: 'course-solana-complete',
    title: 'Введение в блокчейн Solana',
    description: 'Изучите основы архитектуры Solana, Proof of History и ключевые особенности этого высокопроизводительного блокчейна.',
    type: 'TEXT',
    order: 1,
    duration: 45,
    content: `# Добро пожаловать в мир Solana! 

## Что такое Solana?

Solana - это высокопроизводительный блокчейн, разработанный для децентрализованных приложений и криптовалют. Он известен своей невероятной скоростью обработки транзакций и низкими комиссиями.

## Ключевые особенности:

###  Высокая производительность
- До 65,000 транзакций в секунду
- Время блока: ~400ms
- Стоимость транзакции: ~$0.00025

###  Proof of History (PoH)
Уникальный алгоритм, который создает криптографическое доказательство времени между событиями:
- Устраняет необходимость в глобальной синхронизации времени
- Позволяет валидаторам обрабатывать транзакции параллельно
- Значительно увеличивает пропускную способность

###  SOL токен
Нативная криптовалюта с множественными функциями:
- Оплата комиссий за транзакции
- Стейкинг для обеспечения безопасности сети
- Участие в управлении протоколом

###  Экосистема разработки
- **Rust** как основной язык программирования
- **Anchor** фреймворк для упрощения разработки
- **SPL** (Solana Program Library) стандарты

## Архитектура Solana

### Кластеры
Solana состоит из нескольких кластеров:
- **Mainnet Beta** - основная сеть
- **Testnet** - тестовая сеть
- **Devnet** - сеть разработчиков

### Ключевые компоненты:
1. **Validators** - узлы, обрабатывающие транзакции
2. **RPC nodes** - узлы для взаимодействия с сетью
3. **Programs** - смарт-контракты Solana
4. **Accounts** - хранилища данных в сети

## Почему Solana особенная?

### Инновации в консенсусе:
- **Proof of History** + **Proof of Stake**
- **Turbine** - протокол распространения блоков
- **Gulf Stream** - протокол пересылки транзакций
- **Sealevel** - параллельное выполнение смарт-контрактов

### Экосистема DeFi:
- **Serum** - децентрализованная биржа
- **Raydium** - автоматизированный маркет-мейкер
- **Mango Markets** - маржинальная торговля

## Практическое задание

После изучения материала, вы сможете:
- Объяснить, что такое Proof of History
- Понимать архитектуру Solana
- Различать основные компоненты экосистемы
- Готовиться к изучению программирования на Solana

---

 **Совет**: Создайте аккаунт в Phantom или Solflare кошельке, чтобы начать взаимодействие с экосистемой Solana!`,
    isCompleted: false,
    isLocked: false,
    xpReward: 50,
    rewards: [
      {
        id: 'lesson-1-reward',
        type: 'TNG_TOKENS',
        amount: 25,
        tokenSymbol: 'TNG',
        xpPoints: 50,
        isUnlocked: false
      }
    ],
    resources: solanaCourseResources.slice(0, 2),
    // Недостающие поля
    tokenReward: 25,
    timeSpent: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Урок 2: SPL Токены
  {
    id: 'lesson-spl-tokens',
    courseId: 'course-solana-complete',
    title: 'SPL Токены: Стандарт токенов Solana',
    description: 'Узнайте все о SPL токенах, их создании, управлении и взаимодействии в экосистеме Solana.',
    type: 'INTERACTIVE',
    order: 2,
    duration: 60,
    content: `# SPL Токены - Сердце экосистемы Solana 

## Что такое SPL?

**SPL (Solana Program Library)** - это набор стандартных программ и библиотек для Solana, включая стандарт токенов.

## SPL Token Program

### Основные концепции:

####  Mint Account
- Содержит метаданные о токене
- Общее количество в обращении
- Количество десятичных знаков
- Права на эмиссию (mint authority)

####  Token Account
- Принадлежит определенному владельцу
- Хранит баланс конкретного токена
- Связан с определенным Mint Account

####  Associated Token Account (ATA)
- Стандартизованный адрес токен-аккаунта
- Один ATA на пару (владелец + токен)
- Автоматически вычисляемый адрес

## Создание SPL токена

### Шаг 1: Создание Mint Account
\`\`\`bash
spl-token create-token
# Создает новый mint account
# Стоимость: ~0.00144 SOL
\`\`\`

### Шаг 2: Создание Token Account
\`\`\`bash
spl-token create-account <TOKEN_MINT_ADDRESS>
# Создает account для хранения токенов
\`\`\`

### Шаг 3: Эмиссия токенов
\`\`\`bash
spl-token mint <TOKEN_MINT_ADDRESS> <AMOUNT>
# Создает новые токены
\`\`\`

## Взаимодействие с токенами

### Перевод токенов:
\`\`\`javascript
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'

// Получение ATA адресов
const fromATA = await getAssociatedTokenAddress(mint, fromWallet)
const toATA = await getAssociatedTokenAddress(mint, toWallet)

// Создание инструкции перевода
const transferInstruction = createTransferInstruction(
  fromATA,
  toATA,
  fromWallet,
  amount
)
\`\`\`

## Метаданные токенов

### Metaplex Token Metadata
Стандарт для расширенных метаданных:
- Название токена
- Символ
- Описание
- Изображение
- Внешние ссылки

### Пример структуры метаданных:
\`\`\`json
{
  "name": "Solana SuperApp Token",
  "symbol": "TNG",
  "description": "Токен для обучения и вознаграждений",
  "image": "https://example.com/token-image.png",
  "external_url": "https://solana-superapp.com",
  "attributes": [
    {
      "trait_type": "Utility",
      "value": "Learn-to-Earn"
    }
  ]
}
\`\`\`

## Популярные SPL токены

###  Стейблкоины:
- **USDC** - USD Coin
- **USDT** - Tether

###  Gaming & NFT:
- **ATLAS** - Star Atlas
- **SRM** - Serum

###  DeFi:
- **RAY** - Raydium
- **MNGO** - Mango Markets

## Безопасность SPL токенов

###  Важные моменты:
1. **Freeze Authority** - может заморозить токены
2. **Mint Authority** - может создавать новые токены
3. **Проверяйте официальные адреса** токенов
4. **Остерегайтесь поддельных** токенов

###  Лучшие практики:
- Используйте проверенные кошельки
- Проверяйте адреса через официальные источники
- Не взаимодействуйте с неизвестными токенами
- Используйте мультисиг для крупных сумм

## Практическое задание

Попробуйте:
1. Создать тестовый токен в devnet
2. Отправить токены между аккаунтами
3. Изучить метаданные популярных токенов
4. Исследовать токены через Solana Explorer

---

 **Следующий урок**: Мы изучим Anchor Framework для создания программ, работающих с SPL токенами!`,
    interactiveConfig: {
      type: 'simulation',
      config: {
        simulationType: 'spl_token_creation',
        steps: [
          'Создание Mint Account',
          'Настройка метаданных',
          'Создание Token Account',
          'Эмиссия токенов',
          'Тестовый перевод'
        ]
      }
    },
    isCompleted: false,
    isLocked: false,
    xpReward: 75,
    rewards: [
      {
        id: 'lesson-2-reward',
        type: 'TNG_TOKENS',
        amount: 40,
        tokenSymbol: 'TNG',
        xpPoints: 75,
        isUnlocked: false
      }
    ],
    resources: solanaCourseResources.filter(r => r.id === 'resource-4'),
    tokenReward: 30,
    timeSpent: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Урок 3: Anchor Framework
  {
    id: 'lesson-anchor-intro',
    courseId: 'course-solana-complete',
    title: 'Anchor Framework: Современная разработка на Solana',
    description: 'Изучите Anchor - самый популярный фреймворк для разработки Solana программ.',
    type: 'VIDEO',
    order: 3,
    duration: 90,
    videoUrl: 'https://example.com/anchor-intro-video',
    content: `# Anchor Framework - Инструмент разработчика 

## Что такое Anchor?

**Anchor** - это фреймворк для быстрой и безопасной разработки Solana программ. Он предоставляет:
-  Автоматическую валидацию безопасности
-  IDL генерацию
-  Упрощенное тестирование
-  Богатую экосистему макросов

## Установка и настройка

### Установка Anchor CLI:
\`\`\`bash
# Установка через Cargo
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Установка последней версии
avm install latest
avm use latest
\`\`\`

### Создание нового проекта:
\`\`\`bash
anchor init my-project
cd my-project
\`\`\`

## Структура Anchor проекта

\`\`\`
my-project/
 Anchor.toml          # Конфигурация проекта
 Cargo.toml           # Rust конфигурация
 programs/            # Программы Solana
    my-project/
        Cargo.toml
        src/
            lib.rs   # Основной код программы
 tests/               # TypeScript тесты
 migrations/          # Скрипты деплоя
 target/             # Скомпилированные артефакты
\`\`\`

## Основные концепции Anchor

###  Программа (Program)
\`\`\`rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Логика инициализации
        Ok(())
    }
}
\`\`\`

###  Аккаунты (Accounts)
\`\`\`rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 64)]
    pub data_account: Account<'info, DataAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
\`\`\`

###  Структуры данных
\`\`\`rust
#[account]
pub struct DataAccount {
    pub value: u64,
    pub authority: Pubkey,
}
\`\`\`

## Ключевые макросы Anchor

### #[program]
Определяет модуль с инструкциями программы:
\`\`\`rust
#[program]
pub mod my_program {
    // Инструкции программы
}
\`\`\`

### #[derive(Accounts)]
Автоматически генерирует код валидации аккаунтов:
\`\`\`rust
#[derive(Accounts)]
pub struct MyInstruction<'info> {
    // Определения аккаунтов
}
\`\`\`

### #[account]
Определяет структуру данных, хранящуюся в аккаунте:
\`\`\`rust
#[account]
pub struct MyData {
    pub field: u64,
}
\`\`\`

## Валидация аккаунтов

### Атрибуты валидации:
\`\`\`rust
#[derive(Accounts)]
pub struct UpdateData<'info> {
    // Инициализация нового аккаунта
    #[account(init, payer = authority, space = 8 + 32)]
    pub data: Account<'info, MyData>,
    
    // Мутабельный аккаунт с проверкой владельца
    #[account(mut, has_one = authority)]
    pub existing_data: Account<'info, MyData>,
    
    // Подписант транзакции
    #[account(mut)]
    pub authority: Signer<'info>,
    
    // Системная программа
    pub system_program: Program<'info, System>,
}
\`\`\`

## Обработка ошибок

### Кастомные ошибки:
\`\`\`rust
#[error_code]
pub enum MyError {
    #[msg("Недостаточно прав доступа")]
    Unauthorized,
    #[msg("Некорректное значение")]
    InvalidValue,
}
\`\`\`

### Использование:
\`\`\`rust
pub fn update_value(ctx: Context<UpdateData>, new_value: u64) -> Result<()> {
    if new_value > 100 {
        return Err(MyError::InvalidValue.into());
    }
    
    ctx.accounts.data.value = new_value;
    Ok(())
}
\`\`\`

## Тестирование с Anchor

### TypeScript тесты:
\`\`\`typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProject } from "../target/types/my_project";

describe("my-project", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MyProject as Program<MyProject>;

  it("Инициализация", async () => {
    await program.methods
      .initialize()
      .accounts({
        dataAccount: dataAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([dataAccount])
      .rpc();
  });
});
\`\`\`

## Деплой программы

### Сборка:
\`\`\`bash
anchor build
\`\`\`

### Деплой в devnet:
\`\`\`bash
anchor deploy --provider.cluster devnet
\`\`\`

### Генерация IDL:
\`\`\`bash
anchor idl init --provider.cluster devnet <PROGRAM_ID>
\`\`\`

## Лучшие практики

###  Безопасность:
1. Всегда валидируйте входные данные
2. Используйте проверки владельца
3. Ограничивайте права доступа
4. Тестируйте граничные случаи

###  Производительность:
1. Минимизируйте размер аккаунтов
2. Оптимизируйте количество CPI вызовов
3. Используйте zero-copy для больших структур
4. Группируйте связанные операции

###  Код:
1. Документируйте публичные методы
2. Используйте описательные имена
3. Разделяйте логику на модули
4. Покрывайте код тестами

---

 **Практическое задание**: Создайте простую программу счетчика с Anchor!`,
    isCompleted: false,
    isLocked: false,
    xpReward: 100,
    rewards: [
      {
        id: 'lesson-3-reward',
        type: 'TNG_TOKENS',
        amount: 60,
        tokenSymbol: 'TNG',
        xpPoints: 100,
        isUnlocked: false
      }
    ],
    resources: solanaCourseResources.filter(r => r.id === 'resource-2' || r.id === 'resource-3')
  },

  // Урок 4: DeFi на Solana
  {
    id: 'lesson-defi-basics',
    courseId: 'course-solana-complete',
    title: 'DeFi экосистема Solana',
    description: 'Изучите основные DeFi протоколы и возможности на Solana.',
    type: 'TEXT',
    order: 4,
    duration: 75,
    content: `# DeFi на Solana - Будущее финансов 

## Что такое DeFi на Solana?

**Децентрализованные финансы (DeFi)** на Solana - это экосистема финансовых протоколов, работающих без посредников, обеспечивающая:
-  Высокую скорость транзакций
-  Низкие комиссии
-  Мгновенные расчеты
-  Глобальную доступность

## Ключевые DeFi протоколы

###  DEX (Децентрализованные биржи)

#### Serum
- Первая полнофункциональная DEX на Solana
- Центральный ордербук
- Основа для многих других протоколов

#### Raydium
- AMM + ордербук Serum
- Yield farming
- Быстрые свопы

#### Orca
- Пользовательский AMM
- Концентрированная ликвидность
- Whirlpools технология

###  Lending протоколы

#### Solend
- Кредитование и заимствование
- Автоматизированное управление рисками
- Высокие APY

#### Mango Markets
- Маржинальная торговля
- Перпетуальные контракты
- Кросс-коллатерал

###  Стейблкоины

#### USDC
- Центральный стейблкоин
- Быстрые переводы
- DeFi интеграция

#### UXD Protocol
- Децентрализованный стейблкоин
- Delta-neutral позиции
- Алгоритмическая стабильность

## Yield Farming на Solana

### Стратегии получения дохода:

####  Liquidity Mining
1. Предоставьте ликвидность в пул
2. Получайте комиссии от торговли
3. Зарабатывайте токены протокола

####  Yield Farming
1. Стейкинг LP токенов
2. Компаундинг наград
3. Максимизация APY

####  Leveraged Farming
1. Занимайте активы
2. Увеличивайте позицию
3. Управляйте рисками

### Расчет доходности:
\`\`\`
APY = (Торговые комиссии + Reward токены) / Предоставленная ликвидность
\`\`\`

## Интеграция DeFi протоколов

### Использование Jupiter Aggregator:
\`\`\`javascript
import { Jupiter } from '@jup-ag/core'

// Инициализация Jupiter
const jupiter = await Jupiter.load({
  connection,
  cluster: 'mainnet-beta',
  user: wallet
})

// Поиск лучшего маршрута
const routeMap = jupiter.getRouteMap()
const routes = await jupiter.computeRoutes({
  inputMint: USDC_MINT,
  outputMint: SOL_MINT,
  amount: inputAmount,
  slippageBps: 50 // 0.5%
})

// Выполнение свопа
const { execute } = await jupiter.exchange({
  routeInfo: routes[0]
})
\`\`\`

### Работа с Raydium:
\`\`\`javascript
import { Liquidity } from '@raydium-io/raydium-sdk'

// Добавление ликвидности
const addLiquidityTransaction = await Liquidity.makeAddLiquidityInstruction({
  connection,
  poolKeys,
  userKeys,
  baseAmountIn,
  quoteAmountIn
})
\`\`\`

## Риски DeFi

###  Основные риски:

#### Smart Contract риски
- Баги в коде
- Не аудированные протоколы
- Апгрейды протокола

#### Ликвидные риски
- Импетерманентные потери
- Недостаток ликвидности
- Проскальзывание

#### Экономические риски
- Девальвация токенов
- Изменение доходности
- Корреляция активов

###  Управление рисками:

1. **Диверсификация** портфеля
2. **Исследование** протоколов
3. **Постепенное** увеличение позиций
4. **Мониторинг** изменений

## Популярные DeFi стратегии

###  Delta Neutral
- Хеджирование рыночного риска
- Фокус на yield'е
- Стабильный доход

###  Арбитраж
- Разности цен между биржами
- Автоматизированные боты
- Низкий риск

###  Active Management
- Ребалансировка портфеля
- Тактическое распределение
- Максимизация доходности

## Инструменты для DeFi

###  Аналитика:
- **DeFiLlama** - TVL трекинг
- **Jupiter** - агрегатор цен
- **Birdeye** - рыночные данные

###  Кошельки:
- **Phantom** - основной кошелек
- **Solflare** - расширенный функционал
- **Ledger** - аппаратная безопасность

###  Автоматизация:
- **Tulip Protocol** - yield optimization
- **Friktion** - options strategies
- **Symmetry** - index funds

## Будущее DeFi на Solana

###  Развивающиеся тренды:
- **Real World Assets (RWA)**
- **Cross-chain bridges**
- **Institutional DeFi**
- **Mobile-first solutions**

###  Инновации:
- **Compressed NFTs**
- **State compression**
- **Account abstraction**
- **Intent-based trading**

---

 **Практическое задание**: Попробуйте выполнить swap через Jupiter и добавить ликвидность в пул Orca!`,
    isCompleted: false,
    isLocked: false,
    xpReward: 90,
    rewards: [
      {
        id: 'lesson-4-reward',
        type: 'TNG_TOKENS',
        amount: 50,
        tokenSymbol: 'TNG',
        xpPoints: 90,
        isUnlocked: false
      }
    ],
    resources: solanaCourseResources.slice(2, 4),
    // Недостающие поля
    tokenReward: 25,
    timeSpent: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Урок 5: Безопасность
  {
    id: 'lesson-security',
    courseId: 'course-solana-complete',
    title: 'Безопасность в экосистеме Solana',
    description: 'Изучите лучшие практики безопасности для работы с Solana.',
    type: 'TEXT',
    order: 5,
    duration: 55,
    content: `# Безопасность в Solana - Защита ваших активов 

## Основы безопасности

###  Управление приватными ключами

#### Типы кошельков:
1. **Hardware кошельки** (Ledger, Trezor)
   - Максимальная безопасность
   - Офлайн хранение ключей
   - Подтверждение транзакций

2. **Software кошельки** (Phantom, Solflare)
   - Удобство использования
   - Быстрый доступ
   - Риски онлайн атак

3. **Paper кошельки**
   - Полная изоляция
   - Сложность использования
   - Риск потери

###  Основные угрозы

#### Фишинг атаки
- Поддельные сайты
- Фальшивые расширения
- Социальная инженерия

#### Вредоносные программы
- Кейлоггеры
- Скриншоттеры
- RAT (Remote Access Trojans)

#### Smart Contract уязвимости
- Reentrancy атаки
- Overflow/Underflow
- Логические ошибки

## Безопасная работа с кошельками

###  Лучшие практики:

#### Создание кошелька:
1. Используйте официальные источники
2. Генерируйте seed фразу офлайн
3. Записывайте на бумаге, не в цифровом виде
4. Делайте резервные копии

#### Хранение seed фразы:
-  В облаке или на компьютере
-  В фотографиях или скриншотах
-  На бумаге в безопасном месте
-  В металлических пластинах
-  В банковском сейфе

###  Защита от атак:

#### Проверка URL:
\`\`\`
 Правильно: phantom.app
 Фишинг: phantom-app.com, phant0m.app
\`\`\`

#### Проверка расширений:
- Устанавливайте только из официальных магазинов
- Проверяйте количество загрузок и отзывы
- Сверяйте с официальными ссылками

## Безопасность смарт-контрактов

###  Аудит программ

#### Что проверять:
1. **Официальные аудиты** от известных компаний
2. **Open source код** и его доступность
3. **Время работы** протокола в mainnet
4. **TVL и активность** пользователей

#### Известные аудиторские компании:
- **Kudelski Security**
- **Trail of Bits**
- **OtterSec**
- **Neodyme**

###  Распространенные уязвимости

#### Account Confusion:
\`\`\`rust
// Уязвимый код
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user: Signer<'info>,
    pub user_account: Account<'info, UserAccount>,
    // Отсутствует проверка владельца!
}

// Безопасный код
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user: Signer<'info>,
    #[account(has_one = user)] // Проверка владельца
    pub user_account: Account<'info, UserAccount>,
}
\`\`\`

#### Integer Overflow:
\`\`\`rust
// Уязвимый код
pub fn add_funds(ctx: Context<AddFunds>, amount: u64) -> Result<()> {
    ctx.accounts.user_account.balance += amount; // Может переполниться!
    Ok(())
}

// Безопасный код
pub fn add_funds(ctx: Context<AddFunds>, amount: u64) -> Result<()> {
    ctx.accounts.user_account.balance = ctx.accounts.user_account.balance
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    Ok(())
}
\`\`\`

## Безопасность DeFi

###  Проверка протоколов

#### Критерии оценки:
1. **Аудиты безопасности**
2. **Время работы** в mainnet
3. **Размер TVL** и стабильность
4. **Активность разработчиков**
5. **Качество документации**

#### Флаги опасности:
-  Обещания нереальной доходности
-  Анонимная команда
-  Отсутствие аудитов
-  Недавний запуск
-  Сложная токеномика

###  Управление рисками

#### Диверсификация:
- Не более 20% в одном протоколе
- Разные типы стратегий
- Различные временные горизонты

#### Постепенное увеличение:
1. Начните с небольших сумм
2. Изучите работу протокола
3. Постепенно увеличивайте позицию
4. Мониторьте изменения

## Защита от скамов

###  Типы мошенничества

#### Rug Pulls:
- Создатели исчезают с деньгами
- Ликвидность внезапно удаляется
- Невозможность продать токены

#### Pump and Dump:
- Искусственное повышение цены
- Координированная продажа
- Резкое падение цены

#### Fake Airdrops:
- Поддельные раздачи токенов
- Требуют подключения кошелька
- Кража средств через approval

###  Как защититься:

#### Исследование проектов:
1. Проверьте команду и ее историю
2. Изучите whitepaper и roadmap
3. Найдите независимые обзоры
4. Проверьте социальные сети

#### Проверка токенов:
\`\`\`javascript
// Проверка метаданных токена
const mintInfo = await getMint(connection, mintAddress)
console.log('Supply:', mintInfo.supply)
console.log('Decimals:', mintInfo.decimals)
console.log('Freeze Authority:', mintInfo.freezeAuthority)
console.log('Mint Authority:', mintInfo.mintAuthority)
\`\`\`

## Безопасные практики

###  Ежедневные привычки:

#### Перед каждой транзакцией:
1. Проверьте адрес получателя
2. Убедитесь в корректности суммы
3. Проверьте сеть (mainnet/testnet)
4. Изучите детали транзакции

#### Регулярные проверки:
- Мониторинг активности кошелька
- Проверка approvals для токенов
- Обновление программного обеспечения
- Резервное копирование

###  Экстренные меры:

#### При подозрении на компрометацию:
1. Немедленно переведите средства
2. Отзовите все approvals
3. Создайте новый кошелек
4. Проанализируйте, как произошла утечка

#### Отзыв approvals:
\`\`\`javascript
// Отзыв approval для SPL токена
const revokeInstruction = createRevokeInstruction(
  tokenAccount,
  owner
)
\`\`\`

## Инструменты безопасности

###  Полезные сервисы:

#### Проверка транзакций:
- **Solana Explorer** - официальный explorer
- **SolScan** - расширенная аналитика
- **XRAY** - анализ безопасности

#### Мониторинг кошелька:
- **Step Finance** - портфолио трекинг
- **DeBank** - мониторинг активности
- **Zapper** - анализ позиций

#### Анализ токенов:
- **RugCheck** - проверка на scam
- **Birdeye** - рыночные данные
- **CoinGecko** - информация о проектах

---

 **Помните**: Безопасность - это процесс, а не состояние. Будьте осторожны и всегда проверяйте дважды!`,
    isCompleted: false,
    isLocked: false,
    xpReward: 80,
    rewards: [
      {
        id: 'lesson-5-reward',
        type: 'TNG_TOKENS',
        amount: 45,
        tokenSymbol: 'TNG',
        xpPoints: 80,
        isUnlocked: false
      }
    ],
    resources: solanaCourseResources.slice(0, 1),
    // Недостающие поля
    tokenReward: 25,
    timeSpent: 0,
  }
] as any

// Основной курс по Solana
export const solanaCompleteCourse: Course = {
  id: 'course-solana-complete',
  title: 'Полный курс по блокчейну Solana',
  description: 'Комплексное изучение экосистемы Solana: от основ блокчейна до создания DApps. Изучите архитектуру, программирование на Anchor, DeFi протоколы и безопасность. Получайте TNG токены за каждый пройденный урок!',
  shortDescription: 'Станьте экспертом по Solana и зарабатывайте токены',
  coverImage: '',
  category: 'BLOCKCHAIN',
  level: 'BEGINNER',
  duration: 325, // Общая продолжительность всех уроков
  lessonsCount: solanaCourseLessons.length,
  studentsCount: 0,
  rating: 0,
  ratingCount: 0,
  
  isCompleted: false,
  isEnrolled: false,
  progressPercentage: 0,
  
  rewards: [
    {
      id: 'course-complete-reward',
      type: 'TNG_TOKENS',
      amount: 500,
      tokenSymbol: 'TNG',
      title: 'Эксперт Solana',
      description: '500 TNG за полное прохождение курса',
      imageUrl: '',
      isUnlocked: false
    },
    {
      id: 'course-certificate-reward',
      type: 'CERTIFICATE',
      certificateId: 'cert-solana-expert',
      title: 'Сертификат эксперта Solana',
      description: 'On-chain сертификат о прохождении полного курса',
      imageUrl: '',
      isUnlocked: false
    }
  ],
  totalRewardTokens: 500 + 220, // 500 за курс + сумма за уроки
  certificateAvailable: true,
  
  lessons: solanaCourseLessons,
  prerequisites: [],
  learningObjectives: [
    'Понимать архитектуру и принципы работы Solana',
    'Создавать и управлять SPL токенами',
    'Программировать смарт-контракты с Anchor Framework',
    'Участвовать в DeFi экосистеме безопасно',
    'Применять лучшие практики безопасности',
    'Развертывать собственные DApps на Solana'
  ],
  
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'solana-superapp-team',
  difficulty: 'advanced',
  estimatedTime: 325,
  
  completionRate: 0,
  isPopular: true,
  isNew: true,
    isFeatured: true,
    objectives: [],
    xpReward: 500,
    totalXpEarned: 0,
    totalTokensEarned: BigInt(0),
    difficultyScore: 3,
    isActive: true
}

// Все экспорты уже объявлены выше как export const
