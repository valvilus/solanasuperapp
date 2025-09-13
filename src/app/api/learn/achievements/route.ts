/**
 * Achievements API
 * GET /api/learn/achievements - Получить все достижения
 */

import { NextRequest, NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/auth'
import { ApiResponse } from '@/lib/learn/types'

const ACHIEVEMENTS = [
  {
    id: 'first_course',
    title: 'Первый шаг',
    description: 'Завершите свой первый курс',
    icon: '',
    category: 'learning',
    requirement: { type: 'courses_completed', value: 1 },
    reward: { xp: 100, tokens: 10 }
  },
  {
    id: 'speed_learner',
    title: 'Быстрый ученик',
    description: 'Завершите урок за половину отведенного времени',
    icon: '',
    category: 'efficiency',
    requirement: { type: 'lesson_speed', value: 0.5 },
    reward: { xp: 50, tokens: 5 }
  },
  {
    id: 'quiz_master',
    title: 'Мастер квизов',
    description: 'Наберите 100% в 5 квизах подряд',
    icon: '',
    category: 'accuracy',
    requirement: { type: 'perfect_quizzes', value: 5 },
    reward: { xp: 200, tokens: 20 }
  },
  {
    id: 'streak_7',
    title: 'Неделя знаний',
    description: 'Учитесь 7 дней подряд',
    icon: '',
    category: 'consistency',
    requirement: { type: 'streak_days', value: 7 },
    reward: { xp: 150, tokens: 15 }
  },
  {
    id: 'blockchain_expert',
    title: 'Эксперт блокчейна',
    description: 'Завершите 3 курса по блокчейну',
    icon: '',
    category: 'specialization',
    requirement: { type: 'category_courses', category: 'blockchain', value: 3 },
    reward: { xp: 300, tokens: 30 }
  },
  {
    id: 'defi_master',
    title: 'Мастер DeFi',
    description: 'Завершите все курсы по DeFi',
    icon: '',
    category: 'specialization',
    requirement: { type: 'category_complete', category: 'defi' },
    reward: { xp: 500, tokens: 50 }
  },
  {
    id: 'community_helper',
    title: 'Помощник сообщества',
    description: 'Создайте свой первый курс',
    icon: '',
    category: 'contribution',
    requirement: { type: 'courses_created', value: 1 },
    reward: { xp: 400, tokens: 40 }
  },
  {
    id: 'early_bird',
    title: 'Ранняя пташка',
    description: 'Завершите урок до 9:00 утра',
    icon: '',
    category: 'timing',
    requirement: { type: 'early_completion', hour: 9 },
    reward: { xp: 25, tokens: 3 }
  },
  {
    id: 'night_owl',
    title: 'Полуночник',
    description: 'Завершите урок после 23:00',
    icon: '',
    category: 'timing',
    requirement: { type: 'late_completion', hour: 23 },
    reward: { xp: 25, tokens: 3 }
  },
  {
    id: 'perfectionist',
    title: 'Перфекционист',
    description: 'Наберите 100% во всех квизах курса',
    icon: '',
    category: 'accuracy',
    requirement: { type: 'course_perfect', value: 100 },
    reward: { xp: 250, tokens: 25 }
  }
]

export const GET = withOptionalAuth(async (
  request: NextRequest,
  auth: { userId: string; telegramId: string } | null
): Promise<NextResponse<ApiResponse>> => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const onlyUnlocked = searchParams.get('unlocked') === 'true'

    let achievements = ACHIEVEMENTS

    // Фильтр по категории
    if (category) {
      achievements = achievements.filter(a => a.category === category)
    }

    // Если пользователь авторизован, добавляем информацию о прогрессе
    let achievementsWithProgress = achievements

    if (auth?.userId) {
      // Здесь бы был запрос к базе данных для получения прогресса пользователя
      // Для примера используем моковые данные
      achievementsWithProgress = achievements.map(achievement => ({
        ...achievement,
        isUnlocked: Math.random() > 0.7, // 30% вероятность что достижение разблокировано
        unlockedAt: Math.random() > 0.5 ? new Date().toISOString() : null,
        progress: Math.random() * 100 // Прогресс в процентах
      }))

      // Фильтр только разблокированных
      if (onlyUnlocked) {
        achievementsWithProgress = achievementsWithProgress.filter(a => (a as any).isUnlocked)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        achievements: achievementsWithProgress,
        categories: [
          { id: 'learning', name: 'Обучение', icon: '' },
          { id: 'efficiency', name: 'Эффективность', icon: '' },
          { id: 'accuracy', name: 'Точность', icon: '' },
          { id: 'consistency', name: 'Постоянство', icon: '' },
          { id: 'specialization', name: 'Специализация', icon: '' },
          { id: 'contribution', name: 'Вклад', icon: '' },
          { id: 'timing', name: 'Время', icon: '' }
        ]
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения достижений'
    }, { status: 500 })
  }
})






