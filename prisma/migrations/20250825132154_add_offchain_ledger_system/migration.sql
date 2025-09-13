-- CreateEnum
CREATE TYPE "public"."LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "public"."LedgerTxType" AS ENUM ('TRANSFER_INTERNAL', 'DEPOSIT_ONCHAIN', 'WITHDRAW_ONCHAIN', 'FEE', 'REWARD', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'MINT_TOKEN', 'BURN_TOKEN');

-- CreateEnum
CREATE TYPE "public"."LedgerStatus" AS ENUM ('PENDING', 'POSTED', 'SETTLED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."HoldPurpose" AS ENUM ('ESCROW', 'WITHDRAW', 'FRAUD_CHECK', 'COMPLIANCE', 'TRADE_ORDER');

-- CreateEnum
CREATE TYPE "public"."HoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."OnchainTxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FINALIZED', 'FAILED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."OnchainPurpose" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TOKEN_MINT', 'TOKEN_BURN', 'NFT_MINT', 'NFT_TRANSFER', 'DAO_VOTE', 'ESCROW_CREATE', 'ESCROW_RELEASE', 'DEX_SWAP', 'STAKE', 'UNSTAKE');

-- CreateEnum
CREATE TYPE "public"."RateSource" AS ENUM ('PYTH', 'CHAINLINK', 'JUPITER', 'COINGECKO', 'EXTERNAL_API', 'MANUAL');

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceInfo" JSONB NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mintAddress" TEXT,
    "decimals" INTEGER NOT NULL,
    "isOnchain" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "amountCached" BIGINT NOT NULL DEFAULT 0,
    "lockedAmount" BIGINT NOT NULL DEFAULT 0,
    "availableAmount" BIGINT NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ledger_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "direction" "public"."LedgerDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "txType" "public"."LedgerTxType" NOT NULL,
    "txRef" TEXT NOT NULL,
    "status" "public"."LedgerStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "purpose" "public"."HoldPurpose" NOT NULL,
    "referenceId" TEXT,
    "status" "public"."HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onchain_txs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "public"."OnchainTxStatus" NOT NULL DEFAULT 'PENDING',
    "slot" BIGINT,
    "blockTime" TIMESTAMP(3),
    "purpose" "public"."OnchainPurpose" NOT NULL,
    "amount" BIGINT,
    "assetId" TEXT,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "rawTx" JSONB,
    "instructions" JSONB,
    "gasUsed" BIGINT,
    "fee" BIGINT,
    "memo" TEXT,
    "ledgerEntryIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "onchain_txs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rates" (
    "id" TEXT NOT NULL,
    "baseAssetId" TEXT NOT NULL,
    "quoteAssetId" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "source" "public"."RateSource" NOT NULL,
    "provider" TEXT,
    "confidence" DECIMAL(5,4),
    "volume24h" DECIMAL(20,2),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionId_key" ON "public"."user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "public"."user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_sessionId_idx" ON "public"."user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_isActive_idx" ON "public"."user_sessions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "public"."assets"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "assets_mintAddress_key" ON "public"."assets"("mintAddress");

-- CreateIndex
CREATE INDEX "balances_userId_idx" ON "public"."balances"("userId");

-- CreateIndex
CREATE INDEX "balances_assetId_idx" ON "public"."balances"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "balances_userId_assetId_key" ON "public"."balances"("userId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_idempotencyKey_key" ON "public"."ledger_entries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ledger_entries_userId_idx" ON "public"."ledger_entries"("userId");

-- CreateIndex
CREATE INDEX "ledger_entries_assetId_idx" ON "public"."ledger_entries"("assetId");

-- CreateIndex
CREATE INDEX "ledger_entries_status_idx" ON "public"."ledger_entries"("status");

-- CreateIndex
CREATE INDEX "ledger_entries_txType_idx" ON "public"."ledger_entries"("txType");

-- CreateIndex
CREATE INDEX "ledger_entries_createdAt_idx" ON "public"."ledger_entries"("createdAt");

-- CreateIndex
CREATE INDEX "holds_userId_idx" ON "public"."holds"("userId");

-- CreateIndex
CREATE INDEX "holds_assetId_idx" ON "public"."holds"("assetId");

-- CreateIndex
CREATE INDEX "holds_status_idx" ON "public"."holds"("status");

-- CreateIndex
CREATE INDEX "holds_purpose_idx" ON "public"."holds"("purpose");

-- CreateIndex
CREATE INDEX "holds_expiresAt_idx" ON "public"."holds"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "onchain_txs_signature_key" ON "public"."onchain_txs"("signature");

-- CreateIndex
CREATE INDEX "onchain_txs_userId_idx" ON "public"."onchain_txs"("userId");

-- CreateIndex
CREATE INDEX "onchain_txs_signature_idx" ON "public"."onchain_txs"("signature");

-- CreateIndex
CREATE INDEX "onchain_txs_status_idx" ON "public"."onchain_txs"("status");

-- CreateIndex
CREATE INDEX "onchain_txs_purpose_idx" ON "public"."onchain_txs"("purpose");

-- CreateIndex
CREATE INDEX "onchain_txs_slot_idx" ON "public"."onchain_txs"("slot");

-- CreateIndex
CREATE INDEX "onchain_txs_blockTime_idx" ON "public"."onchain_txs"("blockTime");

-- CreateIndex
CREATE INDEX "rates_baseAssetId_quoteAssetId_idx" ON "public"."rates"("baseAssetId", "quoteAssetId");

-- CreateIndex
CREATE INDEX "rates_timestamp_idx" ON "public"."rates"("timestamp");

-- CreateIndex
CREATE INDEX "rates_source_idx" ON "public"."rates"("source");

-- CreateIndex
CREATE UNIQUE INDEX "rates_baseAssetId_quoteAssetId_timestamp_key" ON "public"."rates"("baseAssetId", "quoteAssetId", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."balances" ADD CONSTRAINT "balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."balances" ADD CONSTRAINT "balances_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holds" ADD CONSTRAINT "holds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holds" ADD CONSTRAINT "holds_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onchain_txs" ADD CONSTRAINT "onchain_txs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onchain_txs" ADD CONSTRAINT "onchain_txs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rates" ADD CONSTRAINT "rates_baseAssetId_fkey" FOREIGN KEY ("baseAssetId") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rates" ADD CONSTRAINT "rates_quoteAssetId_fkey" FOREIGN KEY ("quoteAssetId") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
