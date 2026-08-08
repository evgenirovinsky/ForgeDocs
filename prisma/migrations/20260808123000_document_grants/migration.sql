-- CreateEnum
CREATE TYPE "DocumentPermission" AS ENUM ('viewer', 'editor');

-- CreateTable
CREATE TABLE "DocumentGrant" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "DocumentPermission" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentGrant_documentId_idx" ON "DocumentGrant"("documentId");

-- CreateIndex
CREATE INDEX "DocumentGrant_userId_idx" ON "DocumentGrant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentGrant_documentId_userId_key" ON "DocumentGrant"("documentId", "userId");

-- AddForeignKey
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
