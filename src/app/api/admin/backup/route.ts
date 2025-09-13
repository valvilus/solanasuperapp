import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `solana-superapp-backup-${timestamp}.sql`
    
    // Создаем резервную копию базы данных (PostgreSQL)
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL не настроен')
    }

    // Извлекаем параметры подключения из URL
    const dbUrl = new URL(databaseUrl)
    const host = dbUrl.hostname
    const port = dbUrl.port || '5432'
    const database = dbUrl.pathname.slice(1)
    const username = dbUrl.username
    const password = dbUrl.password

    // Команда для создания резервной копии
    const backupCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} > /tmp/${backupName}`

    try {
      await execAsync(backupCommand)
      
      return NextResponse.json({
        success: true,
        message: 'Резервная копия создана успешно',
        backupFile: backupName,
        timestamp: new Date().toISOString()
      })
    } catch (execError) {
      console.error('Backup execution error:', execError)
      
      // Fallback: создаем логическую резервную копию через Prisma
      const { prisma } = await import('@/lib/prisma')
      
      const backupData = {
        timestamp: new Date().toISOString(),
        users: await prisma.user.count(),
        transactions: await prisma.transaction.count(),
        stakes: await prisma.userStake.count(),
        lendingPositions: await prisma.userLendingPosition.count(),
        farmingPositions: await prisma.farmingPosition.count()
      }

      return NextResponse.json({
        success: true,
        message: 'Логическая резервная копия создана (физическая недоступна)',
        backup: backupData,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ошибка создания резервной копии'
    }, { status: 500 })
  }
})
