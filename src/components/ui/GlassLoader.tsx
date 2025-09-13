'use client'

import React from 'react'

interface GlassLoaderProps {
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function GlassLoader({ size = 'sm', className = '' }: GlassLoaderProps) {
  const sizeClasses = {
    xs: 'w-10 h-3 rounded-md',
    sm: 'w-14 h-4 rounded-lg',
    md: 'w-20 h-5 rounded-xl'
  }[size]

  return (
    <div
      className={`relative ${sizeClasses} overflow-hidden ${className}`}
      aria-label="Loading"
      role="status"
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10" />
      <div className="absolute inset-0">
        <div className="w-1/3 h-full bg-white/20 blur-md animate-[slide_1.2s_ease-in-out_infinite]" />
      </div>
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  )
}

export default GlassLoader



