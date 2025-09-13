/**
 * Token Logos Component - Official and custom token logos
 * Solana SuperApp - Wallet Components
 */

'use client'

import React from 'react'

interface TokenLogoProps {
  token: 'SOL' | 'TNG' | 'USDC' | string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Solana SVG Logo Component
export const SolanaLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 397.7 311.7"
    className={className}
    fill="currentColor"
  >
    <defs>
      <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00FFA3" />
        <stop offset="100%" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
    <path
      fill="url(#solana-gradient)"
      d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"
    />
    <path
      fill="url(#solana-gradient)"
      d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"
    />
    <path
      fill="url(#solana-gradient)"
      d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"
    />
  </svg>
)

// TNG Custom Logo Component
export const TNGLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="currentColor"
  >
    <defs>
      <linearGradient id="tng-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9945FF" />
        <stop offset="50%" stopColor="#00FFA3" />
        <stop offset="100%" stopColor="#14F195" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Outer ring with glow */}
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="none"
      stroke="url(#tng-gradient)"
      strokeWidth="2"
      filter="url(#glow)"
      opacity="0.7"
    />
    
    {/* Inner circle background */}
    <circle
      cx="50"
      cy="50"
      r="35"
      fill="url(#tng-gradient)"
      opacity="0.1"
    />
    
    {/* TNG Text */}
    <text
      x="50"
      y="58"
      textAnchor="middle"
      fontSize="20"
      fontWeight="bold"
      fontFamily="system-ui, -apple-system, sans-serif"
      fill="url(#tng-gradient)"
      filter="url(#glow)"
    >
      TNG
    </text>
    
    {/* Decorative elements */}
    <circle cx="30" cy="30" r="2" fill="url(#tng-gradient)" opacity="0.8"/>
    <circle cx="70" cy="30" r="2" fill="url(#tng-gradient)" opacity="0.6"/>
    <circle cx="30" cy="70" r="2" fill="url(#tng-gradient)" opacity="0.6"/>
    <circle cx="70" cy="70" r="2" fill="url(#tng-gradient)" opacity="0.8"/>
    
    {/* Central star/rocket element */}
    <path
      d="M50 25 L52 35 L60 32 L54 40 L62 42 L50 45 L38 42 L46 40 L40 32 L48 35 Z"
      fill="url(#tng-gradient)"
      opacity="0.9"
    />
  </svg>
)

// USDC Logo Component
export const USDCLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="currentColor"
  >
    <circle cx="16" cy="16" r="16" fill="#2775CA"/>
    <path
      d="M15.75 10.5C15.75 9.25 16.5 8.5 17.75 8.5H18.25C19.5 8.5 20.25 9.25 20.25 10.5V11.75H22V10.5C22 8.25 20.25 6.5 18 6.5H17.75C15.5 6.5 13.75 8.25 13.75 10.5V11.75H11V21.25H13.75V22.5C13.75 23.75 14.5 24.5 15.75 24.5H16.25C17.5 24.5 18.25 23.75 18.25 22.5V21.25H20V22.5C20 24.75 18.25 26.5 16 26.5H15.75C13.5 26.5 11.75 24.75 11.75 22.5V21.25H9V11.75H11.75V10.5H15.75ZM15.75 13.75V19.25H13.75V13.75H15.75ZM18.25 13.75V19.25H20.25V13.75H18.25Z"
      fill="white"
    />
  </svg>
)

export function TokenLogo({ token, size = 'md', className = '' }: TokenLogoProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const baseClassName = `${sizeClasses[size]} ${className}`

  switch (token) {
    case 'SOL':
      return <SolanaLogo className={baseClassName} />
    case 'TNG':
      return <TNGLogo className={baseClassName} />
    case 'USDC':
      return <USDCLogo className={baseClassName} />
    default:
      return (
        <div className={`${baseClassName} rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold`}>
          {token && typeof token === 'string' ? token.slice(0, 2).toUpperCase() : '??'}
        </div>
      )
  }
}
