'use client'

import React, { useState, useEffect } from 'react'
import './modal-styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, MinusCircle, Coins } from 'lucide-react'
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

const VOTE_OPTIONS = [
  {
    type: 'for' as VoteType,
    label: 'За',
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-400',
  },
  {
    type: 'against' as VoteType,
    label: 'Против',
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-400',
  },
  {
    type: 'abstain' as VoteType,
    label: 'Воздержаться',
    icon: MinusCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-400',
  }
]

export function VoteModalMinimal({
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

  // Load user voting power
  useEffect(() => {
    if (isOpen && proposal) {
      loadUserVotingPower()
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

  const handleVote = async () => {
    if (!proposal || !selectedVote) return

    setIsSubmitting(true)
    setError('')

    try {
      await DAOService.voteOnProposal(apiCall, proposal.id, selectedVote, comment.trim() || undefined)
      onVoteSuccess()
      onClose()
      
      // Reset state
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

    if (diff <= 0) return 'Завершено'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}д ${hours}ч`
    return `${hours}ч`
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

  if (!proposal) return null

  const progress = getVoteProgress(proposal)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ height: '100vh', overflow: 'hidden' }}
        >
          {/* Minimal spacer сверху */}
          <div className="h-4 flex-shrink-0" />
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 pt-2 modal-scrollable modal-content modal-bottom-safe">
            <motion.div
              className={`w-full max-w-md ${className}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
            <SimpleCard className="p-6 border border-white/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Голосование</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Proposal Info */}
              <div className="mb-6">
                <h3 className="text-white font-medium mb-2">{proposal.title}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{proposal.description}</p>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>Кворум: {progress.quorumProgress.toFixed(1)}%</span>
                  <span>Осталось: {formatTimeRemaining(proposal.endTime)}</span>
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-400">За: {proposal.votesFor || 0}</span>
                    <span className="text-red-400">Против: {proposal.votesAgainst || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-l-full transition-all duration-300"
                      style={{ width: `${progress.forPercentage}%` }}
                    />
                    <div 
                      className="bg-red-500 h-2 rounded-r-full -mt-2 ml-auto transition-all duration-300"
                      style={{ width: `${progress.againstPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Voting Power */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Coins className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">Сила голоса: {votingPower} TNG</span>
              </div>

              {/* Vote Options */}
              <div className="space-y-3 mb-6">
                {VOTE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.type}
                      onClick={() => setSelectedVote(option.type)}
                      className={`w-full p-4 rounded-lg border transition-all ${
                        selectedVote === option.type
                          ? `${option.borderColor} ${option.bgColor}`
                          : 'border-white/20 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${selectedVote === option.type ? option.color : 'text-gray-400'}`} />
                        <span className={`font-medium ${selectedVote === option.type ? 'text-white' : 'text-gray-300'}`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">Комментарий (необязательно)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Ваше мнение..."
                  rows={2}
                  maxLength={200}
                />
                <p className="text-gray-400 text-xs mt-1">{comment.length}/200</p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm mb-4">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Отмена
                </Button>
                
                <Button
                  onClick={handleVote}
                  disabled={isSubmitting || !selectedVote || votingPower === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Голосую...</span>
                    </div>
                  ) : (
                    'Проголосовать'
                  )}
                </Button>
              </div>
              </SimpleCard>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
