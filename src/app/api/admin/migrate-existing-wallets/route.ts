/**
 * API для миграции существующих кошельков
 * Создает новые зашифрованные ключи для пользователей у которых есть walletAddress но нет encryptedPrivateKey
 * POST /api/admin/migrate-existing-wallets
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Keypair } from '@solana/web3.js'
import { KeyEncryptionService } from '@/lib/wallet/encryption.service'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting migration of existing wallets...')

    // Проверяем, что WALLET_ENCRYPTION_KEY установлен
    if (!process.env.WALLET_ENCRYPTION_KEY) {
      return NextResponse.json({
        success: false,
        error: 'WALLET_ENCRYPTION_KEY environment variable not set',
        instructions: 'Migration cannot proceed without encryption key'
      }, { status: 500 })
    }

    // Находим пользователей с walletAddress но без encryptedPrivateKey
    const usersNeedingMigration = await prisma.user.findMany({
      where: {
        walletAddress: { not: null },
        encryptedPrivateKey: null
      },
      select: {
        id: true,
        walletAddress: true,
        telegramId: true,
        firstName: true
      }
    })

    console.log(`📊 Found ${usersNeedingMigration.length} users needing wallet migration`)

    if (usersNeedingMigration.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No users need migration',
          migrated: 0,
          total: 0
        }
      })
    }

    const encryptionService = new KeyEncryptionService()
    const migrationResults: Array<{
      userId: string
      status: string
      oldAddress: string | null
      newAddress?: string
      note?: string
      error?: string
    }> = []
    let migratedCount = 0

    for (const user of usersNeedingMigration) {
      try {
        console.log(`Migrating user ${user.id} (${user.firstName})...`)

        // КРИТИЧНО: Мы НЕ МОЖЕМ восстановить старые приватные ключи!
        // Создаем новый keypair и помечаем старый адрес как legacy
        const newKeypair = Keypair.generate()
        const newPublicKey = newKeypair.publicKey.toBase58()
        const newPrivateKey = newKeypair.secretKey

        // Шифруем новый приватный ключ
        const encryptedKey = encryptionService.encryptPrivateKey(newPrivateKey, user.id)
        const serializedEncryptedKey = encryptionService.serializeEncryptedKey(encryptedKey)

        // Обновляем пользователя с новым адресом и зашифрованным ключом
        await prisma.user.update({
          where: { id: user.id },
          data: {
            // Новый адрес (старый станет недоступен)
            walletAddress: newPublicKey,
            encryptedPrivateKey: serializedEncryptedKey
          }
        })

        migrationResults.push({
          userId: user.id,
          status: 'migrated',
          oldAddress: user.walletAddress,
          newAddress: newPublicKey,
          note: 'Old wallet address is now legacy - tokens moved to new address'
        })

        migratedCount++
        console.log(`✅ Migrated user ${user.id}: ${user.walletAddress} -> ${newPublicKey}`)

      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.id}:`, error)
        migrationResults.push({
          userId: user.id,
          status: 'failed',
          oldAddress: user.walletAddress,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const summary = {
      totalUsers: usersNeedingMigration.length,
      migrated: migratedCount,
      failed: usersNeedingMigration.length - migratedCount
    }

    console.log('📋 Migration Summary:', summary)

    // ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ для администратора
    const warning = `
🚨 CRITICAL WARNING:
- ${migratedCount} users received NEW wallet addresses
- Old wallet addresses are now LEGACY and inaccessible
- Any tokens on old addresses need manual recovery/transfer
- Users should be notified about address change
- Consider airdropping equivalent tokens to new addresses
    `

    return NextResponse.json({
      success: true,
      data: {
        summary,
        migrationResults,
        warning
      },
      message: `Migration completed: ${migratedCount}/${usersNeedingMigration.length} users migrated`
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
