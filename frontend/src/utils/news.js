export const categoryLabels = {
  technology: "Technology",
  business: "Business",
  sports: "Sports",
  science: "Science",
  health: "Health",
  general: "General",
  entertainment: "Entertainment",
};

export function categoryLabel(category) {
  return categoryLabels[category] || category || "General";
}

export function articlePath(articleOrId) {
  const id = typeof articleOrId === "string" ? articleOrId : articleOrId?.id;
  return `/news/${encodeURIComponent(id || "")}`;
}

export function isArticleIdMatch(article, routeId) {
  return encodeURIComponent(article.id) === routeId;
}

const detailArticleKey = "newsFeedDetailArticles";

function readStoredArticles() {
  try {
    return JSON.parse(localStorage.getItem(detailArticleKey)) || {};
  } catch {
    return {};
  }
}

export function rememberArticleForDetail(article) {
  if (!article?.id) return;

  const storedArticles = readStoredArticles();
  const nextArticles = {
    ...storedArticles,
    [article.id]: article,
  };

  localStorage.setItem(detailArticleKey, JSON.stringify(nextArticles));
  sessionStorage.setItem("selectedArticle", JSON.stringify(article));
}

export function rememberArticlesForDetail(articles) {
  const storedArticles = readStoredArticles();
  const nextArticles = articles.reduce(
    (accumulator, article) => {
      if (article?.id) {
        accumulator[article.id] = article;
      }
      return accumulator;
    },
    { ...storedArticles }
  );

  localStorage.setItem(detailArticleKey, JSON.stringify(nextArticles));
}

export function getStoredArticleForDetail(routeId) {
  const decodedId = decodeURIComponent(routeId || "");
  const storedArticles = readStoredArticles();

  try {
    const selectedArticle = JSON.parse(sessionStorage.getItem("selectedArticle"));
    if (selectedArticle?.id === decodedId) {
      return selectedArticle;
    }
  } catch {
    // Ignore malformed session data and fall back to cached articles.
  }

  return storedArticles[decodedId] || null;
}

export function formatDate(date) {
  if (!date) return "New";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fallbackImage(category) {
  const images = {
    technology:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=480&fit=crop",
    business:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=480&fit=crop",
    sports:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=480&fit=crop",
    science:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=480&fit=crop",
    health:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=480&fit=crop",
    general:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=480&fit=crop",
    entertainment:
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=800&h=480&fit=crop",
  };

  return images[category] || images.general;
}

export function filterArticles(articles, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return articles;

  return articles.filter((article) => {
    const searchable = [
      article.title,
      article.description,
      article.source,
      article.category,
      article.author,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

const bookmarkKey = "newsFeedBookmarks";

export function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(bookmarkKey)) || [];
  } catch {
    return [];
  }
}

export function isBookmarked(articleId, bookmarks = getBookmarks()) {
  return bookmarks.some((article) => article.id === articleId);
}

export function toggleBookmark(article) {
  const bookmarks = getBookmarks();
  const exists = isBookmarked(article.id, bookmarks);
  const nextBookmarks = exists
    ? bookmarks.filter((item) => item.id !== article.id)
    : [
        ...bookmarks,
        {
          id: article.id,
          title: article.title,
          description: article.description,
          source: article.source,
          url: article.url,
          imageUrl: article.imageUrl,
          category: article.category,
          publishedAt: article.publishedAt,
          savedAt: new Date().toISOString(),
        },
      ];

  localStorage.setItem(bookmarkKey, JSON.stringify(nextBookmarks));
  return nextBookmarks;
}
