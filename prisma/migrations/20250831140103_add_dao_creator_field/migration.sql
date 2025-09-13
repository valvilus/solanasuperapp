-- AlterTable
ALTER TABLE "public"."dao_proposals" ADD COLUMN     "creatorId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."dao_proposals" ADD CONSTRAINT "dao_proposals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
