/**
 * Price API - Get current and historical token prices
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

// Cache for currency rates (refresh every 10 minutes)
let currencyCache: { usdToKzt: number; lastUpdate: number } | null = null
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

// Function to get real USD/KZT exchange rate
async function getUsdToKztRate(): Promise<number> {
  try {
    // Check cache first
    if (currencyCache && Date.now() - currencyCache.lastUpdate < CACHE_DURATION) {
      return currencyCache.usdToKzt
    }

    // Fetch from exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 600 } // Cache for 10 minutes
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }
    
    const data = await response.json()
    const usdToKzt = data.rates?.KZT || 450 // Fallback to ~450 if API fails
    
    // Update cache
    currencyCache = {
      usdToKzt,
      lastUpdate: Date.now()
    }
    
    return usdToKzt
  } catch (error) {
    // Fallback to typical rate if API fails
    return currencyCache?.usdToKzt || 450
  }
}

// Function to get SOL price from CoinGecko API
async function getSolPrice(): Promise<{ current: number; previous24h: number }> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true', {
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch SOL price from CoinGecko')
    }
    
    const data = await response.json()
    const current = data.solana?.usd
    const change24h = data.solana?.usd_24h_change
    
    if (!current) {
      throw new Error('Invalid SOL price data from CoinGecko')
    }
    
    const previous24h = change24h ? current / (1 + change24h / 100) : current
    
    return { current, previous24h }
  } catch (error) {
    console.error('SOL price fetch failed:', error)
    // Fallback values
    return { current: 200, previous24h: 195 }
  }
}

export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get('symbols')?.split(',') || ['SOL', 'TNG', 'USDC']
    const include24h = searchParams.get('include24h') === 'true'
    const includeCurrency = searchParams.get('includeCurrency') === 'true'

    const prices: Record<string, any> = {}

    // Process each requested symbol
    for (const symbol of symbols) {
      switch (symbol.toUpperCase()) {
        case 'SOL':
          const solPrice = await getSolPrice()
          prices.SOL = {
            symbol: 'SOL',
            name: 'Solana',
            price: solPrice.current,
            change24h: include24h ? ((solPrice.current - solPrice.previous24h) / solPrice.previous24h) * 100 : undefined,
            previous24h: include24h ? solPrice.previous24h : undefined,
            lastUpdated: new Date().toISOString()
          }
          break

        case 'TNG':
          // TNG price: 1 TNG = 1 KZT, конвертируем в USD
          const usdToKzt = await getUsdToKztRate()
          const tngPriceUSD = 1 / usdToKzt // 1 TNG = 1 KZT = 1/usdToKzt USD
          
          prices.TNG = {
            symbol: 'TNG',
            name: 'TNG Token',
            price: tngPriceUSD, // Актуальная цена в USD
            change24h: include24h ? 0 : undefined,
            previous24h: include24h ? tngPriceUSD : undefined,
            lastUpdated: new Date().toISOString()
          }
          break

        case 'USDC':
          // USDC is stable
          prices.USDC = {
            symbol: 'USDC',
            name: 'USD Coin',
            price: 1.0,
            change24h: include24h ? 0 : undefined,
            previous24h: include24h ? 1.0 : undefined,
            lastUpdated: new Date().toISOString()
          }
          break

        default:
          // Unknown symbol, skip
          continue
      }
    }

    // Add currency conversion if requested
    let currencies: Record<string, any> = {}
    if (includeCurrency) {
      const usdToKzt = await getUsdToKztRate()
      currencies = {
        USD: {
          symbol: 'USD',
          name: 'US Dollar',
          rate: 1,
          lastUpdated: new Date().toISOString()
        },
        KZT: {
          symbol: 'KZT',
          name: 'Kazakhstani Tenge',
          rate: usdToKzt,
          lastUpdated: new Date().toISOString()
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        prices,
        currencies: includeCurrency ? currencies : undefined,
        requestedSymbols: symbols,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения цен' },
      { status: 500 }
    )
  }
})