/**
 * Система батчинга запросов для оптимизации производительности
 */

interface BatchRequest<T> {
  id: string
  resolve: (value: T) => void
  reject: (error: any) => void
  timestamp: number
}

interface BatchOptions {
  maxBatchSize?: number
  maxWaitTime?: number
  maxRetries?: number
}

class RequestBatcher<TInput, TOutput> {
  private pendingRequests = new Map<string, BatchRequest<TOutput>>()
  private batchTimer: NodeJS.Timeout | null = null
  private readonly maxBatchSize: number
  private readonly maxWaitTime: number
  private readonly maxRetries: number
  private readonly processBatch: (inputs: TInput[]) => Promise<TOutput[]>

  constructor(
    processBatch: (inputs: TInput[]) => Promise<TOutput[]>,
    options: BatchOptions = {}
  ) {
    this.maxBatchSize = options.maxBatchSize || 10
    this.maxWaitTime = options.maxWaitTime || 100 // 100ms
    this.maxRetries = options.maxRetries || 3
    this.processBatch = processBatch
  }

  /**
   * Добавить запрос в батч
   */
  async request(id: string, input: TInput): Promise<TOutput> {
    return new Promise<TOutput>((resolve, reject) => {
      // Если запрос уже существует, возвращаем существующий Promise
      if (this.pendingRequests.has(id)) {
        const existing = this.pendingRequests.get(id)!
        // Заменяем callbacks на новые
        existing.resolve = resolve
        existing.reject = reject
        return
      }

      // Добавляем новый запрос
      this.pendingRequests.set(id, {
        id,
        resolve,
        reject,
        timestamp: Date.now()
      })

      // Проверяем, нужно ли выполнить батч немедленно
      if (this.pendingRequests.size >= this.maxBatchSize) {
        this.executeBatch()
      } else if (!this.batchTimer) {
        // Устанавливаем таймер для выполнения батча
        this.batchTimer = setTimeout(() => {
          this.executeBatch()
        }, this.maxWaitTime)
      }
    })
  }

  /**
   * Выполнить батч запросов
   */
  private async executeBatch(retryCount = 0): Promise<void> {
    if (this.pendingRequests.size === 0) {
      return
    }

    // Очищаем таймер
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    // Получаем текущие запросы
    const requests = Array.from(this.pendingRequests.values())
    const inputs = requests.map(req => req.id as any) // Предполагаем, что id это input
    
    // Очищаем pending requests
    this.pendingRequests.clear()

    try {
      const results = await this.processBatch(inputs)

      // Разрешаем все промисы
      requests.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index])
        } else {
          request.reject(new Error(`No result for request ${request.id}`))
        }
      })
    } catch (error) {
      console.error('Batch execution failed:', error)

      // Повторяем попытку, если не превышено максимальное количество
      if (retryCount < this.maxRetries) {
        // Возвращаем запросы обратно в очередь
        requests.forEach(request => {
          this.pendingRequests.set(request.id, request)
        })

        // Повторяем через экспоненциальную задержку
        setTimeout(() => {
          this.executeBatch(retryCount + 1)
        }, Math.pow(2, retryCount) * 1000)
      } else {
        // Отклоняем все промисы при превышении лимита повторов
        requests.forEach(request => {
          request.reject(error)
        })
      }
    }
  }

  /**
   * Получить статистику батчера
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      hasPendingBatch: this.batchTimer !== null,
      maxBatchSize: this.maxBatchSize,
      maxWaitTime: this.maxWaitTime
    }
  }

  /**
   * Принудительно выполнить все ожидающие запросы
   */
  flush(): Promise<void> {
    return this.executeBatch()
  }
}

// Создаем батчеры для различных типов запросов

// Батчер для получения цен токенов
export const priceBatcher = new RequestBatcher<string, number>(
  async (symbols: string[]) => {
    try {
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }

      const data = await response.json()
      return symbols.map(symbol => data.prices[symbol] || 0)
    } catch (error) {
      console.error('Price batch failed:', error)
      return symbols.map(() => 0)
    }
  },
  { maxBatchSize: 20, maxWaitTime: 50 }
)

// Батчер для получения балансов
export const balanceBatcher = new RequestBatcher<{userId: string, token: string}, number>(
  async (requests: {userId: string, token: string}[]) => {
    try {
      const response = await fetch('/api/balances/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch balances')
      }

      const data = await response.json()
      return data.balances
    } catch (error) {
      console.error('Balance batch failed:', error)
      return requests.map(() => 0)
    }
  },
  { maxBatchSize: 15, maxWaitTime: 100 }
)

// Батчер для получения данных пользователей
export const userDataBatcher = new RequestBatcher<string, any>(
  async (userIds: string[]) => {
    try {
      const response = await fetch('/api/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json()
      return data.users
    } catch (error) {
      console.error('User data batch failed:', error)
      return userIds.map(() => null)
    }
  },
  { maxBatchSize: 25, maxWaitTime: 150 }
)

// Утилиты для работы с батчингом

/**
 * Создать ключ для батчинга составных запросов
 */
export function createBatchKey(parts: (string | number)[]): string {
  return parts.join(':')
}

/**
 * Дебаунс функция для отложенного выполнения
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Троттлинг функция для ограничения частоты выполнения
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Менеджер для управления множественными батчерами
 */
class BatchManager {
  private batchers = new Map<string, RequestBatcher<any, any>>()

  /**
   * Зарегистрировать батчер
   */
  register<TInput, TOutput>(
    name: string,
    processBatch: (inputs: TInput[]) => Promise<TOutput[]>,
    options?: BatchOptions
  ): RequestBatcher<TInput, TOutput> {
    const batcher = new RequestBatcher(processBatch, options)
    this.batchers.set(name, batcher)
    return batcher
  }

  /**
   * Получить батчер по имени
   */
  get<TInput, TOutput>(name: string): RequestBatcher<TInput, TOutput> | undefined {
    return this.batchers.get(name)
  }

  /**
   * Принудительно выполнить все батчеры
   */
  async flushAll(): Promise<void> {
    const flushPromises = Array.from(this.batchers.values()).map(batcher => 
      batcher.flush()
    )
    await Promise.all(flushPromises)
  }

  /**
   * Получить статистику всех батчеров
   */
  getAllStats() {
    const stats: Record<string, any> = {}
    
    for (const [name, batcher] of this.batchers.entries()) {
      stats[name] = batcher.getStats()
    }

    return stats
  }
}

// Глобальный менеджер батчеров
export const batchManager = new BatchManager()

// Регистрируем стандартные батчеры
batchManager.register('prices', priceBatcher['processBatch'], { maxBatchSize: 20, maxWaitTime: 50 })
batchManager.register('balances', balanceBatcher['processBatch'], { maxBatchSize: 15, maxWaitTime: 100 })
batchManager.register('userData', userDataBatcher['processBatch'], { maxBatchSize: 25, maxWaitTime: 150 })
