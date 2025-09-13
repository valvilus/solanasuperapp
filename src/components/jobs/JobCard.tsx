'use client'

import { motion } from 'framer-motion'
import { 
  Clock, 
  MapPin, 
  Eye, 
  Users, 
  Star, 
  Heart,
  Share2,
  ExternalLink,
  Zap,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import type { Job } from '@/features/jobs/types/jobs.types'
import { 
  jobTypes, 
  experienceLevels, 
  jobStatuses,
  CURRENCY_SYMBOLS 
} from '@/features/jobs/data/constants'

interface JobCardProps {
  job: Job
  index?: number
  onJobClick?: (job: Job) => void
  onApply?: (job: Job) => void
  onFavorite?: (job: Job) => void
  onShare?: (job: Job) => void
  onContact?: (job: Job) => void
  onCreateEscrow?: (job: Job) => void
  onFundEscrow?: (job: Job) => void
  onReleaseEscrow?: (job: Job) => void
  onCancelEscrow?: (job: Job) => void
  className?: string
  isCompact?: boolean
}

export function JobCard({ 
  job, 
  index = 0,
  onJobClick,
  onApply,
  onFavorite,
  onShare,
  onContact,
  onCreateEscrow,
  onFundEscrow,
  onReleaseEscrow,
  onCancelEscrow,
  className = '',
  isCompact = false
}: JobCardProps) {
  const jobType = jobTypes.find(type => type.id === job.type)
  const experienceLevel = experienceLevels.find(level => level.id === job.experienceLevel)
  const jobStatus = jobStatuses.find(status => status.id === job.status)
  const currencySymbol = CURRENCY_SYMBOLS[job.currency]

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Только что'
    if (diffInHours < 24) return `${diffInHours}ч назад`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}д назад`
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}нед назад`
  }

  const formatDeadline = (dateString: string) => {
    const now = new Date()
    const deadline = new Date(dateString)
    const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 0) return 'Просрочено'
    if (diffInDays === 0) return 'Сегодня'
    if (diffInDays === 1) return 'Завтра'
    if (diffInDays < 7) return `${diffInDays} дней`
    if (diffInDays < 30) return `${Math.ceil(diffInDays / 7)} недель`
    return `${Math.ceil(diffInDays / 30)} месяцев`
  }

  const getBudgetDisplay = () => {
    if (job.paymentType === 'hourly' && job.hourlyRate) {
      return `${currencySymbol}${job.hourlyRate}/час`
    }
    return `${currencySymbol}${job.budget.toLocaleString()}`
  }

  const deadlineDays = Math.ceil((new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isUrgent = deadlineDays <= 3 || job.isUrgent
  const isExpired = deadlineDays < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={className}
    >
      <SimpleCard 
        className={`cursor-pointer group hover:border-white/20 transition-all duration-200 ${
          job.isFeatured ? 'border-solana-green/30 bg-solana-green/5' : 'border-white/10'
        } ${isExpired ? 'opacity-60' : ''}`}
        onClick={() => onJobClick?.(job)}
      >
        <div className="p-4 space-y-4">
          {/* Header с индикаторами */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {/* Тип работы */}
                {jobType && (
                  <Badge className={`${jobType.bgColor} ${jobType.color} border-0 text-xs`}>
                    <jobType.icon className="w-3 h-3 mr-1" />
                    {jobType.label}
                  </Badge>
                )}
                
                {/* Статус */}
                {jobStatus && (
                  <Badge className={`${jobStatus.bgColor} ${jobStatus.color} border-0 text-xs`}>
                    {jobStatus.label}
                  </Badge>
                )}
                
                {/* Индикаторы */}
                {job.isFeatured && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-xs">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Топ
                  </Badge>
                )}
                
                {isUrgent && !isExpired && (
                  <Badge className="bg-red-500/20 text-red-400 border-0 text-xs animate-pulse">
                    <Zap className="w-3 h-3 mr-1" />
                    Срочно
                  </Badge>
                )}
                
                {isExpired && (
                  <Badge className="bg-gray-500/20 text-gray-400 border-0 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Истек
                  </Badge>
                )}
              </div>
              
              <h3 className={`font-semibold text-white mb-2 line-clamp-2 ${isCompact ? 'text-sm' : 'text-base'}`}>
                {job.title}
              </h3>
              
              {!isCompact && (
                <p className="text-sm text-gray-400 line-clamp-3 mb-3">
                  {job.description}
                </p>
              )}
            </div>
            
            {/* Бюджет */}
            <div className="text-right ml-4">
              <div className="flex items-center justify-end mb-1">
                <DollarSign className="w-4 h-4 text-solana-green mr-1" />
                <span className={`font-bold text-solana-green ${isCompact ? 'text-lg' : 'text-xl'}`}>
                  {getBudgetDisplay()}
                </span>
              </div>
              {job.paymentType === 'milestone' && job.milestonesCount && (
                <p className="text-xs text-gray-400">{job.milestonesCount} этапов</p>
              )}
            </div>
          </div>

          {/* Работодатель */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm">
                {job.employerAvatar || ''}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{job.employer}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-400">{job.employerRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-400">Опубликовано</p>
              <p className="text-xs text-white">{formatTimeAgo(job.createdAt)}</p>
            </div>
          </div>

          {/* Детали проекта */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              {/* Уровень опыта */}
              {experienceLevel && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">Уровень:</span>
                  <span className={experienceLevel.color}>{experienceLevel.label}</span>
                </div>
              )}
              
              {/* Дедлайн */}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Дедлайн:</span>
                <span className={isExpired ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-white'}>
                  {formatDeadline(job.deadline)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              {/* Местоположение */}
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">
                  {job.isRemote ? 'Удаленно' : job.location || 'Не указано'}
                </span>
              </div>
              
              {/* Статистика */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">{job.viewsCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">{job.applicationsCount} заявок</span>
                </div>
              </div>
            </div>
          </div>

          {/* Навыки */}
          {!isCompact && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.skills.slice(0, 4).map((skill, skillIndex) => (
                <span
                  key={skillIndex}
                  className="px-2 py-1 text-xs bg-white/5 text-gray-300 rounded-md"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 4 && (
                <span className="px-2 py-1 text-xs bg-white/5 text-gray-500 rounded-md">
                  +{job.skills.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Действия */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1">
              {/* Избранное */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onFavorite?.(job)
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Heart className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </motion.button>
              
              {/* Поделиться */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onShare?.(job)
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Share2 className="w-4 h-4 text-gray-400" />
              </motion.button>
              
              {/* Подробнее */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onJobClick?.(job)
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </motion.button>
            </div>
            
            {/* Кнопки действий */}
            <div className="flex gap-2">
              {job.status === 'open' && !isExpired && (
                <>
                  {onContact && (
                    <SimpleButton
                      size="sm"
                      onClick={() => {
                        onContact(job)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Связаться
                    </SimpleButton>
                  )}
                  {onApply && (
                    <SimpleButton
                      size="sm"
                      gradient={true}
                      onClick={() => {
                        onApply(job)
                      }}
                    >
                      Откликнуться
                    </SimpleButton>
                  )}
                  {onCreateEscrow && (
                    <SimpleButton
                      size="sm"
                      onClick={() => {
                        onCreateEscrow(job)
                      }}
                      className="bg-white/5 hover:bg-white/10"
                    >
                      Создать эскроу
                    </SimpleButton>
                  )}
                </>
              )}
              
              {job.status === 'in_progress' && (
                <div className="flex gap-2">
                  {onFundEscrow && (
                    <SimpleButton
                      size="sm"
                      onClick={() => {
                        onFundEscrow(job)
                      }}
                      className="bg-white/5 hover:bg-white/10"
                    >
                      Пополнить
                    </SimpleButton>
                  )}
                  {onReleaseEscrow && (
                    <SimpleButton
                      size="sm"
                      onClick={() => {
                        onReleaseEscrow(job)
                      }}
                      className="bg-solana-green/20 text-solana-green border-solana-green/30"
                    >
                      Выпустить
                    </SimpleButton>
                  )}
                  {onCancelEscrow && (
                    <SimpleButton
                      size="sm"
                      onClick={() => {
                        onCancelEscrow(job)
                      }}
                      className="bg-red-500/20 text-red-400 border-red-500/30"
                    >
                      Отменить
                    </SimpleButton>
                  )}
                </div>
              )}
              
              {job.status === 'completed' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Завершена
                </Badge>
              )}
            </div>
          </div>
        </div>
      </SimpleCard>
    </motion.div>
  )
}

