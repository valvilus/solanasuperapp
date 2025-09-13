'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, Text, RoundedBox, MeshDistortMaterial } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface WalletCard3DProps {
  balance: string
  token: 'SOL' | 'USDC' | 'TNG'
  usdValue?: string
  className?: string
  onClick?: () => void
}

// 3D Карточка кошелька
function AnimatedCard({ token, balance, usdValue, onClick }: {
  token: string
  balance: string
  usdValue?: string
  onClick?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  // Анимация вращения и колебания
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1
      meshRef.current.rotation.y += delta * 0.1
      
      // Эффект hover
      if (hovered) {
        meshRef.current.scale.setScalar(
          1 + Math.sin(state.clock.elapsedTime * 3) * 0.05
        )
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      }
    }
  })

  const handleClick = () => {
    setClicked(true)
    hapticFeedback.impact('medium')
    onClick?.()
    setTimeout(() => setClicked(false), 200)
  }

  // Цвета для разных токенов
  const tokenColors = {
    SOL: '#9945FF',
    USDC: '#2775CA', 
    TNG: '#14F195'
  }

  return (
    <group onClick={handleClick}>
      <RoundedBox
        ref={meshRef}
        args={[3, 2, 0.2]}
        radius={0.1}
        smoothness={8}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={clicked ? [0.95, 0.95, 0.95] : [1, 1, 1]}
      >
        <MeshDistortMaterial
          color={tokenColors[token as keyof typeof tokenColors]}
          attach="material"
          distort={hovered ? 0.3 : 0.1}
          speed={2}
          roughness={0.1}
          metalness={0.8}
        />
      </RoundedBox>
      
      {/* Token название */}
      <Text
        position={[0, 0.5, 0.11]}
        fontSize={0.3}
        color="white"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        {token}
      </Text>
      
      {/* Баланс */}
      <Text
        position={[0, 0, 0.11]}
        fontSize={0.4}
        color="white"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        {balance}
      </Text>
      
      {/* USD значение */}
      {usdValue && (
        <Text
          position={[0, -0.4, 0.11]}
          fontSize={0.2}
          color="#B8BCC8"
          anchorX="center"
          anchorY="middle"
        >
          ${usdValue}
        </Text>
      )}
    </group>
  )
}

export function WalletCard3D({ 
  balance, 
  token, 
  usdValue, 
  className = '',
  onClick 
}: WalletCard3DProps) {
  return (
    <motion.div
      className={`w-full h-48 glass-card ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#14F195" />
        
        <AnimatedCard
          token={token}
          balance={balance}
          usdValue={usdValue}
          onClick={onClick}
        />
      </Canvas>
    </motion.div>
  )
}

// Компонент для отображения плавающих частиц
function FloatingParticles() {
  const particlesRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.002
      particlesRef.current.children.forEach((child, index) => {
        child.position.y += Math.sin(state.clock.elapsedTime + index) * 0.01
      })
    }
  })

  return (
    <group ref={particlesRef}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Box
          key={i}
          args={[0.05, 0.05, 0.05]}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          ]}
        >
          <meshBasicMaterial color="#9945FF" transparent opacity={0.3} />
        </Box>
      ))}
    </group>
  )
}

// 3D Background для страниц
interface Scene3DBackgroundProps {
  className?: string
  showParticles?: boolean
}

export function Scene3DBackground({ 
  className = '',
  showParticles = true 
}: Scene3DBackgroundProps) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={0.5} color="#9945FF" />
        
        {showParticles && <FloatingParticles />}
      </Canvas>
    </div>
  )
}
