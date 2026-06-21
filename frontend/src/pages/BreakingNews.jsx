import { useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, TrendingUp } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/api";
import {
  articlePath,
  fallbackImage,
  filterArticles,
  rememberArticleForDetail,
  rememberArticlesForDetail,
} from "../utils/news";
import {
  sortArticlesByPersonalization,
  trackArticleClick,
} from "../utils/personalization";

function BreakingNews() {
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const searchQuery = searchParams.get("q") || "";

  const loadBreakingNews = useCallback(async ({ refresh = false } = {}) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setArticles([]);
      }
      setError("");
      const response = await api.get(
        refresh ? `/api/news?refresh=true&ts=${Date.now()}` : "/api/news"
      );
      const fetchedArticles = response.data.articles || [];

      rememberArticlesForDetail(fetchedArticles);
      setArticles(fetchedArticles);
      setSelectedCategories(response.data.selectedCategories || []);
    } catch (err) {
      setError(err.response?.data?.message || "Breaking news could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadBreakingNews, 0);

    const interval = setInterval(() => {
      loadBreakingNews({ refresh: true });
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [loadBreakingNews]);

  const visibleArticles = sortArticlesByPersonalization(
    filterArticles(articles, searchQuery),
    selectedCategories
  );
  const main = visibleArticles[0];
  const timeline = visibleArticles.slice(1, 5);
  const mostRead = visibleArticles.slice(5, 10);

  const handleArticleOpen = (article) => {
    rememberArticleForDetail(article);
    trackArticleClick(article);
  };

  if (loading) return <div className="state-box">Loading breaking news...</div>;

  return (
    <div className="dashboard-grid">
      <section className="main-content">
        <div className="page-heading">
          <div>
            <h1>Breaking News</h1>
            <p>Follow real-time updates from your personalized news stream.</p>
          </div>

          <button
            className="secondary-btn"
            type="button"
            onClick={() => loadBreakingNews({ refresh: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="live-banner">
          <Radio size={18} />
          <strong>LIVE UPDATES</strong>
          <span>Auto-refreshes every 5 minutes</span>
        </div>

        {error && <div className="state-box error">{error}</div>}
        {refreshing && <div className="state-box">Refreshing breaking news...</div>}

        {searchQuery && !error && (
          <div className="search-status">
            Showing results for <strong>{searchQuery}</strong>
          </div>
        )}

        {!error && visibleArticles.length === 0 && (
          <div className="state-box">No stories match your search.</div>
        )}

        {main && (
          <Link
            to={articlePath(main)}
            className="breaking-hero"
            onClick={() => handleArticleOpen(main)}
          >
            <SafeImage src={main.imageUrl} category={main.category} alt={main.title} />
            <div>
              <span className="red-badge">BREAKING</span>
              <h2>{main.title}</h2>
              <p>{main.description || "Latest update from the selected news categories."}</p>
              <small>{main.source}</small>
            </div>
          </Link>
        )}

        <div className="timeline-list">
          {timeline.map((item, index) => (
            <Link
              to={articlePath(item)}
              className="timeline-item"
              key={item.id}
              onClick={() => handleArticleOpen(item)}
            >
              <div className="timeline-time">
                <span></span>
                <small>{(index + 1) * 8} min ago</small>
              </div>

              <SafeImage src={item.imageUrl} category={item.category} alt={item.title} />

              <div>
                <strong>{item.title}</strong>
                <p>{item.description || "More details are being updated."}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3>
            <TrendingUp size={19} /> Most Read
          </h3>

          {mostRead.map((item, index) => (
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
          <h3>Daily Brief</h3>
          <p>Breaking stories are filtered according to your selected interests.</p>
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

export default BreakingNews;
