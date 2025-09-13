'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Ring, Torus } from '@react-three/drei'
import * as THREE from 'three'
import { Token } from '@/features/defi/types'
import { formatTokenAmount, formatCurrency, formatPercentage } from '@/features/defi/utils'

// 3D Token Sphere
function TokenSphere({ color, isActive }: { color: string; isActive: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += isActive ? 0.02 : 0.005
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
      
      if (isActive) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.05)
      }
    }
  })

  return (
    <group>
      {/* Main token sphere */}
      <Sphere ref={meshRef} args={[0.8, 32, 32]}>
        <meshStandardMaterial
          color={color}
          metalness={0.7}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={isActive ? 0.2 : 0.1}
        />
      </Sphere>
      
      {/* Energy rings */}
      {isActive && (
        <>
          <EnergyRing radius={1.2} speed={1} color={color} />
          <EnergyRing radius={1.5} speed={-0.8} color={color} />
        </>
      )}
    </group>
  )
}

// Energy Ring Component
function EnergyRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.z += speed * 0.01
    }
  })

  return (
    <Torus
      ref={ringRef}
      args={[radius, 0.02, 8, 64]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.4}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </Torus>
  )
}

// Price Change Indicator
function PriceIndicator({ change, isPositive }: { change: number; isPositive: boolean }) {
  const particlesRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.children.forEach((particle, index) => {
        const time = state.clock.elapsedTime + index * 0.3
        particle.position.y = Math.sin(time) * 0.3 + 0.5
        particle.position.x = Math.cos(time + index) * 0.2
      })
    }
  })

  return (
    <group ref={particlesRef}>
      {Array.from({ length: 5 }, (_, i) => (
        <Sphere key={i} args={[0.02, 8, 8]} position={[0, i * 0.1, 0]}>
          <meshStandardMaterial
            color={isPositive ? "#4ECDC4" : "#FF6B6B"}
            emissive={isPositive ? "#4ECDC4" : "#FF6B6B"}
            emissiveIntensity={0.5}
          />
        </Sphere>
      ))}
    </group>
  )
}

// Main Token 3D Card Component
interface Token3DCardProps {
  token: Token
  balance?: number
  usdValue?: number
  change24h?: number
  isActive?: boolean
  onClick?: () => void
}

export function Token3DCard({
  token,
  balance = 0,
  usdValue = 0,
  change24h = 0,
  isActive = false,
  onClick
}: Token3DCardProps) {
  
  const isPositive = change24h >= 0
  
  // Generate color based on token symbol
  const getTokenColor = (symbol: string): string => {
    const colors: Record<string, string> = {
      'SOL': '#9945FF',
      'USDC': '#2775CA',
      'TNG': '#14F195',
      'RAY': '#FF6B6B',
      'ORCA': '#00D4FF',
      'MNGO': '#FFE66D'
    }
    return colors[symbol] || '#9945FF'
  }

  const tokenColor = getTokenColor(token.symbol)

  return (
    <motion.div
      className="relative"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <motion.div
        className={`
          relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 
          rounded-2xl p-6 border backdrop-blur-sm cursor-pointer
          ${isActive 
            ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
            : 'border-gray-700/50 hover:border-gray-600/50'
          }
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* 3D Token Visualization */}
        <div className="relative h-24 mb-4 overflow-hidden rounded-xl">
          <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[2, 2, 2]} intensity={0.8} color={tokenColor} />
            <pointLight position={[-2, -2, -1]} intensity={0.4} color="#FFFFFF" />
            
            <TokenSphere color={tokenColor} isActive={isActive} />
            
            {change24h !== 0 && (
              <PriceIndicator change={change24h} isPositive={isPositive} />
            )}
          </Canvas>
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent pointer-events-none" />
        </div>

        {/* Token Info */}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{token.symbol}</h3>
              <p className="text-sm text-gray-400">{token.name}</p>
            </div>
            
            {/* Price change indicator */}
            <motion.div
              className={`
                px-2 py-1 rounded-lg text-xs font-medium
                ${isPositive 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
                }
              `}
              animate={{ 
                scale: isActive ? [1, 1.05, 1] : 1 
              }}
              transition={{ 
                duration: 2, 
                repeat: isActive ? Infinity : 0 
              }}
            >
              {formatPercentage(token.change24h)}
            </motion.div>
          </div>

          {/* Price */}
          <div>
            <p className="text-2xl font-bold text-white">
              ${token.price.toFixed(token.price < 1 ? 4 : 2)}
            </p>
            <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(change24h || token.change24h * token.price / 100)}
            </p>
          </div>

          {/* Balance (if provided) */}
          {balance > 0 && (
            <div className="pt-3 border-t border-gray-700/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Баланс</span>
                <span className="text-sm text-white font-medium">
                  {formatTokenAmount(balance, token.decimals)} {token.symbol}
                </span>
              </div>
              
              {usdValue > 0 && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-400">Стоимость</span>
                  <span className="text-sm text-white font-medium">
                    {formatCurrency(usdValue)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Market data */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/50">
            <div>
              <p className="text-xs text-gray-400">Объем 24ч</p>
              <p className="text-sm text-white font-medium">
                {formatCurrency(token.volume24h)}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-gray-400">Рын. кап.</p>
              <p className="text-sm text-white font-medium">
                {formatCurrency(token.marketCap)}
              </p>
            </div>
          </div>
        </div>

        {/* Active glow effect */}
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-2xl pointer-events-none"
            animate={{
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Sparkle effects */}
        {isActive && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}



















































