/**
 * Optimized Token Balance Cache - Производственная оптимизация
 * Solana SuperApp - Кеширование и пулинг соединений
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token'
import ModulePreloader, { getOptimizedConnection } from './ModulePreloader'

// Глобальный кеш балансов
interface BalanceEntry {
  balance: string
  timestamp: number
  loading: boolean
}

// Глобальный пул соединений
class ConnectionPool {
  private static instance: ConnectionPool
  private connections: Map<string, Connection> = new Map()
  private readonly maxConnections = 3

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool()
    }
    return ConnectionPool.instance
  }

  getConnection(rpcUrl: string = 'https://api.devnet.solana.com'): Connection {
    if (!this.connections.has(rpcUrl)) {
      if (this.connections.size >= this.maxConnections) {
        // Очищаем старые соединения
        const firstKey = this.connections.keys().next().value
        this.connections.delete(firstKey)
      }
      
      this.connections.set(rpcUrl, new Connection(rpcUrl, {
        commitment: 'confirmed',
        wsEndpoint: undefined, // Отключаем WebSocket для экономии ресурсов
        confirmTransactionInitialTimeout: 30000
      }))
    }
    
    return this.connections.get(rpcUrl)!
  }

  cleanup() {
    this.connections.clear()
  }
}

// Кеш балансов
class TokenBalanceCache {
  private static instance: TokenBalanceCache
  private cache: Map<string, BalanceEntry> = new Map()
  private readonly cacheTimeout = 30 * 1000 // 30 секунд
  private readonly connectionPool = ConnectionPool.getInstance()

  static getInstance(): TokenBalanceCache {
    if (!TokenBalanceCache.instance) {
      TokenBalanceCache.instance = new TokenBalanceCache()
    }
    return TokenBalanceCache.instance
  }

  private getCacheKey(userPublicKey: string, mint: string): string {
    return `${userPublicKey}_${mint}`
  }

  private isValidCache(entry: BalanceEntry): boolean {
    return !entry.loading && (Date.now() - entry.timestamp) < this.cacheTimeout
  }

  async getTNGBalance(userPublicKey: string): Promise<{ balance: string; tokenAccount: string; fromCache: boolean }> {
    const mintAddress = 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs' // TNG mint
    const cacheKey = this.getCacheKey(userPublicKey, mintAddress)
    
    // Проверяем кеш
    const cached = this.cache.get(cacheKey)
    if (cached && this.isValidCache(cached)) {
      const tokenAccountAddress = await getAssociatedTokenAddress(
        new PublicKey(mintAddress),
        new PublicKey(userPublicKey)
      )
      
      return {
        balance: cached.balance,
        tokenAccount: tokenAccountAddress.toBase58(),
        fromCache: true
      }
    }

    // Предотвращаем множественные запросы
    if (cached?.loading) {
      // Ждем завершения текущего запроса
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.getTNGBalance(userPublicKey) // Рекурсивный вызов
    }

    // Устанавливаем флаг загрузки
    this.cache.set(cacheKey, { balance: '0', timestamp: Date.now(), loading: true })

    try {
      // Используем оптимизированное соединение (предзагруженное)
      let connection: Connection
      try {
        connection = (await getOptimizedConnection()) as unknown as Connection
      } catch {
        connection = this.connectionPool.getConnection()
      }
      const userKey = new PublicKey(userPublicKey)
      const mintKey = new PublicKey(mintAddress)
      
      const tokenAccountAddress = await getAssociatedTokenAddress(mintKey, userKey)

      let balance = '0'
      
      try {
        const tokenAccount = await getAccount(connection, tokenAccountAddress)
        balance = tokenAccount.amount.toString()
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          balance = '0' // Account не существует
        } else {
          throw error
        }
      }

      // Сохраняем в кеш
      this.cache.set(cacheKey, {
        balance,
        timestamp: Date.now(),
        loading: false
      })

      return {
        balance,
        tokenAccount: tokenAccountAddress.toBase58(),
        fromCache: false
      }

    } catch (error) {
      // Удаляем из кеша при ошибке
      this.cache.delete(cacheKey)
      throw error
    }
  }

  async getSOLBalance(userPublicKey: string): Promise<{ balance: string; fromCache: boolean }> {
    const cacheKey = this.getCacheKey(userPublicKey, 'SOL')
    
    // Проверяем кеш
    const cached = this.cache.get(cacheKey)
    if (cached && this.isValidCache(cached)) {
      return {
        balance: cached.balance,
        fromCache: true
      }
    }

    // Предотвращаем множественные запросы
    if (cached?.loading) {
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.getSOLBalance(userPublicKey)
    }

    // Устанавливаем флаг загрузки
    this.cache.set(cacheKey, { balance: '0', timestamp: Date.now(), loading: true })

    try {
      // Используем оптимизированное соединение (предзагруженное)
      let connection: Connection
      try {
        connection = (await getOptimizedConnection()) as unknown as Connection
      } catch {
        connection = this.connectionPool.getConnection()
      }
      const userKey = new PublicKey(userPublicKey)
      
      // Получаем нативный SOL баланс
      const nativeBalance = await connection.getBalance(userKey)
      
      // Также проверяем wrapped SOL balance
      let wrappedBalance = BigInt(0)
      try {
        const wrappedSolMint = new PublicKey('So11111111111111111111111111111111111111112')
        const wrappedSolAccount = await getAssociatedTokenAddress(wrappedSolMint, userKey)
        const accountInfo = await getAccount(connection, wrappedSolAccount)
        wrappedBalance = accountInfo.amount
      } catch (error) {
        // Wrapped SOL account doesn't exist, balance is 0
      }
      
      // Общий SOL баланс (нативный + wrapped)
      const totalBalance = BigInt(nativeBalance) + wrappedBalance
      const balance = totalBalance.toString()

      // Сохраняем в кеш
      this.cache.set(cacheKey, {
        balance,
        timestamp: Date.now(),
        loading: false
      })

      return {
        balance,
        fromCache: false
      }

    } catch (error) {
      this.cache.delete(cacheKey)
      throw error
    }
  }

  // Принудительная очистка кеша
  clearCache(userPublicKey?: string, mint?: string) {
    if (userPublicKey && mint) {
      const key = this.getCacheKey(userPublicKey, mint)
      this.cache.delete(key)
    } else if (userPublicKey) {
      // Очищаем все балансы пользователя
      for (const [key] of this.cache) {
        if (key.startsWith(userPublicKey)) {
          this.cache.delete(key)
        }
      }
    } else {
      // Очищаем весь кеш
      this.cache.clear()
    }
  }

  // Статистика кеша
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      validEntries: Array.from(this.cache.values()).filter(entry => this.isValidCache(entry)).length,
      loadingEntries: Array.from(this.cache.values()).filter(entry => entry.loading).length
    }
  }

  // Очистка соединений
  cleanup() {
    this.cache.clear()
    this.connectionPool.cleanup()
  }
}

export default TokenBalanceCache
