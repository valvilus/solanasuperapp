# Learn System Architecture 

##  Overview
Рефакторированная архитектура Learn системы следует принципам Clean Architecture с четким разделением ответственностей.

##  Layer Structure

###  **UI Layer (Presentation)**
**Responsibility**: Отображение данных и обработка пользовательского ввода

```
src/
 app/learn/
    page.tsx                     # Entry point (re-exports LearnPageRefactored)
    LearnPageRefactored.tsx      # Main page (242 lines vs 895)
 components/learn/
    tabs/
       ExploreTab.tsx          # Course exploration
       MyCoursesTab.tsx        # User's courses
    modals/
       CreateCourseModal.tsx   # Course creation
       CourseDetailsModal.tsx  # Course details
       QuizModal.tsx           # Quiz interface
    cards/
        BlockchainCourseCard.tsx # Blockchain course display
        CourseCard3D.tsx        # 3D course card
```

**Principles:**
-  Single Responsibility: Each component has one clear purpose
-  Composition over Inheritance: Small, reusable components
-  Props Interface: Clear data contracts
-  No Business Logic: Only presentation and user interaction

###  **Business Logic Layer (Application)**
**Responsibility**: Координация бизнес-логики и управление состоянием

```
src/
 hooks/
    useLearn.ts                 # Main React hook (600+ lines)
 services/
    learn.service.ts            # Business logic service
 features/learn/hooks/
     useLearnState.ts            # UI state management
```

**Features:**
-  **useLearn Hook**: Unified interface for all Learn operations
-  **LearnService**: Centralized business logic with error handling
-  **State Management**: Clean separation of UI and business state
-  **Error Handling**: Consistent error handling across all operations

###  **API Layer (Infrastructure)**
**Responsibility**: Внешние интеграции и коммуникации

```
src/app/api/learn/
 courses/
    route.ts                    # GET /api/learn/courses
    [courseId]/
       route.ts               # GET /api/learn/courses/:id
       enroll/route.ts        # POST enroll
       complete/route.ts      # POST complete
 lessons/
    [lessonId]/
        route.ts               # GET lesson details
        start/route.ts         # POST start lesson
        complete/route.ts      # POST complete lesson
 quizzes/
    [quizId]/
        route.ts               # GET quiz details
        start/route.ts         # POST start quiz
        submit/route.ts        # POST submit answers
 user/
    profile/route.ts           # GET user profile
    certificates/route.ts      # GET certificates
    achievements/route.ts      # GET achievements
    challenges/route.ts        # GET daily challenges
 leaderboard/route.ts           # GET leaderboard

src/app/api/learn-contract/         # Blockchain integration
 route.ts                       # Smart contract operations
```

**Features:**
-  **RESTful Design**: Consistent API structure
-  **Authentication**: Secure endpoints with auth middleware  
-  **Validation**: Input validation on all endpoints
-  **Error Handling**: Standardized error responses
-  **Blockchain Integration**: Smart contract operations

###  **Data Layer (Persistence)**
**Responsibility**: Хранение и управление данными

```
prisma/schema.prisma
 Course                          # Course information
 Lesson                          # Lesson content
 Quiz                           # Quiz structure
 UserCourse                     # User enrollment & progress
 LessonProgress                 # Detailed lesson progress
 QuizAttempt                    # Quiz attempts
 Certificate                    # User certificates
 Badge                          # Achievement badges
 Leaderboard                    # User rankings

Solana Blockchain
 TNG Learn Contract             # Smart contract for courses
 Course Creation                # On-chain course storage
 Answer Submission              # Progress tracking
 Reward Claims                  # Token distribution
```

**Features:**
-  **Hybrid Storage**: PostgreSQL + Solana blockchain
-  **Data Consistency**: Prisma schema ensures type safety
-  **Blockchain Integration**: On-chain rewards and verification
-  **Scalability**: Efficient queries and indexing

###  **Types Layer (Contracts)**
**Responsibility**: Контракты данных между слоями

```
src/types/learn.types.ts            #  SINGLE SOURCE OF TRUTH
 Core Entities
    Course                     # Unified course interface
    Lesson                     # Lesson structure  
    Quiz                       # Quiz with questions
    UserProgress               # Complete user progress
 Blockchain Types
    BlockchainCourse           # Smart contract course
    BlockchainUserCourse       # On-chain user progress
    BlockchainLearnConfig      # Contract configuration
 API Types
    ApiResponse<T>             # Standard API response
    CourseFilters              # Query filters
    Error Types                # Error handling
 UI Types
     LearnPageState             # Page state management
     LearnNotification          # UI notifications
     Modal States               # Modal management
```

##  Data Flow

### 1. User Interaction Flow
```
[User Click] → [UI Component] → [useLearn Hook] → [LearnService] → [API Layer] → [Database]
                                                                  ↓
[UI Update] ← [State Update] ← [Response] ← [Business Logic] ← [API Response]
```

### 2. Blockchain Operation Flow
```
[User Action] → [UI] → [useLearn] → [LearnService] → [Blockchain API] → [Smart Contract]
                                                                      ↓
[UI Update] ← [State Update] ← [Transaction Result] ← [Blockchain Response]
```

##  Architecture Benefits

### Before Refactoring
```
 895-line monolithic component
 Multiple duplicated services  
 Scattered type definitions
 Mixed responsibilities
 Tight coupling between layers
 Difficult to test and maintain
```

### After Refactoring  
```
 Modular components (50-300 lines each)
 Single unified service
 Centralized type definitions  
 Clear separation of concerns
 Loose coupling between layers
 Easy to test and extend
```

##  Testing Strategy

### Unit Testing
- **UI Components**: React Testing Library + Jest
- **Hooks**: React Hooks Testing Library
- **Services**: Jest with mocked APIs
- **API Routes**: Integration tests with test database

### Integration Testing  
- **End-to-End**: Complete user flows
- **API Integration**: Real API calls with test data
- **Blockchain Integration**: Devnet smart contract testing

##  Deployment Architecture

### Development
```
Frontend (Next.js) → API Routes → PostgreSQL + Solana Devnet
```

### Production
```
Frontend (Vercel) → API (Vercel Functions) → PostgreSQL (Supabase) + Solana Mainnet
```

##  Performance Optimizations

- **Code Splitting**: Components lazy-loaded by route
- **Memoization**: React.memo for expensive components  
- **Caching**: API responses cached with SWR
- **Pagination**: Large datasets paginated
- **Blockchain Batching**: Multiple operations batched when possible

##  Security Measures

- **Authentication**: JWT tokens with refresh
- **Authorization**: Role-based access control
- **Input Validation**: Zod schema validation
- **SQL Injection**: Prisma ORM protection
- **XSS Protection**: Sanitized user inputs
- **Blockchain Security**: Transaction verification

##  Next Steps

1. **Performance Monitoring**: Add metrics and analytics
2. **Advanced Caching**: Implement Redis for session storage  
3. **Real-time Updates**: WebSocket for live progress updates
4. **Mobile Optimization**: PWA capabilities
5. **AI Integration**: Personalized course recommendations








