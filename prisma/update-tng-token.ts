/**
 * Update TNG Token - Update TNG asset with real mint address
 * Solana SuperApp
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTNGToken() {
  console.log(' Updating TNG token with real mint address...')

  try {
    // Mint address созданного TNG токена
    const TNG_MINT_ADDRESS = '7UuuwrzNE5fAgpCNqRFcrLFGYg8HsMb3uUTNrojC2PX7'

    // Обновляем TNG актив
    const updatedAsset = await prisma.asset.update({
      where: { symbol: 'TNG' },
      data: {
        mintAddress: TNG_MINT_ADDRESS,
        description: 'Tenge Token - utility токен Solana SuperApp (Devnet)',
        logoUrl: null
      }
    })

    console.log(' TNG token updated successfully:', {
      id: updatedAsset.id,
      symbol: updatedAsset.symbol,
      mintAddress: updatedAsset.mintAddress,
      decimals: updatedAsset.decimals
    })

    // Проверяем что токен корректно обновился
    const tngAsset = await prisma.asset.findUnique({
      where: { symbol: 'TNG' }
    })

    if (tngAsset?.mintAddress === TNG_MINT_ADDRESS) {
      console.log(' TNG token integration completed!')
      console.log(' Token details:', {
        symbol: tngAsset.symbol,
        name: tngAsset.name,
        mintAddress: tngAsset.mintAddress,
        decimals: tngAsset.decimals,
        isOnchain: tngAsset.isOnchain,
        isActive: tngAsset.isActive
      })
    } else {
      console.error(' Token update verification failed')
    }

  } catch (error) {
    console.error(' Error updating TNG token:', error)
    process.exit(1)
  }
}

updateTNGToken()
  .catch((e) => {
    console.error(' Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
