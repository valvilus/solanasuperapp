/**
 * Z-Index Constants for Modal Hierarchy
 * Solana SuperApp - Consistent Modal Layering
 */

export const Z_INDEX = {
  // Base layers
  BASE: 10,
  DROPDOWN: 20,
  STICKY: 30,
  OVERLAY: 40,
  
  // Modal layers (NFT page)
  DETAIL_MODAL: 60,        // NFTDetailModal, NFTCollectionModal, NFTReceiveModal
  ACTION_MODAL: 70,        // TransferModal, SellModal, NFTHistory
  UTILITY_MODAL: 80,       // QR Scanner, Camera, File picker
  NOTIFICATION: 90,        // Notifications, Toast messages
  
  // Emergency layers
  CRITICAL: 100            // Critical system messages
} as const

export type ZIndexLevel = typeof Z_INDEX[keyof typeof Z_INDEX]
