-- CreateTable
CREATE TABLE "StravaActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stravaActivityId" INTEGER NOT NULL,
    "stravaAthleteId" INTEGER NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "sportType" TEXT,
    "distance" REAL,
    "movingTime" INTEGER,
    "elapsedTime" INTEGER,
    "startDate" DATETIME,
    "timezone" TEXT,
    "averageSpeed" REAL,
    "maxSpeed" REAL,
    "averagePace" REAL,
    "averageHeartrate" REAL,
    "maxHeartrate" REAL,
    "averageCadence" REAL,
    "sufferScore" INTEGER,
    "totalElevationGain" REAL,
    "elevHigh" REAL,
    "elevLow" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivity_stravaActivityId_key" ON "StravaActivity"("stravaActivityId");
