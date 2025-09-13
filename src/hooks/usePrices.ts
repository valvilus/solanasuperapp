/**
 * Prices Hook - Fetch token prices and calculate changes
 * Solana SuperApp
 */

'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface TokenPrice {
  symbol: string
  name: string
  price: number // USD
  priceKZT: number // В тенге
  currency: string
  lastUpdated: Date
  source: string
  price24hAgo?: number
  change24h?: number
  changePercent24h?: number
  isPositive?: boolean
  confidence?: number // Pyth confidence interval
}

export interface CurrencyRates {
  USD: number // 1
  KZT: number // актуальный курс
  lastUpdated: Date
}

// Cache для цен (5 минут)
let priceCache: { data: Record<string, TokenPrice>; timestamp: number } | null = null
const PRICE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Pyth price feed IDs for major tokens
const PYTH_PRICE_FEEDS = {
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'
}

export function usePrices() {
  const { apiCall } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currencies, setCurrencies] = useState<CurrencyRates | null>(null)
  const [pythPrices, setPythPrices] = useState<Record<string, TokenPrice>>({})
  const pythWsRef = useRef<WebSocket | null>(null)

  // Pyth real-time price subscription
  useEffect(() => {
    const connectToPyth = () => {
      try {
        const ws = new WebSocket('wss://hermes.pyth.network/ws')
        pythWsRef.current = ws

        ws.onopen = () => {
          console.log('Connected to Pyth Network')
          // Subscribe to price feeds
          const subscribeMessage = {
            type: 'subscribe',
            ids: Object.values(PYTH_PRICE_FEEDS)
          }
          ws.send(JSON.stringify(subscribeMessage))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'price_update') {
              const { price_feed } = data
              if (price_feed) {
                // Find symbol by feed ID
                const symbol = Object.keys(PYTH_PRICE_FEEDS).find(
                  key => PYTH_PRICE_FEEDS[key as keyof typeof PYTH_PRICE_FEEDS] === price_feed.id
                )
                
                if (symbol && price_feed.price) {
                  const price = parseFloat(price_feed.price.price) * Math.pow(10, price_feed.price.expo)
                  const confidence = parseFloat(price_feed.price.conf) * Math.pow(10, price_feed.price.expo)
                  
                  setPythPrices(prev => ({
                    ...prev,
                    [symbol]: {
                      symbol,
                      name: symbol,
                      price,
                      priceKZT: price * (currencies?.KZT || 450),
                      currency: 'USD',
                      source: 'Pyth',
                      lastUpdated: new Date(),
                      confidence
                    } as TokenPrice
                  }))
                }
              }
            }
          } catch (err) {
            console.error('Error parsing Pyth message:', err)
          }
        }

        ws.onerror = (error) => {
          console.error('Pyth WebSocket error:', error)
        }

        ws.onclose = () => {
          console.log('Pyth WebSocket closed, reconnecting in 5s...')
          setTimeout(connectToPyth, 5000)
        }
      } catch (err) {
        console.error('Error connecting to Pyth:', err)
        setTimeout(connectToPyth, 5000)
      }
    }

    connectToPyth()

    return () => {
      if (pythWsRef.current) {
        pythWsRef.current.close()
      }
    }
  }, [currencies])

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (pythWsRef.current) {
        pythWsRef.current.close()
      }
    }
  }, [])

  const getPrices = useCallback(async (symbols: string[] = ['SOL', 'TNG', 'USDC'], include24h = true, forceRefresh = false): Promise<Record<string, TokenPrice>> => {
    try {
      // Проверяем кэш, если не форсируем обновление
      if (!forceRefresh && priceCache && Date.now() - priceCache.timestamp < PRICE_CACHE_DURATION) {
        return priceCache.data
      }

      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('symbols', symbols.join(','))
      params.append('include24h', include24h.toString())
      params.append('includeCurrency', 'true') // Получаем курсы валют

      // Используем авторизованный вызов для получения цен
      const response = await apiCall(`/api/prices?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки цен')
      }

      // Извлекаем курсы валют
      const currencyRates: CurrencyRates = {
        USD: 1,
        KZT: data.data.currencies?.KZT?.rate || 450,
        lastUpdated: new Date()
      }
      setCurrencies(currencyRates)

      // Transform prices and merge with Pyth data
      const prices: Record<string, TokenPrice> = {}
      for (const [symbol, priceData] of Object.entries(data.data.prices)) {
        const price = priceData as any
        // Use Pyth price if available and recent, otherwise use API price
        const pythPrice = pythPrices[symbol]
        const shouldUsePyth = pythPrice && 
          Date.now() - pythPrice.lastUpdated.getTime() < 30000 // 30 seconds freshness
        
        prices[symbol] = {
          symbol: price.symbol,
          name: price.name,
          price: shouldUsePyth ? pythPrice.price : price.price,
          priceKZT: (shouldUsePyth ? pythPrice.price : price.price) * currencyRates.KZT,
          currency: 'USD',
          source: shouldUsePyth ? 'Pyth' : 'API',
          lastUpdated: shouldUsePyth ? pythPrice.lastUpdated : new Date(price.lastUpdated),
          change24h: price.change24h,
          changePercent24h: price.change24h,
          isPositive: price.change24h ? price.change24h > 0 : undefined,
          confidence: shouldUsePyth ? (pythPrice as any).confidence : undefined
        }
      }

      // Кэшируем результат
      priceCache = {
        data: prices,
        timestamp: Date.now()
      }

      return prices
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  const calculatePortfolioValue = useCallback((balances: Record<string, number>, prices: Record<string, TokenPrice>): {
    totalValue: number
    totalChange24h: number
    totalChangePercent24h: number
    isPositive: boolean
  } => {
    let totalValue = 0
    let totalValue24hAgo = 0

    for (const [symbol, balance] of Object.entries(balances)) {
      const price = prices[symbol]
      if (price && balance > 0) {
        totalValue += balance * price.price
        if (price.price24hAgo) {
          totalValue24hAgo += balance * price.price24hAgo
        }
      }
    }

    const totalChange24h = totalValue - totalValue24hAgo
    const totalChangePercent24h = totalValue24hAgo > 0 ? (totalChange24h / totalValue24hAgo) * 100 : 0

    return {
      totalValue,
      totalChange24h,
      totalChangePercent24h,
      isPositive: totalChangePercent24h > 0
    }
  }, [])

  return {
    getPrices,
    calculatePortfolioValue,
    loading,
    error,
    currencies,
    pythPrices,
    isPythConnected: pythWsRef.current?.readyState === WebSocket.OPEN
  }
}
