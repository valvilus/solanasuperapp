/**
 * Mock KMS Service - Development Key Management System
 * Solana SuperApp - НЕ ДЛЯ ПРОДАКШЕНА!
 */

import { Keypair } from '@solana/web3.js'
import nacl from 'tweetnacl'
import { derivePath } from 'ed25519-hd-key'
import { generateMnemonic, mnemonicToSeedSync } from 'bip39'
import * as crypto from 'crypto'
import {
  KMSKeyReference,
  KeyUsage,
  SignRequest,
  SignResult,
  WalletResult,
  WalletError,
  WalletErrorCode
} from './types'
import { createWalletError, createKMSKeyNotFoundError } from './errors'

interface MockKeyStorage {
  keyId: string
  publicKey: string
  privateKey: Uint8Array
  derivationPath?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export class MockKMSService {
  private readonly keys = new Map<string, MockKeyStorage>()
  private readonly masterSeed: Buffer
  private readonly isProduction: boolean
  private readonly persistencePath: string

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.persistencePath = process.env.MOCK_KMS_STORAGE_PATH || './data/mock-kms-keys.json'
    
    if (this.isProduction) {
      console.warn(' ВНИМАНИЕ: Mock KMS используется в продакшене! Это небезопасно!')
    }

    // Генерируем или загружаем мастер seed для детерминированной генерации ключей
    const envSeed = process.env.MOCK_KMS_SEED
    if (envSeed) {
      this.masterSeed = Buffer.from(envSeed, 'hex')
    } else {
      // Генерируем новый seed (для dev)
      const mnemonic = generateMnemonic(256) // 24 слова для максимальной энтропии
      this.masterSeed = mnemonicToSeedSync(mnemonic)
      console.log(' Generated new master seed for Mock KMS')
      console.log(' For deterministic keys, set MOCK_KMS_SEED env variable')
    }

    // Загружаем сохраненные ключи при инициализации
    this.loadPersistedKeys()
  }

  /**
   * Генерирует новый ключ в mock KMS
   */
  async generateKey(
    derivationPath?: string,
    metadata?: Record<string, any>
  ): Promise<WalletResult<KMSKeyReference>> {
    try {
      console.log(' Generating new key in Mock KMS:', { derivationPath })

      // Генерируем уникальный keyId
      const keyId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      let keypair: Keypair

      if (derivationPath) {
        // Детерминированная генерация по пути деривации
        const derived = derivePath(derivationPath, this.masterSeed.toString('hex'))
        keypair = Keypair.fromSeed(derived.key)
      } else {
        // Случайная генерация
        keypair = Keypair.generate()
      }

      const publicKey = keypair.publicKey.toBase58()

      // Сохраняем ключ в памяти (в продакшене был бы настоящий KMS)
      const keyStorage: MockKeyStorage = {
        keyId,
        publicKey,
        privateKey: keypair.secretKey,
        derivationPath,
        metadata,
        createdAt: new Date()
      }

      this.keys.set(keyId, keyStorage)

      // Сохраняем в файл после добавления нового ключа
      this.persistKeys()

      const keyReference: KMSKeyReference = {
        keyId,
        publicKey,
        algorithm: 'Ed25519',
        usage: [KeyUsage.SIGN, KeyUsage.VERIFY],
        metadata
      }

      console.log(' Key generated successfully:', { keyId, publicKey })

      return {
        success: true,
        data: keyReference
      }

    } catch (error) {
      console.error(' Key generation failed:', error)
      
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.KEY_GENERATION_FAILED,
          'Ошибка генерации ключа в Mock KMS',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Подписывает сообщение с помощью указанного ключа
   */
  async sign(request: SignRequest): Promise<WalletResult<SignResult>> {
    try {
      console.log(' Signing message with Mock KMS:', { 
        keyId: request.keyId,
        messageLength: request.message.length 
      })

      const keyStorage = this.keys.get(request.keyId)
      if (!keyStorage) {
        return {
          success: false,
          error: createKMSKeyNotFoundError(request.keyId)
        }
      }

      // Восстанавливаем keypair из приватного ключа
      const keypair = Keypair.fromSecretKey(keyStorage.privateKey)
      
      // Подписываем сообщение
      const signature = nacl.sign.detached(request.message, keypair.secretKey)

      const result: SignResult = {
        signature: signature,
        keyId: request.keyId,
        algorithm: 'Ed25519'
      }

      console.log(' Message signed successfully:', { keyId: request.keyId })

      return {
        success: true,
        data: result
      }

    } catch (error) {
      console.error(' Signing failed:', error)
      
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.KMS_SIGN_FAILED,
          'Ошибка подписания в Mock KMS',
          { keyId: request.keyId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает информацию о ключе
   */
  async getKey(keyId: string): Promise<WalletResult<KMSKeyReference>> {
    try {
      const keyStorage = this.keys.get(keyId)
      if (!keyStorage) {
        return {
          success: false,
          error: createKMSKeyNotFoundError(keyId)
        }
      }

      const keyReference: KMSKeyReference = {
        keyId: keyStorage.keyId,
        publicKey: keyStorage.publicKey,
        algorithm: 'Ed25519',
        usage: [KeyUsage.SIGN, KeyUsage.VERIFY],
        metadata: keyStorage.metadata
      }

      return {
        success: true,
        data: keyReference
      }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.KMS_ACCESS_DENIED,
          'Ошибка доступа к ключу',
          { keyId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Проверяет существование ключа
   */
  async keyExists(keyId: string): Promise<boolean> {
    return this.keys.has(keyId)
  }

  /**
   * Удаляет ключ (только для mock KMS!)
   */
  async deleteKey(keyId: string): Promise<WalletResult<boolean>> {
    try {
      if (this.isProduction) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.KMS_ACCESS_DENIED,
            'Удаление ключей запрещено в продакшене'
          )
        }
      }

      const deleted = this.keys.delete(keyId)
      
      // Сохраняем изменения в файл
      if (deleted) {
        this.persistKeys()
      }
      
      return {
        success: true,
        data: deleted
      }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          'Ошибка удаления ключа',
          { keyId, error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает список всех ключей (для отладки)
   */
  async listKeys(): Promise<WalletResult<KMSKeyReference[]>> {
    try {
      if (this.isProduction) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.KMS_ACCESS_DENIED,
            'Листинг ключей запрещен в продакшене'
          )
        }
      }

      const keys: KMSKeyReference[] = Array.from(this.keys.values()).map(storage => ({
        keyId: storage.keyId,
        publicKey: storage.publicKey,
        algorithm: 'Ed25519',
        usage: [KeyUsage.SIGN, KeyUsage.VERIFY],
        metadata: storage.metadata
      }))

      return {
        success: true,
        data: keys
      }

    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          'Ошибка получения списка ключей',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает статистику Mock KMS
   */
  getStats() {
    return {
      totalKeys: this.keys.size,
      isProduction: this.isProduction,
      hasMasterSeed: !!this.masterSeed,
      provider: 'mock'
    }
  }

  /**
   * Экспортирует публичный ключ по keyId (для тестирования)
   */
  async exportPublicKey(keyId: string): Promise<string | null> {
    const keyStorage = this.keys.get(keyId)
    return keyStorage ? keyStorage.publicKey : null
  }

  /**
   * Получает хранилище ключа по keyId (для внутреннего использования)
   */
  getKeyStorage(keyId: string): MockKeyStorage | undefined {
    return this.keys.get(keyId)
  }

  /**
   * Находит keyId по публичному ключу
   */
  findKeyIdByPublicKey(publicKey: string): string | undefined {
    for (const [keyId, keyStorage] of this.keys.entries()) {
      if (keyStorage.publicKey === publicKey) {
        return keyId
      }
    }
    return undefined
  }

  /**
   * Загружает ключи из файла при инициализации
   */
  private loadPersistedKeys(): void {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      return // Не загружаем в браузере
    }

    try {
      const fs = require('fs')
      const path = require('path')
      
      // Создаем директорию если не существует
      const dir = path.dirname(this.persistencePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf8')
        const persistedData = JSON.parse(data)
        
        // Восстанавливаем ключи из сохраненных данных
        for (const [keyId, serializedStorage] of Object.entries(persistedData.keys || {})) {
          const storage = serializedStorage as any
          
          // Восстанавливаем Uint8Array из массива
          const privateKey = new Uint8Array(storage.privateKey)
          
          const keyStorage: MockKeyStorage = {
            keyId: storage.keyId,
            publicKey: storage.publicKey,
            privateKey,
            derivationPath: storage.derivationPath,
            metadata: storage.metadata,
            createdAt: new Date(storage.createdAt)
          }
          
          this.keys.set(keyId, keyStorage)
        }
        
        console.log(` Loaded ${this.keys.size} persisted keys from ${this.persistencePath}`)
      } else {
        console.log(' No persisted keys file found, starting with empty KMS')
      }
    } catch (error) {
      console.error(' Failed to load persisted keys:', error)
      console.log(' Starting with empty KMS')
    }
  }

  /**
   * Сохраняет ключи в файл
   */
  private persistKeys(): void {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      return // Не сохраняем в браузере
    }

    try {
      const fs = require('fs')
      const path = require('path')
      
      // Создаем директорию если не существует
      const dir = path.dirname(this.persistencePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Подготавливаем данные для сериализации
      const persistData = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        keys: {}
      }

      // Сериализуем ключи (преобразуем Uint8Array в обычный массив)
      for (const [keyId, storage] of this.keys.entries()) {
        persistData.keys[keyId] = {
          keyId: storage.keyId,
          publicKey: storage.publicKey,
          privateKey: Array.from(storage.privateKey), // Преобразуем Uint8Array в массив
          derivationPath: storage.derivationPath,
          metadata: storage.metadata,
          createdAt: storage.createdAt.toISOString()
        }
      }

      fs.writeFileSync(this.persistencePath, JSON.stringify(persistData, null, 2))
      console.log(` Persisted ${this.keys.size} keys to ${this.persistencePath}`)
      
    } catch (error) {
      console.error(' Failed to persist keys:', error)
    }
  }

  /**
   * Очищает все сохраненные ключи (только для разработки!)
   */
  clearPersistedKeys(): void {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      console.warn('MockKMS clearPersistedKeys can only be used on the server side')
      this.keys.clear()
      return
    }

    try {
      const fs = require('fs')
      
      if (fs.existsSync(this.persistencePath)) {
        fs.unlinkSync(this.persistencePath)
        console.log(' Cleared persisted keys file')
      }
      
      this.keys.clear()
      console.log(' Cleared in-memory keys')
      
    } catch (error) {
      console.error(' Failed to clear persisted keys:', error)
    }
  }
}
