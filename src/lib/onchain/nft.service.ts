/**
 * NFT Service - Real Blockchain NFT Operations using Metaplex
 * Solana SuperApp - Интеграция с существующей custodial wallet системой
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import {
  Metaplex,
  keypairIdentity,
  toMetaplexFile,
  CreateNftInput,
  FindNftByMintInput,
  Nft,
  Sft,
  NftWithToken,
  SftWithToken,
  irysStorage
} from '@metaplex-foundation/js'
import { WalletErrorCode, WalletResult } from '@/lib/wallet/types'
import { createWalletError } from '@/lib/wallet/errors'
import fs from 'fs'
import path from 'path'

export interface NFTMintResult {
  signature: string
  mintAddress: string
  metadataUri: string
  imageUri?: string
  explorerUrl: string
  name: string
  symbol: string
}

export interface NFTTransferResult {
  signature: string
  fromAddress: string
  toAddress: string
  mintAddress: string
  explorerUrl: string
}

export interface NFTListingResult {
  signature: string
  listingAddress: string
  price: number
  explorerUrl: string
}

export interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    creators?: Array<{
      address: string
      share: number
    }>
    category?: string
  }
}

export class NFTService {
  private readonly connection: Connection
  private readonly metaplex: Metaplex
  private readonly sponsorKeypair: Keypair

  constructor(connection: Connection) {
    this.connection = connection
    
    // Загружаем sponsor keypair (используем существующую логику)
    this.sponsorKeypair = this.loadSponsorKeypair()
    
    // Инициализируем Metaplex с sponsor identity и Irys storage для devnet
    this.metaplex = Metaplex.make(connection)
      .use(keypairIdentity(this.sponsorKeypair))
      .use(irysStorage({
        address: "https://devnet.irys.xyz",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      }))

    console.log(' NFTService initialized:', {
      sponsorAddress: this.sponsorKeypair.publicKey.toBase58(),
      network: 'devnet',
      irysAddress: 'https://devnet.irys.xyz',
      storageEnabled: true
    })
  }

  /**
   * Загружает sponsor keypair (используем существующую логику из TNG service)
   */
  private loadSponsorKeypair(): Keypair {
    try {
      const keypairPath = path.join(process.cwd(), 'keys', 'mvp-sponsor-keypair.json')
      
      if (!fs.existsSync(keypairPath)) {
        throw new Error(`Sponsor keypair not found at: ${keypairPath}`)
      }

      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData))
      
      console.log(' NFT sponsor keypair loaded:', keypair.publicKey.toBase58())
      return keypair

    } catch (error) {
      console.error(' Failed to load sponsor keypair for NFT:', error)
      throw new Error('NFT sponsor keypair loading failed')
    }
  }

  /**
   * Проверяет, достаточно ли SOL у спонсора для Irys операций
   */
  private async ensureSufficientBalance(): Promise<void> {
    console.log(' Checking sponsor balance for Irys operations...')
    
    const balance = await this.connection.getBalance(this.sponsorKeypair.publicKey)
    const balanceSOL = balance / LAMPORTS_PER_SOL
    
    console.log(` Current sponsor balance: ${balanceSOL} SOL`)
    
    // Минимум 0.01 SOL для Irys операций
    const minBalance = 0.01
    if (balanceSOL < minBalance) {
      throw new Error(`Insufficient sponsor balance: ${balanceSOL} SOL (minimum: ${minBalance} SOL)`)
    }
    
    console.log(' Sponsor balance sufficient for Irys operations')
  }

  /**
   * Устойчивая загрузка файла с повторными попытками
   */
  private async robustUpload(
    uploadFn: () => Promise<string>,
    description: string,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(` ${description} (attempt ${attempt}/${maxRetries})...`)
        
        const result = await uploadFn()
        console.log(` ${description} successful:`, result)
        return result
        
      } catch (error) {
        lastError = error as Error
        console.warn(` ${description} attempt ${attempt} failed:`, lastError.message)
        
        // Если это 400 ошибка от Irys, ждем и повторяем
        if (lastError.message.includes('400') || lastError.message.includes('Confirmed tx not found')) {
          if (attempt < maxRetries) {
            const delay = attempt * 2000 // 2s, 4s, 6s
            console.log(` Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        } else {
          // Для других ошибок не повторяем
          throw lastError
        }
      }
    }
    
    throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError?.message}`)
  }

  /**
   * Ожидает подтверждения транзакции с финализацией
   */
  private async confirmTransaction(signature: string): Promise<void> {
    console.log(` Waiting for transaction confirmation: ${signature}`)
    
    try {
      await this.connection.confirmTransaction(signature, "finalized")
      console.log(` Transaction confirmed: ${signature}`)
    } catch (error) {
      console.error(` Transaction confirmation failed: ${signature}`, error)
      throw error
    }
  }

  /**
   * Минтит NFT с метаданными, используя sponsor для оплаты комиссий
   */
  async mintNFT(
    creatorKeypair: Keypair,
    metadata: NFTMetadata,
    imageBuffer?: Buffer,
    collection?: string
  ): Promise<WalletResult<NFTMintResult>> {
    try {
      console.log(' Starting NFT minting process:', {
        creator: creatorKeypair.publicKey.toBase58(),
        name: metadata.name,
        hasImage: !!imageBuffer,
        sponsor: this.sponsorKeypair.publicKey.toBase58()
      })

      // 1. Проверяем баланс спонсора для Irys
      await this.ensureSufficientBalance()

      let imageUri = metadata.image

      // 2. Если передан buffer изображения, загружаем в Arweave via Irys с повторами
      if (imageBuffer) {
        console.log(' Starting image upload to Arweave via Irys...')
        const imageFile = toMetaplexFile(imageBuffer, `${metadata.name}.png`)
        
        imageUri = await this.robustUpload(
          () => this.metaplex.storage().upload(imageFile),
          'Image upload to Arweave'
        )
      }

      // 3. Создаем полные метаданные
      const fullMetadata = {
        name: metadata.name,
        description: metadata.description,
        image: imageUri,
        attributes: metadata.attributes || [],
        properties: {
          creators: [
            {
              address: creatorKeypair.publicKey.toBase58(),
              share: 100
            }
          ],
          category: metadata.properties?.category || 'art',
          ...metadata.properties
        }
      }

      console.log(' Starting metadata upload to Arweave via Irys...')
      
      // 4. Загружаем метаданные с повторами
      const metadataUri = await this.robustUpload(
        () => this.metaplex.storage().uploadJson(fullMetadata),
        'Metadata upload to Arweave'
      )

      // 5. Создаем NFT input
      const nftInput: CreateNftInput = {
        uri: metadataUri,
        name: metadata.name,
        symbol: this.generateSymbol(metadata.name),
        sellerFeeBasisPoints: 500, // 5% royalty
        creators: [
          {
            address: creatorKeypair.publicKey,
            share: 100
          }
        ],
        isMutable: true,
        maxSupply: 1, // Unique NFT
        collection: collection ? new PublicKey(collection) : undefined
      }

      console.log(' Creating NFT transaction on Solana...')
      
      // 6. Минтим NFT (sponsor автоматически платит комиссии)
      const { nft, response } = await this.metaplex.nfts().create(nftInput)

      console.log(' Waiting for NFT mint transaction confirmation...')
      
      // 7. Ждем подтверждения транзакции
      await this.confirmTransaction(response.signature)

      console.log(' NFT minted successfully:', {
        signature: response.signature,
        mintAddress: nft.address.toBase58(),
        name: nft.name,
        symbol: nft.symbol,
        metadataUri,
        imageUri
      })

      const result: NFTMintResult = {
        signature: response.signature,
        mintAddress: nft.address.toBase58(),
        metadataUri,
        imageUri,
        explorerUrl: `https://explorer.solana.com/address/${nft.address.toBase58()}?cluster=devnet`,
        name: nft.name,
        symbol: nft.symbol
      }

      return { success: true, data: result }

    } catch (error) {
      console.error(' NFT mint failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `NFT mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Переводит NFT между пользователями
   */
  async transferNFT(
    fromKeypair: Keypair,
    toPublicKey: PublicKey,
    mintAddress: string
  ): Promise<WalletResult<NFTTransferResult>> {
    try {
      console.log(' Transferring NFT:', {
        from: fromKeypair.publicKey.toBase58(),
        to: toPublicKey.toBase58(),
        mint: mintAddress
      })

      const mint = new PublicKey(mintAddress)

      // Получаем NFT информацию
      const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint }) as any

      // Выполняем transfer (sponsor платит комиссии)
      const { response } = await this.metaplex.nfts().transfer({
        nftOrSft: nft,
        fromOwner: fromKeypair.publicKey,
        toOwner: toPublicKey
      })

      console.log(' NFT transferred:', {
        signature: response.signature,
        from: fromKeypair.publicKey.toBase58(),
        to: toPublicKey.toBase58(),
        mint: mintAddress
      })

      const result: NFTTransferResult = {
        signature: response.signature,
        fromAddress: fromKeypair.publicKey.toBase58(),
        toAddress: toPublicKey.toBase58(),
        mintAddress,
        explorerUrl: `https://explorer.solana.com/tx/${response.signature}?cluster=devnet`
      }

      return { success: true, data: result }

    } catch (error) {
      console.error(' NFT transfer failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `NFT transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Получает информацию о NFT
   */
  async getNFTInfo(mintAddress: string): Promise<WalletResult<Nft | Sft>> {
    try {
      const mint = new PublicKey(mintAddress)
      const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint })
      
      return { success: true, data: nft }
    } catch (error) {
      console.error(' Failed to get NFT info:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get NFT info: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Получает все NFT пользователя
   */
  async getUserNFTs(userPublicKey: PublicKey): Promise<WalletResult<(NftWithToken | SftWithToken)[]>> {
    try {
      console.log(' Getting user NFTs:', userPublicKey.toBase58())

      const nfts = await this.metaplex.nfts().findAllByOwner({
        owner: userPublicKey
      }) as unknown as (NftWithToken | SftWithToken)[]

      console.log(` Found ${nfts.length} NFTs for user:`, userPublicKey.toBase58())

      return { success: true, data: nfts }
    } catch (error) {
      console.error(' Failed to get user NFTs:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Failed to get user NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Создает коллекцию NFT
   */
  async createCollection(
    creatorKeypair: Keypair,
    metadata: NFTMetadata
  ): Promise<WalletResult<NFTMintResult>> {
    try {
      console.log(' Starting NFT collection creation:', metadata.name)

      // Проверяем баланс спонсора
      await this.ensureSufficientBalance()

      // Загружаем метаданные коллекции с устойчивостью
      console.log(' Starting collection metadata upload to Arweave via Irys...')
      const metadataUri = await this.robustUpload(
        () => this.metaplex.storage().uploadJson(metadata),
        'Collection metadata upload'
      )

      console.log(' Creating collection transaction on Solana...')

      // Создаем коллекцию
      const { nft, response } = await this.metaplex.nfts().create({
        uri: metadataUri,
        name: metadata.name,
        symbol: this.generateSymbol(metadata.name),
        sellerFeeBasisPoints: 0,
        isCollection: true,
        creators: [
          {
            address: creatorKeypair.publicKey,
            share: 100
          }
        ]
      })

      console.log(' Waiting for collection creation transaction confirmation...')
      
      // Ждем подтверждения транзакции
      await this.confirmTransaction(response.signature)

      console.log(' Collection created successfully:', {
        signature: response.signature,
        mintAddress: nft.address.toBase58(),
        name: nft.name,
        symbol: nft.symbol,
        metadataUri
      })

      const result: NFTMintResult = {
        signature: response.signature,
        mintAddress: nft.address.toBase58(),
        metadataUri,
        explorerUrl: `https://explorer.solana.com/address/${nft.address.toBase58()}?cluster=devnet`,
        name: nft.name,
        symbol: nft.symbol
      }

      return { success: true, data: result }
    } catch (error) {
      console.error(' Collection creation failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Collection creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Загружает файл в Arweave и возвращает URI
   */
  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<WalletResult<string>> {
    try {
      console.log(' Starting file upload to Arweave via Irys:', fileName)
      
      // Проверяем баланс спонсора
      await this.ensureSufficientBalance()
      
      const file = toMetaplexFile(fileBuffer, fileName)
      
      // Используем устойчивую загрузку с повторами
      const uri = await this.robustUpload(
        () => this.metaplex.storage().upload(file),
        `File upload: ${fileName}`
      )
      
      return { success: true, data: uri }
    } catch (error) {
      console.error(' File upload failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Загружает JSON метаданные в Arweave
   */
  async uploadMetadata(metadata: any): Promise<WalletResult<string>> {
    try {
      console.log(' Starting metadata upload to Arweave via Irys')
      
      // Проверяем баланс спонсора
      await this.ensureSufficientBalance()
      
      // Используем устойчивую загрузку с повторами
      const uri = await this.robustUpload(
        () => this.metaplex.storage().uploadJson(metadata),
        'Metadata upload'
      )
      
      return { success: true, data: uri }
    } catch (error) {
      console.error(' Metadata upload failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.INTERNAL_ERROR,
          `Metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Генерирует символ для NFT на основе имени
   */
  private generateSymbol(name: string): string {
    // Берем первые буквы слов, максимум 8 символов
    const words = name.split(' ')
    let symbol = ''
    
    for (const word of words) {
      if (symbol.length < 8 && word.length > 0) {
        symbol += word[0].toUpperCase()
      }
    }
    
    // Если символ пустой или слишком короткий, используем "NFT"
    if (symbol.length === 0) {
      symbol = 'NFT'
    }
    
    return symbol
  }

  /**
   * Проверяет статус sponsor кошелька
   */
  async getSponsorStats() {
    try {
      const balance = await this.connection.getBalance(this.sponsorKeypair.publicKey)
      
      return {
        address: this.sponsorKeypair.publicKey.toBase58(),
        balance: balance / LAMPORTS_PER_SOL,
        status: balance > 0.01 * LAMPORTS_PER_SOL ? 'healthy' : 'low'
      }
    } catch (error) {
      console.error(' Failed to get sponsor stats:', error)
      return null
    }
  }
}
