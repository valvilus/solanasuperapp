'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import ClientOnly from '@/components/common/ClientOnly'
import { 
  Wallet, 
  Sparkles, 
  Users, 
  GraduationCap, 
  User,
  Home,
  Briefcase,
  TrendingUp,
  Building 
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  path: string
  badge?: number
}

const navigationItems: NavItem[] = [
  {
    id: 'home',
    label: 'Главная',
    icon: Home,
    path: '/'
  },
  {
    id: 'wallet',
    label: 'Кошелек',
    icon: Wallet,
    path: '/wallet'
  },
  {
    id: 'nft',
    label: 'NFT',
    icon: Sparkles,
    path: '/nft'
  },
  {
    id: 'defi',
    label: 'DeFi',
    icon: TrendingUp,
    path: '/defi'
  },
  {
    id: 'learn',
    label: 'Учеба',
    icon: GraduationCap,
    path: '/learn'
  },
  {
    id: 'jobs',
    label: 'Работа',
    icon: Briefcase,
    path: '/jobs'
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: User,
    path: '/profile'
  }
]

export function useBottomNavigation() {
  const router = useRouter()
  
  const navigateTo = (path: string) => {
    hapticFeedback.impact('light')
    router.push(path)
  }

  return { navigateTo }
}

export function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  // Стабилизированный useEffect для предотвращения циклов
  useEffect(() => {
    const currentItem = navigationItems.find(item => 
      item.path === pathname || (item.path !== '/' && pathname.startsWith(item.path))
    )
    const newActiveTab = currentItem?.id || 'home'
    
    // Обновляем только если действительно изменилось
    setActiveTab(prev => prev !== newActiveTab ? newActiveTab : prev)
  }, [pathname])

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleTabPress = useCallback((item: NavItem) => {
    if (activeTab !== item.id) {
      hapticFeedback.impact('medium')
      // НЕ вызываем setActiveTab здесь - useEffect сделает это автоматически
      router.push(item.path)
    } else {
      hapticFeedback.selection()
    }
  }, [activeTab, router])

  return (
    <ClientOnly fallback={<div className="fixed bottom-0 left-0 right-0 z-50 h-20" />}>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ 
          y: isVisible ? 0 : 120, 
          opacity: isVisible ? 1 : 0 
        }}
        transition={{ 
          type: "spring",
          stiffness: 320,
          damping: 26,
          mass: 0.8
        }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
      {/* Subtle backdrop, tighter to the bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-[#0A0A0F]/20 to-transparent" />

      {/* Slim navigation container */}
      <div className="relative mx-3 mb-2">
        {/* Glass morphism container - slimmer */}
        <motion.div 
          className="premium-nav-glass rounded-[20px] p-1 shadow-premium"
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: 0.05,
            type: "spring",
            stiffness: 420,
            damping: 24
          }}
        >
          {/* Inner container */}
          <div className="bg-gradient-to-r from-white/[0.02] via-white/[0.04] to-white/[0.02] rounded-[16px] p-1">
            <div className="flex items-center justify-between gap-1">
              {navigationItems.map((item, index) => {
                const isActive = activeTab === item.id
                const Icon = item.icon

                return (
                  <motion.button
                    key={item.id}
                    className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 touch-manipulation group"
                    onTap={() => handleTabPress(item)}
                    whileTap={{ 
                      scale: 0.94,
                      transition: { duration: 0.08 }
                    }}
                    whileHover={{ 
                      scale: 1.01,
                      transition: { duration: 0.15 }
                    }}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1 
                    }}
                    transition={{ 
                      delay: 0.1 + index * 0.06,
                      type: "spring",
                      stiffness: 520,
                      damping: 26
                    }}
                  >
                    {/* Solana themed active background */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="premiumActiveTab"
                          className="absolute inset-0 rounded-[14px] solana-active-bg"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 540, 
                            damping: 28,
                            mass: 0.8
                          }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Hover background */}
                    <motion.div
                      className="absolute inset-0 rounded-[16px] bg-white/5"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* Icon container with perfect sizing */}
                    <div className="relative z-10 mb-1.5">
                      <motion.div
                        className="relative flex items-center justify-center w-6 h-6"
                        animate={{
                          scale: isActive ? 1.06 : 1,
                          y: isActive ? -1 : 0,
                          rotateY: isActive ? [0, 5, -5, 0] : 0
                        }}
                        transition={{ 
                          duration: isActive ? 0.5 : 0.25,
                          ease: "easeOut"
                        }}
                      >
                        <Icon 
                          className={`w-5 h-5 transition-all duration-200 ${
                            isActive 
                              ? 'text-white' 
                              : 'text-gray-400 group-hover:text-gray-200'
                          }`}
                        />
                        

                      </motion.div>
                      
                      {/* Premium badge with glass effect */}
                      {item.badge && (
                        <motion.div
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full premium-badge flex items-center justify-center"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ 
                            delay: 0.4 + index * 0.1,
                            type: "spring",
                            stiffness: 600,
                            damping: 20
                          }}
                        >
                          <span className="text-[9px] font-bold text-white">
                            {item.badge}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    {/* Premium label with perfect typography */}
                    <motion.span
                      className={`text-[10px] font-medium transition-all duration-200 ${
                        isActive 
                          ? 'text-white font-semibold' 
                          : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                      animate={{
                        opacity: isActive ? 1 : 0.8,
                        y: isActive ? 0 : 1,
                        scale: isActive ? 1.02 : 1
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      {item.label}
                    </motion.span>

                    {/* Premium active indicator */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute -bottom-1 left-1/2 w-1 h-1 premium-dot"
                          initial={{ opacity: 0, scale: 0, x: '-50%' }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            x: '-50%',
                            y: [0, -2, 0]
                          }}
                          exit={{ opacity: 0, scale: 0, x: '-50%' }}
                          transition={{ 
                            delay: 0.12,
                            type: "spring",
                            stiffness: 650,
                            damping: 24,
                            y: {
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
          </div>
          {/* Subtle gradient hairline */}
          <motion.div
            className="absolute -bottom-px left-2 right-2 h-px rounded-full bg-gradient-to-r from-white/5 via-white/2 to-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          />
        </motion.div>
      </div>

        {/* Safe area spacer */}
        <div className="h-safe-area-inset-bottom" />
      </motion.div>
    </ClientOnly>
  )
}

export default BottomTabBar