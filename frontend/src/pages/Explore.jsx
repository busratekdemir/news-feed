import { useCallback, useEffect, useState } from "react";
import { Hash, Sparkles, TrendingUp, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/api";
import {
  articlePath,
  categoryLabel,
  fallbackImage,
  filterArticles,
  rememberArticleForDetail,
  rememberArticlesForDetail,
} from "../utils/news";
import {
  getRecommendationReason,
  sortArticlesByPersonalization,
  trackArticleClick,
} from "../utils/personalization";

const trends = [
  { tag: "#AI", count: "8.2K" },
  { tag: "#Markets", count: "6.4K" },
  { tag: "#Startups", count: "5.8K" },
  { tag: "#Space", count: "4.9K" },
  { tag: "#Sports", count: "7.1K" },
  { tag: "#Health", count: "3.6K" },
];

function Explore() {
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchQuery = searchParams.get("q") || "";

  const loadExplore = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/news", {
        params: {
          offset: 0,
          limit: 24,
        },
      });
      const fetchedArticles = response.data.articles || [];

      rememberArticlesForDetail(fetchedArticles);
      setArticles(fetchedArticles);
      setCategories(response.data.selectedCategories || []);
    } catch (err) {
      setError(err.response?.data?.message || "Explore stories could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadExplore, 0);
    return () => clearTimeout(timeout);
  }, [loadExplore]);

  const visibleArticles = sortArticlesByPersonalization(
    filterArticles(articles, searchQuery),
    categories
  );
  const featured = visibleArticles.slice(0, 3);
  const today = visibleArticles.slice(3, 7);
  const recommended = visibleArticles.slice(7, 10);

  const handleArticleOpen = (article) => {
    rememberArticleForDetail(article);
    trackArticleClick(article);
  };

  return (
    <div className="dashboard-grid">
      <section className="main-content">
        <div className="page-heading">
          <div>
            <h1>Explore</h1>
            <p>Discover trending topics, fresh sources and stories tailored to you.</p>
          </div>
        </div>

        {loading && <div className="state-box">Loading explore stories...</div>}
        {error && <div className="state-box error">{error}</div>}

        {!loading && !error && (
          <>
            {searchQuery && (
              <div className="search-status">
                Showing results for <strong>{searchQuery}</strong>
              </div>
            )}

            {visibleArticles.length === 0 && (
              <div className="state-box">No stories match your search.</div>
            )}

            <div className="explore-hero-grid">
              {featured.map((item, index) => (
                <Link
                  to={articlePath(item)}
                  className="explore-hero-card"
                  key={item.id}
                  onClick={() => handleArticleOpen(item)}
                >
                  <SafeImage src={item.imageUrl} category={item.category} alt={item.title} />
                  <span>{index === 0 ? "TREND" : index === 1 ? "FEATURED" : "RECOMMENDED"}</span>
                  <h2>{item.title}</h2>
                  <p>{getRecommendationReason(item, categories)}</p>
                </Link>
              ))}
            </div>

            <SectionTitle title="Trending Topics" />

            <div className="topic-row">
              {trends.map((trend) => (
                <div className="topic-card" key={trend.tag}>
                  <Hash size={22} />
                  <strong>{trend.tag}</strong>
                  <span>{trend.count} stories</span>
                </div>
              ))}
            </div>

            <SectionTitle title="Today's Highlights" />

            <div className="popular-grid">
              {today.map((item) => (
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
                      {getRecommendationReason(item, categories)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <SectionTitle title="Recommended For You" />

            <div className="hot-row">
              {recommended.map((item) => (
                <Link
                  to={articlePath(item)}
                  className="hot-card"
                  key={item.id}
                  onClick={() => handleArticleOpen(item)}
                >
                  <SafeImage src={item.imageUrl} category={item.category} alt={item.title} />
                  <div>
                    <small>{categoryLabel(item.category)}</small>
                    <strong>{item.title}</strong>
                    <p className="match-text compact">
                      {getRecommendationReason(item, categories)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3><TrendingUp size={19} /> Today's Trends</h3>
          {visibleArticles.slice(10, 15).map((item, index) => (
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

        <div className="side-card">
          <h3><Sparkles size={19} /> Your Discovery Profile</h3>
          <p>Your explore page is shaped by:</p>
          <div className="source-list">
            {categories.map((cat) => (
              <span key={cat}>{categoryLabel(cat)}</span>
            ))}
          </div>
        </div>

        <div className="side-card">
          <h3><Users size={19} /> Sources To Follow</h3>
          <p>Follow trusted publishers to improve recommendations.</p>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ title }) {
  return <h2 className="section-title">{title}</h2>;
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

export default Explore;
