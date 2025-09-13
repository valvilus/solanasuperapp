/**
 * Asset Service - Asset Management for Ledger System
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'
import { AssetDetails, LedgerResult, LedgerError } from './types'
import { createLedgerError, createAssetNotFoundError, LedgerErrorCode } from './errors'
import { memoryCache } from '@/lib/cache/memory-cache.service'
import { CacheKeys, CacheTags, CacheTTL } from '@/lib/cache/cache-keys'

export class AssetService {
  private readonly prisma: PrismaClient
  private readonly assetCache = new Map<string, AssetDetails>()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Получает актив по символу (с кешированием)
   */
  async getAssetBySymbol(symbol: string): Promise<LedgerResult<AssetDetails>> {
    try {
      // Получаем из кэша или БД
      const assetDetails = await memoryCache.getOrSet(
        CacheKeys.ASSET_BY_SYMBOL(symbol),
        async () => {
          const asset = await this.prisma.asset.findUnique({
            where: { symbol }
          })

          if (!asset) {
            throw new Error(`Asset not found: ${symbol}`)
          }

          return {
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            mintAddress: asset.mintAddress,
            decimals: asset.decimals,
            isOnchain: asset.isOnchain,
            logoUrl: asset.logoUrl,
            description: asset.description,
            isActive: asset.isActive
          } as AssetDetails
        },
        {
          ttl: CacheTTL.ASSETS,
          tags: [CacheTags.ASSETS]
        }
      )

      return {
        success: true,
        data: assetDetails
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          success: false,
          error: createAssetNotFoundError(symbol)
        }
      }

      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка получения актива',
          { symbol, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает все активные активы
   */
  async getAllActiveAssets(): Promise<LedgerResult<AssetDetails[]>> {
    try {
      // Получаем из кэша или БД
      const assetDetails = await memoryCache.getOrSet(
        CacheKeys.ALL_ACTIVE_ASSETS,
        async () => {
          const assets = await this.prisma.asset.findMany({
            where: { isActive: true },
            orderBy: { symbol: 'asc' }
          })

          return assets.map(asset => ({
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            mintAddress: asset.mintAddress,
            decimals: asset.decimals,
            isOnchain: asset.isOnchain,
            logoUrl: asset.logoUrl,
            description: asset.description,
            isActive: asset.isActive
          })) as AssetDetails[]
        },
        {
          ttl: CacheTTL.ASSETS,
          tags: [CacheTags.ASSETS]
        }
      )

      // Обновляем индивидуальный кэш для каждого актива
      assetDetails.forEach(asset => {
        memoryCache.set(
          CacheKeys.ASSET_BY_SYMBOL(asset.symbol),
          asset,
          { ttl: CacheTTL.ASSETS, tags: [CacheTags.ASSETS] }
        )
      })

      return {
        success: true,
        data: assetDetails
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка получения списка активов',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Обновляет mint address для токена (например, после создания TNG)
   */
  async updateAssetMintAddress(
    symbol: string,
    mintAddress: string
  ): Promise<LedgerResult<AssetDetails>> {
    try {
      const asset = await this.prisma.asset.update({
        where: { symbol },
        data: { mintAddress }
      })

      const assetDetails: AssetDetails = {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        mintAddress: asset.mintAddress,
        decimals: asset.decimals,
        isOnchain: asset.isOnchain,
        logoUrl: asset.logoUrl,
        description: asset.description,
        isActive: asset.isActive
      }

      // Обновляем кеш
      this.assetCache.set(symbol, assetDetails)

      return {
        success: true,
        data: assetDetails
      }

    } catch (error) {
      return {
        success: false,
        error: createLedgerError(
          LedgerErrorCode.DATABASE_ERROR,
          'Ошибка обновления mint address актива',
          { symbol, mintAddress, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Очищает кеш активов (используется при обновлениях)
   */
  clearCache(): void {
    this.assetCache.clear()
  }

  /**
   * Проверяет существование актива
   */
  async assetExists(symbol: string): Promise<boolean> {
    const result = await this.getAssetBySymbol(symbol)
    return result.success
  }

  /**
   * Получает количество десятичных знаков для актива
   */
  async getAssetDecimals(symbol: string): Promise<number | null> {
    const result = await this.getAssetBySymbol(symbol)
    return result.success ? result.data!.decimals : null
  }
}

