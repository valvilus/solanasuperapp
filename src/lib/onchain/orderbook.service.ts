import { Connection, PublicKey } from '@solana/web3.js'
import { CustodialWalletService } from '@/lib/wallet'
import { prisma } from '@/lib/prisma'

export interface OrderBookOrder {
  orderId: string
  user: string
  market: string
  side: 'Buy' | 'Sell'
  price: string
  quantity: string
  filledQuantity: string
  orderType: 'Limit' | 'Market' | 'StopLoss' | 'TakeProfit'
  status: 'Open' | 'PartiallyFilled' | 'Filled' | 'Cancelled'
  createdAt: Date
}

export interface OrderBookMarket {
  address: string
  baseMint: string
  quoteMint: string
  tickSize: string
  minOrderSize: string
  isActive: boolean
}

export interface PlaceOrderParams {
  userId: string
  userWallet: string
  marketAddress: string
  side: 'Buy' | 'Sell'
  price: string
  quantity: string
  orderType: 'Limit' | 'Market'
}

export class OrderBookService {
  private connection: Connection
  private walletService: CustodialWalletService

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    this.walletService = new CustodialWalletService(prisma)
  }

  async getOrderBookMarkets(): Promise<OrderBookMarket[]> {
    return [
      {
        address: 'TNG_SOL_MARKET_ADDRESS',
        baseMint: process.env.NEXT_PUBLIC_TNG_MINT || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
        quoteMint: 'So11111111111111111111111111111111111111112',
        tickSize: '0.001',
        minOrderSize: '1',
        isActive: true
      },
      {
        address: 'TNG_USDC_MARKET_ADDRESS',
        baseMint: process.env.NEXT_PUBLIC_TNG_MINT || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
        quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tickSize: '0.01',
        minOrderSize: '10',
        isActive: true
      }
    ]
  }

  async getOrderBook(marketAddress: string): Promise<{
    bids: Array<{ price: string; quantity: string; orders: number }>
    asks: Array<{ price: string; quantity: string; orders: number }>
  }> {
    const orders = await this.getMarketOrders(marketAddress)
    
    const bids = new Map<string, { quantity: bigint; orders: number }>()
    const asks = new Map<string, { quantity: bigint; orders: number }>()
    
    orders.forEach(order => {
      if (order.status !== 'Open') return
      
      const remainingQuantity = BigInt(order.quantity) - BigInt(order.filledQuantity)
      if (remainingQuantity <= 0) return
      
      const priceLevel = order.side === 'Buy' ? bids : asks
      const existing = priceLevel.get(order.price) || { quantity: 0n, orders: 0 }
      
      priceLevel.set(order.price, {
        quantity: existing.quantity + remainingQuantity,
        orders: existing.orders + 1
      })
    })
    
    const formatLevel = (entries: Map<string, { quantity: bigint; orders: number }>) =>
      Array.from(entries.entries())
        .map(([price, data]) => ({
          price,
          quantity: data.quantity.toString(),
          orders: data.orders
        }))
        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    
    return {
      bids: formatLevel(bids),
      asks: formatLevel(asks).reverse()
    }
  }

  async getUserOrders(userId: string, marketAddress?: string): Promise<OrderBookOrder[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) return []
    
    return [
      {
        orderId: '1',
        user: user.walletAddress,
        market: marketAddress || 'TNG_SOL_MARKET_ADDRESS',
        side: 'Buy',
        price: '0.05',
        quantity: '1000',
        filledQuantity: '0',
        orderType: 'Limit',
        status: 'Open',
        createdAt: new Date()
      }
    ]
  }

  async placeOrder(params: PlaceOrderParams): Promise<{
    success: boolean
    orderId?: string
    signature?: string
    error?: string
  }> {
    try {
      const { userId, userWallet, marketAddress, side, price, quantity, orderType } = params
      
      const mockOrderId = 'order_' + Date.now()
      const mockSignature = 'ob_signature_' + Date.now()
      
      return {
        success: true,
        orderId: mockOrderId,
        signature: mockSignature
      }
    } catch (error) {
      console.error('Order placement error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async cancelOrder(userId: string, orderId: string): Promise<{
    success: boolean
    signature?: string
    error?: string
  }> {
    try {
      const mockSignature = 'cancel_signature_' + Date.now()
      
      return {
        success: true,
        signature: mockSignature
      }
    } catch (error) {
      console.error('Order cancellation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getRecentTrades(marketAddress: string, limit: number = 50): Promise<Array<{
    price: string
    quantity: string
    side: 'Buy' | 'Sell'
    timestamp: Date
  }>> {
    return [
      {
        price: '0.052',
        quantity: '500',
        side: 'Buy',
        timestamp: new Date(Date.now() - 60000)
      },
      {
        price: '0.051',
        quantity: '750',
        side: 'Sell',
        timestamp: new Date(Date.now() - 120000)
      }
    ]
  }

  private async getMarketOrders(marketAddress: string): Promise<OrderBookOrder[]> {
    return [
      {
        orderId: '1',
        user: 'user1',
        market: marketAddress,
        side: 'Buy',
        price: '0.05',
        quantity: '1000',
        filledQuantity: '0',
        orderType: 'Limit',
        status: 'Open',
        createdAt: new Date()
      },
      {
        orderId: '2',
        user: 'user2',
        market: marketAddress,
        side: 'Sell',
        price: '0.055',
        quantity: '800',
        filledQuantity: '0',
        orderType: 'Limit',
        status: 'Open',
        createdAt: new Date()
      }
    ]
  }
}