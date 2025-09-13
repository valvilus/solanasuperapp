/**
 * Solana Connection Configuration
 * Centralized connection management for the app
 */

import { Connection, clusterApiUrl } from '@solana/web3.js'

// Connection configuration
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet')

// Create shared connection instance
export const connection = new Connection(SOLANA_RPC_URL, 'confirmed')

// Export for convenience
export default connection







