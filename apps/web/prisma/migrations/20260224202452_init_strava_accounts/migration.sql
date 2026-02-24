-- CreateTable
CREATE TABLE "StravaAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stravaAthleteId" INTEGER NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StravaAccount_stravaAthleteId_key" ON "StravaAccount"("stravaAthleteId");
