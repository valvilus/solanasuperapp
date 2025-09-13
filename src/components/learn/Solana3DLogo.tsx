'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface Solana3DLogoProps {
  color?: string
  size?: number
  animated?: boolean
  advanced?: boolean
}

export function Solana3DLogo({ 
  color = '#9945FF', 
  size = 0.4, 
  animated = true,
  advanced = false 
}: Solana3DLogoProps) {
  const logoRef = useRef<THREE.Group>(null)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (!animated) return
    
    if (logoRef.current) {
      logoRef.current.rotation.y = state.clock.elapsedTime * 0.5
      logoRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
      logoRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    }
    
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = state.clock.elapsedTime * 0.4
    }
    
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -state.clock.elapsedTime * 0.6
    }
    
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = state.clock.elapsedTime * 0.8
    }
  })

  return (
    <group ref={logoRef}>
      {/* Центральный токен Solana */}
      <Sphere args={[size]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={advanced ? 0.2 : 0.1}
          speed={advanced ? 3 : 1.5}
          roughness={0.1}
          metalness={0.9}
        />
      </Sphere>
      
      {/* Орбитальные кольца в стиле Solana */}
      <group>
        {/* Внешнее кольцо */}
        <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 2, size * 0.05, 8, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        
        {/* Среднее кольцо */}
        <mesh ref={ring2Ref} rotation={[Math.PI / 2, Math.PI / 3, 0]}>
          <torusGeometry args={[size * 1.5, size * 0.03, 6, 24]} />
          <meshBasicMaterial color="#14F195" transparent opacity={0.4} />
        </mesh>
        
        {/* Внутреннее кольцо для продвинутых курсов */}
        {advanced && (
          <mesh ref={ring3Ref} rotation={[Math.PI / 2, Math.PI / 6, 0]}>
            <torusGeometry args={[size * 1.2, size * 0.02, 4, 16]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
          </mesh>
        )}
      </group>
      
      {/* Световые эффекты */}
      {advanced && (
        <group>
          <pointLight position={[0, 0, size]} intensity={0.5} color={color} />
          <pointLight position={[size, size, 0]} intensity={0.3} color="#14F195" />
          <pointLight position={[-size, -size, 0]} intensity={0.2} color="#FFD700" />
        </group>
      )}
      
      {/* Плавающие частицы для популярных курсов */}
      {advanced && (
        <group>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2
            const radius = size * 2.5
            const height = Math.sin(angle * 2) * size * 0.5
            return (
              <Sphere
                key={i}
                args={[size * 0.05]}
                position={[
                  Math.cos(angle) * radius,
                  height,
                  Math.sin(angle) * radius
                ]}
              >
                <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
              </Sphere>
            )
          })}
        </group>
      )}
    </group>
  )
}



















































