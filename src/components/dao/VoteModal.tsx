'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, MinusCircle, MessageSquare, Coins, Clock, Users, TrendingUp } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Button } from '@/components/ui/button'
import { Proposal, VoteType } from '@/features/dao/types/dao.types'
import { DAOService } from '@/features/dao/services/dao.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface VoteModalProps {
  proposal: Proposal | null
  isOpen: boolean
  onClose: () => void
  onVoteSuccess: () => void
  className?: string
}

export function VoteModal({
  proposal,
  isOpen,
  onClose,
  onVoteSuccess,
  className = ''
}: VoteModalProps) {
  const { apiCall } = useCompatibleAuth()
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [votingPower, setVotingPower] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [canVote, setCanVote] = useState<boolean>(true)

  // Загружаем voting power пользователя
  useEffect(() => {
    if (isOpen && proposal) {
      loadUserVotingPower()
      checkVotingEligibility()
    }
  }, [isOpen, proposal])

  const loadUserVotingPower = async () => {
    try {
      // ИСПРАВЛЕНО: Используем правильный вызов с apiCall как первый параметр
      const power = await DAOService.getUserVotingPower(apiCall)
      console.log(' VoteModal: Loaded voting power:', power)
      setVotingPower(power)
    } catch (error) {
      console.error(' VoteModal: Error loading voting power:', error)
      setVotingPower(0)
    }
  }

  const checkVotingEligibility = async () => {
    if (!proposal) return

    try {
      // ИСПРАВЛЕНО: Улучшена обработка ошибок и логика проверки
      const eligible = await DAOService.canUserVote(apiCall, 'current-user', proposal.id)
      setCanVote(eligible)
      
      if (!eligible) {
        if (proposal.userVote) {
          setError('Вы уже проголосовали по этому предложению')
        } else if (votingPower < 100) {
          setError('Недостаточно TNG токенов для голосования (минимум 100 TNG)')
        } else if (proposal.status !== 'active') {
          setError('Голосование по этому предложению завершено')
        } else {
          setError('Голосование временно недоступно')
        }
      } else {
        setError('') // Очищаем ошибку если всё ок
      }
    } catch (error) {
      console.error('Error checking voting eligibility:', error)
      // ИСПРАВЛЕНО: Если проверка на блокчейне не удалась, всё равно позволяем голосовать
      // если у пользователя достаточно токенов и нет других ограничений
      const canVoteBasic = votingPower >= 100 && 
                          !proposal.userVote && 
                          proposal.status === 'active'
      
      setCanVote(canVoteBasic)
      
      if (canVoteBasic) {
        setError('Проверка статуса голосования временно недоступна, но вы можете голосовать')
      } else {
        setError('Голосование недоступно')
      }
    }
  }

  const handleVote = async () => {
    if (!proposal || !selectedVote || !canVote) return

    setIsSubmitting(true)
    setError('')

    try {
      await DAOService.voteOnProposal(apiCall, proposal.id, selectedVote, comment.trim() || undefined)
      onVoteSuccess()
      onClose()
      
      // Сбрасываем состояние
      setSelectedVote(null)
      setComment('')
    } catch (error: any) {
      console.error('Error voting:', error)
      setError(error.message || 'Произошла ошибка при голосовании')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Голосование завершено'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days} дн. ${hours} ч.`
    if (hours > 0) return `${hours} ч. ${minutes} мин.`
    return `${minutes} мин.`
  }

  const getVoteProgress = (proposal: Proposal) => {
    const totalVotes = (proposal.votesFor || 0) + (proposal.votesAgainst || 0)
    const requiredQuorum = proposal.requiredQuorum || 1000

    return {
      forPercentage: totalVotes > 0 ? ((proposal.votesFor || 0) / totalVotes) * 100 : 0,
      againstPercentage: totalVotes > 0 ? ((proposal.votesAgainst || 0) / totalVotes) * 100 : 0,
      quorumProgress: Math.min((totalVotes / requiredQuorum) * 100, 100),
      quorumReached: totalVotes >= requiredQuorum
    }
  }

  const voteOptions = [
    {
      type: 'for' as VoteType,
      label: 'За',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400',
      description: 'Поддерживаю это предложение'
    },
    {
      type: 'against' as VoteType,
      label: 'Против',
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-400',
      description: 'Не согласен с предложением'
    },
    {
      type: 'abstain' as VoteType,
      label: 'Воздержаться',
      icon: MinusCircle,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-400',
      description: 'Не хочу влиять на результат'
    }
  ]

  if (!isOpen || !proposal) return null

  const progress = getVoteProgress(proposal)
  const timeRemaining = formatTimeRemaining(proposal.endTime)
  const isActive = proposal.status === 'active' && new Date() < new Date(proposal.endTime)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <SimpleCard className="p-6 bg-gray-900 border border-white/10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-bold text-white mb-2">{proposal.title}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{timeRemaining}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{(proposal.voteCount || 0)} голосов</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{proposal.category}</span>
                  </div>
                </div>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Статистика голосования */}
            <div className="mb-6 p-4 bg-white/5 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-3">Текущие результаты</h3>
              
              <div className="space-y-3">
                {/* За */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-400">За</span>
                    <span className="text-white">{proposal.votesFor || 0} ({progress.forPercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.forPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Против */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-400">Против</span>
                    <span className="text-white">{proposal.votesAgainst || 0} ({progress.againstPercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress.againstPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Кворум */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Кворум</span>
                    <span className="text-white">
                      {((proposal.votesFor || 0) + (proposal.votesAgainst || 0)).toLocaleString()} / {(proposal.requiredQuorum || 0).toLocaleString()}
                      <span className={`ml-2 ${progress.quorumReached ? 'text-green-400' : 'text-yellow-400'}`}>
                        ({progress.quorumProgress.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress.quorumReached ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${progress.quorumProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ваш voting power */}
            <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Ваша сила голоса</span>
                </div>
                <span className="text-blue-400 font-bold">{votingPower.toLocaleString()} TNG</span>
              </div>
              {votingPower < 100 && (
                <p className="text-yellow-400 text-xs mt-2">
                   Для голосования требуется минимум 100 TNG токенов
                </p>
              )}
            </div>

            {/* Уже проголосовал */}
            {proposal.userVote && (
              <div className="mb-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h3 className="text-green-400 font-medium mb-2">Ваш голос учтен</h3>
                <div className="flex items-center justify-between">
                  <span className="text-white">
                    Вы проголосовали: <span className="font-bold">{proposal.userVote.voter === 'for' ? 'За' : proposal.userVote.voter === 'against' ? 'Против' : 'Воздерживаюсь'}</span>
                  </span>
                  <span className="text-green-400">{proposal.userVote.weight?.toLocaleString()} TNG</span>
                </div>
                {proposal.userVote.comment && (
                  <div className="mt-2 p-2 bg-white/5 rounded text-sm text-gray-300">
                    <span className="text-gray-500">Комментарий: </span>
                    {proposal.userVote.comment}
                  </div>
                )}
              </div>
            )}

            {/* Варианты голосования */}
            {canVote && !proposal.userVote && isActive && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-4">Ваш голос</h3>
                <div className="grid grid-cols-1 gap-3">
                  {voteOptions.map((option) => {
                    const Icon = option.icon
                    const isSelected = selectedVote === option.type
                    
                    return (
                      <motion.button
                        key={option.type}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedVote(option.type)}
                        className={`p-4 rounded-lg border transition-all text-left ${
                          isSelected
                            ? `${option.bgColor} ${option.borderColor} ${option.color}`
                            : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className={`w-5 h-5 ${isSelected ? option.color : 'text-gray-400'}`} />
                            <div>
                              <span className="font-medium">{option.label}</span>
                              <p className="text-xs opacity-80 mt-1">{option.description}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className={`w-3 h-3 rounded-full ${option.color.replace('text-', 'bg-')}`} />
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Комментарий */}
            {canVote && !proposal.userVote && isActive && selectedVote && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Комментарий (опционально)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Объясните свою позицию..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{comment.length}/500</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                {proposal.userVote ? 'Закрыть' : 'Отмена'}
              </Button>
              
              {canVote && !proposal.userVote && isActive && (
                <Button
                  onClick={handleVote}
                  disabled={!selectedVote || isSubmitting}
                  className={`flex-1 ${
                    selectedVote === 'for' ? 'bg-green-600 hover:bg-green-700' :
                    selectedVote === 'against' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Голосование...</span>
                    </div>
                  ) : (
                    `Проголосовать ${selectedVote ? `(${voteOptions.find(o => o.type === selectedVote)?.label})` : ''}`
                  )}
                </Button>
              )}
            </div>

            {/* Информация о неактивном голосовании */}
            {!isActive && (
              <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-300 text-sm text-center">
                 Период голосования завершен
              </div>
            )}
          </SimpleCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
