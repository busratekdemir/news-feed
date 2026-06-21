-- CreateTable
CREATE TABLE "ArticleInteraction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "articleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "entities" TEXT NOT NULL DEFAULT '[]',
    "eventType" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "scrollPercentage" REAL NOT NULL DEFAULT 0,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "categoryWeights" TEXT NOT NULL DEFAULT '{}',
    "sourceWeights" TEXT NOT NULL DEFAULT '{}',
    "keywordWeights" TEXT NOT NULL DEFAULT '{}',
    "entityWeights" TEXT NOT NULL DEFAULT '{}',
    "recentInterests" TEXT NOT NULL DEFAULT '[]',
    "longTermInterests" TEXT NOT NULL DEFAULT '[]',
    "readingFrequency" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ArticleInteraction_userId_articleId_idx" ON "ArticleInteraction"("userId", "articleId");

-- CreateIndex
CREATE INDEX "ArticleInteraction_userId_category_idx" ON "ArticleInteraction"("userId", "category");

-- CreateIndex
CREATE INDEX "ArticleInteraction_userId_updatedAt_idx" ON "ArticleInteraction"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationCache_userId_key" ON "RecommendationCache"("userId");
