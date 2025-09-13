/**
 * Prisma Seed Script - Solana SuperApp
 * Инициализация базовых данных для off-chain ledger
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log(' Starting database seeding...')

  // Создаем базовые активы
  console.log(' Creating base assets...')
  
  // SOL - нативный токен Solana
  const solAsset = await prisma.asset.upsert({
    where: { symbol: 'SOL' },
    update: {},
    create: {
      symbol: 'SOL',
      name: 'Solana',
      mintAddress: null, // SOL - нативный токен без mint address
      decimals: 9,
      isOnchain: true,
      logoUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png',
      description: 'Нативный токен блокчейна Solana',
      isActive: true
    }
  })
  
  // USDC - стабильная монета
  const usdcAsset = await prisma.asset.upsert({
    where: { symbol: 'USDC' },
    update: {},
    create: {
      symbol: 'USDC',
      name: 'USD Coin',
      mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC mint
      decimals: 6,
      isOnchain: true,
      logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      description: 'Полностью обеспеченная стабильная монета USD',
      isActive: true
    }
  })
  
  // TNG - демо токен проекта (будет создан позже)
  const tngAsset = await prisma.asset.upsert({
    where: { symbol: 'TNG' },
    update: {},
    create: {
      symbol: 'TNG',
      name: 'Tenge Token',
      mintAddress: null, // будет установлен при создании SPL токена
      decimals: 9, // решение: используем 9 decimals для совместимости с SOL
      isOnchain: true,
      logoUrl: null,
      description: 'Демо utility токен Solana SuperApp',
      isActive: true
    }
  })

  console.log(' Base assets created:', {
    SOL: solAsset.id,
    USDC: usdcAsset.id,
    TNG: tngAsset.id
  })

  // Создаем базовые курсы (placeholder)
  console.log(' Creating initial rates...')
  
  // SOL/USDC курс (примерный)
  await prisma.rate.upsert({
    where: {
      baseAssetId_quoteAssetId_timestamp: {
        baseAssetId: solAsset.id,
        quoteAssetId: usdcAsset.id,
        timestamp: new Date()
      }
    },
    update: {},
    create: {
      baseAssetId: solAsset.id,
      quoteAssetId: usdcAsset.id,
      rate: '100.00', // примерный курс SOL/USDC
      source: 'MANUAL',
      provider: 'SEED_DATA',
      confidence: '1.0000',
      timestamp: new Date()
    }
  })

  // TNG/USDC курс (1 TNG ≈ 1 KZT ≈ 0.0021 USDC)
  await prisma.rate.upsert({
    where: {
      baseAssetId_quoteAssetId_timestamp: {
        baseAssetId: tngAsset.id,
        quoteAssetId: usdcAsset.id,
        timestamp: new Date()
      }
    },
    update: {},
    create: {
      baseAssetId: tngAsset.id,
      quoteAssetId: usdcAsset.id,
      rate: '0.0021', // 1 TNG ≈ 1 KZT ≈ 0.0021 USD
      source: 'MANUAL',
      provider: 'SEED_DATA',
      confidence: '1.0000',
      timestamp: new Date()
    }
  })

  console.log(' Initial rates created')

  console.log(' Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(' Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

