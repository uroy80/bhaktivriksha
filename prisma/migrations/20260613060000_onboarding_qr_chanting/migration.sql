-- AlterTable
ALTER TABLE "SadhanaEntry" ADD COLUMN     "chantingQuality" INTEGER;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "image" TEXT,
ADD COLUMN     "inviteToken" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;
-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");
