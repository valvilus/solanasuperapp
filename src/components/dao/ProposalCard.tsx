'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle, XCircle, MinusCircle, MessageSquare, Share2, ExternalLink } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Proposal } from '@/features/dao/types/dao.types'
import { 
  getProposalTypeColor, 
  calculateVotePercentage, 
  calculateQuorumPercentage,
  getTimeRemaining,
  formatLargeNumber 
} from '@/features/dao/utils'

interface ProposalCardProps {
  proposal: Proposal
  index?: number
  onVoteFor?: (e?: React.MouseEvent) => void
  onVoteAgainst?: (e?: React.MouseEvent) => void
  onVoteAbstain?: (e?: React.MouseEvent) => void
  onClick?: (proposal: Proposal) => void
  onShare?: (proposal: Proposal) => void
  onOpenDiscussion?: (proposal: Proposal) => void
  isLoading?: boolean
  showHistoryMode?: boolean
  className?: string
}

export function ProposalCard({ 
  proposal, 
  index = 0,
  onVoteFor,
  onVoteAgainst,
  onVoteAbstain,
  onClick,
  onShare,
  onOpenDiscussion,
  isLoading = false,
  showHistoryMode = false,
  className = ''
}: ProposalCardProps) {
  const votePercentage = calculateVotePercentage(proposal)
  const quorumPercentage = calculateQuorumPercentage(proposal)
  const timeRemaining = getTimeRemaining(proposal.endTime)
  const isActive = proposal.status === 'active'

  // Функция для открытия Solana Explorer
  const openSolanaExplorer = (address: string, type: 'address' | 'tx' = 'address') => {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'https://explorer.solana.com' 
      : 'https://explorer.solana.com'
    
    const cluster = process.env.NODE_ENV === 'development' ? '?cluster=devnet' : ''
    const url = `${baseUrl}/${type}/${address}${cluster}`
    
    window.open(url, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={className}
      onClick={() => onClick?.(proposal)}
    >
      <SimpleCard 
        className="cursor-pointer group hover:border-white/20"
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getProposalTypeColor(proposal.type)} text-white border-0 text-xs`}>
                  {proposal.category}
                </Badge>
                {isActive && !timeRemaining.isExpired && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeRemaining.timeText}
                  </Badge>
                )}
                {timeRemaining.isExpired && (
                  <Badge variant="destructive" className="text-xs">
                    Истекло
                  </Badge>
                )}
              </div>
              <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">
                {proposal.title}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2">
                {proposal.description}
              </p>
            </div>
          </div>

          {/* Proposer info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <div className="flex items-center space-x-2">
              <span>Предложил: {proposal.proposer}</span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e?.stopPropagation?.()
                  openSolanaExplorer(proposal.proposer)
                }}
                className="text-blue-400 hover:text-blue-300"
                title="Исследовать создателя в Solana Explorer"
              >
                <ExternalLink className="w-3 h-3" />
              </motion.button>
            </div>
            <span>{new Date(proposal.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>

        {/* Voting results */}
        <div className="space-y-3 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-400">За: {formatLargeNumber(proposal.votesFor)} TNG</span>
              <span className="text-red-400">Против: {formatLargeNumber(proposal.votesAgainst)} TNG</span>
            </div>
            <Progress value={votePercentage} className="h-2" />
            <div className="text-xs text-gray-500 text-center">
              {votePercentage.toFixed(1)}% голосов "За"
            </div>
          </div>
          
          {/* Quorum */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Кворум</span>
              <span className="text-gray-400">
                {formatLargeNumber(proposal.totalVotes)} / {formatLargeNumber(proposal.requiredQuorum)}
              </span>
            </div>
            <Progress value={quorumPercentage} className="h-1" />
            <div className="text-xs text-gray-500 text-center">
              {quorumPercentage.toFixed(1)}% от кворума
            </div>
          </div>
        </div>

        {/* Actions - Improved responsive layout */}
        <div className="flex flex-col gap-3">
          {isActive && !timeRemaining.isExpired && !showHistoryMode && (
            <div className="grid grid-cols-3 gap-2">
              <SimpleButton 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                onClick={() => {
                  onVoteFor?.()
                }}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                За
              </SimpleButton>
              <SimpleButton 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 text-xs px-2"
                onClick={() => {
                  onVoteAgainst?.()
                }}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Против
              </SimpleButton>
              <SimpleButton 
                size="sm" 
                className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600 text-xs px-2"
                onClick={() => {
                  onVoteAbstain?.()
                }}
              >
                <MinusCircle className="w-3 h-3 mr-1" />
                Воздержаться
              </SimpleButton>
            </div>
          )}
          
          {/* Secondary actions - Compact layout */}
          <div className="flex items-center justify-center gap-1">
            {proposal.discussionUrl && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e?.stopPropagation?.()
                  onOpenDiscussion?.(proposal)
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="Обсуждение"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              </motion.button>
            )}
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e?.stopPropagation?.()
                onShare?.(proposal)
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Поделиться"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-400" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e?.stopPropagation?.()
                // В реальной ситуации здесь был бы PDA предложения
                // Пока используем DAO program address
                openSolanaExplorer('HbDYHpNrayUvx5z4m81QRaQR7iLapK5Co7eW27Zn2ZYh')
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            </motion.button>
          </div>
        </div>

        {/* Tags */}
        {proposal.tags && proposal.tags.length > 0 && (
          <motion.div 
            className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {proposal.tags.slice(0, 3).map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="px-2 py-1 text-xs bg-white/5 text-gray-400 rounded-md"
              >
                #{tag}
              </span>
            ))}
            {proposal.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-white/5 text-gray-500 rounded-md">
                +{proposal.tags.length - 3}
              </span>
            )}
          </motion.div>
        )}
      </SimpleCard>
    </motion.div>
  )
}
































