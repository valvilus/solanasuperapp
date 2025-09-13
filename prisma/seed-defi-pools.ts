/**
 * DeFi Pools Seed Data
 * Creates initial staking and farming pools for Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDeFiPools() {
  console.log(' Seeding DeFi pools...')

  try {
    // Create TNG staking pools
    const stakingPools = await prisma.stakingPool.createMany({
      data: [
        {
          id: 'tng-basic-pool',
          name: 'TNG Basic Staking',
          description: 'Базовый пул стейкинга TNG токенов без блокировки',
          tokenMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
          rewardMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
          apy: 8.5,
          minimumStake: BigInt(100 * 1000000000), // 100 TNG
          lockupPeriod: 0,
          totalStaked: BigInt(0),
          totalRewards: BigInt(0),
          isActive: true,
          isRecommended: true,
          riskLevel: 'LOW'
        },
        {
          id: 'tng-premium-pool',
          name: 'TNG Premium Staking',
          description: 'Премиум пул с высокой доходностью и блокировкой на 30 дней',
          tokenMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
          rewardMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
          apy: 15.2,
          minimumStake: BigInt(1000 * 1000000000), // 1000 TNG
          lockupPeriod: 30,
          totalStaked: BigInt(0),
          totalRewards: BigInt(0),
          isActive: true,
          isRecommended: false,
          riskLevel: 'MEDIUM'
        },
        {
          id: 'sol-staking-pool',
          name: 'SOL Liquid Staking',
          description: 'Жидкий стейкинг SOL через валидаторов сети',
          tokenMint: 'So11111111111111111111111111111111111111112', // SOL
          rewardMint: 'So11111111111111111111111111111111111111112',
          apy: 6.8,
          minimumStake: BigInt(0.1 * 1000000000), // 0.1 SOL
          lockupPeriod: 0,
          totalStaked: BigInt(0),
          totalRewards: BigInt(0),
          isActive: true,
          isRecommended: true,
          riskLevel: 'LOW'
        }
      ],
      skipDuplicates: true
    })

    // Create farming pools
    const farmingPools = await prisma.farmingPool.createMany({
      data: [
        {
          id: 'sol-tng-lp',
          name: 'SOL-TNG LP',
          description: 'Пул ликвидности SOL/TNG с высокой доходностью',
          tokenAMint: 'So11111111111111111111111111111111111111112', // SOL
          tokenBMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs', // TNG
          apy: 45.7,
          tvl: BigInt(125000 * 1000000), // $125,000 в USDC эквиваленте
          volume24h: BigInt(25000 * 1000000), // $25,000 дневной объем
          fees24h: BigInt(62.5 * 1000000), // $62.5 дневные комиссии
          feePercent: 0.25,
          isActive: true,
          isStable: false,
          riskLevel: 'MEDIUM'
        },
        {
          id: 'tng-usdc-lp',
          name: 'TNG-USDC LP',
          description: 'Стабильный пул ликвидности TNG/USDC',
          tokenAMint: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs', // TNG
          tokenBMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          apy: 28.3,
          tvl: BigInt(85000 * 1000000), // $85,000
          volume24h: BigInt(15000 * 1000000), // $15,000
          fees24h: BigInt(37.5 * 1000000), // $37.5
          feePercent: 0.25,
          isActive: true,
          isStable: true,
          riskLevel: 'LOW'
        }
      ],
      skipDuplicates: true
    })

    console.log(' DeFi pools seeded successfully:')
    console.log(`   - ${stakingPools.count} staking pools created`)
    console.log(`   - ${farmingPools.count} farming pools created`)

  } catch (error) {
    console.error(' Error seeding DeFi pools:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedDeFiPools()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { seedDeFiPools }










