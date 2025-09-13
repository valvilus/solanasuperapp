'use client'

import { ProfileTabType, ProfileUser, Achievement, UserActivity } from '../types'
import { ProfileService } from '../services'

export function useProfileActions(
  setSelectedTab: (tab: ProfileTabType) => void,
  setIsLoading: (loading: boolean) => void,
  showSuccessNotification: (message: string) => void,
  showErrorNotification: (message: string) => void,
  showInfoNotification: (message: string) => void,
  openEditProfile: () => void,
  openAchievements: () => void,
  openSettings: () => void,
  openActivity: () => void
) {

  // Быстрые действия
  const handleQuickAction = async (actionId: string) => {
    try {
      switch (actionId) {
        case 'edit-profile':
          openEditProfile()
          showInfoNotification('Режим редактирования профиля')
          break
        
        case 'achievements':
          openAchievements()
          showInfoNotification('Открыты достижения')
          break
        
        case 'activity':
          openActivity()
          showInfoNotification('Открыта история активности')
          break
        
        case 'share':
          await handleShareProfile()
          break
        
        default:
          showInfoNotification(`Действие: ${actionId}`)
      }
    } catch (error) {
      console.error('Quick action error:', error)
      showErrorNotification('Произошла ошибка при выполнении действия')
    }
  }

  // Обновление профиля
  const handleUpdateProfile = async (updates: Partial<ProfileUser>) => {
    setIsLoading(true)
    try {
      await ProfileService.updateProfile(updates)
      showSuccessNotification('Профиль успешно обновлен')
    } catch (error) {
      console.error('Update profile error:', error)
      showErrorNotification('Ошибка при обновлении профиля')
    } finally {
      setIsLoading(false)
    }
  }

  // Обновление настроек
  const handleUpdateSettings = async (settingId: string, value: any) => {
    setIsLoading(true)
    try {
      await ProfileService.updateSetting(settingId, value)
      showSuccessNotification('Настройка обновлена')
    } catch (error) {
      console.error('Update setting error:', error)
      showErrorNotification('Ошибка при обновлении настройки')
    } finally {
      setIsLoading(false)
    }
  }

  // Поделиться профилем
  const handleShareProfile = async () => {
    try {
      const profileUrl = `${window.location.origin}/profile/shared`
      
      if (navigator.share) {
        await navigator.share({
          title: 'Мой профиль в Solana SuperApp',
          text: 'Посмотрите на мои достижения в Web3!',
          url: profileUrl
        })
        showSuccessNotification('Профиль успешно поделился')
      } else {
        await navigator.clipboard.writeText(profileUrl)
        showSuccessNotification('Ссылка на профиль скопирована')
      }
    } catch (error) {
      console.error('Share profile error:', error)
      showErrorNotification('Ошибка при попытке поделиться профилем')
    }
  }

  // Экспорт данных
  const handleExportData = async (format: 'json' | 'csv' | 'pdf') => {
    setIsLoading(true)
    try {
      await ProfileService.exportUserData(format)
      showSuccessNotification(`Данные экспортированы в формате ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export data error:', error)
      showErrorNotification('Ошибка при экспорте данных')
    } finally {
      setIsLoading(false)
    }
  }

  // Копирование адреса кошелька
  const handleCopyWalletAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      showSuccessNotification('Адрес кошелька скопирован')
    } catch (error) {
      console.error('Copy address error:', error)
      showErrorNotification('Ошибка при копировании адреса')
    }
  }

  // Открытие достижения
  const handleAchievementClick = (achievement: Achievement) => {
    if (achievement.isLocked) {
      showInfoNotification(`Достижение заблокировано. Прогресс: ${achievement.progress}/${achievement.maxProgress}`)
    } else {
      showInfoNotification(`Достижение "${achievement.title}" получено ${achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString('ru-RU') : ''}`)
    }
  }

  // Просмотр активности
  const handleActivityClick = (activity: UserActivity) => {
    if (activity.relatedProposalId) {
      showInfoNotification('Переход к предложению DAO')
      // Здесь можно добавить навигацию к конкретному предложению
    } else if (activity.relatedNFTId) {
      showInfoNotification('Переход к NFT')
      // Здесь можно добавить навигацию к конкретному NFT
    } else {
      showInfoNotification(`Активность: ${activity.title}`)
    }
  }

  // Отправка приглашения
  const handleSendInvite = async (contactInfo: string, method: 'telegram' | 'email') => {
    setIsLoading(true)
    try {
      await ProfileService.sendInvite(contactInfo, method)
      showSuccessNotification('Приглашение отправлено')
    } catch (error) {
      console.error('Send invite error:', error)
      showErrorNotification('Ошибка при отправке приглашения')
    } finally {
      setIsLoading(false)
    }
  }

  // Добавление друга
  const handleAddFriend = async (userId: string) => {
    setIsLoading(true)
    try {
      await ProfileService.addFriend(userId)
      showSuccessNotification('Запрос на добавление в друзья отправлен')
    } catch (error) {
      console.error('Add friend error:', error)
      showErrorNotification('Ошибка при добавлении в друзья')
    } finally {
      setIsLoading(false)
    }
  }

  // Удаление аккаунта
  const handleDeleteAccount = async () => {
    // Показываем предупреждение
    const confirmed = window.confirm(
      'Вы уверены, что хотите удалить аккаунт? Это действие необратимо!'
    )
    
    if (confirmed) {
      setIsLoading(true)
      try {
        await ProfileService.deleteAccount()
        showSuccessNotification('Аккаунт удален')
        // Здесь должен происходить logout и редирект
      } catch (error) {
        console.error('Delete account error:', error)
        showErrorNotification('Ошибка при удалении аккаунта')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Выход из аккаунта
  const handleLogout = async () => {
    try {
      await ProfileService.logout()
      showSuccessNotification('Вы вышли из аккаунта')
      // Здесь должен происходить редирект на главную
    } catch (error) {
      console.error('Logout error:', error)
      showErrorNotification('Ошибка при выходе из аккаунта')
    }
  }

  // Переключение приватности
  const handleTogglePrivacy = async (setting: string, value: boolean) => {
    try {
      await ProfileService.updatePrivacySetting(setting, value)
      showSuccessNotification('Настройка приватности обновлена')
    } catch (error) {
      console.error('Toggle privacy error:', error)
      showErrorNotification('Ошибка при обновлении настройки приватности')
    }
  }

  // Создание бэкапа
  const handleCreateBackup = async () => {
    setIsLoading(true)
    try {
      await ProfileService.createBackup()
      showSuccessNotification('Бэкап создан успешно')
    } catch (error) {
      console.error('Create backup error:', error)
      showErrorNotification('Ошибка при создании бэкапа')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    handleQuickAction,
    handleUpdateProfile,
    handleUpdateSettings,
    handleShareProfile,
    handleExportData,
    handleCopyWalletAddress,
    handleAchievementClick,
    handleActivityClick,
    handleSendInvite,
    handleAddFriend,
    handleDeleteAccount,
    handleLogout,
    handleTogglePrivacy,
    handleCreateBackup
  }
}



















































