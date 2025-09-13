'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  MessageSquare,
  Share2,
  ExternalLink,
  Vote
} from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Proposal } from '@/features/dao/types/dao.types'
import { DAOService } from '@/features/dao/services/dao.service'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'

interface ProposalDetailsModalProps {
  proposal: Proposal | null
  isOpen: boolean
  onClose: () => void
  onVote: () => void
  onShare: () => void
  className?: string
}

export function ProposalDetailsModal({
  proposal,
  isOpen,
  onClose,
  onVote,
  onShare,
  className = ''
}: ProposalDetailsModalProps) {
  const { apiCall } = useCompatibleAuth()
  const [proposalDetails, setProposalDetails] = useState<Proposal | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load detailed proposal data
  useEffect(() => {
    if (isOpen && proposal) {
      loadProposalDetails(proposal.id)
    }
  }, [isOpen, proposal])

  const loadProposalDetails = async (proposalId: string) => {
    setIsLoading(true)
    try {
      const details = await DAOService.getProposalDetails(apiCall, proposalId)
      setProposalDetails(details)
    } catch (error) {
      console.error('Error loading proposal details:', error)
      setProposalDetails(proposal)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date()
    const end = new Date(endTime)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Завершено'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days} дн. ${hours} ч.`
    return `${hours} ч.`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20 border-green-500'
      case 'passed': return 'text-blue-400 bg-blue-500/20 border-blue-500'
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500'
      case 'executed': return 'text-purple-400 bg-purple-500/20 border-purple-500'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активное'
      case 'passed': return 'Принято'
      case 'rejected': return 'Отклонено'
      case 'executed': return 'Исполнено'
      default: return status
    }
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

  if (!isOpen || !proposal) return null

  const currentProposal = proposalDetails || proposal
  const isActive = currentProposal.status === 'active' && new Date() < new Date(currentProposal.endTime)
  const progress = getVoteProgress(currentProposal)

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
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <SimpleCard className="p-6 border border-white/20 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div className="flex-1 pr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={`px-2 py-1 text-xs ${getStatusColor(currentProposal.status)}`}>
                    {getStatusLabel(currentProposal.status)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentProposal.category}
                  </Badge>
                </div>
                
                <h2 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                  {currentProposal.title}
                </h2>
                
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeRemaining(currentProposal.endTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {(currentProposal as any).voteCount || 0} голосов
                  </span>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-white mb-2">Описание</h3>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">
                        {currentProposal.description}
                      </p>
                    </div>
                  </div>

                  {/* Voting Results */}
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Результаты голосования</h3>
                    
                    {/* Compact voting stats */}
                    <div className="space-y-3">
                      {/* За/Против */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          За: {(currentProposal.votesFor || 0).toLocaleString()} ({progress.forPercentage.toFixed(1)}%)
                        </span>
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Против: {(currentProposal.votesAgainst || 0).toLocaleString()} ({progress.againstPercentage.toFixed(1)}%)
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-700 rounded-full h-2 relative">
                        <div 
                          className="bg-green-500 h-2 rounded-l-full transition-all duration-300"
                          style={{ width: `${progress.forPercentage}%` }}
                        />
                        <div 
                          className="bg-red-500 h-2 rounded-r-full absolute top-0 right-0 transition-all duration-300"
                          style={{ width: `${progress.againstPercentage}%` }}
                        />
                      </div>
                      
                      {/* Кворум */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Кворум: {((currentProposal.votesFor || 0) + (currentProposal.votesAgainst || 0)).toLocaleString()} / {(currentProposal.requiredQuorum || 0).toLocaleString()}
                        </span>
                        <span className={progress.quorumReached ? 'text-green-400' : 'text-yellow-400'}>
                          {progress.quorumProgress.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full transition-all duration-300 ${
                            progress.quorumReached ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${progress.quorumProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Vote Status */}
                  {(currentProposal as any).userVote && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-green-400 text-sm flex items-center gap-1">
                          <Vote className="w-3 h-3" />
                          Ваш голос: {(currentProposal as any).userVote.vote === 'for' ? 'За' : 
                                      (currentProposal as any).userVote.vote === 'against' ? 'Против' : 'Воздерживаюсь'}
                        </span>
                        <span className="text-green-400 text-xs font-medium">
                          {currentProposal.userVote.weight?.toLocaleString()} TNG
                        </span>
                      </div>
                      {currentProposal.userVote.comment && (
                        <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                          {currentProposal.userVote.comment}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 pt-4 border-t border-white/10">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  size="sm"
                >
                  Закрыть
                </Button>
                
                {isActive && !currentProposal.userVote && (
                  <Button
                    onClick={onVote}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Голосовать
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={onShare}
                  size="sm"
                  className="px-3"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                
                {currentProposal.discussionUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(currentProposal.discussionUrl, '_blank')}
                    size="sm"
                    className="px-3"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </SimpleCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

