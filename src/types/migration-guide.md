# Learn Types Migration Guide

## Overview
All Learn-related types have been unified into a single source of truth: `@/types/learn.types.ts`

## Migration Steps

###  Completed
- [x] Created unified types file
- [x] Updated main service files
- [x] Updated core components
- [x] Created legacy re-export for compatibility

###  In Progress
- [ ] Update remaining component imports
- [ ] Update hook imports  
- [ ] Update utility files
- [ ] Update API service imports

## Type Changes

### Unified Types Location
```typescript
// OLD (multiple locations)
import { Course } from '@/features/learn/types'
import { CourseData } from '@/lib/learn/types/service.types'
import { BlockchainCourse } from '@/hooks/useLearnContract'

// NEW (single source)
import { Course, BlockchainCourse } from '@/types/learn.types'
```

### Key Unified Types
- `Course` - Main course interface (combines database + blockchain)
- `Lesson` - Lesson structure
- `Quiz` - Quiz structure with attempts
- `UserProgress` - Complete user progress tracking
- `BlockchainCourse` - Smart contract course data
- `LearnError` - Unified error handling

### Backward Compatibility
Legacy imports still work via re-export:
```typescript
// Still works (but deprecated)
import { Course } from '@/features/learn/types'

// Preferred
import { Course } from '@/types/learn.types'
```

## Files Updated

### Services
-  `src/features/learn/services/learn.service.ts`
-  `src/services/learn.service.ts` (new unified)

### Components
-  `src/components/learn/LearnHeader.tsx`
-  `src/components/learn/CourseDetailsModal.tsx`
-  New components use unified types

### Data
-  `src/features/learn/data/learn-data.ts`

### Types
-  `src/features/learn/types/index.ts` (now re-exports)
-  `src/types/learn.types.ts` (main types)

## TODO: Remaining Files to Update

### Components
- [ ] `src/components/learn/QuizModal.tsx`
- [ ] `src/components/learn/LearnProgressOverview.tsx`  
- [ ] `src/components/learn/SearchAndFilters.tsx`
- [ ] `src/components/learn/TabNavigation.tsx`

### Hooks
- [ ] `src/features/learn/hooks/useUserData.ts`
- [ ] `src/features/learn/hooks/useLearnState.ts`
- [ ] `src/features/learn/hooks/useLearnActions.ts`

### Utilities
- [ ] `src/features/learn/utils/learn-helpers.ts`

### API Services
- [ ] `src/lib/learn/course.service.ts`
- [ ] `src/lib/learn/lesson.service.ts` 
- [ ] `src/lib/learn/quiz.service.ts`

### Data Files
- [ ] `src/features/learn/data/solana-course-data.ts`

## Next Steps
1. Update remaining component imports
2. Clean up old type files after full migration
3. Update documentation
4. Remove deprecated type files








