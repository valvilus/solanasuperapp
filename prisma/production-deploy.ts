/**
 * Production Deployment Script - Kazakhstan Edition
 * Скрипт для полного развертывания базы данных на продакшене
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting production deployment for Kazakhstan...')
  console.log('=' .repeat(60))

  try {
    // 1. Проверяем подключение к базе данных
    await checkDatabaseConnection()
    
    // 2. Применяем миграции
    await runMigrations()
    
    // 3. Запускаем основной seed
    await runMainSeed()
    
    // 4. Запускаем дополнительный контент
    await runAdditionalContent()
    
    // 5. Проверяем результат
    await verifyDeployment()
    
    console.log('=' .repeat(60))
    console.log('✅ Production deployment completed successfully!')
    console.log('🇰🇿 Kazakhstan Solana SuperApp is ready for production!')
    
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

async function checkDatabaseConnection() {
  console.log('🔌 Checking database connection...')
  
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1 as connected`
    console.log('✅ Database connection successful')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw new Error('Cannot connect to database')
  }
}

async function runMigrations() {
  console.log('📦 Running Prisma migrations...')
  
  try {
    // Генерируем Prisma client
    console.log('  📝 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Применяем миграции
    console.log('  🔄 Applying database migrations...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw new Error('Migration process failed')
  }
}

async function runMainSeed() {
  console.log('🌱 Running main Kazakhstan seed...')
  
  try {
    const seedPath = path.join(process.cwd(), 'prisma', 'seed-production-kazakhstan.ts')
    
    if (!fs.existsSync(seedPath)) {
      throw new Error('Main seed file not found')
    }
    
    // Запускаем основной seed
    execSync('npx tsx prisma/seed-production-kazakhstan.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    })
    
    console.log('✅ Main seed completed successfully')
  } catch (error) {
    console.error('❌ Main seed failed:', error)
    throw new Error('Main seeding process failed')
  }
}

async function runAdditionalContent() {
  console.log('📚 Running additional content seed...')
  
  try {
    const additionalSeedPath = path.join(process.cwd(), 'prisma', 'seed-additional-content.ts')
    
    if (!fs.existsSync(additionalSeedPath)) {
      console.log('⚠️ Additional content seed file not found, skipping...')
      return
    }
    
    // Запускаем дополнительный контент
    execSync('npx tsx prisma/seed-additional-content.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    })
    
    console.log('✅ Additional content seed completed successfully')
  } catch (error) {
    console.error('❌ Additional content seed failed:', error)
    // Не останавливаем весь процесс, если дополнительный контент не удался
    console.log('⚠️ Continuing deployment without additional content...')
  }
}

async function verifyDeployment() {
  console.log('🔍 Verifying deployment...')
  
  try {
    // Проверяем количество записей в ключевых таблицах
    const stats = await getDeploymentStats()
    
    console.log('📊 Deployment Statistics:')
    console.log(`  Users: ${stats.users}`)
    console.log(`  Courses: ${stats.courses}`)
    console.log(`  Lessons: ${stats.lessons}`)
    console.log(`  NFT Collections: ${stats.nftCollections}`)
    console.log(`  NFTs: ${stats.nfts}`)
    console.log(`  Jobs: ${stats.jobs}`)
    console.log(`  Staking Pools: ${stats.stakingPools}`)
    console.log(`  Lending Pools: ${stats.lendingPools}`)
    console.log(`  Achievements: ${stats.achievements}`)
    console.log(`  Daily Challenges: ${stats.dailyChallenges}`)
    
    // Проверяем минимальные требования
    const requirements = [
      { name: 'Courses', value: stats.courses, minimum: 3 },
      { name: 'Lessons', value: stats.lessons, minimum: 5 },
      { name: 'Staking Pools', value: stats.stakingPools, minimum: 2 },
      { name: 'Lending Pools', value: stats.lendingPools, minimum: 2 }
    ]
    
    for (const req of requirements) {
      if (req.value < req.minimum) {
        throw new Error(`Insufficient ${req.name}: ${req.value} < ${req.minimum}`)
      }
    }
    
    console.log('✅ Deployment verification passed')
    
  } catch (error) {
    console.error('❌ Deployment verification failed:', error)
    throw new Error('Deployment verification failed')
  }
}

async function getDeploymentStats() {
  const [
    users,
    courses, 
    lessons,
    nftCollections,
    nfts,
    jobs,
    stakingPools,
    lendingPools,
    achievements,
    dailyChallenges
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.nFTCollection.count(),
    prisma.nFT.count(),
    prisma.job.count(),
    prisma.stakingPool.count(),
    prisma.lendingPool.count(),
    prisma.achievement.count(),
    prisma.dailyChallenge.count()
  ])

  return {
    users,
    courses,
    lessons, 
    nftCollections,
    nfts,
    jobs,
    stakingPools,
    lendingPools,
    achievements,
    dailyChallenges
  }
}

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\n🛑 Deployment interrupted by user')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Deployment terminated')
  await prisma.$disconnect()
  process.exit(0)
})

main()
  .catch(async (e) => {
    console.error('💥 Fatal deployment error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
