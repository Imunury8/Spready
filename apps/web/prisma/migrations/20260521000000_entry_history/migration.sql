-- CreateTable
CREATE TABLE "DiaryEntryHistory" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "nextContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryEntryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryEntryHistory_entryId_createdAt_idx" ON "DiaryEntryHistory"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "DiaryEntryHistory_userId_createdAt_idx" ON "DiaryEntryHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DiaryEntryHistory" ADD CONSTRAINT "DiaryEntryHistory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntryHistory" ADD CONSTRAINT "DiaryEntryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
