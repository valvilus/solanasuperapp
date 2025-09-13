/**
 * Analytics Chart Component - Beautiful interactive charts for portfolio analytics
 * Uses SVG and Framer Motion for smooth animations
 * Solana SuperApp
 */

'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

interface ChartDataPoint {
  timestamp: number
  value?: number
  pnl?: number
  pnlPercent?: number
  apy?: number
}

interface AnalyticsChartProps {
  data: ChartDataPoint[]
  type: 'value' | 'pnl' | 'apy' | 'allocation'
  title: string
  currentValue?: number
  currentChange?: number
  currentChangePercent?: number
  height?: number
  showTooltip?: boolean
  gradientColors?: [string, string]
}

export function AnalyticsChart({
  data,
  type,
  title,
  currentValue,
  currentChange,
  currentChangePercent,
  height = 200,
  showTooltip = true,
  gradientColors = ['#8b5cf6', '#3b82f6']
}: AnalyticsChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
        <div className="flex items-center justify-center h-48 text-gray-400">
          <BarChart3 className="w-12 h-12 mb-2" />
          <p>Нет данных для отображения</p>
        </div>
      </div>
    )
  }

  // Extract values based on chart type
  const values = data.map(point => {
    switch (type) {
      case 'pnl':
        return point.pnl || 0
      case 'apy':
        return point.apy || 0
      case 'allocation':
        return point.value || 0
      default:
        return point.value || 0
    }
  })

  // Calculate chart dimensions and scaling
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue
  const padding = 20
  const chartWidth = 600
  const chartHeight = height - padding * 2

  // Create SVG path for the line
  const createPath = (values: number[]) => {
    if (values.length < 2) return ''
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * chartWidth
      const y = chartHeight - ((value - minValue) / valueRange) * chartHeight
      return { x, y }
    })

    let path = `M ${points[0].x} ${points[0].y}`
    
    // Create smooth curve using quadratic bezier curves
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      path += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`
    }
    
    return path
  }

  const linePath = createPath(values)
  
  // Create area path (same as line but closed at bottom)
  const areaPath = linePath + ` L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  // Chart points for interaction
  const chartPoints = values.map((value, index) => ({
    x: (index / (values.length - 1)) * chartWidth,
    y: chartHeight - ((value - minValue) / valueRange) * chartHeight,
    value,
    originalData: data[index]
  }))

  // Format value based on type
  const formatValue = (value: number) => {
    switch (type) {
      case 'pnl':
        return `${value >= 0 ? '+' : ''}$${value.toFixed(2)}`
      case 'apy':
        return `${value.toFixed(1)}%`
      case 'allocation':
        return `${value.toFixed(1)}%`
      default:
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  const isPositive = (currentChange || 0) >= 0

  return (
    <motion.div
      className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          {currentValue !== undefined && (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">
                {formatValue(currentValue)}
              </span>
              {currentChange !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{formatValue(Math.abs(currentChange))}</span>
                  {currentChangePercent !== undefined && (
                    <span>({currentChangePercent >= 0 ? '+' : ''}{currentChangePercent.toFixed(2)}%)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setMousePosition({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            })
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id={`gradient-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} stopOpacity="0.3" />
              <stop offset="100%" stopColor={gradientColors[1]} stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id={`line-gradient-${type}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={(i / 4) * chartHeight}
              x2={chartWidth}
              y2={(i / 4) * chartHeight}
              stroke="rgba(107, 114, 128, 0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Area */}
          <motion.path
            d={areaPath}
            fill={`url(#gradient-${type})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={`url(#line-gradient-${type})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          {/* Interactive Points */}
          {chartPoints.map((point, index) => (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? 6 : 4}
              fill={gradientColors[0]}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onMouseEnter={() => setHoveredPoint(index)}
              whileHover={{ scale: 1.2 }}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {showTooltip && hoveredPoint !== null && (
          <motion.div
            className="absolute z-10 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 pointer-events-none"
            style={{
              left: mousePosition.x,
              top: mousePosition.y - 80,
              transform: 'translateX(-50%)'
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-sm">
              <div className="text-gray-300 mb-1">
                {new Date(chartPoints[hoveredPoint].originalData.timestamp).toLocaleDateString('ru-RU', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="text-white font-semibold">
                {formatValue(chartPoints[hoveredPoint].value)}
              </div>
              {type === 'pnl' && chartPoints[hoveredPoint].originalData.pnlPercent && (
                <div className={`text-xs ${chartPoints[hoveredPoint].originalData.pnlPercent! >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {chartPoints[hoveredPoint].originalData.pnlPercent! >= 0 ? '+' : ''}
                  {chartPoints[hoveredPoint].originalData.pnlPercent!.toFixed(2)}%
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
