const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth.middleware");
const {
  fetchPersonalizedNews,
  allowedCategories,
} = require("../services/news.service");
const {
  rankArticlesForUser,
  recordInteraction,
} = require("../services/recommendation.service");

const router = express.Router();
const prisma = new PrismaClient();
const MAX_RESPONSE_LIMIT = 48;

function parsePagination(query) {
  const requestedLimit = Number(query.limit);
  const requestedOffset = Number(query.offset);
  const hasLimit = Number.isFinite(requestedLimit) && requestedLimit > 0;
  const limit = hasLimit
    ? Math.min(Math.floor(requestedLimit), MAX_RESPONSE_LIMIT)
    : null;
  const offset =
    Number.isFinite(requestedOffset) && requestedOffset > 0
      ? Math.floor(requestedOffset)
      : 0;

  return { hasLimit, limit, offset };
}

router.get("/categories", (req, res) => {
  res.json({
    categories: allowedCategories,
  });
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferences: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const categories = user.preferences
      ? user.preferences
          .split(",")
          .map((category) => category.trim())
          .filter(Boolean)
      : ["general"];

    const refresh = req.query.refresh === "true";
    const feed = await fetchPersonalizedNews(categories, {
      refresh,
      page: req.query.page,
      pageSize: req.query.pageSize,
      pages: req.query.pages,
      ts: req.query.ts,
    });
    const recommendations = await rankArticlesForUser(
      req.user.id,
      feed.articles,
      categories,
      { refresh }
    );
    const pagination = parsePagination(req.query);
    const pagedArticles = pagination.hasLimit
      ? recommendations.articles.slice(
          pagination.offset,
          pagination.offset + pagination.limit
        )
      : recommendations.articles;
    const nextOffset = pagination.offset + pagedArticles.length;

    return res.json({
      message: "Personalized news feed loaded.",
      selectedCategories: categories,
      totalResults: recommendations.articles.length,
      refreshed: refresh,
      articles: pagedArticles,
      sections: recommendations.sections,
      profile: recommendations.profile,
      pagination: {
        offset: pagination.offset,
        limit: pagination.limit || recommendations.articles.length,
        count: pagedArticles.length,
        total: recommendations.articles.length,
        nextOffset,
        hasMore: nextOffset < recommendations.articles.length,
      },
      fetchMeta: feed.meta,
    });
  } catch (error) {
    return res.status(500).json({
      message: "News could not be loaded.",
      error: error.message,
    });
  }
});

router.post("/interactions", authMiddleware, async (req, res) => {
  try {
    const { article, eventType, durationSeconds, scrollPercentage, bookmarked } =
      req.body;

    if (!article?.id) {
      return res.status(400).json({ message: "Article is required." });
    }

    const profile = await recordInteraction(req.user.id, article, {
      eventType,
      durationSeconds,
      scrollPercentage,
      bookmarked,
    });

    return res.status(201).json({
      message: "Interaction recorded.",
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Interaction could not be recorded.",
      error: error.message,
    });
  }
});

module.exports = router;
