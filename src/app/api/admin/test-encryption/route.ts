/**
 * Encryption Test API
 * POST /api/admin/test-encryption
 */

import { NextRequest, NextResponse } from 'next/server'
import { Keypair } from '@solana/web3.js'
import { KeyEncryptionService } from '@/lib/wallet/encryption.service'

export async function POST(request: NextRequest) {
  try {

    if (!process.env.WALLET_ENCRYPTION_KEY) {
      return NextResponse.json({
        success: false,
        error: 'WALLET_ENCRYPTION_KEY environment variable not set',
        instructions: 'Set WALLET_ENCRYPTION_KEY to a 64-character hex string (32 bytes)'
      }, { status: 500 })
    }

    const encryptionService = new KeyEncryptionService()

    const testKeypair = Keypair.generate()
    const originalPublicKey = testKeypair.publicKey.toBase58()
    const privateKey = testKeypair.secretKey


    const testUserId = 'test_user_123'

    const encryptedKey = encryptionService.encryptPrivateKey(privateKey, testUserId)

    const serialized = encryptionService.serializeEncryptedKey(encryptedKey)

    const deserialized = encryptionService.deserializeEncryptedKey(serialized)

    const decryptedPrivateKey = encryptionService.decryptPrivateKey(deserialized, testUserId)

    const restoredKeypair = Keypair.fromSecretKey(decryptedPrivateKey)
    const restoredPublicKey = restoredKeypair.publicKey.toBase58()


    if (originalPublicKey !== restoredPublicKey) {
      return NextResponse.json({
        success: false,
        error: 'Public keys do not match after encryption/decryption cycle',
        details: {
          original: originalPublicKey,
          restored: restoredPublicKey
        }
      }, { status: 500 })
    }

    const originalBytes = Array.from(privateKey)
    const restoredBytes = Array.from(decryptedPrivateKey)
    const privateKeysMatch = originalBytes.every((byte, index) => byte === restoredBytes[index])

    if (!privateKeysMatch) {
      return NextResponse.json({
        success: false,
        error: 'Private keys do not match after encryption/decryption cycle'
      }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      data: {
        testResults: {
          keyGeneration: true,
          encryption: true,
          serialization: true,
          deserialization: true,
          decryption: true,
          publicKeyIntegrity: true,
          privateKeyIntegrity: true
        },
        testKeypair: {
          originalPublicKey,
          restoredPublicKey,
          match: originalPublicKey === restoredPublicKey
        },
        encryptionInfo: {
          algorithm: encryptedKey.algorithm,
          hasIv: !!encryptedKey.iv,
          hasTag: !!encryptedKey.tag,
          hasEncryptedData: !!encryptedKey.encryptedData
        }
      },
      message: 'Encryption system is ready for production!'
    })

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: 'Encryption test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
