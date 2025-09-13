/**
 * NFT Integration Service - Интеграция NFT операций с custodial wallet системой
 * Solana SuperApp - Связывает NFT сервис с пользователями и их кошельками
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { NFTService, NFTMetadata, NFTMintResult, NFTTransferResult } from '@/lib/onchain/nft.service'
import { WalletGeneratorService } from './generator.service'
import { WalletResult, WalletErrorCode } from './types'
import { PrismaClient, NFTType } from '@prisma/client'

export interface UserNFTMintRequest {
  userId: string
  name: string
  description: string
  nftType: NFTType // COLLECTIBLE, TICKET, COUPON, CERTIFICATE, BADGE
  imageBuffer?: Buffer
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  collectionId?: string
}

export interface UserNFTTransferRequest {
  fromUserId: string
  toUserId: string
  nftId: string // database ID or mint address
  memo?: string
}

export interface UserNFT {
  id: string
  mintAddress: string
  name: string
  description: string
  image: string
  imageUri?: string // Добавляем для совместимости с UI
  type: NFTType
  attributes: any
  ownerUserId: string
  isForSale: boolean
  price?: number
  collectionId?: string
  createdAt: Date
  onchainData?: any // метаданные из блокчейна
}

export class NFTIntegrationService {
  private readonly nftService: NFTService
  private readonly walletGenerator: WalletGeneratorService
  private readonly prisma: PrismaClient

  constructor(connection: Connection, prisma: PrismaClient) {
    this.nftService = new NFTService(connection)
    this.walletGenerator = new WalletGeneratorService(prisma)
    this.prisma = prisma
  }

  /**
   * Минтит NFT для пользователя, используя его custodial кошелек
   */
  async mintNFTForUser(request: UserNFTMintRequest): Promise<WalletResult<UserNFT>> {
    try {
      console.log(' Minting NFT for user:', {
        userId: request.userId,
        name: request.name,
        type: request.nftType
      })

      // Получаем keypair пользователя
      const keypairResult = await this.walletGenerator.getUserKeypair(request.userId)
      if (!keypairResult.success || !keypairResult.data) {
        return { success: false, error: keypairResult.error }
      }

      const userKeypair = keypairResult.data

      // Получаем коллекцию если указана
      let collectionMint: string | undefined
      if (request.collectionId) {
        const collection = await this.prisma.nFT.findUnique({
          where: { id: request.collectionId },
          select: { mintAddress: true }
        })
        collectionMint = collection?.mintAddress || undefined
      }

      // Подготавливаем метаданные с учетом типа NFT
      const metadata: NFTMetadata = {
        name: request.name,
        description: request.description || this.getDefaultDescription(request.nftType),
        image: '', // Будет заполнено после загрузки
        attributes: [
          {
            trait_type: 'Type',
            value: request.nftType
          },
          {
            trait_type: 'Creator',
            value: userKeypair.publicKey.toBase58()
          },
          ...(request.attributes || [])
        ],
        properties: {
          creators: [
            {
              address: userKeypair.publicKey.toBase58(),
              share: 100
            }
          ],
          category: this.getCategoryFromType(request.nftType)
        }
      }

      // Минтим NFT в блокчейне
      const mintResult = await this.nftService.mintNFT(
        userKeypair,
        metadata,
        request.imageBuffer,
        collectionMint
      )

      if (!mintResult.success || !mintResult.data) {
        return { success: false, error: mintResult.error }
      }

      const nftData = mintResult.data

      // Сохраняем NFT в базе данных
      const dbNft = await this.prisma.nFT.create({
        data: {
          userId: request.userId,
          ownerId: request.userId,
          creatorId: request.userId,
          mintAddress: nftData.mintAddress,
          name: nftData.name,
          description: request.description || this.getDefaultDescription(request.nftType),
          imageUri: nftData.imageUri || '',
          type: request.nftType,
          collectionId: request.collectionId || undefined,
          isForSale: false
        }
      })

      // Создаем запись в onchain_txs для отслеживания
      await this.prisma.onchainTx.create({
        data: {
          userId: request.userId,
          signature: nftData.signature,
          purpose: 'NFT_MINT',
          status: 'CONFIRMED',
          metadata: {
            mintAddress: nftData.mintAddress,
            name: nftData.name,
            type: request.nftType,
            explorerUrl: nftData.explorerUrl
          }
        }
      })

      const userNft: UserNFT = {
        id: dbNft.id,
        mintAddress: dbNft.mintAddress || '',
        name: dbNft.name,
        description: dbNft.description || '',
        image: dbNft.imageUri || '',
        type: dbNft.type,
        attributes: (dbNft as any).metadata || {},
        ownerUserId: dbNft.userId || '',
        isForSale: dbNft.isForSale,
        price: dbNft.price ? Number(dbNft.price) : undefined,
        collectionId: dbNft.collectionId || undefined,
        createdAt: dbNft.createdAt
      }

      console.log(' NFT minted and saved:', {
        dbId: dbNft.id,
        mintAddress: nftData.mintAddress,
        signature: nftData.signature
      })

      return { success: true, data: userNft }

    } catch (error) {
      console.error(' User NFT mint failed:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.NFT_MINT_FAILED,
          message: `Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Переводит NFT между пользователями
   */
  async transferNFTBetweenUsers(request: UserNFTTransferRequest): Promise<WalletResult<NFTTransferResult>> {
    try {
      console.log(' Transferring NFT between users:', {
        from: request.fromUserId,
        to: request.toUserId,
        nftId: request.nftId
      })

      // Получаем NFT из базы данных
      const nft = await this.prisma.nFT.findFirst({
        where: {
          OR: [
            { id: request.nftId },
            { mintAddress: request.nftId }
          ],
          userId: request.fromUserId // Проверяем владение
        }
      })

      if (!nft) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.NFT_NOT_FOUND,
            message: 'NFT не найден или не принадлежит отправителю',
            timestamp: new Date()
          }
        }
      }

      // Получаем keypair отправителя
      const fromKeypairResult = await this.walletGenerator.getUserKeypair(request.fromUserId)
      if (!fromKeypairResult.success || !fromKeypairResult.data) {
        return { success: false, error: fromKeypairResult.error }
      }

      // Получаем публичный ключ получателя
      const toUser = await this.prisma.user.findUnique({
        where: { id: request.toUserId },
        select: { walletAddress: true }
      })

      if (!toUser?.walletAddress) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.RECIPIENT_WALLET_NOT_FOUND,
            message: 'Кошелек получателя не найден',
            timestamp: new Date()
          }
        }
      }

      const toPublicKey = new PublicKey(toUser.walletAddress)

      // Проверяем mintAddress
      if (!nft.mintAddress) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.NFT_TRANSFER_FAILED,
            message: 'NFT mint address is missing',
            timestamp: new Date()
          }
        }
      }

      // Выполняем transfer в блокчейне
      const transferResult = await this.nftService.transferNFT(
        fromKeypairResult.data,
        toPublicKey,
        nft.mintAddress
      )

      if (!transferResult.success || !transferResult.data) {
        return { success: false, error: transferResult.error }
      }

      // Обновляем владельца в базе данных
      await this.prisma.nFT.update({
        where: { id: nft.id },
        data: {
          userId: request.toUserId,
          isForSale: false, // Сбрасываем статус продажи
          price: null
        }
      })

      // Создаем запись в onchain_txs
      await this.prisma.onchainTx.create({
        data: {
          userId: request.fromUserId,
          signature: transferResult.data.signature,
          purpose: 'NFT_TRANSFER',
          status: 'CONFIRMED',
          metadata: {
            mintAddress: nft.mintAddress,
            fromUserId: request.fromUserId,
            toUserId: request.toUserId,
            nftName: nft.name,
            memo: request.memo,
            explorerUrl: transferResult.data.explorerUrl
          }
        }
      })

      console.log(' NFT transferred:', {
        signature: transferResult.data.signature,
        from: request.fromUserId,
        to: request.toUserId,
        mint: nft.mintAddress
      })

      return { success: true, data: transferResult.data }

    } catch (error) {
      console.error(' NFT transfer failed:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.NFT_TRANSFER_FAILED,
          message: `Failed to transfer NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Получает все NFT пользователя (объединяет данные из БД и блокчейна)
   */
  async getUserNFTs(userId: string): Promise<WalletResult<UserNFT[]>> {
    try {
      console.log(' Getting user NFTs:', userId)
      console.log(' Searching NFTs with OR condition: ownerId =', userId, 'OR userId =', userId)

      // Получаем NFT из базы данных - ищем по ownerId (основное поле владельца)
      const dbNFTs = await this.prisma.nFT.findMany({
        where: { 
          OR: [
            { ownerId: userId },    // Основной поиск по владельцу
            { userId: userId }      // Резервный поиск по старому полю
          ]
        },
        orderBy: { createdAt: 'desc' }
      })

      console.log(' Found', dbNFTs.length, 'NFTs in database for user:', userId)
      if (dbNFTs.length > 0) {
        console.log(' NFT details:', dbNFTs.map(nft => ({
          id: nft.id,
          name: nft.name,
          ownerId: nft.ownerId,
          userId: nft.userId,
          createdAt: nft.createdAt
        })))
      }

      // Получаем адрес кошелька пользователя для проверки onchain данных
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      })

      if (!user?.walletAddress) {
        // Возвращаем только данные из БД
        const userNFTs = dbNFTs.map(nft => ({
          id: nft.id,
          mintAddress: nft.mintAddress || '',
          name: nft.name,
          description: nft.description || '',
          image: nft.imageUri || '', // Основное поле для API response
          imageUri: nft.imageUri || '', // Дублируем для совместимости с UI
          type: nft.type,
          attributes: Array.isArray((nft as any).metadata) ? (nft as any).metadata : [],
          ownerUserId: nft.ownerId || nft.userId || '', // Используем ownerId как основное поле
          isForSale: nft.isForSale,
          price: nft.price ? Number(nft.price) : undefined,
          collectionId: nft.collectionId || undefined,
          createdAt: nft.createdAt
        }))

        return { success: true, data: userNFTs }
      }

      // Опционально: получаем актуальные данные из блокчейна для верификации
      const userPublicKey = new PublicKey(user.walletAddress)
      const onchainNFTsResult = await this.nftService.getUserNFTs(userPublicKey)

      // Создаем результат с данными из БД (основной источник)
      const userNFTs: UserNFT[] = dbNFTs.map(nft => ({
        id: nft.id,
        mintAddress: nft.mintAddress || '',
        name: nft.name,
        description: nft.description || '',
        image: nft.imageUri || '', // Основное поле для API response
        imageUri: nft.imageUri || '', // Дублируем для совместимости с UI
        type: nft.type,
        attributes: (nft as any).metadata || {},
        ownerUserId: nft.ownerId || nft.userId || '', // Используем ownerId как основное поле
        isForSale: nft.isForSale,
        price: nft.price ? Number(nft.price) : undefined,
        collectionId: nft.collectionId || undefined,
        createdAt: nft.createdAt,
        onchainData: onchainNFTsResult.success ? onchainNFTsResult.data : undefined
      }))

      console.log(` Found ${userNFTs.length} NFTs for user:`, userId)
      return { success: true, data: userNFTs }

    } catch (error) {
      console.error(' Failed to get user NFTs:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.GET_USER_NFTS_FAILED,
          message: `Failed to get user NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Выставляет NFT на продажу
   */
  async listNFTForSale(userId: string, nftId: string, price: number): Promise<WalletResult<boolean>> {
    try {
      const nft = await this.prisma.nFT.findFirst({
        where: {
          OR: [{ id: nftId }, { mintAddress: nftId }],
          userId: userId
        }
      })

      if (!nft) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.NFT_NOT_FOUND,
            message: 'NFT не найден или не принадлежит пользователю',
            timestamp: new Date()
          }
        }
      }

      await this.prisma.nFT.update({
        where: { id: nft.id },
        data: {
          isForSale: true,
          price: BigInt(price)
        }
      })

      return { success: true, data: true }
    } catch (error) {
      console.error(' Failed to list NFT:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.LIST_NFT_FAILED,
          message: `Failed to list NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Покупает NFT
   */
  async buyNFT(buyerUserId: string, nftId: string): Promise<WalletResult<NFTTransferResult>> {
    try {
      const nft = await this.prisma.nFT.findFirst({
        where: {
          OR: [{ id: nftId }, { mintAddress: nftId }],
          isForSale: true
        },
        include: { owner: true }
      })

      if (!nft) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.NFT_NOT_FOR_SALE,
            message: 'NFT не найден или не продается',
            timestamp: new Date()
          }
        }
      }

      if (nft.userId === buyerUserId) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.CANNOT_BUY_OWN_NFT,
            message: 'Нельзя купить собственный NFT',
            timestamp: new Date()
          }
        }
      }

      // Проверяем что у NFT есть владелец
      if (!nft.userId) {
        return {
          success: false,
          error: {
            code: WalletErrorCode.BUY_NFT_FAILED,
            message: 'NFT has no owner',
            timestamp: new Date()
          }
        }
      }

      // Переводим NFT новому владельцу
      const transferResult = await this.transferNFTBetweenUsers({
        fromUserId: nft.userId,
        toUserId: buyerUserId,
        nftId: nft.id,
        memo: `Purchase for ${nft.price} lamports`
      })

      if (transferResult.success) {
        // TODO: Здесь можно добавить перевод оплаты продавцу
        console.log(' NFT purchased:', {
          nftId: nft.id,
          buyer: buyerUserId,
          seller: nft.userId,
          price: nft.price?.toString()
        })
      }

      return transferResult
    } catch (error) {
      console.error(' Failed to buy NFT:', error)
      return {
        success: false,
        error: {
          code: WalletErrorCode.BUY_NFT_FAILED,
          message: `Failed to buy NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Получает дефолтное описание для типа NFT
   */
  private getDefaultDescription(type: NFTType): string {
    switch (type) {
      case 'TICKET':
        return 'Цифровой билет на событие или мероприятие'
      case 'COUPON':
        return 'Цифровой купон со скидкой или специальным предложением'
      case 'CERTIFICATE':
        return 'Цифровой сертификат достижения'
      case 'BADGE':
        return 'Цифровой значок или награда'
      case 'COLLECTIBLE':
      default:
        return 'Уникальное коллекционное цифровое произведение искусства'
    }
  }

  /**
   * Получает категорию Metaplex для типа NFT
   */
  private getCategoryFromType(type: NFTType): string {
    switch (type) {
      case 'TICKET':
        return 'utility'
      case 'COUPON':
        return 'utility'
      case 'CERTIFICATE':
        return 'certificate'
      case 'BADGE':
        return 'badge'
      case 'COLLECTIBLE':
      default:
        return 'art'
    }
  }

  /**
   * Получает статистику sponsor кошелька для NFT операций
   */
  async getSponsorStats() {
    return await (this.nftService.getSponsorStats() as unknown as Promise<any>)
  }
}
