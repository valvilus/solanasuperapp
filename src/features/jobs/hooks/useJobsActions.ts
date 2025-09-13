'use client'

import { useCallback } from 'react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { JobsService } from '../services/jobs.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import type { 
  Job, 
  JobApplication, 
  CreateJobForm, 
  ApplicationForm,
  JobsTabType 
} from '../types/jobs.types'

export function useJobsActions(
  setActiveTab: (tab: JobsTabType) => void,
  openJobDetailsModal: (job: Job) => void,
  openApplicationModal: (job: Job) => void,
  openCreateJobModal: () => void,
  showSuccessNotification: (message: string) => void,
  showErrorNotification: (message: string) => void,
  showInfoNotification: (message: string) => void,
  onJobCreated?: () => void,
  onApplicationSubmitted?: () => void
) {
  const { isAuthenticated } = useCompatibleAuth()
  const jobsService = JobsService.getInstance()
  // Обработка быстрых действий
  const handleQuickAction = useCallback((actionId: string) => {
    hapticFeedback.impact('light')
    
    switch (actionId) {
      case 'search-jobs':
        setActiveTab('all')
        showInfoNotification('Переключение на поиск работы')
        break
        
      case 'create-job':
        openCreateJobModal()
        break
        
      case 'my-applications':
        setActiveTab('applications')
        showInfoNotification('Просмотр ваших заявок')
        break
        
      case 'talent-search':
        showInfoNotification('Поиск талантов - функция в разработке')
        break
        
      case 'contracts':
        setActiveTab('contracts')
        showInfoNotification('Просмотр эскроу контрактов')
        break
        
      case 'analytics':
        showInfoNotification('Аналитика платформы - функция в разработке')
        break
        
      case 'featured':
        showInfoNotification('Фильтр по рекомендуемым работам')
        break
        
      case 'urgent':
        showInfoNotification('Фильтр по срочным работам')
        break
        
      default:
        showInfoNotification(`Действие ${actionId}`)
    }
  }, [
    setActiveTab, 
    openCreateJobModal, 
    showSuccessNotification, 
    showErrorNotification, 
    showInfoNotification
  ])

  // Клик по карточке работы
  const handleJobClick = useCallback((job: Job) => {
    hapticFeedback.impact('light')
    openJobDetailsModal(job)
  }, [openJobDetailsModal])

  // Подача заявки на работу
  const handleApplyToJob = useCallback((job: Job) => {
    hapticFeedback.impact('medium')
    
    if (job.status !== 'open') {
      showErrorNotification('Эта работа больше не доступна для заявок')
      return
    }
    
    openApplicationModal(job)
  }, [openApplicationModal, showErrorNotification])

  // Создание новой работы
  const handleCreateJob = useCallback(async (jobData: CreateJobForm) => {
    hapticFeedback.notification('warning')
    
    if (!isAuthenticated) {
      showErrorNotification('Необходимо войти в систему для создания работы')
      throw new Error('Not authenticated')
    }
    
    try {
      const result = await jobsService.createJob(jobData)
      
      showSuccessNotification(`Работа "${jobData.title}" успешно создана!`)
      
      // Вызываем callback для обновления списка работ
      if (onJobCreated) {
        onJobCreated()
      }
      
      return { success: true, jobId: result.jobId }
    } catch (error) {
      hapticFeedback.notification('error')
      showErrorNotification('Ошибка при создании работы. Попробуйте еще раз.')
      throw error
    }
  }, [isAuthenticated, jobsService, showSuccessNotification, showErrorNotification, onJobCreated])

  // Отправка заявки
  const handleSubmitApplication = useCallback(async (
    job: Job, 
    applicationData: ApplicationForm
  ) => {
    hapticFeedback.notification('warning')
    
    if (!isAuthenticated) {
      showErrorNotification('Необходимо войти в систему для подачи заявки')
      throw new Error('Not authenticated')
    }
    
    try {
      const result = await jobsService.applyToJob(job.id, applicationData)
      
      showSuccessNotification(`Заявка на работу "${job.title}" успешно отправлена!`)
      
      // Вызываем callback для обновления данных
      if (onApplicationSubmitted) {
        onApplicationSubmitted()
      }
      
      return { success: true, applicationId: result.applicationId }
    } catch (error) {
      hapticFeedback.notification('error')
      showErrorNotification('Ошибка при отправке заявки. Попробуйте еще раз.')
      throw error
    }
  }, [isAuthenticated, jobsService, showSuccessNotification, showErrorNotification, onApplicationSubmitted])

  // Добавление в избранное
  const handleToggleFavorite = useCallback((job: Job) => {
    hapticFeedback.impact('light')
    // В реальном приложении здесь была бы логика избранного
    showInfoNotification(`Работа "${job.title}" добавлена в избранное`)
  }, [showInfoNotification])

  // Поделиться работой
  const handleShareJob = useCallback(async (job: Job) => {
    hapticFeedback.impact('light')
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: job.title,
          text: `Посмотрите эту работу: ${job.title}`,
          url: `${window.location.origin}/jobs/${job.id}`
        })
      } else {
        // Fallback: копирование в буфер обмена
        await navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`)
        showSuccessNotification('Ссылка скопирована в буфер обмена')
      }
    } catch (error) {
      showErrorNotification('Ошибка при попытке поделиться')
    }
  }, [showSuccessNotification, showErrorNotification])

  // Связаться с работодателем
  const handleContactEmployer = useCallback((job: Job) => {
    hapticFeedback.impact('light')
    showInfoNotification(`Связь с ${job.employer} - функция в разработке`)
  }, [showInfoNotification])

  // Сообщить о проблеме
  const handleReportJob = useCallback((job: Job) => {
    hapticFeedback.impact('medium')
    showInfoNotification(`Жалоба на работу "${job.title}" отправлена`)
  }, [showInfoNotification])

  // Принять заявку (для работодателя)
  const handleAcceptApplication = useCallback(async (application: JobApplication) => {
    hapticFeedback.notification('warning')
    
    try {
      // Симуляция принятия заявки
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      hapticFeedback.notification('success')
      showSuccessNotification(`Заявка от ${application.applicant} принята!`)
    } catch (error) {
      hapticFeedback.notification('error')
      showErrorNotification('Ошибка при принятии заявки')
    }
  }, [showSuccessNotification, showErrorNotification])

  // Отклонить заявку (для работодателя)
  const handleRejectApplication = useCallback(async (application: JobApplication) => {
    hapticFeedback.impact('medium')
    
    try {
      // Симуляция отклонения заявки
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      showInfoNotification(`Заявка от ${application.applicant} отклонена`)
    } catch (error) {
      showErrorNotification('Ошибка при отклонении заявки')
    }
  }, [showInfoNotification, showErrorNotification])

  // Создать эскроу контракт
  const handleCreateEscrow = useCallback(async (job: Job, contractor: string) => {
    hapticFeedback.notification('warning')
    
    if (!isAuthenticated) {
      showErrorNotification('Войдите, чтобы создавать эскроу')
      throw new Error('Not authenticated')
    }
    
    try {
      // Для fixed бюджета используем общую сумму; для milestone можно будет просить ввод суммы
      const amount = job.paymentType === 'fixed' ? job.budget : Math.min(job.budget, 1000)
      const result = await jobsService.createEscrow({
        jobId: job.id,
        freelancerId: contractor,
        amount,
        token: job.currency
      })
      
      hapticFeedback.notification('success')
      showSuccessNotification('Эскроу контракт создан')
    } catch (error) {
      hapticFeedback.notification('error')
      showErrorNotification('Ошибка при создании эскроу контракта')
      throw error
    }
  }, [isAuthenticated, jobsService, showSuccessNotification, showErrorNotification])

  // Релиз средств эскроу
  const handleReleaseEscrow = useCallback(async (contractId: string, releaseAmount?: number) => {
    hapticFeedback.notification('warning')
    
    try {
      await jobsService.releaseEscrow(contractId, releaseAmount)
      hapticFeedback.notification('success')
      showSuccessNotification('Релиз выполнен')
    } catch (error) {
      hapticFeedback.notification('error')
      showErrorNotification('Ошибка при релизе средств')
      throw error
    }
  }, [jobsService, showSuccessNotification, showErrorNotification])

  // Обновление статуса работы
  const handleUpdateJobStatus = useCallback(async (job: Job, newStatus: Job['status']) => {
    hapticFeedback.impact('medium')
    
    try {
      // Симуляция обновления статуса
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusLabels = {
        open: 'открыта',
        in_progress: 'в работе',
        completed: 'завершена',
        cancelled: 'отменена',
        disputed: 'в споре'
      }
      
      showSuccessNotification(`Статус работы изменен на "${statusLabels[newStatus]}"`)
    } catch (error) {
      showErrorNotification('Ошибка при обновлении статуса')
    }
  }, [showSuccessNotification, showErrorNotification])

  return {
    handleQuickAction,
    handleJobClick,
    handleApplyToJob,
    handleCreateJob,
    handleSubmitApplication,
    handleToggleFavorite,
    handleShareJob,
    handleContactEmployer,
    handleReportJob,
    handleAcceptApplication,
    handleRejectApplication,
    handleCreateEscrow,
    handleReleaseEscrow,
    handleUpdateJobStatus
  }
}

