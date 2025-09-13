/**
 * Wallet Generator Service - Custodial Wallet Generation
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'
import {
  WalletGenerationRequest,
  WalletGenerationResult,
  CustodialWallet,
  WalletType,
  WalletStatus,
  WalletResult,
  WalletError,
  WalletErrorCode,
  KeyUsage
} from './types'
import { createWalletError } from './errors'
import { KeyEncryptionService } from './encryption.service'
import { Keypair } from '@solana/web3.js'

export class WalletGeneratorService {
  private readonly prisma: PrismaClient
  private readonly encryptionService: KeyEncryptionService
  private readonly derivationPathPrefix: string

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.encryptionService = new KeyEncryptionService()
    this.derivationPathPrefix = process.env.WALLET_DERIVATION_PREFIX || "m/44'/501'"
    
    // WalletGeneratorService initialized - silent for production
  }

  /**
   * Генерирует новый custodial кошелек для пользователя
   */
  async generateCustodialWallet(request: WalletGenerationRequest): Promise<WalletResult<WalletGenerationResult>> {
    try {
      console.log(' Generating custodial wallet:', { userId: request.userId })

      // Проверяем что пользователь существует
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId }
      })

      if (!user) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INTERNAL_ERROR,
            'Пользователь не найден',
            { userId: request.userId }
          )
        }
      }

      // Проверяем что у пользователя еще нет custodial кошелька
      const existingWallet = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { walletAddress: true }
      })

      if (existingWallet?.walletAddress) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.WALLET_CREATION_FAILED,
            'У пользователя уже есть кошелек',
            { userId: request.userId, existingAddress: existingWallet.walletAddress }
          )
        }
      }

      // Генерируем уникальный derivation path для пользователя
      const userIndex = await this.getNextUserIndex()
      const derivationPath = request.derivationPath || `${this.derivationPathPrefix}/${userIndex}'/0'/0'`

      console.log(' Generating key with derivation path:', derivationPath)

      // Генерируем реальный Solana keypair
      const keypair = Keypair.generate()
      const publicKey = keypair.publicKey.toBase58()
      const privateKey = keypair.secretKey

      // Generated Solana keypair - silent for production

      // Шифруем приватный ключ для безопасного хранения
      const encryptedKey = this.encryptionService.encryptPrivateKey(privateKey, request.userId)
      const serializedEncryptedKey = this.encryptionService.serializeEncryptedKey(encryptedKey)

      // Сохраняем кошелек в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: request.userId },
          data: { 
            walletAddress: publicKey,
            encryptedPrivateKey: serializedEncryptedKey
          }
        })

        return { user: updatedUser }
      })

      // Формируем результат
      const custodialWallet: CustodialWallet = {
        id: `wallet_${result.user.id}`,
        userId: result.user.id,
        publicKey: publicKey,
        type: WalletType.CUSTODIAL,
        status: WalletStatus.ACTIVE,
        createdAt: result.user.updatedAt,
        lastUsedAt: undefined,
        metadata: {
          encryptionMethod: 'aes-256-gcm',
          derivationPath,
          userIndex,
          createdBy: 'WalletGeneratorService',
          isEncrypted: true
        }
      }

      const generationResult: WalletGenerationResult = {
        wallet: custodialWallet,
        keyReference: {
          keyId: `encrypted_${result.user.id}`,
          publicKey: publicKey,
          algorithm: 'Ed25519',
          usage: [KeyUsage.SIGN, KeyUsage.VERIFY],
          metadata: {
            encrypted: true,
            userId: request.userId
          }
        }
      }

      console.log(' Custodial wallet generated successfully:', {
        userId: request.userId,
        publicKey: publicKey,
        encryptedKeyStored: true
      })

      return {
        success: true,
        data: generationResult
      }

    } catch (error) {
      console.error(' Custodial wallet generation failed:', error)
      
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.WALLET_CREATION_FAILED,
          'Ошибка создания custodial кошелька',
          { 
            userId: request.userId,
            error: error instanceof Error ? error.message : String(error) 
          }
        )
      }
    }
  }

  /**
   * Получает custodial кошелек пользователя
   */
  async getUserCustodialWallet(userId: string): Promise<WalletResult<CustodialWallet | null>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          walletAddress: true,
          encryptedPrivateKey: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      })

      if (!user) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INTERNAL_ERROR,
            'Пользователь не найден',
            { userId }
          )
        }
      }

      if (!user.walletAddress) {
        return {
          success: true,
          data: null
        }
      }

      // Проверяем состояние кошелька
      const isLegacyWallet = !user.encryptedPrivateKey
      const walletStatus = isLegacyWallet ? WalletStatus.NEEDS_MIGRATION : WalletStatus.ACTIVE

      if (isLegacyWallet) {
        console.warn(' Legacy wallet detected for user:', {
          userId,
          walletAddress: user.walletAddress,
          issue: 'Has walletAddress but no encryptedPrivateKey'
        })
      }

      const custodialWallet: CustodialWallet = {
        id: `wallet_${user.id}`,
        userId: user.id,
        publicKey: user.walletAddress,
        type: WalletType.CUSTODIAL,
        status: walletStatus,
        createdAt: user.updatedAt,
        lastUsedAt: user.lastLoginAt || undefined,
        metadata: {
          hasEncryptedKey: !!user.encryptedPrivateKey,
          encryptionMethod: user.encryptedPrivateKey ? 'aes-256-gcm' : undefined,
          storedInDatabase: true,
          isLegacy: isLegacyWallet,
          migrationRequired: isLegacyWallet
        }
      }

      return {
        success: true,
        data: custodialWallet
      }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.DATABASE_ERROR,
          'Ошибка получения кошелька пользователя',
          { userId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Проверяет существование custodial кошелька
   */
  async hasCustodialWallet(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      })

      return !!user?.walletAddress
    } catch (error) {
      console.error('Error checking custodial wallet existence:', error)
      return false
    }
  }

  /**
   * Деактивирует custodial кошелек (устанавливает статус INACTIVE)
   */
  async deactivateCustodialWallet(userId: string): Promise<WalletResult<boolean>> {
    try {
      // В текущей реализации просто очищаем walletAddress
      // В будущем можно добавить отдельную таблицу wallets со статусами
      
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.walletAddress) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.WALLET_NOT_FOUND,
            'Custodial кошелек не найден',
            { userId }
          )
        }
      }

      // В продакшене здесь должен быть флаг статуса, а не удаление
      console.warn(' Deactivating custodial wallet (clearing walletAddress):', {
        userId,
        publicKey: user.walletAddress
      })

      await this.prisma.user.update({
        where: { id: userId },
        data: { walletAddress: null }
      })

      return {
        success: true,
        data: true
      }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          'Ошибка деактивации кошелька',
          { userId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает статистику генератора кошельков
   */
  async getGeneratorStats() {
    try {
      const totalUsers = await this.prisma.user.count()
      const usersWithWallets = await this.prisma.user.count({
        where: {
          walletAddress: { not: null }
        }
      })

      const kmsStats = { provider: 'database_encrypted', keys: 0 }

      return {
        totalUsers,
        usersWithWallets,
        walletGeneration: {
          coverage: totalUsers > 0 ? (usersWithWallets / totalUsers * 100).toFixed(2) + '%' : '0%',
          derivationPrefix: this.derivationPathPrefix
        },
        kms: kmsStats
      }

    } catch (error) {
      console.error('Error getting generator stats:', error)
      return {
        error: 'Failed to get stats'
      }
    }
  }

  // === PRIVATE METHODS ===

  /**
   * Получает Keypair существующего custodial кошелька пользователя
   */
  async getUserKeypair(userId: string): Promise<WalletResult<import('@solana/web3.js').Keypair>> {
    try {
      // Getting keypair from database - silent for production

      // Получаем зашифрованный приватный ключ из БД
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          walletAddress: true,
          encryptedPrivateKey: true
        }
      })

      if (!user) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.WALLET_NOT_FOUND,
            'Пользователь не найден'
          )
        }
      }

      if (!user.walletAddress) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.WALLET_NOT_FOUND,
            'Кошелек не найден. Создайте кошелек сначала.'
          )
        }
      }

      if (!user.encryptedPrivateKey) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.WALLET_NOT_FOUND,
            'Legacy кошелек обнаружен! Этот кошелек создан до внедрения шифрования. Требуется миграция через API /api/admin/migrate-existing-wallets'
          )
        }
      }

      // Дешифруем приватный ключ
      const encryptedKey = this.encryptionService.deserializeEncryptedKey(user.encryptedPrivateKey)
      const decryptedPrivateKey = this.encryptionService.decryptPrivateKey(encryptedKey, userId)

      // Создаем Keypair из дешифрованного ключа
      const keypair = Keypair.fromSecretKey(decryptedPrivateKey)
      
      // Проверяем, что публичный ключ совпадает с сохраненным
      if (keypair.publicKey.toBase58() !== user.walletAddress) {
        console.error(' Public key mismatch after decryption!', {
          expected: user.walletAddress,
          actual: keypair.publicKey.toBase58()
        })
        
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.KMS_KEY_NOT_FOUND,
            'Ошибка дешифрования ключа - публичные ключи не совпадают'
          )
        }
      }
      
      // Successfully decrypted keypair - silent for production

      return {
        success: true,
        data: keypair
      }

    } catch (error) {
      console.error(' Failed to get keypair from database:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          'Ошибка получения keypair из базы данных',
          { userId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает следующий индекс пользователя для derivation path
   */
  private async getNextUserIndex(): Promise<number> {
    try {
      // Простая реализация: используем количество пользователей + 1
      const userCount = await this.prisma.user.count()
      return userCount + 1
    } catch (error) {
      // Fallback на случайное число
      return Math.floor(Math.random() * 1000000)
    }
  }
}
