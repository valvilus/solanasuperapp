'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, Text, RoundedBox, MeshDistortMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { SimpleCard } from '@/components/ui/simple-card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Copy, Star, Crown } from 'lucide-react'
import { ProfileUser, UserRanking } from '@/features/profile/types'
import { getRankTitle, generateAvatarPlaceholder } from '@/features/profile/utils'
import { EditableBio } from './EditableBio'
import { useWallet } from '@/hooks/useWallet'

interface UserCard3DProps {
  user: ProfileUser
  ranking: UserRanking
  onCopyAddress?: (address?: string | null) => void
  onEditProfile?: () => void
  className?: string
}

// 3D аватар компонент
function Avatar3D({ user, ranking }: { user: ProfileUser; ranking: UserRanking }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1
    }
    
    if (glowRef.current) {
      glowRef.current.rotation.y -= 0.01
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      glowRef.current.scale.setScalar(scale)
    }
  })

  const avatarColor = user.isPremium ? '#FFD700' : '#9945FF'
  const glowColor = user.isPremium ? '#FFA500' : '#14F195'

  return (
    <group>
      {/* Светящийся эффект */}
      <Sphere ref={glowRef} args={[1.2]} position={[0, 0, -0.5]}>
        <meshBasicMaterial color={glowColor} transparent opacity={0.1} />
      </Sphere>
      
      {/* Основной аватар */}
      <RoundedBox
        ref={meshRef}
        args={[1.5, 1.5, 0.3]}
        radius={0.2}
        smoothness={8}
      >
        <MeshDistortMaterial
          color={avatarColor}
          attach="material"
          distort={0.2}
          speed={1}
          roughness={0.1}
          metalness={0.8}
        />
      </RoundedBox>
      
      {/* Уровень */}
      <Text
        position={[0, 0.8, 0.2]}
        fontSize={0.2}
        color="white"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        LVL {ranking.currentLevel}
      </Text>
      
      {/* Инициалы */}
      <Text
        position={[0, 0, 0.2]}
        fontSize={0.4}
        color="white"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        {user.firstName.charAt(0)}{user.lastName?.charAt(0) || ''}
      </Text>
      
      {/* Premium корона */}
      {user.isPremium && (
        <Text
          position={[0, -0.8, 0.2]}
          fontSize={0.15}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
        >
          👑
        </Text>
      )}
    </group>
  )
}

// Плавающие частицы для премиум аккаунтов
function PremiumParticles() {
  const particlesRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.children.forEach((child, index) => {
        child.position.y += Math.sin(state.clock.elapsedTime + index) * 0.01
        child.rotation.z += 0.02
      })
    }
  })

  return (
    <group ref={particlesRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Sphere
          key={i}
          args={[0.02]}
          position={[
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2
          ]}
        >
          <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
        </Sphere>
      ))}
    </group>
  )
}

export function UserCard3D({ 
  user, 
  ranking, 
  onCopyAddress, 
  onEditProfile, 
  className = '' 
}: UserCard3DProps) {
  const { custodial, external, activeWallet } = useWallet()
  
  // Получаем активный адрес кошелька
  const getActiveAddress = () => {
    if (activeWallet === 'custodial' && custodial.address) {
      return custodial.address
    } else if (activeWallet === 'external' && external.address) {
      return external.address
    } else if (custodial.address) {
      return custodial.address
    } else if (external.address) {
      return external.address
    }
    return null
  }

  // Функция для сокращения адреса
  const formatAddress = (address: string | null) => {
    if (!address) return 'Кошелек не подключен'
    return `${address.slice(0, 5)}...${address.slice(-4)}`
  }

  const walletAddress = getActiveAddress()
  const displayAddress = formatAddress(walletAddress)
  const rankTitle = getRankTitle(ranking.currentLevel)
  
  return (
    <motion.div
      className={`${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <SimpleCard className="p-5 border border-white/10 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-cyan-900/20 relative overflow-hidden">
        {/* Улучшенный 3D фон */}
        <div className="absolute inset-0 opacity-30">
          <Canvas
            camera={{ position: [0, 0, 6], fov: 50 }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.4} />
            <pointLight position={[8, 8, 8]} intensity={1.2} color="#9945FF" />
            <pointLight position={[-8, -8, 8]} intensity={0.8} color="#14F195" />
            <pointLight position={[0, 8, -8]} intensity={0.6} color="#00D4FF" />
            
            <Avatar3D user={user} ranking={ranking} />
            {user.isPremium && <PremiumParticles />}
          </Canvas>
        </div>

        {/* ГОРИЗОНТАЛЬНЫЙ LAYOUT */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Левая часть - Аватар */}
          <motion.div
            className="flex-shrink-0"
            initial={{ scale: 0.8, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <div className="relative">
              <Avatar className="h-16 w-16 ring-3 ring-cyan-400/50 border-2 border-white/30">
                <AvatarImage 
                  src={user.photoUrl || generateAvatarPlaceholder(`${user.firstName} ${user.lastName || ''}`)} 
                  alt={user.firstName} 
                />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 text-white font-bold text-lg">
                  {user.firstName.charAt(0)}{user.lastName?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              
              {/* Индикатор уровня */}
              <motion.div
                className="absolute -top-1 -right-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full px-1.5 py-0.5 text-xs font-bold text-white shadow-lg"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {ranking.currentLevel}
              </motion.div>
              
              {/* Premium значок */}
              {user.isPremium && (
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Crown className="h-4 w-4 text-yellow-400 fill-current drop-shadow-lg" />
                </motion.div>
              )}
            </div>
          </motion.div>
          
          {/* Правая часть - Информация */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Имя и Username */}
            <div className="mb-2">
              <h2 className="text-lg font-bold text-white leading-tight">
                {user.firstName} {user.lastName}
              </h2>
              {user.username && (
                <p className="text-cyan-300 text-sm font-medium">
                  @{user.username}
                </p>
              )}
            </div>
            
            {/* Бейджи */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 text-cyan-200 border-cyan-400/30 text-xs px-2 py-1">
                {rankTitle}
              </Badge>
              
              {user.isPremium && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-2 py-1">
                  <Star className="w-2.5 h-2.5 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            
            {/* Bio - Редактируемое поле */}
            <div className="mb-2">
              <EditableBio
                bio={user.bio || ''}
                onSave={async (newBio: string) => {
                  // В реальном приложении здесь будет API запрос
                  return true
                }}
                placeholder="Расскажите о себе..."
                maxLength={160}
              />
            </div>
            
            {/* Прогресс уровня */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>LVL {ranking.currentLevel}</span>
                <span>{ranking.currentXP.toLocaleString()} / {ranking.nextLevelXP.toLocaleString()} XP</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${((ranking.currentXP - (ranking.nextLevelXP - (ranking.nextLevelXP - ranking.currentXP))) / (ranking.nextLevelXP - ranking.currentXP)) * 100}%` 
                  }}
                  transition={{ delay: 0.5, duration: 1.5 }}
                />
              </div>
            </div>
            
            {/* Адрес кошелька */}
            <motion.div
              className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 transition-all cursor-pointer border border-white/10"
              whileTap={{ scale: 0.98 }}
              onClick={() => onCopyAddress?.(walletAddress)}
            >
              <span className="text-gray-300 text-xs font-mono flex-1 truncate">{displayAddress}</span>
              <Copy className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            </motion.div>
          </motion.div>
        </div>

        {/* Улучшенная градиентная рамка для премиум */}
        {user.isPremium && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/15 via-orange-400/10 to-yellow-400/15 border border-yellow-400/20"
            animate={{ 
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </SimpleCard>
    </motion.div>
  )
}
