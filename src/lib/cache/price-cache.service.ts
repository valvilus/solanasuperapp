/**
 * Price Cache Service - Caches token prices and rates
 * Solana SuperApp Database Optimization
 */

import { PrismaClient } from '@prisma/client'
import { memoryCache } from './memory-cache.service'
import { CacheKeys, CacheTags, CacheTTL } from './cache-keys'

export interface TokenPrice {
  symbol: string
  usdPrice: number
  lastUpdated: string
}

export interface ExchangeRate {
  baseSymbol: string
  quoteSymbol: string
  rate: number
  confidence?: number
  lastUpdated: string
}

export class PriceCacheService {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Получает USD цену токена с кэшированием
   */
  async getTokenPriceUSD(symbol: string): Promise<TokenPrice | null> {
    return await memoryCache.getOrSet(
      CacheKeys.PRICE_USD(symbol),
      async () => {
        // Получаем актив
        const assets = await this.prisma.asset.findMany({
          where: { symbol: { in: [symbol, 'USDC'] } }
        })

        const baseAsset = assets.find(a => a.symbol === symbol)
        const usdAsset = assets.find(a => a.symbol === 'USDC')

        if (!baseAsset || !usdAsset || baseAsset.id === usdAsset.id) {
          return null
        }

        // Получаем последний курс
        const rate = await this.prisma.rate.findFirst({
          where: {
            baseAssetId: baseAsset.id,
            quoteAssetId: usdAsset.id
          },
          orderBy: { createdAt: 'desc' }
        })

        if (!rate) {
          return null
        }

        return {
          symbol,
          usdPrice: Number(rate.rate),
          lastUpdated: rate.timestamp.toISOString()
        } as TokenPrice
      },
      {
        ttl: CacheTTL.PRICES,
        tags: [CacheTags.PRICES, `price:${symbol}`]
      }
    )
  }

  /**
   * Получает курс обмена между двумя токенами
   */
  async getExchangeRate(baseSymbol: string, quoteSymbol: string): Promise<ExchangeRate | null> {
    return await memoryCache.getOrSet(
      CacheKeys.RATE_LATEST(baseSymbol, quoteSymbol),
      async () => {
        // Получаем активы
        const assets = await this.prisma.asset.findMany({
          where: { symbol: { in: [baseSymbol, quoteSymbol] } }
        })

        const baseAsset = assets.find(a => a.symbol === baseSymbol)
        const quoteAsset = assets.find(a => a.symbol === quoteSymbol)

        if (!baseAsset || !quoteAsset) {
          return null
        }

        // Получаем последний курс
        const rate = await this.prisma.rate.findFirst({
          where: {
            baseAssetId: baseAsset.id,
            quoteAssetId: quoteAsset.id
          },
          orderBy: { createdAt: 'desc' }
        })

        if (!rate) {
          return null
        }

        return {
          baseSymbol,
          quoteSymbol,
          rate: Number(rate.rate),
          confidence: rate.confidence ? Number(rate.confidence) : undefined,
          lastUpdated: rate.timestamp.toISOString()
        } as ExchangeRate
      },
      {
        ttl: CacheTTL.RATES,
        tags: [CacheTags.RATES, `rate:${baseSymbol}:${quoteSymbol}`]
      }
    )
  }

  /**
   * Получает все актуальные цены
   */
  async getAllTokenPrices(): Promise<TokenPrice[]> {
    return await memoryCache.getOrSet(
      CacheKeys.ALL_PRICES,
      async () => {
        // Получаем все активы кроме USDC (базовой валюты)
        const assets = await this.prisma.asset.findMany({
          where: { 
            isActive: true,
            symbol: { not: 'USDC' }
          }
        })

        const usdAsset = await this.prisma.asset.findFirst({
          where: { symbol: 'USDC' }
        })

        if (!usdAsset) {
          return []
        }

        // Получаем последние курсы для всех активов
        const rates = await this.prisma.rate.findMany({
          where: {
            quoteAssetId: usdAsset.id,
            baseAssetId: { in: assets.map(a => a.id) }
          },
          distinct: ['baseAssetId'],
          orderBy: { createdAt: 'desc' }
        })

        return assets.map(asset => {
          const rate = rates.find(r => r.baseAssetId === asset.id)
          return {
            symbol: asset.symbol,
            usdPrice: rate ? Number(rate.rate) : 0,
            lastUpdated: rate ? rate.timestamp.toISOString() : new Date().toISOString()
          }
        }).filter(price => price.usdPrice > 0)
      },
      {
        ttl: CacheTTL.PRICES,
        tags: [CacheTags.PRICES]
      }
    )
  }

  /**
   * Конвертирует сумму из одного токена в другой
   */
  async convertAmount(
    amount: bigint,
    fromSymbol: string,
    toSymbol: string
  ): Promise<{ amount: bigint; rate: number } | null> {
    if (fromSymbol === toSymbol) {
      return { amount, rate: 1 }
    }

    const rate = await this.getExchangeRate(fromSymbol, toSymbol)
    if (!rate) {
      return null
    }

    const convertedAmount = BigInt(Math.floor(Number(amount) * rate.rate))
    return {
      amount: convertedAmount,
      rate: rate.rate
    }
  }

  /**
   * Инвалидирует кэш цен
   */
  invalidatePrices(): void {
    memoryCache.invalidateByTag(CacheTags.PRICES)
    console.log(' Invalidated all price caches')
  }

  /**
   * Инвалидирует кэш курсов
   */
  invalidateRates(): void {
    memoryCache.invalidateByTag(CacheTags.RATES)
    console.log(' Invalidated all rate caches')
  }

  /**
   * Инвалидирует кэш для конкретного токена
   */
  invalidateTokenPrice(symbol: string): void {
    memoryCache.invalidateByTag(`price:${symbol}`)
    console.log(` Invalidated price cache for token: ${symbol}`)
  }
}

