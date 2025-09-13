'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'
import ClientOnly from '@/components/common/ClientOnly'
import { useBottomNavigation } from '@/components/navigation/BottomTabBar'
import { useTelegram, hapticFeedback } from '@/components/telegram/TelegramProvider'
import { AuthGuard, UserInfo, LogoutButton, AuthSettings } from '@/components/auth'
import { Settings, LogOut } from 'lucide-react'

// Profile Components
import {
  ProfileHeader,
  UserCard3D,
  AchievementsSection,
  QuickActionsProfile,
  ProfileStatsGrid,
  NotificationToastProfile
} from '@/components/profile'

// Business Logic & Data
import {
  useProfileState,
  useProfileActions,
  profileUser,
  userStats,
  userRanking,
  achievements
} from '@/features/profile'

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  )
}

function ProfilePageContent() {
  const { user } = useTelegram()
  const { navigateTo } = useBottomNavigation()
  const router = useRouter()
  
  // State Management
  const {
    state,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    openEditProfile,
    openAchievements,
    openSettings,
    openActivity
  } = useProfileState()

  // Actions
  const { 
    handleQuickAction, 
    handleCopyWalletAddress,
    handleAchievementClick,
    handleShareProfile,
    handleLogout
  } = useProfileActions(
    () => {}, // setSelectedTab - заглушка
    () => {}, // setIsLoading - заглушка
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    openEditProfile,
    openAchievements,
    openSettings,
    openActivity
  )

  // Создаем профиль из данных Telegram или используем mock
  const currentUser = user ? {
    ...profileUser,
    firstName: user.first_name,
    lastName: user.last_name || '',
    username: user.username,
    photoUrl: user.photo_url,
    languageCode: user.language_code,
    isPremium: user.is_premium || false,
    telegramId: user.id
  } : profileUser

  return (
    <ClientOnly>
      {/* 3D Background with premium particles */}
      <div className="fixed inset-0 opacity-15">
        <Scene3DBackground showParticles={currentUser.isPremium} />
      </div>
      
      <PageLayout showBottomNav={true}>
        <div className="space-y-5 pb-safe ultra-smooth-scroll no-horizontal-scroll mobile-scroll-container overflow-y-auto">
        
          {/* HEADER */}
          <ProfileHeader
            user={currentUser}
            onOpenSettings={() => handleQuickAction('settings')}
            onShare={handleShareProfile}
            onEdit={() => handleQuickAction('edit-profile')}
            isEditing={state.isEditing}
            onBack={() => router.back()}
          />

          {/* 3D USER CARD */}
          <div className="px-5">
            <UserCard3D
              user={currentUser}
              ranking={userRanking}
              onCopyAddress={(address) => handleCopyWalletAddress(address)}
              onEditProfile={() => handleQuickAction('edit-profile')}
            />
          </div>

          {/* QUICK ACTIONS */}
          <QuickActionsProfile onAction={handleQuickAction} />

          {/* STATISTICS GRID */}
          <ProfileStatsGrid 
            stats={userStats}
            ranking={userRanking}
          />

          {/* ACHIEVEMENTS SECTION */}
          <AchievementsSection
            achievements={achievements}
            onAchievementClick={handleAchievementClick}
            showAll={state.showAchievements}
          />

          {/* SETTINGS PREVIEW */}
          <div className="px-5 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Быстрые настройки</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => handleQuickAction('settings')}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2 flex justify-center">
                    <Settings className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-xs text-white">Все настройки</p>
                </div>
              </div>
              
              <div 
                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={handleLogout}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2 flex justify-center">
                    <LogOut className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-xs text-red-400">Выйти</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </PageLayout>
      
      {/* Notification Toast */}
      <NotificationToastProfile notification={state.notification} />
      
    </ClientOnly>
  )
}
