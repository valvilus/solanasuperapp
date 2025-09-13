'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'
import ClientOnly from '@/components/common/ClientOnly'
import { JobsPageSkeleton } from '@/components/jobs/JobsPageSkeleton'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'

// Jobs Components
import { JobsHeader } from '@/components/jobs/JobsHeader'
import { JobsQuickActions } from '@/components/jobs/JobsQuickActions'
import { JobsFilters } from '@/components/jobs/JobsFilters'
import { JobCard } from '@/components/jobs/JobCard'

// Business Logic & Data
import { useJobsState } from '@/features/jobs/hooks/useJobsState'
import { useJobsFiltering } from '@/features/jobs/hooks/useJobsFiltering'
import { useJobsActions } from '@/features/jobs/hooks/useJobsActions'
import { useJobsData } from '@/features/jobs/hooks/useJobsData'
import { JobsService } from '@/features/jobs/services/jobs.service'

// Icons
import { 
  Briefcase, 
  Plus, 
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  MapPin,
  X,
  CheckCircle,
  Send,
  Link,
  FileText
} from 'lucide-react'

import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

export default function JobsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // State Management
  const {
    state,
    setSearchQuery,
    setFilters,
    openJobDetailsModal,
    closeJobDetailsModal,
    openApplicationModal,
    closeApplicationModal,
    openCreateJobModal,
    closeCreateJobModal,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    resetFilters
  } = useJobsState()

  // Data Management
  const {
    jobs,
    stats: jobsStats,
    categories,
    loading: dataLoading,
    error: dataError,
    loadJobs,
    refreshAll,
    clearError
  } = useJobsData()

  // Data Processing
  const { filteredJobs, stats } = useJobsFiltering(
    jobs,
    state.filters,
    state.searchQuery
  )

  // Actions
  const {
    handleQuickAction,
    handleJobClick,
    handleApplyToJob,
    handleCreateJob,
    handleSubmitApplication,
    handleToggleFavorite,
    handleShareJob,
    handleContactEmployer
  } = useJobsActions(
    () => {}, // setActiveTab - не используется в данной версии
    openJobDetailsModal,
    openApplicationModal,
    openCreateJobModal,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    () => loadJobs({}, true), // onJobCreated - обновляем список работ
    () => loadJobs({}, true)  // onApplicationSubmitted - обновляем список работ
  )

  const { apiCall } = useCompatibleAuth()

  useEffect(() => {
    JobsService.configure({ apiCall })
  }, [apiCall])

  // Loading simulation - стабильная загрузка
  useEffect(() => {
    let timer: NodeJS.Timeout
    let interval: NodeJS.Timeout
    
    timer = setTimeout(() => {
      let progress = 0
      interval = setInterval(() => {
        progress += 10
        setLoadingProgress(progress)
        
        if (progress >= 100) {
          clearInterval(interval)
          setTimeout(() => setIsLoading(false), 300)
        }
      }, 150)
    }, 500)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  // Create Job Modal State
  const [createJobForm, setCreateJobForm] = useState({
    title: '',
    description: '',
    type: 'development' as const,
    category: '',
    budget: 0,
    currency: 'USDC' as const,
    paymentType: 'fixed' as const,
    experienceLevel: 'middle' as const,
    skills: [] as string[],
    requirements: [] as string[],
    deadline: '',
    isRemote: true,
    isUrgent: false,
    enableEscrow: true,
    milestones: []
  })

  // Application Modal State
  const [applicationForm, setApplicationForm] = useState({
    coverLetter: '',
    proposedBudget: 0,
    proposedTimeline: '',
    portfolioLinks: [] as string[],
    estimatedHours: 0
  })

  const LoadingFallback = () => (
    <JobsPageSkeleton />
  )

  // Jobs service (upload, escrow helpers)
  const jobsService = JobsService.getInstance()

  // Render Create Job Modal
  const renderCreateJobModal = () => {
    if (!state.showCreateJob) return null

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closeCreateJobModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Создать новую работу</h2>
            <button
              onClick={closeCreateJobModal}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Основная информация */}
            <SimpleCard className="p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Основная информация</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Название работы *
                  </label>
                  <input
                    type="text"
                    value={createJobForm.title}
                    onChange={(e) => setCreateJobForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: Frontend разработчик для DeFi платформы"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Описание работы *
                  </label>
                  <textarea
                    value={createJobForm.description}
                    onChange={(e) => setCreateJobForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Подробно опишите требования, задачи и ожидания..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Категория
                    </label>
                    <select
                      value={createJobForm.category}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20"
                    >
                      <option value="DEVELOPMENT">Development</option>
                      <option value="DESIGN">Design</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="WRITING">Writing</option>
                      <option value="CONSULTING">Consulting</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Дедлайн *
                    </label>
                    <input
                      type="date"
                      value={createJobForm.deadline}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>
            </SimpleCard>

            {/* Бюджет и оплата */}
            <SimpleCard className="p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Бюджет и оплата</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Бюджет *
                    </label>
                    <input
                      type="number"
                      value={createJobForm.budget || ''}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, budget: Number(e.target.value) }))}
                      placeholder="5000"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={createJobForm.currency}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, currency: e.target.value as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20 [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="SOL" className="bg-gray-800 text-white">SOL</option>
                      <option value="USDC" className="bg-gray-800 text-white">USDC</option>
                      <option value="TNG" className="bg-gray-800 text-white">TNG</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Тип оплаты
                    </label>
                    <select
                      value={createJobForm.paymentType.toUpperCase()}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, paymentType: e.target.value.toUpperCase() as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20 [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="FIXED" className="bg-gray-800 text-white">Фиксированная</option>
                      <option value="HOURLY" className="bg-gray-800 text-white">Почасовая</option>
                      <option value="MILESTONE" className="bg-gray-800 text-white">По этапам</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createJobForm.isRemote}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, isRemote: e.target.checked }))}
                      className="rounded border-gray-600 text-solana-green focus:ring-solana-green"
                    />
                    <span className="text-sm text-gray-300">Удаленная работа</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createJobForm.isUrgent}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, isUrgent: e.target.checked }))}
                      className="rounded border-gray-600 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">Срочная работа</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createJobForm.enableEscrow}
                      onChange={(e) => setCreateJobForm(prev => ({ ...prev, enableEscrow: e.target.checked }))}
                      className="rounded border-gray-600 text-solana-purple focus:ring-solana-purple"
                    />
                    <span className="text-sm text-gray-300">Использовать эскроу</span>
                  </label>
                </div>
              </div>
            </SimpleCard>

            {/* Действия */}
            <div className="flex gap-3">
              <SimpleButton
                onClick={closeCreateJobModal}
                className="flex-1"
              >
                Отмена
              </SimpleButton>
              <SimpleButton
                gradient={true}
                onClick={async () => {
                  try {
                    await handleCreateJob(createJobForm)
                    closeCreateJobModal()
                    // Сброс формы
                    setCreateJobForm({
                      title: '',
                      description: '',
                      type: 'development',
                      category: '',
                      budget: 0,
                      currency: 'USDC',
                      paymentType: 'fixed',
                      experienceLevel: 'middle',
                      skills: [],
                      requirements: [],
                      deadline: '',
                      isRemote: true,
                      isUrgent: false,
                      enableEscrow: true,
                      milestones: []
                    })
                  } catch (error) {
                    // Ошибка уже обработана в handleCreateJob
                  }
                }}
                disabled={!createJobForm.title || !createJobForm.description || !createJobForm.deadline || createJobForm.budget <= 0}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Опубликовать работу
              </SimpleButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Render Job Details Modal
  const renderJobDetailsModal = () => {
    if (!state.showJobDetails || !state.selectedJob) return null

    const job = state.selectedJob

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closeJobDetailsModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">{job.title}</h2>
            <button
              onClick={closeJobDetailsModal}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Основная информация */}
            <div>
              <p className="text-gray-300 leading-relaxed">{job.description}</p>
            </div>

            {/* Детали */}
            <SimpleCard className="p-4 border border-white/10">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Бюджет:</span>
                    <span className="text-white ml-2 font-semibold">
                      {job.currency === 'SOL' ? '' : job.currency === 'TNG' ? '₸' : '$'}{job.budget.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Тип оплаты:</span>
                    <span className="text-white ml-2">
                      {job.paymentType === 'fixed' ? 'Фиксированная' : 
                       job.paymentType === 'hourly' ? 'Почасовая' : 'По этапам'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Уровень:</span>
                    <span className="text-white ml-2">
                      {job.experienceLevel === 'junior' ? 'Junior' :
                       job.experienceLevel === 'middle' ? 'Middle' :
                       job.experienceLevel === 'senior' ? 'Senior' : 'Expert'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Дедлайн:</span>
                    <span className="text-white ml-2">
                      {new Date(job.deadline).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Локация:</span>
                    <span className="text-white ml-2">
                      {job.isRemote ? 'Удаленно' : job.location || 'Не указано'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Заявок:</span>
                    <span className="text-white ml-2">{job.applicationsCount}</span>
                  </div>
                </div>
              </div>
            </SimpleCard>

            {/* Навыки */}
            {job.skills.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Требуемые навыки</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <Badge key={index} className="bg-solana-purple/20 text-solana-purple border-solana-purple/30">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Работодатель */}
            <SimpleCard className="p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg">
                  {job.employerAvatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{job.employer}</h4>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400"></span>
                    <span className="text-gray-400 text-sm">{job.employerRating.toFixed(1)} рейтинг</span>
                  </div>
                </div>
              </div>
            </SimpleCard>

            {/* Действия */}
            <div className="flex gap-3">
              <SimpleButton
                onClick={() => handleContactEmployer(job)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Связаться
              </SimpleButton>
              {job.status === 'open' && (
                <SimpleButton
                  gradient={true}
                  onClick={() => {
                    closeJobDetailsModal()
                    handleApplyToJob(job)
                  }}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Откликнуться
                </SimpleButton>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Render Application Modal
  const renderApplicationModal = () => {
    if (!state.showApplication || !state.selectedJob) return null

    const job = state.selectedJob

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closeApplicationModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Отклик на: {job.title}</h2>
            <button
              onClick={closeApplicationModal}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Сопроводительное письмо */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Сопроводительное письмо *
              </label>
              <textarea
                value={applicationForm.coverLetter}
                onChange={(e) => setApplicationForm(prev => ({ ...prev, coverLetter: e.target.value }))}
                placeholder="Расскажите о своем опыте, почему вы подходите для этой работы..."
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20 resize-none"
              />
            </div>

            {/* Предложение по бюджету */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ваше предложение по бюджету
                </label>
                <input
                  type="number"
                  value={applicationForm.proposedBudget || ''}
                  onChange={(e) => setApplicationForm(prev => ({ ...prev, proposedBudget: Number(e.target.value) }))}
                  placeholder={job.budget.toString()}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Предполагаемые сроки
                </label>
                <input
                  type="text"
                  value={applicationForm.proposedTimeline}
                  onChange={(e) => setApplicationForm(prev => ({ ...prev, proposedTimeline: e.target.value }))}
                  placeholder="Например: 2 недели"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                />
              </div>
            </div>

            {/* Портфолио */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Портфолио
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="https://github.com/username, https://portfolio.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-white/20"
                  onChange={(e) => {
                    const val = e.target.value.trim()
                    if (!val) return
                    const links = val.split(',').map(s => s.trim()).filter(Boolean)
                    setApplicationForm(prev => ({ ...prev, portfolioLinks: Array.from(new Set([...(prev.portfolioLinks || []), ...links])) }))
                  }}
                />
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) return
                    try {
                      const uploads: string[] = []
                      for (const f of files) {
                        const res = await jobsService.uploadPortfolioFile(f)
                        uploads.push(res.url)
                      }
                      setApplicationForm(prev => ({ ...prev, portfolioLinks: [...(prev.portfolioLinks || []), ...uploads] }))
                      showSuccessNotification('Файлы портфолио загружены')
                    } catch (err) {
                      showErrorNotification('Не удалось загрузить файлы')
                    }
                  }}
                />
              </div>
              {applicationForm.portfolioLinks?.length > 0 && (
                <div className="text-xs text-gray-400">
                  Загружено: {applicationForm.portfolioLinks.length}
                </div>
              )}
            </div>

            {/* Действия */}
            <div className="flex gap-3">
              <SimpleButton
                onClick={closeApplicationModal}
                className="flex-1"
              >
                Отмена
              </SimpleButton>
              <SimpleButton
                gradient={true}
                onClick={async () => {
                  try {
                    await handleSubmitApplication(job, applicationForm)
                    closeApplicationModal()
                    // Сброс формы
                    setApplicationForm({
                      coverLetter: '',
                      proposedBudget: 0,
                      proposedTimeline: '',
                      portfolioLinks: [],
                      estimatedHours: 0
                    })
                  } catch (error) {
                    // Ошибка уже обработана
                  }
                }}
                disabled={!applicationForm.coverLetter.trim()}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Отправить заявку
              </SimpleButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      {isLoading ? (
        <LoadingFallback />
      ) : (
        <>
          {/* 3D Background */}
          <div className="fixed inset-0 opacity-10">
            <Scene3DBackground />
          </div>
          
          <PageLayout showBottomNav={true}>
            <div className="space-y-5 pb-safe ultra-smooth-scroll no-horizontal-scroll mobile-scroll-container overflow-y-auto">
            
              {/* HEADER */}
              <JobsHeader
                title="Jobs Marketplace"
                subtitle="Найди работу мечты в Web3"
                activeJobsCount={stats.openJobs}
                totalFreelancers={jobsStats?.totalFreelancers || 0}
                averageJobValue={jobsStats?.averageJobValue || 0}
                onOpenSettings={() => showInfoNotification('Настройки')}
                onRefresh={() => {
                  showInfoNotification('Обновление данных...')
                  refreshAll()
                }}
              />

              {/* QUICK ACTIONS */}
              <JobsQuickActions onAction={handleQuickAction} />

              {/* STATS OVERVIEW */}
              <motion.div
                className="px-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <SimpleCard className="p-4 border border-white/10 bg-gradient-to-br from-solana-green/10 to-blue-500/5">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <Briefcase className="w-4 h-4 text-solana-green mr-1" />
                        <span className="text-lg font-bold text-white">{stats.openJobs}</span>
                      </div>
                      <p className="text-xs text-gray-400">Открытых работ</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <DollarSign className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-lg font-bold text-white">
                          ${Math.round(stats.averageBudget / 1000)}K
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Средний бюджет</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <Users className="w-4 h-4 text-blue-400 mr-1" />
                        <span className="text-lg font-bold text-white">{jobsStats?.totalFreelancers || 0}</span>
                      </div>
                      <p className="text-xs text-gray-400">Фрилансеров</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                        <span className="text-lg font-bold text-white">{jobsStats?.successRate || 0}%</span>
                      </div>
                      <p className="text-xs text-gray-400">Успешность</p>
                    </div>
                  </div>
                </SimpleCard>
              </motion.div>

              {/* FILTERS */}
              <JobsFilters
                searchQuery={state.searchQuery}
                filters={state.filters}
                onSearchChange={setSearchQuery}
                onFiltersChange={setFilters}
                onResetFilters={resetFilters}
                resultsCount={filteredJobs.length}
              />

              {/* JOB LISTINGS */}
              <div className="px-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    {filteredJobs.length > 0 
                      ? `Найдено ${filteredJobs.length} работ` 
                      : 'Работы не найдены'}
                  </h3>
                  {stats.featuredJobs > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      {stats.featuredJobs} рекомендуемых
                    </Badge>
                  )}
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Работы не найдены</h3>
                    <p className="text-gray-400 mb-4">
                      Попробуйте изменить фильтры поиска или создайте новую работу
                    </p>
                    <SimpleButton
                      gradient={true}
                      onClick={openCreateJobModal}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Создать работу
                    </SimpleButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredJobs.map((job, index) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        index={index}
                        onJobClick={handleJobClick}
                        onApply={handleApplyToJob}
                        onFavorite={handleToggleFavorite}
                        onShare={handleShareJob}
                        onContact={handleContactEmployer}
                        onCreateEscrow={(j) => {
                          const freelancerId = prompt('Введите ID исполнителя (userId) для эскроу:')
                          if (!freelancerId) return
                          console.log('Creating escrow for job:', j.id, 'freelancer:', freelancerId)
                        }}
                        onFundEscrow={async (j) => {
                          const escrowId = prompt('ID эскроу для фондирования:')
                          if (!escrowId) return
                          try {
                            await jobsService.fundEscrow(escrowId)
                            showSuccessNotification('Эскроу фондирован')
                          } catch {
                            showErrorNotification('Ошибка фондирования эскроу')
                          }
                        }}
                        onReleaseEscrow={async (j) => {
                          const escrowId = prompt('ID эскроу для релиза:')
                          if (!escrowId) return
                          const amtStr = prompt('Сумма релиза (опционально), в единицах токена:') || undefined
                          try {
                            await jobsService.releaseEscrow(escrowId, amtStr ? Number(amtStr) : undefined)
                            showSuccessNotification('Релиз выполнен')
                          } catch {
                            showErrorNotification('Ошибка релиза эскроу')
                          }
                        }}
                        onCancelEscrow={async (j) => {
                          const escrowId = prompt('ID эскроу для отмены:')
                          if (!escrowId) return
                          try {
                            await jobsService.cancelEscrow(escrowId)
                            showSuccessNotification('Эскроу отменен')
                          } catch {
                            showErrorNotification('Ошибка отмены эскроу')
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </PageLayout>

          {/* MODALS */}
          <AnimatePresence>
            {renderCreateJobModal()}
            {renderJobDetailsModal()}
            {renderApplicationModal()}
          </AnimatePresence>
          
          {/* Notification Toast */}
          {state.notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`
                fixed top-4 left-4 right-4 p-4 rounded-xl backdrop-blur-sm z-[110]
                ${state.notification.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                  state.notification.type === 'error' ? 'bg-red-500/20 border border-red-500/30' :
                  state.notification.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                  'bg-blue-500/20 border border-blue-500/30'
                }
              `}
            >
              <p className="text-white font-medium">{state.notification.message}</p>
            </motion.div>
          )}
        </>
      )}
    </ClientOnly>
  )
}

