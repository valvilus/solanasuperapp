'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { Solana3DLogo } from './Solana3DLogo'

interface SolanaLoader3DProps {
  title?: string
  subtitle?: string
  size?: 'small' | 'medium' | 'large'
  color?: string
  className?: string
}

export function SolanaLoader3D({ 
  title = 'Загрузка...', 
  subtitle = 'Подключение к Solana...',
  size = 'medium',
  color = '#9945FF',
  className = ''
}: SolanaLoader3DProps) {
  
  const sizeConfig = {
    small: { 
      container: 'w-16 h-16', 
      tokenSize: 0.2, 
      titleClass: 'text-sm', 
      subtitleClass: 'text-xs' 
    },
    medium: { 
      container: 'w-24 h-24', 
      tokenSize: 0.3, 
      titleClass: 'text-lg', 
      subtitleClass: 'text-sm' 
    },
    large: { 
      container: 'w-32 h-32', 
      tokenSize: 0.4, 
      titleClass: 'text-xl', 
      subtitleClass: 'text-base' 
    }
  }
  
  const config = sizeConfig[size]

  return (
    <motion.div 
      className={`text-center ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 3D Solana Token Loader */}
      <div className={`${config.container} mx-auto mb-4 relative`}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[3, 3, 3]} intensity={1} color={color} />
          <pointLight position={[-3, -3, 3]} intensity={0.5} color="#14F195" />
          
          <Suspense fallback={null}>
            <Solana3DLogo 
              color={color}
              size={config.tokenSize}
              animated={true}
              advanced={true}
            />
          </Suspense>
        </Canvas>
        
        {/* Pulsing glow effect */}
        <motion.div
          className={`absolute inset-0 rounded-full opacity-20`}
          style={{ 
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            filter: 'blur(8px)'
          }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Loading Text */}
      <motion.h3 
        className={`${config.titleClass} font-semibold text-white mb-2`}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {title}
      </motion.h3>
      
      <motion.p 
        className={`${config.subtitleClass} text-gray-400`}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
      >
        {subtitle}
      </motion.p>
      
      {/* Loading dots animation */}
      <motion.div 
        className="flex justify-center gap-1 mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}

// Preloader для полного экрана
export function SolanaFullScreenLoader({ 
  title = 'Solana SuperApp', 
  subtitle = 'Подключение к экосистеме...' 
}: Pick<SolanaLoader3DProps, 'title' | 'subtitle'>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
      <SolanaLoader3D 
        title={title}
        subtitle={subtitle}
        size="large"
        color="#9945FF"
      />
    </div>
  )
}

// Inline loader для компонентов
export function SolanaInlineLoader({ 
  title = 'Загрузка...',
  subtitle,
  size = 'small' 
}: Pick<SolanaLoader3DProps, 'title' | 'subtitle' | 'size'>) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <SolanaLoader3D 
        title={title}
        subtitle={subtitle}
        size={size}
        color="#9945FF"
      />
    </div>
  )
}



















































