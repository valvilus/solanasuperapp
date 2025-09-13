'use client'

import { LearnTabType, Course, Quiz, Lesson } from '../types'
import { LearnService } from '../../../lib/learn/learn.service'
import { useAuth } from '@/contexts/AuthContext'

export function useLearnActions(
  setCurrentTab: (tab: LearnTabType) => void,
  setIsLoading: (loading: boolean) => void,
  showSuccessNotification: (message: string, action?: { label: string; handler: () => void }) => void,
  showErrorNotification: (message: string, action?: { label: string; handler: () => void }) => void,
  showInfoNotification: (message: string, action?: { label: string; handler: () => void }) => void,
  openCourseDetails: (course: Course) => void,
  openQuiz: (quiz: Quiz) => void,
  performSearch: (query: string) => void,
  applyQuickFilter: (category: any) => void
) {
  const { user } = useAuth()

  // Быстрые действия
  const handleQuickAction = async (actionId: string) => {
    try {
      switch (actionId) {
        case 'continue-learning':
          await handleContinueLearning()
          break
        
        case 'daily-challenge':
          await handleDailyChallenge()
          break
        
        case 'leaderboard':
          setCurrentTab('leaderboard')
          showInfoNotification('Открыт рейтинг учащихся')
          break
        
        case 'certificates':
          setCurrentTab('certificates')
          showInfoNotification('Ваши сертификаты')
          break
        
        default:
          showInfoNotification(`Действие: ${actionId}`)
      }
    } catch (error) {
      console.error('Quick action error:', error)
      showErrorNotification('Произошла ошибка при выполнении действия')
    }
  }

  // Продолжить обучение
  const handleContinueLearning = async () => {
    setIsLoading(true)
    try {
      // Получаем профиль пользователя для определения последнего курса
      try {
        const { ExtendedUserService } = await import('@/features/learn/services/user.service')
        const profile = await ExtendedUserService.getUserProfile('current-user-id')
        
        if (profile && profile.lastAccessedCourse) {
          // Переходим к последнему курсу
          showSuccessNotification(`Продолжаем изучение: ${profile.lastAccessedCourse.title}`, {
            label: 'Перейти',
            handler: () => {
              window.location.href = `/learn/course/${profile.lastAccessedCourse.id}`
            }
          })
          return
        }
        
        // Если есть записанные курсы, переходим к первому активному
        if (profile && profile.courses && profile.courses.length > 0) {
          const activeCourse = profile.courses.find(c => c.isEnrolled && !c.isCompleted)
          if (activeCourse) {
            showSuccessNotification(`Продолжаем изучение: ${activeCourse.title}`, {
              label: 'Перейти',
              handler: () => {
                window.location.href = `/learn/course/${activeCourse.id}`
              }
            })
            return
          }
        }
      } catch (error) {
        console.error('Error getting user profile for continue learning:', error)
      }
      
      // Fallback - переход к курсу Solana
      const targetCourse = 'course-solana-complete'
      showSuccessNotification('Продолжаем изучение Solana!', {
        label: 'Перейти',
        handler: () => {
          window.location.href = `/learn/course/${targetCourse}`
        }
      })
      
    } catch (error) {
      console.error('Continue learning error:', error)
      showErrorNotification('Ошибка при загрузке текущего курса')
    } finally {
      setIsLoading(false)
    }
  }

  // Ежедневный челлендж
  const handleDailyChallenge = async () => {
    setIsLoading(true)
    try {
      const challenges = await (LearnService as any).getDailyChallenges()
      const activeChallenges = challenges.filter(c => !c.isCompleted)
      
      if (activeChallenges.length > 0) {
        showInfoNotification(
          `У вас ${activeChallenges.length} активных челленджей`,
          {
            label: 'Посмотреть',
            handler: () => setCurrentTab('my_courses')
          }
        )
      } else {
        showSuccessNotification('Все ежедневные челленджи выполнены! ')
      }
    } catch (error) {
      console.error('Daily challenge error:', error)
      showErrorNotification('Ошибка при загрузке челленджей')
    } finally {
      setIsLoading(false)
    }
  }

  // Записаться на курс
  const handleEnrollCourse = async (courseId: string) => {
    setIsLoading(true)
    try {
      await (LearnService as any).enrollCourse(courseId)
      showSuccessNotification('Вы записались на курс!', {
        label: 'Начать',
        handler: () => setCurrentTab('my_courses')
      })
    } catch (error) {
      console.error('Enroll course error:', error)
      showErrorNotification('Ошибка при записи на курс')
    } finally {
      setIsLoading(false)
    }
  }

  // Начать урок
  const handleStartLesson = async (courseId: string, lessonId: string) => {
    setIsLoading(true)
    try {
      await (LearnService as any).startLesson(courseId, lessonId)
      showSuccessNotification('Урок начат!')
      // Здесь можно открыть модальное окно урока или перейти на страницу урока
    } catch (error) {
      console.error('Start lesson error:', error)
      showErrorNotification('Ошибка при запуске урока')
    } finally {
      setIsLoading(false)
    }
  }

  // Завершить урок
  const handleCompleteLesson = async (courseId: string, lessonId: string, score?: number) => {
    setIsLoading(true)
    try {
      const result = await (LearnService as any).completeLesson(courseId, lessonId, score)
      showSuccessNotification(
        `Урок завершен! +${result.xpEarned} XP, +${result.tokensEarned} TNG`,
        {
          label: 'Далее',
          handler: () => {
            // Переход к следующему уроку или показ прогресса
          }
        }
      )
    } catch (error) {
      console.error('Complete lesson error:', error)
      showErrorNotification('Ошибка при завершении урока')
    } finally {
      setIsLoading(false)
    }
  }

  // Начать квиз
  const handleStartQuiz = async (quiz: Quiz) => {
    try {
      // Проверяем лимит попыток
      if (quiz.attempts.length >= quiz.attemptsAllowed) {
        console.warn('Исчерпан лимит попыток для этого квиза')
        return
      }
      
      await LearnService.startQuiz(quiz.id, 'current-user')
      openQuiz(quiz)
      showInfoNotification('Квиз начат! Удачи!')
    } catch (error) {
      console.error('Start quiz error:', error)
      showErrorNotification('Ошибка при запуске квиза')
    }
  }

  // Завершить квиз
  const handleCompleteQuiz = async (quizId: string, answers: any[], timeSpent: number) => {
    setIsLoading(true)
    try {
      const result = await LearnService.submitQuizAnswers(quizId, 'current-user', answers)
      
      if (result.isPassed) {
        showSuccessNotification(
          `Квиз пройден! Результат: ${result.percentage}%. +${result.xpEarned} XP`,
          {
            label: 'Продолжить',
            handler: () => {
              // Переход к следующему элементу курса
            }
          }
        )
      } else {
        console.warn(
          `Квиз не пройден. Результат: ${result.percentage}%. Попробуйте еще раз.`
        )
      }
    } catch (error) {
      console.error('Complete quiz error:', error)
      showErrorNotification('Ошибка при отправке ответов квиза')
    } finally {
      setIsLoading(false)
    }
  }

  // Поделиться курсом
  const handleShareCourse = async (course: Course) => {
    try {
      const shareUrl = `${window.location.origin}/learn/course/${course.id}`
      
      if (navigator.share) {
        await navigator.share({
          title: course.title,
          text: course.shortDescription,
          url: shareUrl
        })
        showSuccessNotification('Курс успешно поделился')
      } else {
        await navigator.clipboard.writeText(shareUrl)
        showSuccessNotification('Ссылка на курс скопирована')
      }
    } catch (error) {
      console.error('Share course error:', error)
      showErrorNotification('Ошибка при попытке поделиться курсом')
    }
  }

  // Добавить в избранное
  const handleToggleFavorite = async (courseId: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await LearnService.addToFavorites(courseId, 'current-user')
        showSuccessNotification('Курс добавлен в избранное')
      } else {
        await LearnService.removeFromFavorites(courseId, 'current-user')
        showInfoNotification('Курс удален из избранного')
      }
    } catch (error) {
      console.error('Toggle favorite error:', error)
      showErrorNotification('Ошибка при изменении избранного')
    }
  }

  // Скачать сертификат
  const handleDownloadCertificate = async (certificateId: string) => {
    setIsLoading(true)
    try {
      const certificateResult = await LearnService.downloadCertificate(certificateId, 'current-user')
      
      if (!certificateResult.success || !certificateResult.url) {
        showErrorNotification('Ошибка при скачивании сертификата')
        return
      }
      
      // Используем полученную ссылку
      const url = certificateResult.url
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certificateId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showSuccessNotification('Сертификат скачан')
    } catch (error) {
      console.error('Download certificate error:', error)
      showErrorNotification('Ошибка при скачивании сертификата')
    } finally {
      setIsLoading(false)
    }
  }

  // Поиск курсов
  const handleSearch = async (query: string) => {
    if (query.trim().length < 2) {
      console.warn('Введите минимум 2 символа для поиска')
      return
    }
    
    setIsLoading(true)
    try {
      performSearch(query)
      showInfoNotification(`Поиск: "${query}"`)
    } catch (error) {
      console.error('Search error:', error)
      showErrorNotification('Ошибка при поиске')
    } finally {
      setIsLoading(false)
    }
  }

  // Фильтрация по категории
  const handleCategoryFilter = (category: any) => {
    applyQuickFilter(category)
    showInfoNotification(`Фильтр по категории: ${category}`)
  }

  // Отправить отзыв о курсе
  const handleSubmitReview = async (courseId: string, rating: number, comment: string) => {
    setIsLoading(true)
    try {
      await LearnService.submitCourseReview(courseId, 'current-user', rating, comment)
      showSuccessNotification('Отзыв отправлен! Спасибо за обратную связь.')
    } catch (error) {
      console.error('Submit review error:', error)
      showErrorNotification('Ошибка при отправке отзыва')
    } finally {
      setIsLoading(false)
    }
  }

  // Проверить достижения
  const handleCheckAchievements = async () => {
    setIsLoading(true)
    try {
      const newAchievements = await LearnService.checkAchievements(user?.id || '')
      
      if (newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
          showSuccessNotification(
            `Новое достижение: ${achievement.title}! `,
            {
              label: 'Посмотреть',
              handler: () => setCurrentTab('certificates')
            }
          )
        })
      }
    } catch (error) {
      console.error('Check achievements error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Экспорт прогресса
  const handleExportProgress = async (format: 'pdf' | 'json') => {
    setIsLoading(true)
    try {
      const exportData = await LearnService.exportProgress(format)
      showSuccessNotification(`Прогресс экспортирован в формате ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export progress error:', error)
      showErrorNotification('Ошибка при экспорте прогресса')
    } finally {
      setIsLoading(false)
    }
  }

  // Сброс прогресса курса
  const handleResetCourseProgress = async (courseId: string) => {
    const confirmed = window.confirm(
      'Вы уверены, что хотите сбросить прогресс курса? Это действие необратимо!'
    )
    
    if (confirmed) {
      setIsLoading(true)
      try {
        await LearnService.resetCourseProgress(courseId, user?.id || '')
        showSuccessNotification('Прогресс курса сброшен')
      } catch (error) {
        console.error('Reset progress error:', error)
        showErrorNotification('Ошибка при сбросе прогресса')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Создать курс (для преподавателей)
  const handleCreateCourse = async (courseData: any) => {
    setIsLoading(true)
    try {
      const newCourseResult = await LearnService.createCourse(courseData)
      
      if (newCourseResult.success && newCourseResult.courseId) {
        showSuccessNotification(
          'Курс создан успешно!',
          {
            label: 'Посмотреть', 
            handler: () => {
              // Здесь должна быть навигация к курсу по ID
              console.log('Navigate to course:', newCourseResult.courseId)
            }
          }
        )
      } else {
        showErrorNotification(newCourseResult.error || 'Ошибка при создании курса')
      }
    } catch (error) {
      console.error('Create course error:', error)
      showErrorNotification('Ошибка при создании курса')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    handleQuickAction,
    handleContinueLearning,
    handleDailyChallenge,
    handleEnrollCourse,
    handleStartLesson,
    handleCompleteLesson,
    handleStartQuiz,
    handleCompleteQuiz,
    handleShareCourse,
    handleToggleFavorite,
    handleDownloadCertificate,
    handleSearch,
    handleCategoryFilter,
    handleSubmitReview,
    handleCheckAchievements,
    handleExportProgress,
    handleResetCourseProgress,
    handleCreateCourse
  }
}



























