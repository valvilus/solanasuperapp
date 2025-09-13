/**
 * Server-side TNG formatting utilities
 * Safe for use in API routes and server components
 */

/**
 * Converts lamports to TNG and formats large numbers with suffixes
 * @param amount - Amount in lamports (string)
 * @param decimals - Token decimals (default: 9 for TNG)
 * @returns Formatted string like "1.5K TNG" or "2.3M TNG"
 */
export function formatTNGAmount(amount: string, decimals: number = 9): string {
  try {
    const num = parseFloat(amount) / Math.pow(10, decimals)
    
    if (num === 0) return '0 TNG'
    
    // Format with suffixes for large numbers
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B TNG`
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M TNG`
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K TNG`
    }
    
    // For smaller numbers, show up to 2 decimal places
    if (num >= 1) {
      return `${num.toFixed(2)} TNG`
    }
    
    // For very small numbers, show more precision
    return `${num.toFixed(6)} TNG`
    
  } catch (error) {
    console.error('Error formatting TNG amount:', error)
    return '0 TNG'
  }
}

/**
 * Converts lamports to TNG without formatting (just decimal conversion)
 * @param amount - Amount in lamports (string)
 * @param decimals - Token decimals (default: 9 for TNG)
 * @returns Number as string with proper decimal places
 */
export function lamportsToTNG(amount: string, decimals: number = 9): string {
  try {
    const num = parseFloat(amount) / Math.pow(10, decimals)
    return num.toString()
  } catch (error) {
    console.error('Error converting lamports to TNG:', error)
    return '0'
  }
}

/**
 * Formats a number for display (shortens large numbers)
 * @param num - Number to format
 * @returns Formatted string like "1.5K" or "2.3M"
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  
  return num.toFixed(2)
}

