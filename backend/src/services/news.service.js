const axios = require("axios");

const NEWS_API_BASE_URL = "https://newsapi.org/v2/top-headlines";

const allowedCategories = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
];

async function fetchNewsByCategory(category) {
  const apiKey = process.env.NEWS_API_KEY;
  const country = process.env.NEWS_API_COUNTRY || "us";

  if (!apiKey || apiKey === "BURAYA_NEWSAPI_KEY_GELECEK") {
    throw new Error("NEWS_API_KEY .env dosyasında tanımlı değil.");
  }

  const safeCategory = allowedCategories.includes(category)
    ? category
    : "general";

  const response = await axios.get(NEWS_API_BASE_URL, {
    params: {
      country,
      category: safeCategory,
      pageSize: 8,
      apiKey,
    },
  });

  const articles = response.data.articles || [];

  return articles.map((article, index) => ({
    id: `${safeCategory}-${index}-${article.publishedAt || Date.now()}`,
    category: safeCategory,
    title: article.title,
    description: article.description,
    source: article.source?.name || "Unknown Source",
    author: article.author,
    url: article.url,
    imageUrl: article.urlToImage,
    publishedAt: article.publishedAt,
    content: article.content,
  }));
}

async function fetchPersonalizedNews(categories) {
  const safeCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : ["general"];

  const newsResults = await Promise.all(
    safeCategories.map((category) => fetchNewsByCategory(category))
  );

  return newsResults.flat();
}

module.exports = {
  fetchPersonalizedNews,
  allowedCategories,
};
