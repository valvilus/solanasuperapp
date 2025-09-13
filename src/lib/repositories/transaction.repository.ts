/**
 * Transaction Repository - Data access layer for transactions
 * Solana SuperApp Database Optimization
 */

import { LedgerEntry, OnchainTx, Prisma } from '@prisma/client'
import { BaseRepository, PaginationOptions, PaginatedResult } from './base.repository'

export interface TransactionSearchFilters {
  userId?: string
  assetId?: string
  txType?: string
  status?: string
  direction?: 'DEBIT' | 'CREDIT'
  dateFrom?: Date
  dateTo?: Date
}

export interface TransactionWithDetails extends LedgerEntry {
  asset: {
    id: string
    symbol: string
    name: string
    decimals: number
  }
  counterpart?: {
    id: string
    username?: string | null
    firstName: string
  }
}

export class TransactionRepository extends BaseRepository {

  /**
   * Находит запись в леджере по ID
   */
  async findLedgerEntryById(id: string): Promise<LedgerEntry | null> {
    this.logOperation('findLedgerEntryById', { id })

    try {
      const entry = await this.prisma.ledgerEntry.findUnique({
        where: { id },
        include: {
          asset: true,
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      this.logResult('findLedgerEntryById', entry)
      return entry
    } catch (error) {
      this.handleError('findLedgerEntryById', error)
    }
  }

  /**
   * Находит записи леджера по ключу идемпотентности
   */
  async findByIdempotencyKey(idempotencyKey: string): Promise<LedgerEntry | null> {
    this.logOperation('findByIdempotencyKey', { idempotencyKey })

    try {
      const entry = await this.prisma.ledgerEntry.findUnique({
        where: { idempotencyKey },
        include: { asset: true }
      })

      this.logResult('findByIdempotencyKey', entry)
      return entry
    } catch (error) {
      this.handleError('findByIdempotencyKey', error)
    }
  }

  /**
   * Создает запись в леджере
   */
  async createLedgerEntry(data: Prisma.LedgerEntryCreateInput): Promise<LedgerEntry> {
    this.logOperation('createLedgerEntry', {
      userId: data.user?.connect?.id,
      assetId: data.asset?.connect?.id,
      direction: data.direction,
      amount: data.amount?.toString()
    })

    try {
      const entry = await this.prisma.ledgerEntry.create({
        data,
        include: { asset: true }
      })

      this.logResult('createLedgerEntry', entry)
      return entry
    } catch (error) {
      this.handleError('createLedgerEntry', error)
    }
  }

  /**
   * Получает историю транзакций пользователя с деталями
   */
  async getUserTransactionHistory(
    userId: string,
    filters: TransactionSearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<TransactionWithDetails>> {
    this.logOperation('getUserTransactionHistory', { userId, filters, options })

    try {
      const where: Prisma.LedgerEntryWhereInput = {
        userId,
        ...this.buildTransactionFilters(filters)
      }

      const { skip, take } = this.applyPagination(options)
      const orderBy = this.applySorting(options)

      const result = await this.executePaginatedQuery(
        async (skip, take) => {
          const entries = await this.prisma.ledgerEntry.findMany({
            where,
            include: {
              asset: {
                select: {
                  id: true,
                  symbol: true,
                  name: true,
                  decimals: true
                }
              }
            },
            orderBy,
            skip,
            take
          })

          // Для каждой записи ищем контрагента (если это внутренний перевод)
          const entriesWithCounterpart = await Promise.all(
            entries.map(async (entry) => {
              let counterpart = undefined

              if (entry.txType === 'TRANSFER_INTERNAL') {
                // Ищем запись с тем же txRef но противоположным направлением
                const counterpartDirection = entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT'
                const counterpartEntry = await this.prisma.ledgerEntry.findFirst({
                  where: {
                    txRef: entry.txRef,
                    direction: counterpartDirection,
                    userId: { not: userId }
                  },
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        firstName: true
                      }
                    }
                  }
                })

                if (counterpartEntry?.user) {
                  counterpart = counterpartEntry.user
                }
              }

              return {
                ...entry,
                counterpart
              } as TransactionWithDetails
            })
          )

          return entriesWithCounterpart
        },
        () => this.prisma.ledgerEntry.count({ where }),
        options
      )

      this.logResult('getUserTransactionHistory', result.data)
      return result
    } catch (error) {
      this.handleError('getUserTransactionHistory', error)
    }
  }

  /**
   * Получает записи леджера по txRef
   */
  async findByTxRef(txRef: string): Promise<LedgerEntry[]> {
    this.logOperation('findByTxRef', { txRef })

    try {
      const entries = await this.prisma.ledgerEntry.findMany({
        where: { txRef },
        include: {
          asset: true,
          user: {
            select: {
              id: true,
              username: true,
              firstName: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      this.logResult('findByTxRef', entries)
      return entries
    } catch (error) {
      this.handleError('findByTxRef', error)
    }
  }

  /**
   * Находит on-chain транзакцию по подписи
   */
  async findOnchainTxBySignature(signature: string): Promise<OnchainTx | null> {
    this.logOperation('findOnchainTxBySignature', { signature })

    try {
      const tx = await this.prisma.onchainTx.findFirst({
        where: { signature },
        include: { asset: true }
      })

      this.logResult('findOnchainTxBySignature', tx)
      return tx
    } catch (error) {
      this.handleError('findOnchainTxBySignature', error)
    }
  }

  /**
   * Создает on-chain транзакцию
   */
  async createOnchainTx(data: Prisma.OnchainTxCreateInput): Promise<OnchainTx> {
    this.logOperation('createOnchainTx', {
      signature: data.signature,
      purpose: data.purpose,
      userId: data.user?.connect?.id
    })

    try {
      const tx = await this.prisma.onchainTx.create({
        data,
        include: { asset: true }
      })

      this.logResult('createOnchainTx', tx)
      return tx
    } catch (error) {
      this.handleError('createOnchainTx', error)
    }
  }

  /**
   * Обновляет статус on-chain транзакции
   */
  async updateOnchainTxStatus(
    signature: string,
    status: 'CONFIRMED' | 'FINALIZED' | 'FAILED' | 'DROPPED',
    updateData: Partial<Prisma.OnchainTxUpdateInput> = {}
  ): Promise<OnchainTx> {
    this.logOperation('updateOnchainTxStatus', { signature, status })

    try {
      const now = new Date()
      const tx = await this.prisma.onchainTx.updateMany({
        where: { signature },
        data: {
          status,
          ...(status === 'CONFIRMED' && { confirmedAt: now }),
          ...(status === 'FINALIZED' && { finalizedAt: now }),
          updatedAt: now,
          ...updateData
        }
      }) as unknown as OnchainTx

      this.logResult('updateOnchainTxStatus', tx)
      return tx
    } catch (error) {
      this.handleError('updateOnchainTxStatus', error)
    }
  }

  /**
   * Получает pending on-chain транзакции для пользователя
   */
  async getPendingOnchainTxs(userId: string): Promise<OnchainTx[]> {
    this.logOperation('getPendingOnchainTxs', { userId })

    try {
      const txs = await this.prisma.onchainTx.findMany({
        where: {
          userId,
          status: 'PENDING'
        },
        include: { asset: true },
        orderBy: { createdAt: 'desc' }
      })

      this.logResult('getPendingOnchainTxs', txs)
      return txs
    } catch (error) {
      this.handleError('getPendingOnchainTxs', error)
    }
  }

  /**
   * Строит фильтры для запросов транзакций
   */
  private buildTransactionFilters(filters: TransactionSearchFilters): Prisma.LedgerEntryWhereInput {
    const where: Prisma.LedgerEntryWhereInput = {}

    if (filters.assetId) {
      where.assetId = filters.assetId
    }

    if (filters.txType) {
      where.txType = filters.txType as any
    }

    if (filters.status) {
      where.status = filters.status as any
    }

    if (filters.direction) {
      where.direction = filters.direction
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo
      }
    }

    return where
  }
}

