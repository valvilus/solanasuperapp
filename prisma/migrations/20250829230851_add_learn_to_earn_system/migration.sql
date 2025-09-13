/*
  Warnings:

  - Added the required column `category` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CourseCategory" AS ENUM ('BLOCKCHAIN', 'DEFI', 'NFT', 'TRADING', 'DEVELOPMENT', 'SECURITY');

-- CreateEnum
CREATE TYPE "public"."CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "public"."LessonType" AS ENUM ('VIDEO', 'TEXT', 'INTERACTIVE', 'QUIZ', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "public"."QuizType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'CODE_COMPLETION', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "public"."BadgeCategory" AS ENUM ('COMPLETION', 'STREAK', 'SCORE', 'PARTICIPATION', 'SPECIAL');

-- CreateEnum
CREATE TYPE "public"."BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "public"."ChallengeType" AS ENUM ('LESSON_COMPLETION', 'QUIZ_SCORE', 'STREAK', 'TIME_SPENT');

-- CreateEnum
CREATE TYPE "public"."AchievementCategory" AS ENUM ('LEARNING', 'SOCIAL', 'STREAK', 'SCORE', 'COMPLETION');

-- DropForeignKey
ALTER TABLE "public"."user_courses" DROP CONSTRAINT "user_courses_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_courses" DROP CONSTRAINT "user_courses_userId_fkey";

-- DropIndex
DROP INDEX "public"."onchain_txs_signature_key";

-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "averageScore" DECIMAL(5,2),
ADD COLUMN     "category" "public"."CourseCategory" NOT NULL,
ADD COLUMN     "certificateAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "difficultyScore" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "duration" INTEGER NOT NULL,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "learningObjectives" TEXT[],
ADD COLUMN     "lessonsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "level" "public"."CourseLevel" NOT NULL,
ADD COLUMN     "prerequisites" TEXT[],
ADD COLUMN     "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "studentsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRewardTokens" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."user_courses" ADD COLUMN     "averageQuizScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "currentLessonId" TEXT,
ADD COLUMN     "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progressPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "streakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTokensEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalXpEarned" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."LessonType" NOT NULL,
    "content" TEXT,
    "videoUrl" TEXT,
    "interactiveConfig" JSONB,
    "order" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "tokenReward" INTEGER NOT NULL DEFAULT 10,
    "resources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quizzes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."QuizType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "timeLimit" INTEGER,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 3,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "isRandomized" BOOLEAN NOT NULL DEFAULT false,
    "xpReward" INTEGER NOT NULL DEFAULT 25,
    "tokenReward" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT,
    "type" "public"."QuizType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "points" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userCourseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "progressPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "score" DECIMAL(5,2),
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "blockchainTxId" TEXT,
    "imageUrl" TEXT,
    "verificationUrl" TEXT,
    "skills" TEXT[],
    "grade" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" "public"."BadgeCategory" NOT NULL,
    "rarity" "public"."BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "maxProgress" INTEGER NOT NULL DEFAULT 1,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "tokenReward" INTEGER NOT NULL DEFAULT 0,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."ChallengeType" NOT NULL,
    "target" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "tokenReward" INTEGER NOT NULL DEFAULT 25,
    "badgeReward" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "currentProgress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "userProgress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "category" "public"."AchievementCategory" NOT NULL,
    "rarity" "public"."BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "maxProgress" INTEGER NOT NULL DEFAULT 1,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "tokenReward" INTEGER NOT NULL DEFAULT 0,
    "nftReward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "public"."CourseCategory",
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "coursesCompleted" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "globalRank" INTEGER,
    "categoryRank" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lessons_courseId_order_idx" ON "public"."lessons"("courseId", "order");

-- CreateIndex
CREATE INDEX "quizzes_courseId_idx" ON "public"."quizzes"("courseId");

-- CreateIndex
CREATE INDEX "quiz_questions_quizId_order_idx" ON "public"."quiz_questions"("quizId", "order");

-- CreateIndex
CREATE INDEX "lesson_progress_userId_idx" ON "public"."lesson_progress"("userId");

-- CreateIndex
CREATE INDEX "lesson_progress_userCourseId_idx" ON "public"."lesson_progress"("userCourseId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "public"."lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_idx" ON "public"."quiz_attempts"("userId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_idx" ON "public"."quiz_attempts"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_attemptId_questionId_key" ON "public"."quiz_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "certificates_userId_idx" ON "public"."certificates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_userId_courseId_key" ON "public"."certificates"("userId", "courseId");

-- CreateIndex
CREATE INDEX "badges_userId_idx" ON "public"."badges"("userId");

-- CreateIndex
CREATE INDEX "badges_category_idx" ON "public"."badges"("category");

-- CreateIndex
CREATE INDEX "user_challenges_userId_idx" ON "public"."user_challenges"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_challenges_userId_challengeId_key" ON "public"."user_challenges"("userId", "challengeId");

-- CreateIndex
CREATE INDEX "course_reviews_courseId_idx" ON "public"."course_reviews"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_userId_courseId_key" ON "public"."course_reviews"("userId", "courseId");

-- CreateIndex
CREATE INDEX "achievements_userId_idx" ON "public"."achievements"("userId");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "public"."achievements"("category");

-- CreateIndex
CREATE INDEX "leaderboard_globalRank_idx" ON "public"."leaderboard"("globalRank");

-- CreateIndex
CREATE INDEX "leaderboard_category_categoryRank_idx" ON "public"."leaderboard"("category", "categoryRank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_userId_category_key" ON "public"."leaderboard"("userId", "category");

-- CreateIndex
CREATE INDEX "onchain_txs_userId_signature_idx" ON "public"."onchain_txs"("userId", "signature");

-- CreateIndex
CREATE INDEX "user_courses_userId_idx" ON "public"."user_courses"("userId");

-- CreateIndex
CREATE INDEX "user_courses_courseId_idx" ON "public"."user_courses"("courseId");

-- AddForeignKey
ALTER TABLE "public"."user_courses" ADD CONSTRAINT "user_courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_courses" ADD CONSTRAINT "user_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_progress" ADD CONSTRAINT "lesson_progress_userCourseId_fkey" FOREIGN KEY ("userCourseId") REFERENCES "public"."user_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_answers" ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."badges" ADD CONSTRAINT "badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_challenges" ADD CONSTRAINT "user_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_challenges" ADD CONSTRAINT "user_challenges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."daily_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_reviews" ADD CONSTRAINT "course_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_reviews" ADD CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leaderboard" ADD CONSTRAINT "leaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
