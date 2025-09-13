-- CreateEnum
CREATE TYPE "public"."StakingRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."FarmingRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "public"."SwapStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SnapshotType" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "public"."staking_pools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokenMint" TEXT NOT NULL,
    "rewardMint" TEXT NOT NULL,
    "apy" DECIMAL(5,2) NOT NULL,
    "minimumStake" BIGINT NOT NULL,
    "lockupPeriod" INTEGER NOT NULL DEFAULT 0,
    "totalStaked" BIGINT NOT NULL DEFAULT 0,
    "totalRewards" BIGINT NOT NULL DEFAULT 0,
    "maxCapacity" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "public"."StakingRiskLevel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staking_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staking_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "stakedAmount" BIGINT NOT NULL,
    "rewardsEarned" BIGINT NOT NULL DEFAULT 0,
    "stakeDate" TIMESTAMP(3) NOT NULL,
    "unlockDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staking_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farming_pools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokenAMint" TEXT NOT NULL,
    "tokenBMint" TEXT NOT NULL,
    "lpTokenMint" TEXT,
    "apy" DECIMAL(5,2) NOT NULL,
    "tvl" BIGINT NOT NULL DEFAULT 0,
    "volume24h" BIGINT NOT NULL DEFAULT 0,
    "fees24h" BIGINT NOT NULL DEFAULT 0,
    "feePercent" DECIMAL(5,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isStable" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "public"."FarmingRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farming_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."farming_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "tokenAAmount" BIGINT NOT NULL,
    "tokenBAmount" BIGINT NOT NULL,
    "lpTokenAmount" BIGINT NOT NULL DEFAULT 0,
    "currentValue" DECIMAL(20,8) NOT NULL,
    "rewardsEarned" BIGINT NOT NULL DEFAULT 0,
    "impermanentLoss" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "totalFeesEarned" BIGINT NOT NULL DEFAULT 0,
    "depositDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farming_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."swap_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputMint" TEXT NOT NULL,
    "outputMint" TEXT NOT NULL,
    "inputAmount" BIGINT NOT NULL,
    "outputAmount" BIGINT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "priceImpact" DECIMAL(5,4) NOT NULL,
    "fee" BIGINT NOT NULL,
    "slippage" DECIMAL(5,4) NOT NULL,
    "route" JSONB,
    "routeInfo" TEXT,
    "signature" TEXT NOT NULL,
    "status" "public"."SwapStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "swap_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."defi_portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalValue" DECIMAL(20,8) NOT NULL,
    "totalStaked" BIGINT NOT NULL DEFAULT 0,
    "totalFarming" BIGINT NOT NULL DEFAULT 0,
    "totalRewards" BIGINT NOT NULL DEFAULT 0,
    "dailyChange" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "dailyChangePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "allTimeHigh" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "allTimeLow" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "riskScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "diversification" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "snapshotType" "public"."SnapshotType" NOT NULL DEFAULT 'DAILY',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defi_portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staking_pools_tokenMint_idx" ON "public"."staking_pools"("tokenMint");

-- CreateIndex
CREATE INDEX "staking_pools_isActive_idx" ON "public"."staking_pools"("isActive");

-- CreateIndex
CREATE INDEX "staking_pools_apy_idx" ON "public"."staking_pools"("apy");

-- CreateIndex
CREATE INDEX "staking_positions_userId_idx" ON "public"."staking_positions"("userId");

-- CreateIndex
CREATE INDEX "staking_positions_poolId_idx" ON "public"."staking_positions"("poolId");

-- CreateIndex
CREATE INDEX "staking_positions_isActive_idx" ON "public"."staking_positions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staking_positions_userId_poolId_key" ON "public"."staking_positions"("userId", "poolId");

-- CreateIndex
CREATE INDEX "farming_pools_isActive_idx" ON "public"."farming_pools"("isActive");

-- CreateIndex
CREATE INDEX "farming_pools_tvl_idx" ON "public"."farming_pools"("tvl");

-- CreateIndex
CREATE INDEX "farming_pools_apy_idx" ON "public"."farming_pools"("apy");

-- CreateIndex
CREATE UNIQUE INDEX "farming_pools_tokenAMint_tokenBMint_key" ON "public"."farming_pools"("tokenAMint", "tokenBMint");

-- CreateIndex
CREATE INDEX "farming_positions_userId_idx" ON "public"."farming_positions"("userId");

-- CreateIndex
CREATE INDEX "farming_positions_poolId_idx" ON "public"."farming_positions"("poolId");

-- CreateIndex
CREATE INDEX "farming_positions_isActive_idx" ON "public"."farming_positions"("isActive");

-- CreateIndex
CREATE INDEX "swap_transactions_userId_idx" ON "public"."swap_transactions"("userId");

-- CreateIndex
CREATE INDEX "swap_transactions_signature_idx" ON "public"."swap_transactions"("signature");

-- CreateIndex
CREATE INDEX "swap_transactions_status_idx" ON "public"."swap_transactions"("status");

-- CreateIndex
CREATE INDEX "swap_transactions_createdAt_idx" ON "public"."swap_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "defi_portfolio_snapshots_userId_idx" ON "public"."defi_portfolio_snapshots"("userId");

-- CreateIndex
CREATE INDEX "defi_portfolio_snapshots_createdAt_idx" ON "public"."defi_portfolio_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "defi_portfolio_snapshots_snapshotType_idx" ON "public"."defi_portfolio_snapshots"("snapshotType");

-- AddForeignKey
ALTER TABLE "public"."staking_positions" ADD CONSTRAINT "staking_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staking_positions" ADD CONSTRAINT "staking_positions_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."staking_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farming_positions" ADD CONSTRAINT "farming_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."farming_positions" ADD CONSTRAINT "farming_positions_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."farming_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swap_transactions" ADD CONSTRAINT "swap_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."defi_portfolio_snapshots" ADD CONSTRAINT "defi_portfolio_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
