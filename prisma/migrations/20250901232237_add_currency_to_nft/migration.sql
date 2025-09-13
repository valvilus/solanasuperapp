/*
  Warnings:

  - You are about to drop the column `attributes` on the `nfts` table. All the data in the column will be lost.
  - You are about to drop the column `collection` on the `nfts` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `nfts` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `nfts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `nfts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."NFTType" ADD VALUE 'ART';

-- DropForeignKey
ALTER TABLE "public"."nfts" DROP CONSTRAINT "nfts_userId_fkey";

-- AlterTable
ALTER TABLE "public"."nfts" DROP COLUMN "attributes",
DROP COLUMN "collection",
DROP COLUMN "image",
ADD COLUMN     "collectionId" TEXT,
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT DEFAULT 'SOL',
ADD COLUMN     "imageUri" TEXT,
ADD COLUMN     "maxUsage" INTEGER,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "mintAddress" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."nft_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUri" TEXT,
    "bannerUri" TEXT,
    "slug" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalSupply" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" BIGINT NOT NULL DEFAULT 0,
    "floorPrice" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nft_likes" (
    "userId" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_likes_pkey" PRIMARY KEY ("userId","nftId")
);

-- CreateTable
CREATE TABLE "public"."nft_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nft_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'telegram',
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nft_collection_likes" (
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_collection_likes_pkey" PRIMARY KEY ("userId","collectionId")
);

-- CreateTable
CREATE TABLE "public"."nft_collection_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_collection_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nft_transactions" (
    "id" TEXT NOT NULL,
    "nftId" TEXT,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "type" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "transactionHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "nft_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nft_collections_slug_key" ON "public"."nft_collections"("slug");

-- CreateIndex
CREATE INDEX "nft_views_nftId_idx" ON "public"."nft_views"("nftId");

-- CreateIndex
CREATE INDEX "nft_views_userId_idx" ON "public"."nft_views"("userId");

-- CreateIndex
CREATE INDEX "nft_views_viewedAt_idx" ON "public"."nft_views"("viewedAt");

-- CreateIndex
CREATE INDEX "nft_shares_nftId_idx" ON "public"."nft_shares"("nftId");

-- CreateIndex
CREATE INDEX "nft_shares_userId_idx" ON "public"."nft_shares"("userId");

-- CreateIndex
CREATE INDEX "nft_shares_sharedAt_idx" ON "public"."nft_shares"("sharedAt");

-- CreateIndex
CREATE INDEX "nft_collection_views_collectionId_idx" ON "public"."nft_collection_views"("collectionId");

-- CreateIndex
CREATE INDEX "nft_collection_views_userId_idx" ON "public"."nft_collection_views"("userId");

-- CreateIndex
CREATE INDEX "nft_collection_views_viewedAt_idx" ON "public"."nft_collection_views"("viewedAt");

-- CreateIndex
CREATE INDEX "nft_transactions_nftId_idx" ON "public"."nft_transactions"("nftId");

-- CreateIndex
CREATE INDEX "nft_transactions_fromUserId_idx" ON "public"."nft_transactions"("fromUserId");

-- CreateIndex
CREATE INDEX "nft_transactions_toUserId_idx" ON "public"."nft_transactions"("toUserId");

-- CreateIndex
CREATE INDEX "nft_transactions_type_idx" ON "public"."nft_transactions"("type");

-- CreateIndex
CREATE INDEX "nft_transactions_status_idx" ON "public"."nft_transactions"("status");

-- CreateIndex
CREATE INDEX "nft_transactions_createdAt_idx" ON "public"."nft_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."nft_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_collections" ADD CONSTRAINT "nft_collections_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_likes" ADD CONSTRAINT "nft_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_likes" ADD CONSTRAINT "nft_likes_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "public"."nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_views" ADD CONSTRAINT "nft_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_views" ADD CONSTRAINT "nft_views_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "public"."nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_shares" ADD CONSTRAINT "nft_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_shares" ADD CONSTRAINT "nft_shares_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "public"."nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_collection_likes" ADD CONSTRAINT "nft_collection_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_collection_likes" ADD CONSTRAINT "nft_collection_likes_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."nft_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_collection_views" ADD CONSTRAINT "nft_collection_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_collection_views" ADD CONSTRAINT "nft_collection_views_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."nft_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_transactions" ADD CONSTRAINT "nft_transactions_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "public"."nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_transactions" ADD CONSTRAINT "nft_transactions_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_transactions" ADD CONSTRAINT "nft_transactions_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
