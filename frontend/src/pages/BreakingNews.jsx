import { useEffect, useState } from "react";
import { Bell, Radio, Share2, TrendingUp } from "lucide-react";
import api from "../api/api";

function BreakingNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBreakingNews();

    const interval = setInterval(() => {
      loadBreakingNews();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadBreakingNews = async () => {
    try {
      const response = await api.get("/api/news");
      setArticles(response.data.articles || []);
    } finally {
      setLoading(false);
    }
  };

  const main = articles[0];
  const timeline = articles.slice(1, 5);
  const mostRead = articles.slice(5, 10);

  if (loading) return <div className="state-box">Loading breaking news...</div>;

  return (
    <div className="dashboard-grid">
      <section className="main-content">
        <div className="page-heading">
          <div>
            <h1>Breaking News</h1>
            <p>Follow real-time updates from your personalized news stream.</p>
          </div>

          <button className="primary-btn">
            <Bell size={17} />
            Enable Alerts
          </button>
        </div>

        <div className="live-banner">
          <Radio size={18} />
          <strong>LIVE UPDATES</strong>
          <span>Auto-refreshes every 5 minutes</span>
        </div>

        {main && (
          <article className="breaking-hero">
            <SafeImage src={main.imageUrl} category={main.category} alt={main.title} />
            <div>
              <span className="red-badge">BREAKING</span>
              <h2>{main.title}</h2>
              <p>{main.description || "Latest update from the selected news categories."}</p>
              <small>{main.source}</small>
              <button>
                <Share2 size={16} />
                Share
              </button>
            </div>
          </article>
        )}

        <div className="timeline-list">
          {timeline.map((item, index) => (
            <article className="timeline-item" key={item.id}>
              <div className="timeline-time">
                <span></span>
                <small>{(index + 1) * 8} min ago</small>
              </div>

              <SafeImage src={item.imageUrl} category={item.category} alt={item.title} />

              <div>
                <strong>{item.title}</strong>
                <p>{item.description || "More details are being updated."}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3>
            <TrendingUp size={19} /> Most Read
          </h3>

          {mostRead.map((item, index) => (
            <div className="trend-item" key={item.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.source}</p>
              </div>
            </div>
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

export default BreakingNews;