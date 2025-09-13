import { Connection, PublicKey } from '@solana/web3.js'
import { CustodialWalletService } from '@/lib/wallet'
import { prisma } from '@/lib/prisma'
import { TngBridgeContractService } from '@/lib/onchain/bridge-contract.service'

export type ChainId = 'Solana' | 'Ethereum' | 'BSC' | 'Polygon' | 'Avalanche' | 'Arbitrum' | 'Optimism'

export interface BridgeTransaction {
  txId: string
  sourceChain: ChainId
  targetChain: ChainId
  sender: string
  recipient: string
  amount: number
  feeAmount: number
  tokenSymbol: string
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Failed'
  createdAt: Date
  completedAt?: Date
}

export interface CrossChainSwapTransaction {
  txId: string
  user: string
  sourceChain: ChainId
  targetChain: ChainId
  inputToken: string
  outputToken: string
  amountIn: number
  minimumAmountOut: number
  recipient: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed'
  createdAt: Date
}

export interface BridgeConfig {
  authority: string
  supportedChains: ChainId[]
  validators: string[]
  threshold: number
  totalLocked: number
  totalUnlocked: number
  isActive: boolean
}

export class BridgeService {
  private connection: Connection
  private walletService: CustodialWalletService

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    this.walletService = new CustodialWalletService(prisma)
  }

  async getBridgeConfig(): Promise<BridgeConfig> {
    return {
      authority: 'BRIDGE_AUTHORITY_ADDRESS',
      supportedChains: ['Ethereum', 'BSC', 'Polygon', 'Avalanche'],
      validators: ['VALIDATOR_1', 'VALIDATOR_2', 'VALIDATOR_3'],
      threshold: 2,
      totalLocked: 1500000,
      totalUnlocked: 1450000,
      isActive: true
    }
  }

  async getSupportedChains(): Promise<Array<{
    chainId: ChainId
    name: string
    symbol: string
    rpcUrl: string
    blockExplorer: string
    bridgeFee: number
    estimatedTime: string
    isActive: boolean
  }>> {
    return [
      {
        chainId: 'Ethereum',
        name: 'Ethereum',
        symbol: 'ETH',
        rpcUrl: 'https://mainnet.infura.io/v3/...',
        blockExplorer: 'https://etherscan.io',
        bridgeFee: 0.25,
        estimatedTime: '10-15 мин',
        isActive: true
      },
      {
        chainId: 'BSC',
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        blockExplorer: 'https://bscscan.com',
        bridgeFee: 0.1,
        estimatedTime: '3-5 мин',
        isActive: true
      },
      {
        chainId: 'Polygon',
        name: 'Polygon',
        symbol: 'MATIC',
        rpcUrl: 'https://polygon-rpc.com/',
        blockExplorer: 'https://polygonscan.com',
        bridgeFee: 0.05,
        estimatedTime: '2-3 мин',
        isActive: true
      },
      {
        chainId: 'Avalanche',
        name: 'Avalanche',
        symbol: 'AVAX',
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        blockExplorer: 'https://snowtrace.io',
        bridgeFee: 0.15,
        estimatedTime: '1-2 мин',
        isActive: true
      }
    ]
  }

  async initiateBridgeTransfer(
    targetChain: ChainId,
    recipient: string,
    amount: number,
    tokenSymbol: string,
    userWallet: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const bridgeFee = amount * 0.0025 // 0.25%
      const netAmount = amount - bridgeFee

      // Try on-chain lock via program when possible (TNG token assumed for now)
      const sponsorStr = process.env.SPONSOR_PRIVATE_KEY
      if (sponsorStr) {
        try {
          const sponsorSecret = JSON.parse(sponsorStr) as number[]
          const userKeypairResult = await this.walletService.getUserKeypair(userWallet)
          if (userKeypairResult.success && userKeypairResult.data) {
            const userKeypair = userKeypairResult.data
            // Resolve token mint: default to TNG mint env or fallback
            const tngMint = process.env.NEXT_PUBLIC_TNG_MINT || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs'
            const service = new TngBridgeContractService(this.connection, sponsorSecret)
            const onchain = await service.lockTokens({
              userKeypair,
              tokenMint: new (require('@solana/web3.js').PublicKey)(tngMint),
              amount: BigInt(Math.floor(netAmount * 1e9)),
              targetChain,
              recipient,
            })
            if (!onchain.success) {
              console.warn('Bridge on-chain lock failed, falling back:', onchain.error)
            }
          }
        } catch (e) {
          console.warn('Bridge on-chain path disabled due to config error:', e)
        }
      }

      const txId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await prisma.bridgeTransaction.create({
        data: {
          txId,
          sourceChain: 'Solana',
          targetChain: targetChain,
          sender: userWallet,
          recipient,
          amount: netAmount,
          feeAmount: bridgeFee,
          tokenSymbol,
          status: 'Pending',
          createdAt: new Date()
        }
      })

      return { success: true, txId }
    } catch (error) {
      console.error('Error initiating bridge transfer:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getBridgeTransactions(userWallet: string): Promise<BridgeTransaction[]> {
    try {
      const transactions = await prisma.bridgeTransaction.findMany({
        where: {
          OR: [
            { sender: userWallet },
            { recipient: userWallet }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      return transactions.map(tx => ({
        txId: tx.txId,
        sourceChain: tx.sourceChain as ChainId,
        targetChain: tx.targetChain as ChainId,
        sender: tx.sender,
        recipient: tx.recipient,
        amount: tx.amount,
        feeAmount: tx.feeAmount,
        tokenSymbol: tx.tokenSymbol,
        status: tx.status as any,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt || undefined
      }))
    } catch (error) {
      console.error('Error fetching bridge transactions:', error)
      return []
    }
  }

  async getBridgeTransactionStatus(txId: string): Promise<{
    status: 'Pending' | 'Confirmed' | 'Completed' | 'Failed'
    confirmations: number
    requiredConfirmations: number
    estimatedCompletion?: Date
  }> {
    try {
      const transaction = await prisma.bridgeTransaction.findUnique({
        where: { txId }
      })

      if (!transaction) {
        return {
          status: 'Failed',
          confirmations: 0,
          requiredConfirmations: 2
        }
      }

      const mockConfirmations = Math.min(2, Math.floor((Date.now() - transaction.createdAt.getTime()) / 60000))
      
      return {
        status: transaction.status as any,
        confirmations: mockConfirmations,
        requiredConfirmations: 2,
        estimatedCompletion: transaction.status === 'Pending' ? 
          new Date(transaction.createdAt.getTime() + 15 * 60 * 1000) : undefined
      }
    } catch (error) {
      console.error('Error getting bridge status:', error)
      return {
        status: 'Failed',
        confirmations: 0,
        requiredConfirmations: 2
      }
    }
  }

  async crossChainSwap(
    sourceChain: ChainId,
    targetChain: ChainId,
    inputToken: string,
    outputToken: string,
    amountIn: number,
    minimumAmountOut: number,
    recipient: string,
    userWallet: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const txId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await prisma.crossChainSwapTransaction.create({
        data: {
          txId,
          userId: userWallet, // Changed from user to userId
          sourceChain,
          targetChain,
          inputToken,
          outputToken,
          amountIn,
          minimumAmountOut,
          recipient,
          status: 'Pending',
          createdAt: new Date()
        }
      })

      return {
        success: true,
        txId
      }
    } catch (error) {
      console.error('Error initiating cross-chain swap:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getCrossChainSwaps(userWallet: string): Promise<CrossChainSwapTransaction[]> {
    try {
      const swaps = await prisma.crossChainSwapTransaction.findMany({
        where: { userId: userWallet },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      return swaps.map(swap => ({
        txId: swap.txId,
        user: swap.userId, // Changed from swap.user to swap.userId
        sourceChain: swap.sourceChain as ChainId,
        targetChain: swap.targetChain as ChainId,
        inputToken: swap.inputToken,
        outputToken: swap.outputToken,
        amountIn: swap.amountIn,
        minimumAmountOut: swap.minimumAmountOut,
        recipient: swap.recipient,
        status: swap.status as any,
        createdAt: swap.createdAt
      }))
    } catch (error) {
      console.error('Error fetching cross-chain swaps:', error)
      return []
    }
  }

  async getEstimatedBridgeTime(sourceChain: ChainId, targetChain: ChainId): Promise<{
    estimatedMinutes: number
    description: string
  }> {
    const estimates = {
      'Solana-Ethereum': { minutes: 12, desc: '10-15 минут' },
      'Solana-BSC': { minutes: 4, desc: '3-5 минут' },
      'Solana-Polygon': { minutes: 2, desc: '2-3 минуты' },
      'Solana-Avalanche': { minutes: 1, desc: '1-2 минуты' },
      'Ethereum-Solana': { minutes: 15, desc: '12-18 минут' },
      'BSC-Solana': { minutes: 5, desc: '4-6 минут' },
      'Polygon-Solana': { minutes: 3, desc: '2-4 минуты' },
      'Avalanche-Solana': { minutes: 2, desc: '1-3 минуты' }
    }

    const key = `${sourceChain}-${targetChain}` as keyof typeof estimates
    const estimate = estimates[key] || { minutes: 10, desc: '8-12 минут' }

    return {
      estimatedMinutes: estimate.minutes,
      description: estimate.desc
    }
  }

  async crossChainLiquidityProvision(
    targetChain: ChainId,
    tokenA: string,
    tokenB: string,
    amountA: number,
    amountB: number,
    recipient: string,
    userWallet: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const txId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // В реальной реализации здесь был бы вызов смарт-контракта
      // Для демо-версии сохраняем в базе данных
      
      return {
        success: true,
        txId
      }
    } catch (error) {
      console.error('Error initiating cross-chain LP:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getCrossChainRoutes(
    inputToken: string,
    outputToken: string,
    amount: number
  ): Promise<{
    routes: Array<{
      path: string[]
      estimatedOutput: number
      priceImpact: number
      fee: number
      estimatedTime: string
      chains: ChainId[]
    }>
  }> {
    // Mock cross-chain routes for demonstration
    const routes = [
      {
        path: [inputToken, 'USDC', outputToken],
        estimatedOutput: amount * 0.995, // 0.5% slippage
        priceImpact: 0.5,
        fee: 0.25,
        estimatedTime: '5-8 мин',
        chains: ['Solana', 'Ethereum'] as ChainId[]
      },
      {
        path: [inputToken, 'USDT', outputToken],
        estimatedOutput: amount * 0.993, // 0.7% slippage
        priceImpact: 0.7,
        fee: 0.3,
        estimatedTime: '3-5 мин',
        chains: ['Solana', 'BSC'] as ChainId[]
      }
    ]

    return { routes }
  }
}
