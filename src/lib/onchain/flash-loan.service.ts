import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { CustodialWalletService } from '@/lib/wallet'
import { prisma } from '@/lib/prisma'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import TngLendingContractService, { TngLendingFlashLoanHelper } from '@/lib/onchain/tng-lending-contract.service'
import fs from 'fs'

export interface FlashLoanPool {
  address: string
  tokenMint: string
  tokenSymbol: string
  availableLiquidity: string
  utilizationRate: number
  flashLoanFee: number
  isActive: boolean
}

export interface FlashLoanParams {
  amount: string
  poolAddress: string
  userWallet: string
  callbackProgram?: string
  userId: string
}

export interface FlashLoanRepayParams {
  poolAddress: string
  userWallet: string
  userId: string
}

export class FlashLoanService {
  private connection: Connection
  private walletService: CustodialWalletService

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    this.walletService = new CustodialWalletService(prisma)
  }

  private loadSponsorSecret(): number[] | null {
    try {
      if (process.env.SPONSOR_PRIVATE_KEY) {
        const parsed = JSON.parse(process.env.SPONSOR_PRIVATE_KEY)
        if (Array.isArray(parsed)) return parsed as number[]
      }
      const defaultPath = process.cwd() + '/keys/mvp-sponsor-keypair.json'
      if (fs.existsSync(defaultPath)) {
        const raw = fs.readFileSync(defaultPath, 'utf-8')
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return arr as number[]
      }
    } catch (_) {}
    return null
  }

  async getAvailableFlashLoanPools(): Promise<FlashLoanPool[]> {
    return [
      {
        address: 'FL1_POOL_ADDRESS',
        tokenMint: process.env.NEXT_PUBLIC_TNG_MINT || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
        tokenSymbol: 'TNG',
        availableLiquidity: '1000000000000',
        utilizationRate: 65.5,
        flashLoanFee: 9,
        isActive: true
      },
      {
        address: 'FL2_POOL_ADDRESS',
        tokenMint: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        availableLiquidity: '500000000000',
        utilizationRate: 72.3,
        flashLoanFee: 9,
        isActive: true
      }
    ]
  }

  async getUserWallet(userId: string) {
    const walletResult = await this.walletService.getOrCreateUserWallet(userId)
    if (!walletResult.success || !walletResult.data) {
      return null
    }
    return walletResult.data
  }

  async executeFlashLoan(params: FlashLoanParams): Promise<{
    success: boolean
    signature?: string
    flashLoanId?: string
    fee?: string
    error?: string
  }> {
    try {
      const { amount, poolAddress, userWallet, callbackProgram, userId } = params
      const sponsorSecret = this.loadSponsorSecret()

      // Try real on-chain path if sponsor key available
      if (sponsorSecret) {
        // 1) Get custodial borrower keypair
        const kpRes = await this.walletService.getUserKeypair(userId)
        if (!kpRes.success || !kpRes.data) {
          return { success: false, error: kpRes.error?.message || 'User keypair not available' }
        }
        const borrowerKeypair: Keypair = kpRes.data

        // 2) Resolve pool by address -> token mint
        const pools = await this.getAvailableFlashLoanPools()
        const pool = pools.find(p => p.address === poolAddress)
        if (!pool) {
          return { success: false, error: 'Unknown pool address' }
        }
        const assetMint = new PublicKey(pool.tokenMint)

        // 3) Borrower ATA
        const borrowerTokenAccount = await getAssociatedTokenAddress(assetMint, borrowerKeypair.publicKey)

        // 4) Call program via helper
        const tng = new TngLendingContractService(this.connection, sponsorSecret)
        const helper = new TngLendingFlashLoanHelper(tng)

        // amount may overflow number; clamp to Number for dev flows
        const amountNum = Number(BigInt(amount))
        const result = await helper.flashLoan(borrowerKeypair, assetMint, amountNum, borrowerTokenAccount)
        if (!result.success) {
          return { success: false, error: result.error || 'Flash loan failed' }
        }

        const fee = (BigInt(amount) * BigInt(9) / BigInt(10000)).toString()
        return {
          success: true,
          signature: result.signature,
          flashLoanId: 'fl_' + Date.now().toString(),
          fee
        }
      }

      // Fallback mock when sponsor key is missing
      const fee = (BigInt(amount) * BigInt(9) / BigInt(10000)).toString()
      return {
        success: true,
        signature: 'fl_signature_' + Date.now(),
        flashLoanId: 'fl_' + Date.now(),
        fee
      }
    } catch (error) {
      console.error('Flash loan execution error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async repayFlashLoan(params: FlashLoanRepayParams): Promise<{
    success: boolean
    signature?: string
    error?: string
  }> {
    try {
      const sponsorSecret = this.loadSponsorSecret()
      if (!sponsorSecret) {
        return { success: true, signature: 'repay_mock_' + Date.now() }
      }

      const { poolAddress, userId } = params
      const kpRes = await this.walletService.getUserKeypair(userId)
      if (!kpRes.success || !kpRes.data) {
        return { success: false, error: kpRes.error?.message || 'User keypair not available' }
      }
      const borrowerKeypair: Keypair = kpRes.data

      const pools = await this.getAvailableFlashLoanPools()
      const pool = pools.find(p => p.address === poolAddress)
      if (!pool) {
        return { success: false, error: 'Unknown pool address' }
      }
      const assetMint = new PublicKey(pool.tokenMint)
      const borrowerTokenAccount = await getAssociatedTokenAddress(assetMint, borrowerKeypair.publicKey)

      const tng = new TngLendingContractService(this.connection, sponsorSecret)
      const helper = new TngLendingFlashLoanHelper(tng)
      const result = await helper.repayFlashLoan(borrowerKeypair, assetMint, borrowerTokenAccount)

      if (!result.success) {
        return { success: false, error: result.error || 'Repay flash loan failed' }
      }

      return { success: true, signature: result.signature }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}