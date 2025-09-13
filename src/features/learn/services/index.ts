/**
 * Legacy Learn Services Index
 * @deprecated These services have been moved to unified locations
 * 
 * New locations:
 * - Main service: @/services/learn.service.ts
 * - React hook: @/hooks/useLearn.ts
 * - Types: @/types/learn.types.ts
 */

// Re-export from new unified locations for backward compatibility
export { learnService, LearnService } from '@/services/learn.service'
// useLearn hook no longer exists - individual hooks available instead
// export { useLearn } from '@/hooks/useLearn'