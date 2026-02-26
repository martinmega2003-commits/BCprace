/*
  Warnings:

  - You are about to alter the column `stravaActivityId` on the `StravaActivity` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StravaActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stravaActivityId" BIGINT NOT NULL,
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
INSERT INTO "new_StravaActivity" ("averageCadence", "averageHeartrate", "averagePace", "averageSpeed", "createdAt", "distance", "elapsedTime", "elevHigh", "elevLow", "id", "maxHeartrate", "maxSpeed", "movingTime", "name", "sportType", "startDate", "stravaActivityId", "stravaAthleteId", "sufferScore", "timezone", "totalElevationGain", "type", "updatedAt") SELECT "averageCadence", "averageHeartrate", "averagePace", "averageSpeed", "createdAt", "distance", "elapsedTime", "elevHigh", "elevLow", "id", "maxHeartrate", "maxSpeed", "movingTime", "name", "sportType", "startDate", "stravaActivityId", "stravaAthleteId", "sufferScore", "timezone", "totalElevationGain", "type", "updatedAt" FROM "StravaActivity";
DROP TABLE "StravaActivity";
ALTER TABLE "new_StravaActivity" RENAME TO "StravaActivity";
CREATE UNIQUE INDEX "StravaActivity_stravaActivityId_key" ON "StravaActivity"("stravaActivityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
