'use client'

import { motion } from 'framer-motion'
import { Settings, Share2, Edit, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProfileUser } from '@/features/profile/types'

interface ProfileHeaderProps {
  user: ProfileUser
  onOpenSettings?: () => void
  onShare?: () => void
  onEdit?: () => void
  isEditing?: boolean
  onBack?: () => void
}

export function ProfileHeader({
  user,
  onOpenSettings,
  onShare,
  onEdit,
  isEditing = false,
  onBack
}: ProfileHeaderProps) {
  return (
    <motion.div
      className="px-5 pt-4 pb-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </motion.button>
          )}
          <h1 className="text-xl font-bold text-white">
            Профиль <span className="text-solana-purple">{user.firstName}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isEditing ? 'Режим редактирования' : 'Управление аккаунтом'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.isPremium && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
              Premium
            </Badge>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            <Edit className="w-4 h-4 text-gray-400" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onShare}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}



















































