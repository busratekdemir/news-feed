import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, ExternalLink, Sparkles, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../api/api";
import {
  articlePath,
  categoryLabel,
  fallbackImage,
  formatDate,
  getBookmarks,
  isArticleIdMatch,
  isBookmarked,
  rememberArticleForDetail,
  rememberArticlesForDetail,
  toggleBookmark,
} from "../utils/news";
import {
  getMatchScore,
  getRecommendationReason,
  recordInteraction,
  trackArticleClick,
} from "../utils/personalization";

function readSelectedArticle(routeId) {
  try {
    const selectedArticle = JSON.parse(sessionStorage.getItem("selectedArticle"));

    return selectedArticle && isArticleIdMatch(selectedArticle, routeId)
      ? selectedArticle
      : null;
  } catch {
    return null;
  }
}

function cleanArticleText(article) {
  const content = String(article?.content || "")
    .replace(/\[\+\d+\s+chars\].*$/i, "")
    .trim();

  const description = String(article?.description || "").trim();

  const hasMessyContent =
    !content ||
    content.length < 80 ||
    content.includes("[+") ||
    content.toLowerCase().includes("removed");

  return hasMessyContent
    ? description || "Read the full story from the original publisher for complete details."
    : content;
}

function calculateReadingTime(article) {
  const text = `${article?.title || ""} ${article?.description || ""} ${article?.content || ""}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function NewsDetail() {
  const { id } = useParams();

  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const openedAtRef = useRef(null);
  const maxScrollRef = useRef(0);
  const trackedViewRef = useRef("");

  const loadArticle = useCallback(async () => {
    const selectedArticle = readSelectedArticle(id);

    if (selectedArticle) {
      setArticle(selectedArticle);
      setLoading(false);
      setError("");

      try {
        const response = await api.get("/api/news", {
          params: {
            offset: 0,
            limit: 24,
          },
        });
        const list = response.data.articles || [];

        rememberArticlesForDetail(list);
        setArticles(list);
        setSelectedCategories(response.data.selectedCategories || []);
      } catch {
        setArticles([]);
      }

      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/news", {
        params: {
          offset: 0,
          limit: 36,
        },
      });
      const list = response.data.articles || [];

      rememberArticlesForDetail(list);
      setArticles(list);
      setSelectedCategories(response.data.selectedCategories || []);

      const foundArticle = list.find((item) => isArticleIdMatch(item, id));

      if (!foundArticle) {
        setArticle(null);
        setError("");
        return;
      }

      setArticle(foundArticle);
    } catch (err) {
      setError(err.response?.data?.message || "Article could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    window.scrollTo(0, 0);
    openedAtRef.current = Date.now();
    maxScrollRef.current = 0;

    const timeout = setTimeout(loadArticle, 0);

    return () => clearTimeout(timeout);
  }, [loadArticle]);

  useEffect(() => {
    if (!article || trackedViewRef.current === article.id) return undefined;

    trackedViewRef.current = article.id;

    recordInteraction(article, {
      eventType: "detail_view",
      durationSeconds: 0,
      scrollPercentage: 0,
    });

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;

      maxScrollRef.current = Math.max(
        maxScrollRef.current,
        Math.min(percentage, 100)
      );
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);

      const durationSeconds = openedAtRef.current
        ? Math.round((Date.now() - openedAtRef.current) / 1000)
        : 0;

      recordInteraction(article, {
        eventType: "read_progress",
        durationSeconds,
        scrollPercentage: Math.round(maxScrollRef.current),
      });
    };
  }, [article]);

  if (loading) return <div className="state-box">Loading article...</div>;
  if (error) return <div className="state-box error">{error}</div>;

  if (!article) {
    return (
      <div className="article-not-found">
        <h1>Article not found</h1>
        <p>The story may no longer be available in the latest NewsAPI response.</p>

        <Link to="/" className="primary-btn">
          <ArrowLeft size={17} />
          Back to Home
        </Link>
      </div>
    );
  }

  const sameCategory = articles.filter(
    (item) => item.id !== article.id && item.category === article.category
  );

  const otherArticles = articles.filter(
    (item) => item.id !== article.id && item.category !== article.category
  );

  const related = [...sameCategory, ...otherArticles].slice(0, 3);
  const saved = isBookmarked(article.id, bookmarks);
  const articleText = cleanArticleText(article);
  const readingTime = calculateReadingTime(article);
  const matchScore = getMatchScore(article, selectedCategories);

  const handleBookmark = () => {
    setBookmarks(toggleBookmark(article));

    recordInteraction(article, {
      eventType: "bookmark",
      bookmarked: true,
    });
  };

  const handleArticleOpen = (item) => {
    rememberArticleForDetail(item);

    trackArticleClick(item);
  };

  return (
    <div className="article-layout">
      <article className="article-detail">
        <div className="breadcrumb">
          <Link to="/">Home</Link> / {categoryLabel(article.category)} / Article Detail
        </div>

        <span className="detail-category">{categoryLabel(article.category)}</span>

        <h1>{article.title}</h1>

        <p className="detail-description">
          {article.description || "This article is part of your personalized news feed."}
        </p>

        <div className="article-meta">
          <span>{article.source}</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span>{readingTime} min read</span>
          <span>{matchScore}% match</span>
        </div>

        <div className="detail-actions">
          <button
            className={saved ? "active" : ""}
            type="button"
            onClick={handleBookmark}
          >
            <Bookmark size={17} />
            {saved ? "Saved" : "Save"}
          </button>

          {article.url && (
            <a href={article.url} target="_blank" rel="noreferrer">
              <ExternalLink size={17} />
              Read full article
            </a>
          )}
        </div>

        <SafeImage src={article.imageUrl} category={article.category} alt={article.title} />

        <p className="article-summary">{articleText}</p>

        <div className="recommendation-box">
          <strong>Personalized recommendation</strong>
          <p>{getRecommendationReason(article, selectedCategories)}</p>
        </div>

        <div className="article-tags">
          <span>{categoryLabel(article.category)}</span>
          <span>{article.source}</span>
          <span>NewsAPI</span>
        </div>

        <h2 className="section-title">Related Stories</h2>

        <div className="popular-grid related-grid">
          {related.map((item) => (
            <Link
              to={articlePath(item)}
              className="popular-card"
              key={item.id}
              onClick={() => handleArticleOpen(item)}
            >
              <SafeImage src={item.imageUrl} category={item.category} alt={item.title} />

              <div>
                <small>{categoryLabel(item.category)} · {item.source}</small>
                <h3>{item.title}</h3>
                <p className="match-text">
                  {getMatchScore(item, selectedCategories)}% match ·{" "}
                  {getRecommendationReason(item, selectedCategories)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </article>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3>
            <Sparkles size={19} /> Quick Summary
          </h3>

          <ul className="quick-summary">
            <li>This story was opened from your personalized news feed.</li>
            <li>Reading duration and scroll depth improve future recommendations.</li>
            <li>Your session is protected with JWT authentication.</li>
          </ul>
        </div>

        <div className="side-card">
          <h3>
            <TrendingUp size={19} /> Trending News
          </h3>

          {articles.slice(0, 5).map((item, index) => (
            <Link
              to={articlePath(item)}
              className="trend-item"
              key={item.id}
              onClick={() => handleArticleOpen(item)}
            >
              <span>{index + 1}</span>

              <div>
                <strong>{item.title}</strong>
                <p>{item.source}</p>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SafeImage({ src, category, alt }) {
  const fallback = fallbackImage(category);

  return (
    <img
      src={src || fallback}
      alt={alt || "News image"}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = fallback;
      }}
    />
  );
}

export default NewsDetail;
