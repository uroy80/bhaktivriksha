-- CreateTable
CREATE TABLE "SadhanaEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "japaRounds" INTEGER NOT NULL DEFAULT 0,
    "readingMinutes" INTEGER NOT NULL DEFAULT 0,
    "mangalArati" BOOLEAN NOT NULL DEFAULT false,
    "eveningArati" BOOLEAN NOT NULL DEFAULT false,
    "lectureHeard" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SadhanaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SadhanaEntry_userId_date_idx" ON "SadhanaEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SadhanaEntry_userId_date_key" ON "SadhanaEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "SadhanaEntry" ADD CONSTRAINT "SadhanaEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
