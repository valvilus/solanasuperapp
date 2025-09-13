/**
 * Notification Stream Management
 */

// Types for notifications
export interface TransferNotificationData {
  type: 'transfer_received'
  transferId: string
  senderId: string
  senderUsername?: string
  recipientId: string
  token: string
  amount: string
  usdAmount?: string
  memo?: string
  isAnonymous: boolean
  timestamp: string
}

export interface NotificationEvent {
  id: string
  type: string
  data: TransferNotificationData | any
  timestamp: string
}

// Simple connections management
const connections = new Map<string, { controller: ReadableStreamDefaultController; lastPing: number }>()

export function addConnection(userId: string, connection: { controller: ReadableStreamDefaultController; lastPing: number }) {
  connections.set(userId, connection)
}

export function removeConnection(userId: string) {
  connections.delete(userId)
}

export function getConnection(userId: string) {
  return connections.get(userId)
}

// Function to send notification to specific user
export function sendNotificationToUser(userId: string, notification: NotificationEvent) {
  const connection = getConnection(userId)
  if (connection) {
    try {
      const eventData = `id: ${notification.id}\nevent: ${notification.type}\ndata: ${JSON.stringify(notification.data)}\n\n`
      connection.controller.enqueue(new TextEncoder().encode(eventData))
    } catch (error) {
      removeConnection(userId)
    }
  }
}

// Periodic ping to maintain connection
setInterval(() => {
  const now = Date.now()
  for (const [userId, connection] of connections.entries()) {
    try {
      if (now - connection.lastPing > 30000) {
        const pingData = `event: ping\ndata: ${JSON.stringify({ timestamp: now })}\n\n`
        connection.controller.enqueue(new TextEncoder().encode(pingData))
        connection.lastPing = now
      }
    } catch (error) {
      removeConnection(userId)
    }
  }
}, 30000)
