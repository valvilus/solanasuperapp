/**
 * SSE Connections Manager
 * Центральное хранилище активных SSE подключений
 */

export interface SSEConnection {
  controller: ReadableStreamDefaultController
  userId: string
  lastPing: number
}

// Глобальное хранилище подключений
export const connections = new Map<string, SSEConnection>()

export function addConnection(userId: string, connection: SSEConnection) {
  connections.set(userId, connection)
  console.log(` SSE connection added for user: ${userId}`)
}

export function removeConnection(userId: string) {
  connections.delete(userId)
  console.log(` SSE connection removed for user: ${userId}`)
}

export function getConnection(userId: string): SSEConnection | undefined {
  return connections.get(userId)
}

export function isUserConnected(userId: string): boolean {
  return connections.has(userId)
}

export function getConnectionsCount(): number {
  return connections.size
}

export function getAllConnections(): Map<string, SSEConnection> {
  return connections
}







































