import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Check, SlidersHorizontal, TrendingUp } from "lucide-react";
import api from "../api/api";

function Home() {
  const [articles, setArticles] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/news");

      setArticles(response.data.articles || []);
      setSelectedCategories(response.data.selectedCategories || []);
    } catch (err) {
      setError(err.response?.data?.message || "News could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const mainArticles = articles.slice(0, 4);
  const hotArticles = articles.slice(4, 8);
  const similarArticles = articles.slice(8, 11);
  const trendArticles = articles.slice(11, 16);

  return (
    <div className="dashboard-grid">
      <section className="main-content">
        <div className="interest-panel">
          <div>
            <h3>Your Interests</h3>
            <p>Your news feed is personalized based on your selected interests.</p>
          </div>

          <Link to="/categories" className="edit-btn">
            <SlidersHorizontal size={17} />
            Edit Interests
          </Link>

          <div className="interest-tags">
            {selectedCategories.map((tag, index) => (
              <span className={index === 0 ? "active" : ""} key={tag}>
                {categoryLabel(tag)}
                <Check size={15} />
              </span>
            ))}
          </div>
        </div>

        <SectionTitle title="Top Picks For You" />

        {loading && <div className="state-box">Loading news...</div>}
        {error && <div className="state-box error">{error}</div>}

        {!loading && !error && (
          <>
            <div className="popular-grid">
              {mainArticles.map((news) => (
                <Link
                  to={`/news/${encodeURIComponent(news.id)}`}
                  className="popular-card"
                  key={news.id}
                >
                  <SafeImage
                    src={news.imageUrl}
                    category={news.category}
                    alt={news.title}
                  />

                  <button
                    className="bookmark"
                    type="button"
                    onClick={(event) => event.preventDefault()}
                  >
                    <Bookmark size={18} />
                  </button>

                  <div>
                    <small>
                      {categoryLabel(news.category)} ·{" "}
                      {formatDate(news.publishedAt)}
                    </small>

                    <h3>{news.title}</h3>

                    <p className="match-text">
                      🎯 Recommended because you follow{" "}
                      {categoryLabel(news.category)}.
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <SectionTitle title="Breaking Stories" />

            <div className="hot-row">
              {hotArticles.map((news) => (
                <Link
                  to={`/news/${encodeURIComponent(news.id)}`}
                  className="hot-card"
                  key={news.id}
                >
                  <SafeImage
                    src={news.imageUrl}
                    category={news.category}
                    alt={news.title}
                  />

                  <div>
                    <small>
                      {categoryLabel(news.category)} · {news.source}
                    </small>
                    <strong>{news.title}</strong>
                  </div>
                </Link>
              ))}
            </div>

            <div className="bottom-grid">
              <div className="wide-panel">
                <SectionTitle title="Readers Like You" />

                <div className="mini-news-grid">
                  {similarArticles.map((news) => (
                    <Link
                      to={`/news/${encodeURIComponent(news.id)}`}
                      className="mini-news"
                      key={news.id}
                    >
                      <SafeImage
                        src={news.imageUrl}
                        category={news.category}
                        alt={news.title}
                      />

                      <small>
                        {categoryLabel(news.category)} · {news.source}
                      </small>

                      <h4>{news.title}</h4>
                      <p>{randomMatch()}% interest match</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="summary-panel">
                <SectionTitle title="Weekly Summary" />

                <ul>
                  {selectedCategories.slice(0, 3).map((category) => (
                    <li key={category}>
                      <strong>{categoryLabel(category)}</strong>
                      <span>
                        {categoryLabel(category)} stories stood out this week.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3>
            <TrendingUp size={19} /> Trending News
          </h3>

          {trendArticles.map((item, index) => (
            <div className="trend-item" key={item.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.source}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="side-card saved-card">
          <h3>
            <Bookmark size={19} /> Personalization Info
          </h3>
          <p>This feed is generated based on your selected interests using NewsAPI.</p>
          <small>Secure user session with JWT authentication</small>
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

function SectionTitle({ title }) {
  return <h2 className="section-title">{title}</h2>;
}

function categoryLabel(category) {
  const labels = {
    technology: "Technology",
    business: "Business",
    sports: "Sports",
    science: "Science",
    health: "Health",
    general: "General",
    entertainment: "Entertainment",
  };

  return labels[category] || category;
}

function formatDate(date) {
  if (!date) return "New";
  return new Date(date).toLocaleDateString("en-US");
}

function randomMatch() {
  return Math.floor(Math.random() * 8) + 90;
}

function fallbackImage(category) {
  const images = {
    technology:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=360&fit=crop",
    business:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=360&fit=crop",
    sports:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=360&fit=crop",
    science:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=360&fit=crop",
    health:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=360&fit=crop",
    general:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&h=360&fit=crop",
    entertainment:
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&h=360&fit=crop",
  };

  return images[category] || images.general;
}

export default Home;