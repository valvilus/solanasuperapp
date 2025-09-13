/**
 * Auth Components - Export все компоненты авторизации
 * Solana SuperApp - Frontend Authentication
 */

// Login components
export { LoginButton, AuthStatus, AuthGuard } from './LoginButton'

// User profile components
export { 
  UserAvatar, 
  UserInfo, 
  LogoutButton, 
  UserSessions, 
  AuthSettings 
} from './UserProfile'

// Re-export hooks for convenience
export { 
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  useAuthGuard,
  useUserProfile,
  useTelegramLogin,
  useLogout,
  useHasWallet,
  useIsPremium,
  usePermissions,
  useUserSessions,
  useAutoLogin,
  useUserDisplay,
  useAuthStatus
} from '@/hooks/useAuth'

