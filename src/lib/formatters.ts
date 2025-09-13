/**
 * Token and Currency Formatting Utilities
 * Solana SuperApp - Smart Token Display
 */

export type TokenSymbol = 'SOL' | 'TNG' | 'USDC'
export type FormatContext = 'visual' | 'precise' | 'input'

/**
 * Format token balance based on context
 * @param balance - Token balance as number
 * @param token - Token symbol
 * @param context - Display context (visual, precise, input)
 * @returns Formatted string
 */
export function formatTokenBalance(
  balance: number, 
  token: TokenSymbol, 
  context: FormatContext = 'visual'
): string {
  if (balance === 0) return '0.00'
  
  switch (context) {
    case 'visual':
      // For UI display - show whole numbers for integers, decimals for fractions
      if (token === 'TNG') {
        // TNG: show whole numbers, decimals only if needed
        if (Number.isInteger(balance)) {
          return balance.toString()
        } else {
          return balance.toFixed(2).replace(/\.?0+$/, '')
        }
      } else {
        // SOL/USDC - show decimals for precision
        if (balance >= 1) {
          return balance.toFixed(4).replace(/\.?0+$/, '')
        } else {
          return balance.toFixed(6).replace(/\.?0+$/, '')
        }
      }
      
    case 'precise':
      // For transfers and precise operations - full precision
      if (token === 'TNG') {
        if (Number.isInteger(balance)) {
          return balance.toString()
        } else {
          return balance.toFixed(0)
        }
      } else {
        return balance.toFixed(9) // SOL precision (lamports)
      }
      
    case 'input':
      // For input fields - practical precision
      if (token === 'TNG') {
        return balance.toString()
      } else {
        return balance.toFixed(9) // Allow higher precision for inputs
      }
      
    default:
      return balance.toString()
  }
}

/**
 * Format USD value
 * @param value - USD value as number
 * @param context - Display context
 * @returns Formatted USD string
 */
export function formatUSDValue(
  value: number, 
  context: FormatContext = 'visual'
): string {
  if (value === 0) return '$0.00'
  
  switch (context) {
    case 'visual':
      // For UI display - clean formatting without locale separators
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}k`
      } else if (value >= 1) {
        return `$${value.toFixed(2)}`
      } else {
        return `$${value.toFixed(4).replace(/\.?0+$/, '')}`
      }
      
    case 'precise':
      // For calculations - 4 decimals
      return `$${value.toFixed(4)}`
      
    case 'input':
      // For input fields - 2 decimals
      return value.toFixed(2)
      
    default:
      return `$${value.toFixed(2)}`
  }
}

/**
 * Format percentage change
 * @param change - Percentage change as number
 * @param includeSign - Whether to include + sign for positive values
 * @returns Formatted percentage string
 */
export function formatPercentageChange(
  change: number, 
  includeSign: boolean = true
): string {
  if (change === 0) return '0.0%'
  
  const sign = includeSign && change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * Format transaction amount for display
 * @param amount - Transaction amount (can be string with +/- prefix)
 * @param token - Token symbol
 * @param context - Display context
 * @returns Formatted amount with token symbol
 */
export function formatTransactionAmount(
  amount: string | number, 
  token: TokenSymbol,
  context: FormatContext = 'visual'
): string {
  if (typeof amount === 'string') {
    // Handle string amounts with +/- prefix
    const sign = amount.startsWith('+') ? '+' : amount.startsWith('-') ? '-' : ''
    const numericAmount = parseFloat(amount.replace(/[+-]/, ''))
    const formattedAmount = formatTokenBalance(numericAmount, token, context)
    return `${sign}${formattedAmount} ${token}`
  } else {
    const formattedAmount = formatTokenBalance(amount, token, context)
    return `${formattedAmount} ${token}`
  }
}

/**
 * Format wallet address for display
 * @param address - Full wallet address
 * @param context - Display context
 * @returns Formatted address
 */
export function formatWalletAddress(
  address: string | null, 
  context: 'short' | 'medium' | 'full' = 'short'
): string {
  if (!address) return 'Загрузка...'
  
  switch (context) {
    case 'short':
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    case 'medium':
      return `${address.slice(0, 8)}...${address.slice(-8)}`
    case 'full':
      return address
    default:
      return address
  }
}

/**
 * Smart number formatting based on value size
 * @param value - Numeric value
 * @param context - Display context
 * @returns Formatted number string
 */
export function formatSmartNumber(
  value: number,
  context: FormatContext = 'visual'
): string {
  if (value === 0) return '0'
  
  // For very large numbers, use compact notation
  if (context === 'visual' && value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  
  if (context === 'visual' && value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  
  // For numbers under 1000, show as-is
  if (value >= 1) {
    return value.toFixed(context === 'visual' ? 2 : 4)
  }
  
  // For small numbers, preserve precision
  return value.toFixed(context === 'visual' ? 4 : 6)
}
