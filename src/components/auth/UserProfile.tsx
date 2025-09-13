'use client'

/**
 * User Profile Components - Компоненты профиля пользователя
 * Solana SuperApp - Frontend Authentication
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  LogOut, 
  User, 
  Settings, 
  Shield, 
  Smartphone, 
  Clock,
  ChevronRight,
  Crown,
  Wallet,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLogout, useUserSessions, useUserDisplay } from '@/hooks/useAuth'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

/**
 * User Avatar Component
 */
interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  className?: string
}

export function UserAvatar({ size = 'md', showStatus = false, className = '' }: UserAvatarProps) {
  const { displayName, avatar, user } = useUserDisplay()
  const { isAuthenticated } = useAuth()

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-600 rounded-full flex items-center justify-center ${className}`}>
        <User className="w-1/2 h-1/2 text-gray-400" />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Avatar className={sizeClasses[size]}>
        {avatar ? (
          <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center text-white font-semibold">
            {user.firstName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </Avatar>
      
      {showStatus && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full" />
      )}
      
      {user.isPremium && (
        <div className="absolute -top-1 -right-1">
          <Crown className="w-4 h-4 text-yellow-400" />
        </div>
      )}
    </div>
  )
}

/**
 * User Info Display
 */
export function UserInfo() {
  const { displayName, user } = useUserDisplay()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return (
      <div className="text-gray-400">
        Не авторизован
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <UserAvatar size="md" showStatus />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>ID: {user.telegramId}</span>
          {user.isPremium && (
            <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
              Premium
            </Badge>
          )}
          {user.walletAddress && (
            <Badge className="bg-green-500/20 text-green-400 text-xs">
              <Wallet className="w-3 h-3 mr-1" />
              Кошелек
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Logout Button
 */
interface LogoutButtonProps {
  showConfirm?: boolean
  allDevices?: boolean
  onSuccess?: () => void
  variant?: 'default' | 'DANGER' | 'SIMPLE'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LogoutButton({ 
  showConfirm = true,
  allDevices = false,
  onSuccess,
  variant = 'default',
  size = 'md',
  className = ''
}: LogoutButtonProps) {
  const { logoutUser, isLogging } = useLogout()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleLogout = async () => {
    if (showConfirm && !showConfirmDialog) {
      setShowConfirmDialog(true)
      hapticFeedback.impact('light')
      return
    }

    hapticFeedback.impact('medium')
    setShowConfirmDialog(false)
    
    await logoutUser()
    onSuccess?.()
  }

  const buttonText = allDevices ? 'Выйти везде' : 'Выйти'
  const buttonIcon = <LogOut className="w-4 h-4" />

  if (variant === 'SIMPLE') {
    return (
      <>
        <SimpleButton
          onClick={handleLogout}
          disabled={isLogging}
          className={`${className} ${(variant as any) === 'DANGER' ? 'text-red-400 hover:text-red-300' : ''}`}
        >
          <div className="flex items-center gap-2">
            {buttonIcon}
            {isLogging ? 'Выход...' : buttonText}
          </div>
        </SimpleButton>
        
        {showConfirmDialog && (
          <ConfirmLogoutDialog
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            onConfirm={handleLogout}
            allDevices={allDevices}
          />
        )}
      </>
    )
  }

  const buttonClass = variant === 'DANGER' 
    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
    : ''

  return (
    <>
      <button
        onClick={handleLogout}
        disabled={isLogging}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${buttonClass}
          ${className}
        `}
      >
        {buttonIcon}
        {isLogging ? 'Выход...' : buttonText}
      </button>
      
      {showConfirmDialog && (
        <ConfirmLogoutDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleLogout}
          allDevices={allDevices}
        />
      )}
    </>
  )
}

/**
 * Confirm Logout Dialog
 */
interface ConfirmLogoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  allDevices: boolean
}

function ConfirmLogoutDialog({ isOpen, onClose, onConfirm, allDevices }: ConfirmLogoutDialogProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-2">
              Подтвердите выход
            </h3>
            <p className="text-gray-400 text-sm">
              {allDevices 
                ? 'Вы выйдете из системы на всех устройствах. Потребуется повторная авторизация.'
                : 'Вы выйдете из системы на этом устройстве.'
              }
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <SimpleButton 
            onClick={onClose}
            className="flex-1"
          >
            Отмена
          </SimpleButton>
          <SimpleButton 
            onClick={onConfirm}
            className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Выйти
          </SimpleButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * User Sessions List
 */
export function UserSessions() {
  const { sessions, isLoading, error, revokeSession } = useUserSessions()
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId)
    hapticFeedback.impact('light')
    
    const success = await revokeSession(sessionId)
    
    if (success) {
      hapticFeedback.notification('success')
    } else {
      hapticFeedback.notification('error')
    }
    
    setRevokingSessionId(null)
  }

  if (isLoading) {
    return (
      <SimpleCard className="p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Загрузка сессий...</span>
        </div>
      </SimpleCard>
    )
  }

  if (error) {
    return (
      <SimpleCard className="p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Ошибка: {error}</span>
        </div>
      </SimpleCard>
    )
  }

  return (
    <SimpleCard className="p-4">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Активные сессии
      </h3>
      
      {sessions.length === 0 ? (
        <p className="text-gray-400">Активных сессий не найдено</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {session.deviceInfo?.platform || 'Неизвестное устройство'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Последняя активность: {new Date(session.lastActivity).toLocaleString('ru')}
                  </p>
                </div>
              </div>
              
              <SimpleButton
                onClick={() => handleRevokeSession(session.sessionId)}
                disabled={revokingSessionId === session.sessionId}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                {revokingSessionId === session.sessionId ? 'Отзыв...' : 'Отозвать'}
              </SimpleButton>
            </div>
          ))}
        </div>
      )}
    </SimpleCard>
  )
}

/**
 * Auth Settings Component
 */
export function AuthSettings() {
  return (
    <div className="space-y-4">
      <SimpleCard className="p-4">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Настройки безопасности
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Двухфакторная аутентификация</p>
              <p className="text-xs text-gray-400">Дополнительная защита аккаунта</p>
            </div>
            <SimpleButton className="text-gray-400">
              Настроить
            </SimpleButton>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Уведомления о входе</p>
              <p className="text-xs text-gray-400">Получать уведомления о новых сессиях</p>
            </div>
            <div className="w-8 h-4 bg-solana-purple rounded-full"></div>
          </div>
        </div>
      </SimpleCard>
      
      <UserSessions />
      
      <SimpleCard className="p-4">
        <div className="space-y-3">
          <LogoutButton 
            variant="DANGER" 
            className="w-full justify-center"
          />
          <LogoutButton 
            allDevices
            variant="DANGER" 
            className="w-full justify-center opacity-75"
          />
        </div>
      </SimpleCard>
    </div>
  )
}

