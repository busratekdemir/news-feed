-- CreateTable
CREATE TABLE "NewsArticleCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "pageSize" INTEGER NOT NULL DEFAULT 25,
    "country" TEXT NOT NULL DEFAULT 'us',
    "articles" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "NewsArticleCache_category_expiresAt_idx" ON "NewsArticleCache"("category", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticleCache_category_page_pageSize_country_key" ON "NewsArticleCache"("category", "page", "pageSize", "country");
