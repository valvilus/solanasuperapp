-- CreateEnum
CREATE TYPE "public"."PendingTransferStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."onchain_txs" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "public"."pending_transfers" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientUsername" TEXT NOT NULL,
    "recipientId" TEXT,
    "token" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "memo" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."PendingTransferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_transfers_recipientUsername_idx" ON "public"."pending_transfers"("recipientUsername");

-- CreateIndex
CREATE INDEX "pending_transfers_senderId_idx" ON "public"."pending_transfers"("senderId");

-- CreateIndex
CREATE INDEX "pending_transfers_status_idx" ON "public"."pending_transfers"("status");

-- CreateIndex
CREATE INDEX "pending_transfers_createdAt_idx" ON "public"."pending_transfers"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."pending_transfers" ADD CONSTRAINT "pending_transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pending_transfers" ADD CONSTRAINT "pending_transfers_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
