/**
 * Compatible Auth Hook - Unified interface for authentication
 * Solana SuperApp - Single Source of Truth
 */

import { useAuth } from '../contexts/AuthContext'

/**
 * Unified auth hook that provides all authentication functionality
 */
export function useCompatibleAuth() {
  const auth = useAuth()
  
  return {
    // Core state
    user: auth.user,
    accessToken: auth.accessToken,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    
    // Core methods
    login: auth.login,
    logout: auth.logout,
    getAuthHeader: auth.getAuthHeader,
    apiCall: auth.apiCall
  }
}

// Re-export the main hook for convenience
export { useAuth } from '../contexts/AuthContext'