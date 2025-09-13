/**
 * Asset Repository - Data access layer for assets and rates
 * Solana SuperApp Database Optimization
 */

import { Asset, Rate, Prisma } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { CacheKeys, CacheTags, CacheTTL } from '@/lib/cache/cache-keys'

export interface AssetWithRates extends Asset {
  latestRate?: {
    rate: number
    quoteSymbol: string
    timestamp: Date
  }
}

export class AssetRepository extends BaseRepository {

  /**
   * Находит актив по символу с кэшированием
   */
  async findBySymbol(symbol: string): Promise<Asset | null> {
    this.logOperation('findBySymbol', { symbol })

    try {
      const asset = await this.cache.getOrSet(
        CacheKeys.ASSET_BY_SYMBOL(symbol),
        async () => {
          return await this.prisma.asset.findUnique({
            where: { symbol }
          })
        },
        {
          ttl: CacheTTL.ASSETS,
          tags: [CacheTags.ASSETS]
        }
      )

      this.logResult('findBySymbol', asset)
      return asset
    } catch (error) {
      this.handleError('findBySymbol', error)
    }
  }

  /**
   * Находит актив по ID
   */
  async findById(id: string): Promise<Asset | null> {
    this.logOperation('findById', { id })

    try {
      const asset = await this.prisma.asset.findUnique({
        where: { id }
      })

      this.logResult('findById', asset)
      return asset
    } catch (error) {
      this.handleError('findById', error)
    }
  }

  /**
   * Получает все активные активы с кэшированием
   */
  async findAllActive(): Promise<Asset[]> {
    this.logOperation('findAllActive')

    try {
      const assets = await this.cache.getOrSet(
        CacheKeys.ALL_ACTIVE_ASSETS,
        async () => {
          return await this.prisma.asset.findMany({
            where: { isActive: true },
            orderBy: { symbol: 'asc' }
          })
        },
        {
          ttl: CacheTTL.ASSETS,
          tags: [CacheTags.ASSETS]
        }
      )

      // Обновляем индивидуальный кэш для каждого актива
      assets.forEach(asset => {
        this.cache.set(
          CacheKeys.ASSET_BY_SYMBOL(asset.symbol),
          asset,
          { ttl: CacheTTL.ASSETS, tags: [CacheTags.ASSETS] }
        )
      })

      this.logResult('findAllActive', assets)
      return assets
    } catch (error) {
      this.handleError('findAllActive', error)
    }
  }

  /**
   * Создает новый актив
   */
  async create(data: Prisma.AssetCreateInput): Promise<Asset> {
    this.logOperation('create', { symbol: data.symbol })

    try {
      const asset = await this.prisma.asset.create({
        data
      })

      // Инвалидируем кэш активов
      this.invalidateAssetCache()
      
      this.logResult('create', asset)
      return asset
    } catch (error) {
      this.handleError('create', error)
    }
  }

  /**
   * Обновляет актив
   */
  async update(id: string, data: Prisma.AssetUpdateInput): Promise<Asset> {
    this.logOperation('update', { id })

    try {
      const asset = await this.prisma.asset.update({
        where: { id },
        data
      })

      // Инвалидируем кэш активов
      this.invalidateAssetCache()
      
      this.logResult('update', asset)
      return asset
    } catch (error) {
      this.handleError('update', error)
    }
  }

  /**
   * Обновляет mint address актива
   */
  async updateMintAddress(symbol: string, mintAddress: string): Promise<Asset> {
    this.logOperation('updateMintAddress', { symbol, mintAddress })

    try {
      const asset = await this.prisma.asset.update({
        where: { symbol },
        data: { mintAddress }
      })

      // Инвалидируем кэш активов
      this.invalidateAssetCache()
      
      this.logResult('updateMintAddress', asset)
      return asset
    } catch (error) {
      this.handleError('updateMintAddress', error)
    }
  }

  /**
   * Получает последний курс между двумя активами
   */
  async getLatestRate(baseSymbol: string, quoteSymbol: string): Promise<Rate | null> {
    this.logOperation('getLatestRate', { baseSymbol, quoteSymbol })

    try {
      const rate = await this.cache.getOrSet(
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

          return await this.prisma.rate.findFirst({
            where: {
              baseAssetId: baseAsset.id,
              quoteAssetId: quoteAsset.id
            },
            orderBy: { createdAt: 'desc' }
          })
        },
        {
          ttl: CacheTTL.RATES,
          tags: [CacheTags.RATES, `rate:${baseSymbol}:${quoteSymbol}`]
        }
      )

      this.logResult('getLatestRate', rate)
      return rate
    } catch (error) {
      this.handleError('getLatestRate', error)
    }
  }

  /**
   * Создает новую запись курса
   */
  async createRate(data: Prisma.RateCreateInput): Promise<Rate> {
    this.logOperation('createRate', {
      baseAssetId: data.baseAsset?.connect?.id,
      quoteAssetId: data.quoteAsset?.connect?.id,
      rate: data.rate?.toString()
    })

    try {
      const rate = await this.prisma.rate.create({
        data,
        include: {
          baseAsset: true,
          quoteAsset: true
        }
      })

      // Инвалидируем кэш курсов
      this.invalidateRateCache()
      
      this.logResult('createRate', rate)
      return rate
    } catch (error) {
      this.handleError('createRate', error)
    }
  }

  /**
   * Получает активы с их последними USD курсами
   */
  async findAllWithUSDRates(): Promise<AssetWithRates[]> {
    this.logOperation('findAllWithUSDRates')

    try {
      const assets = await this.findAllActive()
      const usdAsset = assets.find(a => a.symbol === 'USDC')
      
      if (!usdAsset) {
        return assets.map(asset => ({ ...asset }))
      }

      // Получаем последние курсы для всех активов
      const rates = await this.prisma.rate.findMany({
        where: {
          quoteAssetId: usdAsset.id,
          baseAssetId: { in: assets.map(a => a.id) }
        },
        distinct: ['baseAssetId'],
        orderBy: { createdAt: 'desc' },
        include: {
          baseAsset: true
        }
      })

      const assetsWithRates = assets.map(asset => {
        const rate = rates.find(r => r.baseAssetId === asset.id)
        return {
          ...asset,
          latestRate: rate ? {
            rate: Number(rate.rate),
            quoteSymbol: 'USDC',
            timestamp: rate.timestamp
          } : undefined
        }
      })

      this.logResult('findAllWithUSDRates', assetsWithRates)
      return assetsWithRates
    } catch (error) {
      this.handleError('findAllWithUSDRates', error)
    }
  }

  /**
   * Получает множественные активы по символам (batch операция)
   */
  async findManyBySymbols(symbols: string[]): Promise<Asset[]> {
    this.logOperation('findManyBySymbols', { symbols })

    try {
      const assets = await this.prisma.asset.findMany({
        where: { symbol: { in: symbols } }
      })

      this.logResult('findManyBySymbols', assets)
      return assets
    } catch (error) {
      this.handleError('findManyBySymbols', error)
    }
  }

  /**
   * Инвалидирует кэш активов
   */
  private invalidateAssetCache(): void {
    this.cache.invalidateByTag(CacheTags.ASSETS)
    console.log(' Invalidated all asset caches')
  }

  /**
   * Инвалидирует кэш курсов
   */
  private invalidateRateCache(): void {
    this.cache.invalidateByTag(CacheTags.RATES)
    console.log(' Invalidated all rate caches')
  }
}

