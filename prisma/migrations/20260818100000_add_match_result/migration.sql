-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,
    "adversaireNom" TEXT,
    "scoreDomicile" INTEGER,
    "scoreExterieur" INTEGER,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_annonceId_key" ON "MatchResult"("annonceId");

-- CreateIndex
CREATE INDEX "MatchResult_annonceId_idx" ON "MatchResult"("annonceId");

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;
