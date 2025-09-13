-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('SEND', 'RECEIVE', 'MINT', 'BURN', 'SWAP', 'STAKE', 'UNSTAKE', 'VOTE', 'ESCROW_DEPOSIT', 'ESCROW_RELEASE');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NFTType" AS ENUM ('COLLECTIBLE', 'TICKET', 'COUPON', 'CERTIFICATE', 'BADGE');

-- CreateEnum
CREATE TYPE "public"."ProposalType" AS ENUM ('TREASURY', 'GOVERNANCE', 'FEATURE', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "public"."ProposalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PASSED', 'REJECTED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "public"."RewardType" AS ENUM ('TNG_TOKENS', 'NFT_CERTIFICATE', 'NFT_BADGE', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "public"."CourseStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('FIXED', 'HOURLY', 'MILESTONE');

-- CreateEnum
CREATE TYPE "public"."JobCategory" AS ENUM ('DEVELOPMENT', 'DESIGN', 'MARKETING', 'WRITING', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."EscrowStatus" AS ENUM ('CREATED', 'FUNDED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'RELEASED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "languageCode" TEXT NOT NULL DEFAULT 'ru',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'SOL',
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nfts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT NOT NULL,
    "attributes" JSONB,
    "collection" TEXT,
    "type" "public"."NFTType" NOT NULL DEFAULT 'COLLECTIBLE',
    "isForSale" BOOLEAN NOT NULL DEFAULT false,
    "price" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dao_proposals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."ProposalType" NOT NULL,
    "votingStartsAt" TIMESTAMP(3) NOT NULL,
    "votingEndsAt" TIMESTAMP(3) NOT NULL,
    "quorumRequired" BIGINT NOT NULL DEFAULT 1000,
    "votesFor" BIGINT NOT NULL DEFAULT 0,
    "votesAgainst" BIGINT NOT NULL DEFAULT 0,
    "status" "public"."ProposalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dao_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dao_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "vote" "public"."VoteType" NOT NULL,
    "weight" BIGINT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dao_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "rewardType" "public"."RewardType" NOT NULL DEFAULT 'TNG_TOKENS',
    "rewardAmount" BIGINT NOT NULL DEFAULT 100,
    "rewardNFT" TEXT,
    "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "estimatedTime" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_courses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."CourseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "rewardTxSignature" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[],
    "skills" TEXT[],
    "paymentAmount" BIGINT NOT NULL,
    "paymentToken" TEXT NOT NULL DEFAULT 'USDC',
    "paymentType" "public"."PaymentType" NOT NULL DEFAULT 'FIXED',
    "category" "public"."JobCategory" NOT NULL,
    "location" TEXT,
    "estimatedTime" TEXT,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "proposedRate" BIGINT,
    "estimatedTime" TEXT,
    "portfolio" TEXT[],
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."escrow_contracts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'USDC',
    "terms" TEXT NOT NULL,
    "milestones" JSONB,
    "escrowAddress" TEXT,
    "depositTxSignature" TEXT,
    "releaseTxSignature" TEXT,
    "status" "public"."EscrowStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "escrow_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "public"."users"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "public"."users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_signature_key" ON "public"."transactions"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "nfts_mintAddress_key" ON "public"."nfts"("mintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "dao_votes_userId_proposalId_key" ON "public"."dao_votes"("userId", "proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "user_courses_userId_courseId_key" ON "public"."user_courses"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_userId_jobId_key" ON "public"."job_applications"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dao_votes" ADD CONSTRAINT "dao_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dao_votes" ADD CONSTRAINT "dao_votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."dao_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_courses" ADD CONSTRAINT "user_courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_courses" ADD CONSTRAINT "user_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_applications" ADD CONSTRAINT "job_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_applications" ADD CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escrow_contracts" ADD CONSTRAINT "escrow_contracts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."escrow_contracts" ADD CONSTRAINT "escrow_contracts_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
