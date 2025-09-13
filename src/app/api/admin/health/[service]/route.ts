import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Connection } from '@solana/web3.js'

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', message: 'База данных доступна' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка подключения к базе данных' }
  }
}

async function checkSolanaHealth() {
  try {
    const connection = new Connection(SOLANA_RPC_URL)
    const slot = await connection.getSlot()
    return { status: 'ok', message: `Solana RPC доступен, слот: ${slot}` }
  } catch (error) {
    return { status: 'error', message: 'Ошибка подключения к Solana RPC' }
  }
}

async function checkOracleHealth() {
  try {
    // Проверяем доступность oracle данных
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/oracle?action=health`)
    if (response.ok) {
      return { status: 'ok', message: 'Oracle сервис работает' }
    }
    return { status: 'warning', message: 'Oracle сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Oracle сервиса' }
  }
}

async function checkBridgeHealth() {
  try {
    // Проверяем статус bridge
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/bridge?action=status`)
    if (response.ok) {
      return { status: 'ok', message: 'Bridge сервис работает' }
    }
    return { status: 'warning', message: 'Bridge сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Bridge сервиса' }
  }
}

async function checkInsuranceHealth() {
  try {
    // Проверяем статус insurance
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/insurance?action=health`)
    if (response.ok) {
      return { status: 'ok', message: 'Insurance сервис работает' }
    }
    return { status: 'warning', message: 'Insurance сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Insurance сервиса' }
  }
}

async function checkLendingHealth() {
  try {
    // Проверяем статус lending
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/lending?action=health`)
    if (response.ok) {
      return { status: 'ok', message: 'Lending сервис работает' }
    }
    return { status: 'warning', message: 'Lending сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Lending сервиса' }
  }
}

async function checkStakingHealth() {
  try {
    // Проверяем статус staking
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/staking?action=health`)
    if (response.ok) {
      return { status: 'ok', message: 'Staking сервис работает' }
    }
    return { status: 'warning', message: 'Staking сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Staking сервиса' }
  }
}

async function checkSwapHealth() {
  try {
    // Проверяем статус swap
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/swap?action=health`)
    if (response.ok) {
      return { status: 'ok', message: 'Swap сервис работает' }
    }
    return { status: 'warning', message: 'Swap сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Swap сервиса' }
  }
}

async function checkFarmingHealth() {
  try {
    // Проверяем статус farming
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/defi/farming?action=health`)
    if (response.ok) {
      return { status: 'ok', message: 'Farming сервис работает' }
    }
    return { status: 'warning', message: 'Farming сервис недоступен' }
  } catch (error) {
    return { status: 'error', message: 'Ошибка проверки Farming сервиса' }
  }
}

export const GET = withAuth(async (request: NextRequest, auth, { params }) => {
  try {
    const { service } = params

    let healthCheck
    switch (service) {
      case 'database':
        healthCheck = await checkDatabaseHealth()
        break
      case 'solana':
        healthCheck = await checkSolanaHealth()
        break
      case 'oracle':
        healthCheck = await checkOracleHealth()
        break
      case 'bridge':
        healthCheck = await checkBridgeHealth()
        break
      case 'insurance':
        healthCheck = await checkInsuranceHealth()
        break
      case 'lending':
        healthCheck = await checkLendingHealth()
        break
      case 'staking':
        healthCheck = await checkStakingHealth()
        break
      case 'swap':
        healthCheck = await checkSwapHealth()
        break
      case 'farming':
        healthCheck = await checkFarmingHealth()
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестный сервис'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      ...healthCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      success: false,
      status: 'error',
      message: 'Ошибка проверки статуса сервиса'
    }, { status: 500 })
  }
})
