/**
 * On-Chain TNG Token Service - Real Blockchain Operations
 * Handles minting, transferring, and managing TNG tokens on Solana devnet
 * Solana SuperApp
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
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  TokenAccountNotFoundError,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token'
import { WalletErrorCode, WalletResult } from '@/lib/wallet/types'
import { createWalletError } from '@/lib/wallet/errors'

export interface TNGMintResult {
  signature: string
  tokenAccount: string
  amount: string
  explorerUrl: string
  userBalance: string
}

export interface TNGTransferResult {
  signature: string
  fromTokenAccount: string
  toTokenAccount: string
  amount: string
  explorerUrl: string
  senderNewBalance: string
  receiverNewBalance: string
}

export interface TNGBalanceResult {
  balance: string
  tokenAccount: string
  mint: string
}

export class TNGTokenService {
  private readonly connection: Connection
  private readonly tngMint: PublicKey
  private readonly mintAuthority: Keypair
  private readonly sponsorKeypair: Keypair

  constructor(connection: Connection) {
    this.connection = connection

    // Загружаем TNG mint информацию из файла
    const mintInfo = this.loadMintInfo()
    this.tngMint = new PublicKey(mintInfo.mintAddress)

    // Сначала загружаем sponsor keypair
    this.sponsorKeypair = this.loadSponsorKeypair()

    // Затем загружаем mint authority (может использовать sponsor keypair)
    this.mintAuthority = this.loadMintAuthority()

    // TNGTokenService initialized - logs removed for production
  }

  /**
   * Загружает информацию о TNG mint из файла
   */
  private loadMintInfo(): { mintAddress: string, mintAuthority: string } {
    try {
      const fs = require('fs')
      const path = require('path')
      
      const keysDir = path.join(process.cwd(), 'keys')
      const mintInfoPath = path.join(keysDir, 'tng-mint-info.json')
      
      if (!fs.existsSync(mintInfoPath)) {
        throw new Error('TNG mint info not found at: ' + mintInfoPath)
      }
      
      const mintInfo = JSON.parse(fs.readFileSync(mintInfoPath, 'utf8'))
      
      if (!mintInfo.mintAddress || !mintInfo.mintAuthority) {
        throw new Error('Invalid TNG mint info: missing mintAddress or mintAuthority')
      }
      
      return {
        mintAddress: mintInfo.mintAddress,
        mintAuthority: mintInfo.mintAuthority
      }
      
    } catch (error) {
      console.error(' Error loading TNG mint info:', error)
      throw new Error('Failed to load TNG mint info')
    }
  }

  /**
   * Загружает mint authority keypair из файла
   */
  private loadMintAuthority(): Keypair {
    try {
      const fs = require('fs')
      const path = require('path')
      
      // Ищем mint authority в папке keys/
      const keysDir = path.join(process.cwd(), 'keys')
      const mintAuthorityPath = path.join(keysDir, 'tng-mint-authority.json')
      
      if (fs.existsSync(mintAuthorityPath)) {
        const secretKey = JSON.parse(fs.readFileSync(mintAuthorityPath, 'utf8'))
        return Keypair.fromSecretKey(new Uint8Array(secretKey))
      }
      
      // Для MVP sponsor keypair является mint authority (согласно tng-mint-info.json)
      console.log(' Using sponsor keypair as TNG mint authority')
      return this.sponsorKeypair
      
    } catch (error) {
      console.error(' Error loading TNG mint authority:', error)
      throw new Error('Failed to load TNG mint authority keypair')
    }
  }

  /**
   * Загружает sponsor keypair
   */
  private loadSponsorKeypair(): Keypair {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      throw new Error('TNGTokenService can only be used on the server side')
    }

    try {
      const fs = require('fs')
      const path = require('path')
      
      const keysDir = path.join(process.cwd(), 'keys')
      const sponsorPath = path.join(keysDir, 'mvp-sponsor-keypair.json')
      
      if (!fs.existsSync(sponsorPath)) {
        throw new Error('Sponsor keypair not found at: ' + sponsorPath)
      }
      
      const secretKey = JSON.parse(fs.readFileSync(sponsorPath, 'utf8'))
      return Keypair.fromSecretKey(new Uint8Array(secretKey))
      
    } catch (error) {
      console.error(' Error loading sponsor keypair:', error)
      throw new Error('Failed to load sponsor keypair')
    }
  }

  /**
   * Faucet - минтит реальные TNG токены пользователю
   */
  async mintTNGTokens(
    userPublicKey: PublicKey,
    amount: bigint = BigInt(1000 * 1000000000) // 1000 TNG по умолчанию
  ): Promise<WalletResult<TNGMintResult>> {
    try {
      console.log(' Minting TNG tokens:', {
        user: userPublicKey.toBase58(),
        amount: (Number(amount) / 1000000000).toFixed(2) + ' TNG',
        mint: this.tngMint.toBase58()
      })

      // 0. Проверяем баланс sponsor'а для оплаты fees
      const sponsorBalance = await this.connection.getBalance(this.sponsorKeypair.publicKey)
      if (sponsorBalance < 0.01 * LAMPORTS_PER_SOL) { // Минимум 0.01 SOL
        console.error(' Insufficient sponsor SOL balance:', {
          current: (sponsorBalance / LAMPORTS_PER_SOL).toFixed(4) + ' SOL',
          required: '0.01 SOL',
          sponsor: this.sponsorKeypair.publicKey.toBase58()
        })
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
            'Sponsor account has insufficient SOL balance for transaction fees',
            {
              sponsorBalance: (sponsorBalance / LAMPORTS_PER_SOL).toFixed(4) + ' SOL',
              sponsor: this.sponsorKeypair.publicKey.toBase58()
            }
          )
        }
      }

      // 1. Получаем или создаем Associated Token Account для пользователя
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer (sponsor платит за создание)
        this.tngMint,
        userPublicKey
      )

      console.log(' User token account:', {
        address: userTokenAccount.address.toBase58(),
        mint: userTokenAccount.mint.toBase58(),
        owner: userTokenAccount.owner.toBase58(),
        isNewAccount: userTokenAccount.amount === 0n
      })

      // 2. Минтим токены напрямую в token account пользователя
      const mintSignature = await mintTo(
        this.connection,
        this.sponsorKeypair, // payer
        this.tngMint,
        userTokenAccount.address,
        this.mintAuthority, // mint authority
        Number(amount)
      )

      console.log(' TNG tokens minted:', {
        signature: mintSignature,
        user: userPublicKey.toBase58(),
        tokenAccount: userTokenAccount.address.toBase58(),
        amount: (Number(amount) / 1e9).toFixed(2) + ' TNG'
      })

      // 3. Получаем обновленный баланс
      const updatedAccount = await getAccount(this.connection, userTokenAccount.address)
      const userBalance = updatedAccount.amount.toString()

      const result: TNGMintResult = {
        signature: mintSignature,
        tokenAccount: userTokenAccount.address.toBase58(),
        amount: amount.toString(),
        explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`,
        userBalance
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      console.error(' TNG minting failed:', error)
      
      // Специальная обработка для TokenAccountNotFoundError
      if (error instanceof TokenAccountNotFoundError || error.name === 'TokenAccountNotFoundError') {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INVALID_TOKEN_ACCOUNT,
            'Failed to create token account - likely insufficient sponsor SOL balance',
            { 
              error: error instanceof Error ? error.message : String(error),
              user: userPublicKey.toBase58(),
              sponsor: this.sponsorKeypair.publicKey.toBase58(),
              suggestion: 'Fund sponsor account with SOL'
            }
          )
        }
      }
      
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка минтинга TNG токенов',
          { 
            error: error instanceof Error ? error.message : String(error),
            user: userPublicKey.toBase58()
          }
        )
      }
    }
  }

  /**
   * Перевод TNG токенов между пользователями
   */
  async transferTNGTokens(
    fromKeypair: Keypair,
    toPublicKey: PublicKey,
    amount: bigint
  ): Promise<WalletResult<TNGTransferResult>> {
    try {
      console.log(' Transferring TNG tokens:', {
        from: fromKeypair.publicKey.toBase58(),
        to: toPublicKey.toBase58(),
        amount: (Number(amount) / 1000000000).toFixed(2) + ' TNG',
        mint: this.tngMint.toBase58()
      })

      // 1. Получаем token accounts для отправителя и получателя
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer
        this.tngMint,
        fromKeypair.publicKey
      )

      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer
        this.tngMint,
        toPublicKey
      )

      console.log(' Token accounts:', {
        fromAccount: fromTokenAccount.address.toBase58(),
        toAccount: toTokenAccount.address.toBase58(),
        fromBalance: fromTokenAccount.amount.toString(),
        toBalance: toTokenAccount.amount.toString()
      })

      // 2. Проверяем баланс отправителя
      if (fromTokenAccount.amount < amount) {
        return {
          success: false,
          error: createWalletError(
            WalletErrorCode.INSUFFICIENT_SOL_BALANCE,
            `Недостаточно TNG токенов. Требуется: ${Number(amount) / 1000000000}, Доступно: ${Number(fromTokenAccount.amount) / 1000000000}`
          )
        }
      }

      // 3. Выполняем перевод
      const transferSignature = await transfer(
        this.connection,
        this.sponsorKeypair, // payer (sponsor платит за комиссию)
        fromTokenAccount.address,
        toTokenAccount.address,
        fromKeypair, // owner (отправитель подписывает)
        Number(amount)
      )

      console.log(' TNG transfer completed:', {
        signature: transferSignature,
        from: fromKeypair.publicKey.toBase58(),
        to: toPublicKey.toBase58(),
        amount: (Number(amount) / 1e9).toFixed(2) + ' TNG'
      })

      // 4. Получаем обновленные балансы
      const [updatedFromAccount, updatedToAccount] = await Promise.all([
        getAccount(this.connection, fromTokenAccount.address),
        getAccount(this.connection, toTokenAccount.address)
      ])

      const result: TNGTransferResult = {
        signature: transferSignature,
        fromTokenAccount: fromTokenAccount.address.toBase58(),
        toTokenAccount: toTokenAccount.address.toBase58(),
        amount: amount.toString(),
        explorerUrl: `https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`,
        senderNewBalance: updatedFromAccount.amount.toString(),
        receiverNewBalance: updatedToAccount.amount.toString()
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      console.error(' TNG transfer failed:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка перевода TNG токенов',
          { 
            error: error instanceof Error ? error.message : String(error),
            from: fromKeypair.publicKey.toBase58(),
            to: toPublicKey.toBase58()
          }
        )
      }
    }
  }

  /**
   * Получает баланс TNG токенов пользователя
   */
  async getTNGBalance(userPublicKey: PublicKey): Promise<WalletResult<TNGBalanceResult>> {
    try {
      // Removed excessive logging for production

      // Получаем адрес token account
      const tokenAccountAddress = await getAssociatedTokenAddress(
        this.tngMint,
        userPublicKey
      )

      try {
        // Пытаемся получить account
        const tokenAccount = await getAccount(this.connection, tokenAccountAddress)
        
        const result: TNGBalanceResult = {
          balance: tokenAccount.amount.toString(),
          tokenAccount: tokenAccountAddress.toBase58(),
          mint: this.tngMint.toBase58()
        }

        // Success - silent for production

        return {
          success: true,
          data: result
        }

      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          // Token account не существует = баланс 0
          const result: TNGBalanceResult = {
            balance: '0',
            tokenAccount: tokenAccountAddress.toBase58(),
            mint: this.tngMint.toBase58()
          }

          // Token account not found - silent for production

          return {
            success: true,
            data: result
          }
        }
        throw error
      }

    } catch (error) {
      console.error(' Error getting TNG balance:', error)
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.RPC_CONNECTION_FAILED,
          'Ошибка получения баланса TNG',
          { 
            error: error instanceof Error ? error.message : String(error),
            user: userPublicKey.toBase58()
          }
        )
      }
    }
  }

  /**
   * Проверяет существование token account
   */
  async tokenAccountExists(userPublicKey: PublicKey): Promise<boolean> {
    try {
      const tokenAccountAddress = await getAssociatedTokenAddress(
        this.tngMint,
        userPublicKey
      )
      
      await getAccount(this.connection, tokenAccountAddress)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Создает token account для пользователя (если не существует)
   */
  async ensureTokenAccount(userPublicKey: PublicKey): Promise<WalletResult<string>> {
    try {
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair, // payer
        this.tngMint,
        userPublicKey
      )

      return {
        success: true,
        data: tokenAccount.address.toBase58()
      }
    } catch (error) {
      return {
        success: false,
        error: createWalletError(
          WalletErrorCode.TRANSACTION_SEND_FAILED,
          'Ошибка создания token account',
          { error: error instanceof Error ? error.message : String(error) }
        )
      }
    }
  }

  /**
   * Получает информацию о TNG mint
   */
  getMintInfo() {
    return {
      mintAddress: this.tngMint.toBase58(),
      decimals: 9,
      symbol: 'TNG',
      name: 'Test Network Gold',
      network: 'devnet',
      explorerUrl: `https://explorer.solana.com/address/${this.tngMint.toBase58()}?cluster=devnet`
    }
  }
}
