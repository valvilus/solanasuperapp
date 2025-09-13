/**
 * Production Key Encryption Service
 * Безопасное шифрование/дешифрование приватных ключей для продакшена
 * Solana SuperApp
 */

import * as crypto from 'crypto'

export interface EncryptedKey {
  encryptedData: string
  iv: string
  tag: string
  algorithm: string
}

export class KeyEncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32 // 256 bits
  private readonly ivLength = 16 // 128 bits
  private readonly tagLength = 16 // 128 bits
  
  private readonly masterKey: Buffer

  constructor() {
    // Получаем мастер-ключ из переменной окружения
    const masterKeyHex = process.env.WALLET_ENCRYPTION_KEY
    
    if (!masterKeyHex) {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required for production')
    }
    
    if (masterKeyHex.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error('WALLET_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    }
    
    this.masterKey = Buffer.from(masterKeyHex, 'hex')
    
    // KeyEncryptionService initialized - silent for production
  }

  /**
   * Шифрует приватный ключ
   */
  encryptPrivateKey(privateKey: Uint8Array, userId: string): EncryptedKey {
    try {
      // Генерируем уникальный IV для каждого шифрования
      const iv = crypto.randomBytes(this.ivLength)
      
      // Создаем уникальный ключ шифрования для каждого пользователя
      const userSalt = this.generateUserSalt(userId)
      const derivedKey = this.deriveUserKey(this.masterKey, userSalt)
      
      // Создаем cipher
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv)
      
      // Шифруем данные
      let encrypted = cipher.update(privateKey)
      cipher.final()
      
      // Получаем authentication tag
      const tag = cipher.getAuthTag()
      
      const result: EncryptedKey = {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        algorithm: this.algorithm
      }
      
      console.log(' Private key encrypted successfully for user:', userId)
      
      return result
      
    } catch (error) {
      console.error(' Private key encryption failed:', error)
      throw new Error('Failed to encrypt private key')
    }
  }

  /**
   * Дешифрует приватный ключ
   */
  decryptPrivateKey(encryptedKey: EncryptedKey, userId: string): Uint8Array {
    try {
      // Проверяем алгоритм
      if (encryptedKey.algorithm !== this.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${encryptedKey.algorithm}`)
      }
      
      // Восстанавливаем данные из base64
      const encryptedData = Buffer.from(encryptedKey.encryptedData, 'base64')
      const iv = Buffer.from(encryptedKey.iv, 'base64')
      const tag = Buffer.from(encryptedKey.tag, 'base64')
      
      // Генерируем тот же ключ для пользователя
      const userSalt = this.generateUserSalt(userId)
      const derivedKey = this.deriveUserKey(this.masterKey, userSalt)
      
      // Создаем decipher
      const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv)
      decipher.setAuthTag(tag)
      
      // Дешифруем данные
      let decrypted = decipher.update(encryptedData)
      decipher.final()
      
      console.log(' Private key decrypted successfully for user:', userId)
      
      return new Uint8Array(decrypted)
      
    } catch (error) {
      console.error(' Private key decryption failed:', error)
      throw new Error('Failed to decrypt private key - possibly corrupted or wrong key')
    }
  }

  /**
   * Сериализует зашифрованный ключ в строку для хранения в БД
   */
  serializeEncryptedKey(encryptedKey: EncryptedKey): string {
    return JSON.stringify(encryptedKey)
  }

  /**
   * Десериализует зашифрованный ключ из строки БД
   */
  deserializeEncryptedKey(serialized: string): EncryptedKey {
    try {
      const parsed = JSON.parse(serialized)
      
      // Валидируем структуру
      if (!parsed.encryptedData || !parsed.iv || !parsed.tag || !parsed.algorithm) {
        throw new Error('Invalid encrypted key format')
      }
      
      return parsed as EncryptedKey
      
    } catch (error) {
      console.error(' Failed to deserialize encrypted key:', error)
      throw new Error('Failed to parse encrypted key data')
    }
  }

  /**
   * Генерирует детерминированный salt для пользователя
   */
  private generateUserSalt(userId: string): Buffer {
    // Создаем детерминированный salt на основе userId
    const hash = crypto.createHash('sha256')
    hash.update(`solana_superapp_salt_${userId}`)
    return hash.digest()
  }

  /**
   * Создает производный ключ для конкретного пользователя
   */
  private deriveUserKey(masterKey: Buffer, userSalt: Buffer): Buffer {
    // Используем PBKDF2 для создания производного ключа
    return crypto.pbkdf2Sync(masterKey, userSalt, 100000, this.keyLength, 'sha256')
  }

  /**
   * Генерирует новый мастер-ключ (только для первоначальной настройки!)
   */
  static generateMasterKey(): string {
    const key = crypto.randomBytes(32)
    return key.toString('hex')
  }

  /**
   * Проверяет корректность мастер-ключа
   */
  validateMasterKey(): boolean {
    try {
      // Тестируем шифрование/дешифрование
      const testData = new Uint8Array([1, 2, 3, 4, 5])
      const testUserId = 'test_user'
      
      const encrypted = this.encryptPrivateKey(testData, testUserId)
      const decrypted = this.decryptPrivateKey(encrypted, testUserId)
      
      // Проверяем, что данные совпадают
      return testData.every((byte, index) => byte === decrypted[index])
      
    } catch (error) {
      return false
    }
  }
}
