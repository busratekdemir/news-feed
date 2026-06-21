const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "also",
  "among",
  "because",
  "before",
  "between",
  "could",
  "from",
  "have",
  "into",
  "more",
  "over",
  "said",
  "that",
  "their",
  "there",
  "these",
  "this",
  "those",
  "under",
  "with",
  "would",
  "news",
  "live",
  "latest",
]);

const DECAY_HALF_LIFE_DAYS = 14;
const CACHE_TTL_MS = 2 * 60 * 1000;
const KEYWORD_ALIASES = {
  "artificial intelligence": "ai",
  "machine learning": "ai",
  "open ai": "openai",
  cryptocurrency: "crypto",
};

const DISPLAY_TOPICS = {
  ai: "AI",
  openai: "OpenAI",
  crypto: "Crypto",
  iphone: "iPhone",
  ios: "iOS",
  uk: "UK",
  us: "US",
};

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function addWeight(map, key, amount) {
  const normalized = normalize(key);
  if (!normalized) return;
  map[normalized] = (map[normalized] || 0) + amount;
}

function topKeys(map, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function extractKeywords(article) {
  const text = String(`${article.title || ""} ${article.description || ""}`)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const keywords = new Set();

  Object.entries(KEYWORD_ALIASES).forEach(([phrase, alias]) => {
    if (text.includes(phrase)) {
      keywords.add(alias);
    }
  });

  text
    .split(/\s+/)
    .filter((word) => (word === "ai" || word.length > 3) && !STOP_WORDS.has(word))
    .forEach((word) => keywords.add(KEYWORD_ALIASES[word] || word));

  return [...keywords].slice(0, 14);
}

function extractEntities(article) {
  const title = String(article.title || "");
  const matches = title.match(/\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2}/g) || [];

  return [...new Set(matches.map((entity) => entity.trim()).filter((entity) => entity.length > 2))]
    .slice(0, 8);
}

function articleFeatures(article) {
  return {
    keywords: article.keywords || extractKeywords(article),
    entities: article.entities || extractEntities(article),
  };
}

function decayFor(date) {
  const ageMs = Date.now() - new Date(date).getTime();
  const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 0);
  return Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
}

function eventWeight(interaction) {
  const base = {
    click: 1,
    detail_view: 1.2,
    read_progress: 1.4,
    bookmark: 3,
  }[interaction.eventType] || 1;
  const durationBoost = Math.min((interaction.durationSeconds || 0) / 90, 1.5);
  const scrollBoost = Math.min((interaction.scrollPercentage || 0) / 100, 1);
  const repeatBoost = Math.min((interaction.visitCount || 1) - 1, 4) * 0.25;

  return base + durationBoost + scrollBoost + repeatBoost;
}

function normalizeScore(score, maxScore) {
  if (!maxScore) return 0;
  return Math.min(score / maxScore, 1);
}

function overlapScore(items, weights) {
  if (!items.length) return 0;
  const maxWeight = Math.max(...Object.values(weights), 0);
  if (!maxWeight) return 0;

  const score = items.reduce((sum, item) => sum + (weights[normalize(item)] || 0), 0);
  return Math.min(score / (items.length * maxWeight), 1);
}

async function updateUserProfile(userId) {
  const interactions = await prisma.articleInteraction.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const categoryWeights = {};
  const sourceWeights = {};
  const keywordWeights = {};
  const entityWeights = {};
  const recentWeights = {};
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  interactions.forEach((interaction) => {
    const decayedWeight = eventWeight(interaction) * decayFor(interaction.updatedAt);
    const keywords = parseJson(interaction.keywords, []);
    const entities = parseJson(interaction.entities, []);

    addWeight(categoryWeights, interaction.category, decayedWeight);
    addWeight(sourceWeights, interaction.source, decayedWeight);
    keywords.forEach((keyword) => addWeight(keywordWeights, keyword, decayedWeight));
    entities.forEach((entity) => addWeight(entityWeights, entity, decayedWeight));

    if (new Date(interaction.updatedAt).getTime() >= thirtyDaysAgo) {
      addWeight(recentWeights, interaction.category, decayedWeight);
      keywords.slice(0, 4).forEach((keyword) => addWeight(recentWeights, keyword, decayedWeight));
      entities.slice(0, 3).forEach((entity) => addWeight(recentWeights, entity, decayedWeight));
    }
  });

  const firstReadAt = interactions.at(-1)?.createdAt;
  const activeDays = firstReadAt
    ? Math.max((Date.now() - new Date(firstReadAt).getTime()) / (1000 * 60 * 60 * 24), 1)
    : 1;
  const readingFrequency = interactions.length / activeDays;

  const profile = {
    categoryWeights,
    sourceWeights,
    keywordWeights,
    entityWeights,
    recentInterests: topKeys(recentWeights, 10),
    longTermInterests: [
      ...topKeys(categoryWeights, 4),
      ...topKeys(keywordWeights, 5),
      ...topKeys(entityWeights, 5),
    ].slice(0, 12),
    readingFrequency,
  };

  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      categoryWeights: JSON.stringify(profile.categoryWeights),
      sourceWeights: JSON.stringify(profile.sourceWeights),
      keywordWeights: JSON.stringify(profile.keywordWeights),
      entityWeights: JSON.stringify(profile.entityWeights),
      recentInterests: JSON.stringify(profile.recentInterests),
      longTermInterests: JSON.stringify(profile.longTermInterests),
      readingFrequency,
    },
    create: {
      userId,
      categoryWeights: JSON.stringify(profile.categoryWeights),
      sourceWeights: JSON.stringify(profile.sourceWeights),
      keywordWeights: JSON.stringify(profile.keywordWeights),
      entityWeights: JSON.stringify(profile.entityWeights),
      recentInterests: JSON.stringify(profile.recentInterests),
      longTermInterests: JSON.stringify(profile.longTermInterests),
      readingFrequency,
    },
  });

  await prisma.recommendationCache.deleteMany({ where: { userId } });

  return profile;
}

async function getUserProfile(userId) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  if (!profile) {
    return updateUserProfile(userId);
  }

  return {
    categoryWeights: parseJson(profile.categoryWeights, {}),
    sourceWeights: parseJson(profile.sourceWeights, {}),
    keywordWeights: parseJson(profile.keywordWeights, {}),
    entityWeights: parseJson(profile.entityWeights, {}),
    recentInterests: parseJson(profile.recentInterests, []),
    longTermInterests: parseJson(profile.longTermInterests, []),
    readingFrequency: profile.readingFrequency,
  };
}

async function recordInteraction(userId, article, event = {}) {
  if (!article?.id) {
    throw new Error("Article id is required to record an interaction.");
  }

  const features = articleFeatures(article);
  const eventType = event.eventType || "click";
  const durationSeconds = Math.max(Number(event.durationSeconds) || 0, 0);
  const scrollPercentage = Math.min(Math.max(Number(event.scrollPercentage) || 0, 0), 100);
  const bookmarked = Boolean(event.bookmarked || eventType === "bookmark");
  const existing = await prisma.articleInteraction.findFirst({
    where: {
      userId,
      articleId: article.id,
      eventType,
    },
  });

  if (existing) {
    await prisma.articleInteraction.update({
      where: { id: existing.id },
      data: {
        durationSeconds: Math.max(existing.durationSeconds, durationSeconds),
        scrollPercentage: Math.max(existing.scrollPercentage, scrollPercentage),
        bookmarked: existing.bookmarked || bookmarked,
        visitCount: existing.visitCount + 1,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.articleInteraction.create({
      data: {
        userId,
        articleId: article.id,
        title: article.title || "Untitled article",
        category: article.category || "general",
        source: article.source || "Unknown Source",
        url: article.url,
        keywords: JSON.stringify(features.keywords),
        entities: JSON.stringify(features.entities),
        eventType,
        durationSeconds,
        scrollPercentage,
        bookmarked,
      },
    });
  }

  return updateUserProfile(userId);
}

function recencyScore(article) {
  if (!article.publishedAt) return 0.2;
  const ageHours = Math.max((Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60), 0);
  return Math.max(1 - ageHours / (24 * 7), 0);
}

function popularityScore(article, globalPopularity = {}) {
  const reads = globalPopularity[article.id] || 0;
  const maxReads = Math.max(...Object.values(globalPopularity), 1);
  return reads / maxReads;
}

function scoreArticle(article, profile, selectedCategories, globalPopularity = {}) {
  const features = articleFeatures(article);
  const maxCategoryWeight = Math.max(...Object.values(profile.categoryWeights), 0);
  const maxSourceWeight = Math.max(...Object.values(profile.sourceWeights), 0);
  const selectedCategoryBoost = selectedCategories.includes(article.category) ? 0.35 : 0;
  const categorySimilarity = Math.max(
    normalizeScore(profile.categoryWeights[normalize(article.category)] || 0, maxCategoryWeight),
    selectedCategoryBoost
  );
  const keywordSimilarity = Math.max(
    overlapScore(features.keywords, profile.keywordWeights),
    overlapScore(features.entities, profile.entityWeights)
  );
  const sourcePreference = normalizeScore(
    profile.sourceWeights[normalize(article.source)] || 0,
    maxSourceWeight
  );
  const recency = recencyScore(article);
  const popularity = popularityScore(article, globalPopularity);
  const score =
    0.45 * keywordSimilarity +
    0.25 * categorySimilarity +
    0.10 * sourcePreference +
    0.15 * recency +
    0.05 * popularity;

  return {
    score,
    signals: {
      categorySimilarity,
      keywordSimilarity,
      sourcePreference,
      recency,
      popularity,
    },
    features,
  };
}

function explanationFor(article, profile, signals) {
  const features = articleFeatures(article);
  const entity = features.entities.find((item) => profile.entityWeights[normalize(item)] > 0);
  const keyword = features.keywords.find((item) => profile.keywordWeights[normalize(item)] > 0);

  if (entity) return `Because you read stories about ${entity}.`;
  if (keyword === "ai") return "Because you recently followed AI topics.";
  if (keyword) return `Because you read stories about ${formatTopic(keyword)}.`;
  if (signals.sourcePreference > 0.25) return `Recommended because you often read ${article.source}.`;
  if (signals.categorySimilarity > 0) return `Recommended because you often read ${article.category} news.`;
  if (signals.popularity > 0.3) return "Popular among readers with similar interests.";
  return "Discover something new outside your usual reading pattern.";
}

function formatTopic(topic) {
  return DISPLAY_TOPICS[normalize(topic)] || String(topic || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function globalPopularityFor(articles) {
  const articleIds = articles.map((article) => article.id);
  const grouped = await prisma.articleInteraction.groupBy({
    by: ["articleId"],
    where: {
      articleId: { in: articleIds },
    },
    _sum: {
      visitCount: true,
    },
  });

  return grouped.reduce((map, item) => {
    map[item.articleId] = item._sum.visitCount || 0;
    return map;
  }, {});
}

async function similarUserArticleIds(userId) {
  const profile = await getUserProfile(userId);
  const favoriteCategories = topKeys(profile.categoryWeights, 3);
  if (!favoriteCategories.length) return new Set();

  const similarInteractions = await prisma.articleInteraction.findMany({
    where: {
      userId: { not: userId },
      category: { in: favoriteCategories },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return new Set(similarInteractions.map((interaction) => interaction.articleId));
}

function applyDiversity(scoredArticles) {
  const personalized = scoredArticles.filter((article) => !article.recommendation.isExploration);
  const exploration = scoredArticles.filter((article) => article.recommendation.isExploration);
  const result = [];
  const categoryCounts = {};

  personalized.forEach((article, index) => {
    if ((index + 1) % 5 === 0 && exploration.length) {
      result.push(exploration.shift());
    }

    const categoryCount = categoryCounts[article.category] || 0;
    if (categoryCount < Math.ceil(result.length * 0.55) + 2) {
      result.push(article);
      categoryCounts[article.category] = categoryCount + 1;
    } else if (exploration.length) {
      result.push(exploration.shift());
      result.push(article);
      categoryCounts[article.category] = categoryCount + 1;
    } else {
      result.push(article);
    }
  });

  return [...result, ...exploration];
}

function buildSections(rankedArticles, profile) {
  const topicWeights = {
    ...profile.keywordWeights,
    ...profile.entityWeights,
  };
  const topTopic = topKeys(topicWeights, 1)[0];
  const trending = [...rankedArticles]
    .sort((a, b) => b.recommendation.signals.popularity - a.recommendation.signals.popularity)
    .slice(0, 8);
  const readersLikeYou = rankedArticles
    .filter((article) => article.recommendation.fromSimilarUsers)
    .slice(0, 8);
  const discovery = rankedArticles
    .filter((article) => article.recommendation.isExploration)
    .slice(0, 8);
  const becauseYouReadArticles = topTopic
    ? rankedArticles
        .filter((article) => {
          const features = articleFeatures(article);
          return [...features.keywords, ...features.entities].some(
            (item) => normalize(item) === normalize(topTopic)
          );
        })
        .slice(0, 8)
    : rankedArticles.slice(8, 16);

  return {
    personalized: rankedArticles.slice(0, 24),
    trending,
    becauseYouRead: {
      label: topTopic ? `Because You Read ${formatTopic(topTopic)}` : "Because You Read",
      articles: becauseYouReadArticles,
    },
    readersLikeYou,
    discovery,
  };
}

async function rankArticlesForUser(userId, articles, selectedCategories, options = {}) {
  if (!articles.length) {
    const profile = await getUserProfile(userId);

    return {
      articles: [],
      sections: {
        personalized: [],
        trending: [],
        becauseYouRead: {
          label: "Because You Read",
          articles: [],
        },
        readersLikeYou: [],
        discovery: [],
      },
      profile,
    };
  }

  const cacheKey = JSON.stringify({
    ids: articles.map((article) => article.id).slice(0, 150),
    selectedCategories,
    refresh: Boolean(options.refresh),
  });

  if (!options.refresh) {
    const cached = await prisma.recommendationCache.findUnique({ where: { userId } });
    if (
      cached &&
      cached.cacheKey === cacheKey &&
      Date.now() - new Date(cached.createdAt).getTime() < CACHE_TTL_MS
    ) {
      return parseJson(cached.payload, null);
    }
  }

  const profile = await getUserProfile(userId);
  const globalPopularity = await globalPopularityFor(articles);
  const similarArticleIds = await similarUserArticleIds(userId);
  const scored = articles.map((article) => {
    const recommendation = scoreArticle(article, profile, selectedCategories, globalPopularity);
    const hasPersonalSignal =
      recommendation.signals.categorySimilarity > 0 ||
      recommendation.signals.keywordSimilarity > 0 ||
      recommendation.signals.sourcePreference > 0;
    const isExploration = !hasPersonalSignal || !selectedCategories.includes(article.category);
    const fromSimilarUsers = similarArticleIds.has(article.id);

    return {
      ...article,
      recommendation: {
        score: recommendation.score + (fromSimilarUsers ? 0.08 : 0),
        explanation: fromSimilarUsers
          ? "Popular among readers with similar interests."
          : explanationFor(article, profile, recommendation.signals),
        signals: recommendation.signals,
        isExploration,
        fromSimilarUsers,
      },
    };
  });

  const ranked = applyDiversity(
    scored.sort((a, b) => {
      if (b.recommendation.score !== a.recommendation.score) {
        return b.recommendation.score - a.recommendation.score;
      }
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    })
  );

  const payload = {
    articles: ranked,
    profile: {
      favoriteCategories: topKeys(profile.categoryWeights, 5),
      favoriteNewsSources: topKeys(profile.sourceWeights, 5),
      favoriteKeywords: topKeys(profile.keywordWeights, 8),
      favoriteEntities: topKeys(profile.entityWeights, 8),
      readingFrequency: profile.readingFrequency,
      recentInterests: profile.recentInterests,
      longTermInterests: profile.longTermInterests,
    },
    sections: buildSections(ranked, profile),
  };

  await prisma.recommendationCache.upsert({
    where: { userId },
    update: {
      cacheKey,
      payload: JSON.stringify(payload),
      createdAt: new Date(),
    },
    create: {
      userId,
      cacheKey,
      payload: JSON.stringify(payload),
    },
  });

  return payload;
}

module.exports = {
  extractKeywords,
  extractEntities,
  recordInteraction,
  updateUserProfile,
  getUserProfile,
  rankArticlesForUser,
};
