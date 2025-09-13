/**
 * Address Utilities - Helper functions for blockchain addresses
 * Solana SuperApp - Enhanced Web3 Ecosystem
 */

/**
 * Truncates a blockchain address for display
 * @param address - The full address to truncate
 * @param startLength - Number of characters to show at the start (default: 6)
 * @param endLength - Number of characters to show at the end (default: 4)
 * @param separator - Separator between start and end (default: '...')
 * @returns Truncated address string
 */
export function truncateAddress(
  address: string | undefined | null,
  startLength: number = 6,
  endLength: number = 4,
  separator: string = '...'
): string {
  if (!address) return ''
  
  // If address is shorter than or equal to total display length, return as is
  if (address.length <= startLength + endLength) {
    return address
  }
  
  return `${address.slice(0, startLength)}${separator}${address.slice(-endLength)}`
}

/**
 * Validates if a string is a valid Solana address
 * @param address - Address to validate
 * @returns true if valid Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded and 32-44 characters long
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return solanaAddressRegex.test(address)
}

/**
 * Validates if a string is a valid Telegram username
 * @param username - Username to validate
 * @returns true if valid username format
 */
export function isValidTelegramUsername(username: string): boolean {
  // Telegram usernames are 5-32 characters, alphanumeric + underscore, no consecutive underscores
  const telegramUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_]){3,30}[a-zA-Z0-9]$/
  return telegramUsernameRegex.test(username)
}

/**
 * Validates if a string is a valid Telegram ID
 * @param telegramId - Telegram ID to validate
 * @returns true if valid Telegram ID format
 */
export function isValidTelegramId(telegramId: string): boolean {
  // Telegram IDs are numeric strings
  const telegramIdRegex = /^\d+$/
  return telegramIdRegex.test(telegramId)
}

/**
 * Determines the type of identifier (wallet, username, or telegram ID)
 * @param identifier - The identifier to analyze
 * @returns The detected type
 */
export function detectIdentifierType(identifier: string): 'wallet' | 'username' | 'telegramId' | 'unknown' {
  if (isValidSolanaAddress(identifier)) {
    return 'wallet'
  }
  
  if (isValidTelegramId(identifier)) {
    return 'telegramId'
  }
  
  if (isValidTelegramUsername(identifier)) {
    return 'username'
  }
  
  return 'unknown'
}

/**
 * Formats an address for different display contexts
 * @param address - The address to format
 * @param context - Display context
 * @returns Formatted address
 */
export function formatAddressForContext(
  address: string | undefined | null,
  context: 'card' | 'modal' | 'list' | 'input' = 'card'
): string {
  if (!address) return ''
  
  switch (context) {
    case 'card':
      return truncateAddress(address, 4, 4)
    case 'modal':
      return truncateAddress(address, 8, 6)
    case 'list':
      return truncateAddress(address, 6, 4)
    case 'input':
      return address // Show full address in inputs
    default:
      return truncateAddress(address)
  }
}

/**
 * Copies an address to clipboard with feedback
 * @param address - Address to copy
 * @param onSuccess - Success callback
 * @param onError - Error callback
 */
export async function copyAddressToClipboard(
  address: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    await navigator.clipboard.writeText(address)
    onSuccess?.()
  } catch (error) {
    console.error('Failed to copy address:', error)
    onError?.(error as Error)
  }
}

/**
 * Creates a clickable address component data
 * @param address - The address
 * @param label - Optional label for the address
 * @returns Object with display properties
 */
export function createAddressDisplay(address: string, label?: string) {
  return {
    full: address,
    truncated: truncateAddress(address),
    label: label || 'Address',
    isValid: isValidSolanaAddress(address),
    explorerUrl: `https://explorer.solana.com/address/${address}?cluster=devnet`
  }
}

/**
 * Generates a QR code data string for an address
 * @param address - The address
 * @param label - Optional label
 * @returns QR code data string
 */
export function generateAddressQRData(address: string, label?: string): string {
  const data = {
    type: 'solana_address',
    address,
    label,
    network: 'devnet',
    timestamp: Date.now()
  }
  
  return JSON.stringify(data)
}

/**
 * Creates a shareable link for an address
 * @param address - The address to share
 * @param type - Type of sharing (explorer, app, etc.)
 * @returns Shareable URL
 */
export function createAddressShareLink(
  address: string,
  type: 'explorer' | 'app' = 'explorer'
): string {
  switch (type) {
    case 'explorer':
      return `https://explorer.solana.com/address/${address}?cluster=devnet`
    case 'app':
      return `${window.location.origin}/address/${address}`
    default:
      return `https://explorer.solana.com/address/${address}?cluster=devnet`
  }
}
