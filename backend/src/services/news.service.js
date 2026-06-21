const axios = require("axios");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const NEWS_API_BASE_URL = "https://newsapi.org/v2/top-headlines";
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
const TARGET_FEED_SIZE = 300;
const DEFAULT_DAILY_REQUEST_LIMIT = 90;
const DEFAULT_SYNC_INTERVAL_MINUTES = 6 * 60;
const prisma = new PrismaClient();

const allowedCategories = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
];

function slugify(value) {
  return String(value || "article")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

function createArticleId(article) {
  const source = article.source?.name || "unknown-source";
  const seed = `${article.title || ""}|${article.publishedAt || ""}|${source}`;
  const hash = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 10);
  return `${slugify(article.title)}-${hash}`;
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function dedupeAndSortArticles(articles) {
  const seen = new Set();

  return articles
    .filter((article) => article.title && article.title !== "[Removed]")
    .filter((article) => {
      const key = article.url
        ? `url:${normalizeValue(article.url)}`
        : `title:${normalizeValue(article.title)}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
}

function mapNewsApiArticle(article, category) {
  return {
    id: createArticleId(article),
    category,
    title: article.title,
    description: article.description,
    source: article.source?.name || "Unknown Source",
    author: article.author,
    url: article.url,
    imageUrl: article.urlToImage,
    publishedAt: article.publishedAt,
    content: article.content,
  };
}

function parseCachedArticles(cache) {
  if (!cache) return null;

  try {
    return JSON.parse(cache.articlesJson);
  } catch {
    return null;
  }
}

function isCacheValid(cache) {
  if (!cache) return false;
  return (
    Date.now() - new Date(cache.updatedAt).getTime() <
    getSyncIntervalMinutes() * 60 * 1000
  );
}

function isRateLimitError(error) {
  return error?.response?.status === 429;
}

function shouldStopSyncAfterError(error) {
  return [401, 429].includes(error?.response?.status);
}

async function getCategoryCache(category) {
  return prisma.newsCache.findUnique({
    where: { category },
  });
}

async function saveCategoryCache(category, articles) {
  await prisma.newsCache.upsert({
    where: { category },
    update: {
      articlesJson: JSON.stringify(articles),
    },
    create: {
      category,
      articlesJson: JSON.stringify(articles),
    },
  });
}

function getDailyRequestLimit() {
  const configuredLimit = Number(process.env.NEWS_API_DAILY_REQUEST_LIMIT);
  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return Math.floor(configuredLimit);
  }

  return DEFAULT_DAILY_REQUEST_LIMIT;
}

function getSyncIntervalMinutes() {
  const configuredMinutes = Number(process.env.NEWS_CACHE_REFRESH_INTERVAL_MINUTES);
  if (Number.isFinite(configuredMinutes) && configuredMinutes > 0) {
    return Math.floor(configuredMinutes);
  }

  return DEFAULT_SYNC_INTERVAL_MINUTES;
}

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function reserveNewsApiRequest() {
  const date = getUtcDateKey();
  const limit = getDailyRequestLimit();

  return prisma.$transaction(async (tx) => {
    const usage = await tx.newsApiUsage.findUnique({
      where: { date },
    });

    if (usage && usage.requestCount >= limit) {
      return {
        allowed: false,
        date,
        limit,
        used: usage.requestCount,
      };
    }

    const updatedUsage = usage
      ? await tx.newsApiUsage.update({
          where: { date },
          data: { requestCount: { increment: 1 } },
        })
      : await tx.newsApiUsage.create({
          data: {
            date,
            requestCount: 1,
          },
        });

    return {
      allowed: true,
      date,
      limit,
      used: updatedUsage.requestCount,
    };
  });
}

async function getNewsApiUsageSummary() {
  const date = getUtcDateKey();
  const usage = await prisma.newsApiUsage.findUnique({
    where: { date },
  });

  return {
    date,
    limit: getDailyRequestLimit(),
    used: usage?.requestCount || 0,
    remaining: Math.max(getDailyRequestLimit() - (usage?.requestCount || 0), 0),
  };
}

async function fetchNewsApiCategory({ category, pageSize, country, apiKey }) {
  const response = await axios.get(NEWS_API_BASE_URL, {
    params: {
      country,
      category,
      page: 1,
      pageSize,
      apiKey,
    },
  });

  return (response.data.articles || []).map((article) =>
    mapNewsApiArticle(article, category)
  );
}

function createCategoryPlan(categories = []) {
  const preferredCategories = Array.isArray(categories)
    ? categories.filter((category) => allowedCategories.includes(category))
    : [];

  const uniquePreferred = [...new Set(preferredCategories)];

  return [
    ...uniquePreferred,
    ...allowedCategories.filter((category) => !uniquePreferred.includes(category)),
  ];
}

async function fetchNewsByCategory(category, options = {}) {
  const safeCategory = allowedCategories.includes(category) ? category : "general";
  const cached = await getCategoryCache(safeCategory);
  const cachedArticles = parseCachedArticles(cached);

  return {
    category: safeCategory,
    articles: cachedArticles || [],
    source: "database",
    cacheStatus: cachedArticles
      ? isCacheValid(cached)
        ? "available"
        : "stale"
      : "empty",
    updatedAt: cached?.updatedAt || null,
    newsApiRequests: 0,
  };
}

async function fetchPersonalizedNews(categories, options = {}) {
  const prioritizedCategories = createCategoryPlan(
    Array.isArray(categories) && categories.length > 0 ? categories : ["general"]
  );

  const newsResults = await Promise.all(
    prioritizedCategories.map((category) =>
      fetchNewsByCategory(category, {
        ...options,
        pageSize: options.pageSize || DEFAULT_PAGE_SIZE,
      })
    )
  );

  const allArticles = dedupeAndSortArticles(
    newsResults.flatMap((result) => result.articles)
  ).slice(0, Number(options.limit) || TARGET_FEED_SIZE);

  return {
    articles: allArticles,
    meta: {
      requestedCategories: prioritizedCategories,
      newsApiRequests: newsResults.reduce(
        (total, result) => total + result.newsApiRequests,
        0
      ),
      cache: newsResults.map((result) => ({
        category: result.category,
        source: result.source,
        status: result.cacheStatus,
        count: result.articles.length,
        updatedAt: result.updatedAt,
      })),
      maxPossibleNewsApiRequests: 0,
      newsApiReadsDisabledForUserRequests: true,
      syncIntervalMinutes: getSyncIntervalMinutes(),
      targetFeedSize: TARGET_FEED_SIZE,
    },
  };
}

async function syncNewsCache(options = {}) {
  const apiKey = process.env.NEWS_API_KEY;
  const country = process.env.NEWS_API_COUNTRY || "us";

  if (!apiKey || apiKey === "REPLACE_WITH_NEWSAPI_KEY") {
    throw new Error("NEWS_API_KEY is not configured in the backend .env file.");
  }

  const categories = Array.isArray(options.categories) && options.categories.length
    ? options.categories.filter((category) => allowedCategories.includes(category))
    : allowedCategories;
  const uniqueCategories = [...new Set(categories)];
  const force = Boolean(options.force);
  const pageSize = Math.min(
    Math.max(Number(options.pageSize) || DEFAULT_PAGE_SIZE, 20),
    MAX_PAGE_SIZE
  );
  const results = [];

  for (const category of uniqueCategories) {
    const cached = await getCategoryCache(category);
    const cachedArticles = parseCachedArticles(cached);

    if (!force && cachedArticles && isCacheValid(cached)) {
      results.push({
        category,
        status: "fresh",
        count: cachedArticles.length,
        updatedAt: cached.updatedAt,
      });
      continue;
    }

    const usage = await reserveNewsApiRequest();
    if (!usage.allowed) {
      results.push({
        category,
        status: "daily-limit-reached",
        count: cachedArticles?.length || 0,
        updatedAt: cached?.updatedAt || null,
        usage,
      });
      break;
    }

    try {
      const freshArticles = await fetchNewsApiCategory({
        category,
        pageSize,
        country,
        apiKey,
      });
      const cleanedArticles = dedupeAndSortArticles(freshArticles);

      await saveCategoryCache(category, cleanedArticles);
      results.push({
        category,
        status: cachedArticles ? "refreshed" : "created",
        count: cleanedArticles.length,
        usage,
      });
    } catch (error) {
      results.push({
        category,
        status: isRateLimitError(error)
          ? "newsapi-rate-limit"
          : error?.response?.status === 401
            ? "newsapi-auth-error"
            : "error",
        count: cachedArticles?.length || 0,
        updatedAt: cached?.updatedAt || null,
        usage,
        error: error.message,
      });

      if (shouldStopSyncAfterError(error)) break;
    }
  }

  return {
    results,
    usage: await getNewsApiUsageSummary(),
    syncIntervalMinutes: getSyncIntervalMinutes(),
  };
}

module.exports = {
  fetchPersonalizedNews,
  syncNewsCache,
  getNewsApiUsageSummary,
  allowedCategories,
};
