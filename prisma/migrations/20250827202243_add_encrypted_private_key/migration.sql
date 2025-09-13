-- AlterEnum
ALTER TYPE "public"."OnchainPurpose" ADD VALUE 'FAUCET';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "encryptedPrivateKey" TEXT;
