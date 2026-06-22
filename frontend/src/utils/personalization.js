import api from "../api/api";
import { categoryLabel } from "./news";

const PROFILE_KEY = "newsFeedReadingProfile";
const DECAY_PER_DAY = 0.94;
const MAX_STORED_KEYWORDS = 80;
const MAX_STORED_SOURCES = 30;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "as",
  "at",
  "by",
  "from",
  "this",
  "that",
  "after",
  "before",
  "over",
  "under",
  "new",
  "latest",
  "live",
  "news",
  "says",
  "said",
  "will",
  "could",
  "would",
  "about",
  "into",
  "than",
  "then",
  "they",
  "their",
  "there",
  "here",
  "what",
  "when",
  "where",
  "which",
  "while",
  "more",
  "most",
  "first",
  "last",
  "how",
  "why",
  "who",
  "just",
  "also",
  "has",
  "had",
  "have",
  "been",
  "can",
  "may",
  "its",
  "his",
  "her",
  "our",
  "you",
  "your",
  "all",
  "not",
  "but",
  "out",
  "off",
  "up",
  "down",
]);

function defaultProfile() {
  return {
    categoryWeights: {},
    sourceWeights: {},
    keywordWeights: {},
    totalReads: 0,
    lastReadAt: null,
  };
}

const KEYWORD_ALIASES = {
  "artificial intelligence": "ai",
  "machine learning": "ai",
  "open ai": "openai",
  "u s": "us",
  "u k": "uk",
};

const DISPLAY_KEYWORDS = {
  ai: "AI",
  openai: "OpenAI",
  iphone: "iPhone",
  ipad: "iPad",
  ios: "iOS",
  macos: "macOS",
  usa: "US",
  us: "US",
  uk: "UK",
  nba: "NBA",
  nfl: "NFL",
  mlb: "MLB",
  eu: "EU",
};

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanWord(word) {
  return normalizeKey(word).replace(/\s/g, "");
}

function tokenise(text) {
  return normalizeKey(text)
    .split(/\s+/)
    .map(cleanWord)
    .filter((word) => {
      if (!word || STOP_WORDS.has(word)) return false;
      if (word === "ai") return true;
      return word.length > 2;
    });
}

function addKeywordScore(scores, keyword, amount) {
  const normalized = KEYWORD_ALIASES[keyword] || cleanWord(keyword);
  if (!normalized || STOP_WORDS.has(normalized)) return;
  if (normalized.length <= 2 && normalized !== "ai") return;

  scores[normalized] = (scores[normalized] || 0) + amount;
}

function extractKeywordScores(article) {
  const scores = {};
  const title = article?.title || "";
  const description = article?.description || "";
  const combinedText = normalizeKey(`${title} ${description}`);

  Object.entries(KEYWORD_ALIASES).forEach(([phrase, alias]) => {
    if (combinedText.includes(phrase)) {
      addKeywordScore(scores, alias, 4);
    }
  });

  tokenise(title).forEach((word) => addKeywordScore(scores, word, 3));
  tokenise(description).forEach((word) => addKeywordScore(scores, word, 1));

  return scores;
}

export function extractKeywords(article) {
  return Object.entries(extractKeywordScores(article))
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword)
    .slice(0, 18);
}

function migrateProfile(profile = {}) {
  return {
    ...defaultProfile(),
    ...profile,
    categoryWeights: {
      ...(profile.categories || {}),
      ...(profile.categoryWeights || {}),
    },
    sourceWeights: {
      ...(profile.sources || {}),
      ...(profile.sourceWeights || {}),
    },
    keywordWeights: {
      ...(profile.keywords || {}),
      ...(profile.keywordWeights || {}),
    },
    totalReads: profile.totalReads || 0,
    lastReadAt: profile.lastReadAt || null,
  };
}

function trimWeights(weights, limit) {
  return Object.fromEntries(
    Object.entries(weights || {})
      .filter(([, value]) => Number(value) > 0.05)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  );
}

function applyDecay(profile) {
  if (!profile.lastReadAt) return profile;

  const lastReadTime = new Date(profile.lastReadAt).getTime();
  if (!Number.isFinite(lastReadTime)) return profile;

  const daysSinceRead = Math.max(0, (Date.now() - lastReadTime) / 86400000);
  if (daysSinceRead < 0.1) return profile;

  const decay = DECAY_PER_DAY ** daysSinceRead;
  const decayWeights = (weights) =>
    Object.fromEntries(
      Object.entries(weights || {}).map(([key, value]) => [key, value * decay])
    );

  return {
    ...profile,
    categoryWeights: decayWeights(profile.categoryWeights),
    sourceWeights: decayWeights(profile.sourceWeights),
    keywordWeights: decayWeights(profile.keywordWeights),
  };
}

export function getReadingProfile() {
  try {
    return migrateProfile(JSON.parse(localStorage.getItem(PROFILE_KEY)));
  } catch {
    return defaultProfile();
  }
}

export function saveReadingProfile(profile) {
  const normalizedProfile = migrateProfile(profile);

  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      categoryWeights: normalizedProfile.categoryWeights,
      sourceWeights: trimWeights(normalizedProfile.sourceWeights, MAX_STORED_SOURCES),
      keywordWeights: trimWeights(normalizedProfile.keywordWeights, MAX_STORED_KEYWORDS),
      totalReads: normalizedProfile.totalReads,
      lastReadAt: normalizedProfile.lastReadAt,
    })
  );
}

export function trackArticleClick(article) {
  if (!article) return Promise.resolve(null);

  const profile = applyDecay(getReadingProfile());
  const category = article.category || "general";
  const source = article.source || "Unknown Source";
  const keywordScores = extractKeywordScores(article);

  profile.categoryWeights[category] = (profile.categoryWeights[category] || 0) + 1.5;
  profile.sourceWeights[source] = (profile.sourceWeights[source] || 0) + 0.6;

  Object.entries(keywordScores).forEach(([keyword, amount]) => {
    profile.keywordWeights[keyword] =
      (profile.keywordWeights[keyword] || 0) + amount;
  });

  profile.totalReads = (profile.totalReads || 0) + 1;
  profile.lastReadAt = new Date().toISOString();

  saveReadingProfile(profile);

  return recordInteraction(article, { eventType: "click" });
}

export function sortArticlesByPersonalization(articles, selectedInterests = []) {
  const profile = getReadingProfile();

  return [...articles].sort((a, b) => {
    return (
      getArticleScore(b, profile, selectedInterests) -
      getArticleScore(a, profile, selectedInterests)
    );
  });
}

function getArticleScore(article, profile, selectedInterests = []) {
  const category = article.category || "general";
  const source = article.source || "Unknown Source";
  const keywordScores = extractKeywordScores(article);

  let score = 0;

  const keywordAffinity = Object.entries(keywordScores).reduce(
    (sum, [keyword, articleWeight]) =>
      sum + (profile.keywordWeights?.[keyword] || 0) * articleWeight,
    0
  );

  score += keywordAffinity * 16;

  if (category !== "general") {
    score += (profile.categoryWeights?.[category] || 0) * 10;
  }

  if (selectedInterests.includes(category) && category !== "general") {
    score += profile.totalReads > 0 ? 14 : 32;
  }

  score += (profile.sourceWeights?.[source] || 0) * 4;

  score += getRecencyBonus(article) * 8;

  return score;
}

function getRecencyBonus(article) {
  if (!article?.publishedAt) return 0;

  const ageHours =
    (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);

  if (!Number.isFinite(ageHours)) return 0;

  return Math.max(0, 1 - ageHours / 72);
}

function getTopMatchingKeyword(article, profile) {
  const keywordScores = extractKeywordScores(article);

  return Object.keys(keywordScores)
    .filter((keyword) => (profile.keywordWeights?.[keyword] || 0) > 0)
    .sort((a, b) => {
      const aScore = (profile.keywordWeights[a] || 0) * keywordScores[a];
      const bScore = (profile.keywordWeights[b] || 0) * keywordScores[b];
      return bScore - aScore;
    })[0];
}

function formatKeyword(keyword) {
  return (
    DISPLAY_KEYWORDS[keyword] ||
    keyword.replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function isEntityKeyword(keyword) {
  return (
    DISPLAY_KEYWORDS[keyword] ||
    ["apple", "google", "microsoft", "tesla", "nvidia", "meta", "amazon"].includes(
      keyword
    )
  );
}

export function getRecommendationReason(article, selectedInterests = []) {
  const profile = getReadingProfile();
  const category = article?.category || "general";
  const source = article?.source || "Unknown Source";
  const matchedKeyword = getTopMatchingKeyword(article, profile);

  if (matchedKeyword) {
    const label = formatKeyword(matchedKeyword);
    const weight = profile.keywordWeights?.[matchedKeyword] || 0;

    if (matchedKeyword === "ai" && weight >= 5) {
      return "Because you recently followed AI topics.";
    }

    if (isEntityKeyword(matchedKeyword) || weight >= 5) {
      return `Because you read stories about ${label}.`;
    }

    return "Similar to articles you opened recently.";
  }

  if ((profile.categoryWeights?.[category] || 0) >= 3 && category !== "general") {
    return `Recommended because you often read ${categoryLabel(category)} stories.`;
  }

  if ((profile.sourceWeights?.[source] || 0) >= 2) {
    return `Recommended because you often read stories from ${source}.`;
  }

  if (selectedInterests.includes(category) && category !== "general") {
    return `Recommended based on your ${categoryLabel(category)} interest.`;
  }

  if (category !== "general") {
    return `Fresh ${categoryLabel(category)} story to broaden your feed.`;
  }

  return "Fresh story to broaden your feed.";
}

export function buildKeywordDiscoverySection(articles, options = {}) {
  const profile = getReadingProfile();
  const keywordWeights = profile.keywordWeights || {};
  const limit = options.limit || 6;

  const topKeywords = Object.entries(keywordWeights)
    .filter(([, weight]) => Number(weight) >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([keyword]) => keyword);

  if (!topKeywords.length) {
    return null;
  }

  const sections = topKeywords
    .map((keyword) => {
      const matches = articles
        .map((article) => {
          const keywordScores = extractKeywordScores(article);
          const articleKeywordScore = keywordScores[keyword] || 0;

          if (!articleKeywordScore) return null;

          return {
            ...article,
            keywordDiscoveryScore:
              articleKeywordScore * (keywordWeights[keyword] || 0) +
              getRecencyBonus(article),
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (b.keywordDiscoveryScore !== a.keywordDiscoveryScore) {
            return b.keywordDiscoveryScore - a.keywordDiscoveryScore;
          }

          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        });

      return {
        keyword,
        label: `Because You Read ${formatKeyword(keyword)}`,
        articles: matches.slice(0, limit),
      };
    })
    .filter((section) => section.articles.length > 0)
    .sort((a, b) => b.articles.length - a.articles.length);

  return sections[0] || null;
}

export function getMatchScore(article, selectedInterests = []) {
  const profile = getReadingProfile();
  const category = article?.category || "general";
  const source = article?.source || "Unknown Source";
  const keywordScores = extractKeywordScores(article);

  let score = 45;

  if (selectedInterests.includes(category) && category !== "general") score += 10;
  if ((profile.categoryWeights?.[category] || 0) > 0 && category !== "general") {
    score += Math.min(profile.categoryWeights[category] * 4, 16);
  }
  if ((profile.sourceWeights?.[source] || 0) > 0) {
    score += Math.min(profile.sourceWeights[source] * 2, 8);
  }

  Object.keys(keywordScores).forEach((keyword) => {
    score += Math.min((profile.keywordWeights?.[keyword] || 0) * 3, 24);
  });

  return Math.min(score, 98);
}

export async function recordInteraction(article, event = {}) {
  if (!article?.id) return null;
  if (!localStorage.getItem("token")) return null;

  try {
    const response = await api.post("/api/news/interactions", {
      article,
      eventType: event.eventType || "click",
      durationSeconds: event.durationSeconds || 0,
      scrollPercentage: event.scrollPercentage || 0,
      bookmarked: Boolean(event.bookmarked),
    });

    return response.data.profile;
  } catch (error) {
    console.warn(
      "Interaction tracking failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}
