'use client'

import { useState, useEffect } from 'react'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Input } from '@/components/ui/input'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface OrderBookData {
  bids: Array<{ price: string; quantity: string; orders: number }>
  asks: Array<{ price: string; quantity: string; orders: number }>
}

interface Order {
  orderId: string
  side: 'Buy' | 'Sell'
  price: string
  quantity: string
  filledQuantity: string
  status: string
  createdAt: Date
}

interface Trade {
  price: string
  quantity: string
  side: 'Buy' | 'Sell'
  timestamp: Date
}

export function OrderBookInterface() {
  const { user, apiCall } = useCompatibleAuth()
  const [selectedMarket, setSelectedMarket] = useState('TNG_SOL_MARKET_ADDRESS')
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] })
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  
  const [orderForm, setOrderForm] = useState({
    side: 'Buy' as 'Buy' | 'Sell',
    price: '',
    quantity: '',
    orderType: 'Limit' as 'Limit' | 'Market'
  })

  useEffect(() => {
    loadOrderBookData()
    loadUserOrders()
    loadRecentTrades()
  }, [selectedMarket])

  const loadOrderBookData = async () => {
    try {
      const response = await apiCall(`/api/defi/orderbook?action=orderbook&market=${selectedMarket}`)
      const data = await response.json()
      if (data.success && data.data?.orderBook) {
        setOrderBook(data.data.orderBook)
      }
    } catch (error) {
      console.error('Error loading order book:', error)
    }
  }

  const loadUserOrders = async () => {
    try {
      const response = await apiCall(`/api/defi/orderbook?action=orders&market=${selectedMarket}`)
      const data = await response.json()
      if (data.success && data.data?.orders) {
        setUserOrders(data.data.orders)
      }
    } catch (error) {
      console.error('Error loading user orders:', error)
    }
  }

  const loadRecentTrades = async () => {
    try {
      const response = await apiCall(`/api/defi/orderbook?action=trades&market=${selectedMarket}`)
      const data = await response.json()
      if (data.success && data.data?.trades) {
        setRecentTrades(data.data.trades)
      }
    } catch (error) {
      console.error('Error loading trades:', error)
    }
  }

  const handlePlaceOrder = async () => {
    if (!user || !orderForm.price || !orderForm.quantity) {
      hapticFeedback.notification('error')
      return
    }

    setLoading(true)
    try {
      const response = await apiCall('/api/defi/orderbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place',
          marketAddress: selectedMarket,
          ...orderForm
        })
      })

      const result = await response.json()
      if (result.success) {
        hapticFeedback.notification('success')
        setOrderForm({ side: 'Buy', price: '', quantity: '', orderType: 'Limit' })
        loadOrderBookData()
        loadUserOrders()
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      hapticFeedback.notification('error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    setLoading(true)
    try {
      const response = await apiCall('/api/defi/orderbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          orderId
        })
      })

      const result = await response.json()
      if (result.success) {
        hapticFeedback.notification('success')
        loadOrderBookData()
        loadUserOrders()
      } else {
        hapticFeedback.notification('error')
      }
    } catch (error) {
      console.error('Error canceling order:', error)
      hapticFeedback.notification('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SimpleCard className="lg:col-span-2">
          <h3 className="text-xl font-bold text-white mb-4">Книга ордеров</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2">Покупка</h4>
              <div className="space-y-1">
                {orderBook.bids.slice(0, 10).map((bid, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-green-400">{bid.price}</span>
                    <span className="text-gray-300">{bid.quantity}</span>
                    <span className="text-gray-400">{bid.orders}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">Продажа</h4>
              <div className="space-y-1">
                {orderBook.asks.slice(0, 10).map((ask, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-red-400">{ask.price}</span>
                    <span className="text-gray-300">{ask.quantity}</span>
                    <span className="text-gray-400">{ask.orders}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard>
          <h3 className="text-xl font-bold text-white mb-4">Разместить ордер</h3>
          
          <div className="space-y-4">
            <div className="flex rounded-lg bg-gray-800 p-1">
              <button
                onClick={() => setOrderForm({ ...orderForm, side: 'Buy' })}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  orderForm.side === 'Buy'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Купить
              </button>
              <button
                onClick={() => setOrderForm({ ...orderForm, side: 'Sell' })}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  orderForm.side === 'Sell'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Продать
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Цена
              </label>
              <Input
                type="number"
                step="0.001"
                value={orderForm.price}
                onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                placeholder="0.000"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Количество
              </label>
              <Input
                type="number"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                placeholder="0"
                className="w-full"
              />
            </div>

            <SimpleButton
              onClick={handlePlaceOrder}
              disabled={loading || !orderForm.price || !orderForm.quantity}
              className={`w-full ${
                orderForm.side === 'Buy' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Размещение...' : `${orderForm.side === 'Buy' ? 'Купить' : 'Продать'} TNG`}
            </SimpleButton>
          </div>
        </SimpleCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleCard>
          <h3 className="text-xl font-bold text-white mb-4">Мои ордера</h3>
          
          <div className="space-y-2">
            {userOrders.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Нет активных ордеров</p>
            ) : (
              userOrders.map((order) => (
                <div key={order.orderId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.side === 'Buy' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {order.side === 'Buy' ? 'Покупка' : 'Продажа'}
                      </span>
                      <span className="text-xs text-gray-400">{order.status}</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      {order.price} × {order.quantity}
                    </div>
                  </div>
                  
                  {order.status === 'Open' && (
                    <SimpleButton
                      onClick={() => handleCancelOrder(order.orderId)}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-xs px-3 py-1"
                    >
                      Отменить
                    </SimpleButton>
                  )}
                </div>
              ))
            )}
          </div>
        </SimpleCard>

        <SimpleCard>
          <h3 className="text-xl font-bold text-white mb-4">Последние сделки</h3>
          
          <div className="space-y-1">
            {recentTrades.map((trade, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className={trade.side === 'Buy' ? 'text-green-400' : 'text-red-400'}>
                  {trade.price}
                </span>
                <span className="text-gray-300">{trade.quantity}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </SimpleCard>
      </div>
    </div>
  )
}
