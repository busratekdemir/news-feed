import { useEffect, useState } from "react";
import { Bookmark, Share2, Sparkles, TrendingUp } from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../api/api";

function NewsDetail() {
  const { id } = useParams();
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    const response = await api.get("/api/news");
    const list = response.data.articles || [];

    setArticles(list);
    setArticle(list.find((item) => encodeURIComponent(item.id) === id) || list[0]);
    setLoading(false);
  };

  if (loading) return <div className="state-box">Loading article...</div>;
  if (!article) return <div className="state-box">Article not found.</div>;

  const related = articles
    .filter((item) => item.id !== article.id)
    .slice(0, 3);

  return (
    <div className="dashboard-grid">
      <article className="article-detail">
        <div className="breadcrumb">Home / {article.category} / Article Detail</div>

        <span className="detail-category">{article.category}</span>

        <h1>{article.title}</h1>

        <p className="detail-description">
          {article.description || "This article is part of your personalized news feed."}
        </p>

        <div className="article-meta">
          <span>{article.source}</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span>5 min read</span>
        </div>

        <div className="detail-actions">
          <button>
            <Bookmark size={17} />
            Save
          </button>
          <button>
            <Share2 size={17} />
            Share
          </button>
        </div>

        <SafeImage src={article.imageUrl} category={article.category} alt={article.title} />

        <p>
          {article.content ||
            article.description ||
            "The full article can be read from the original source. This detail page summarizes the story and presents related personalized recommendations."}
        </p>

        <blockquote>
          Personalized recommendations help users discover more relevant stories based on their interests.
        </blockquote>

        <div className="article-tags">
          <span>{article.category}</span>
          <span>Personalized</span>
          <span>NewsAPI</span>
        </div>

        <h2 className="section-title">Related Stories</h2>

        <div className="popular-grid related-grid">
          {related.map((item) => (
            <article className="popular-card" key={item.id}>
              <SafeImage src={item.imageUrl} category={item.category} alt={item.title} />
              <div>
                <small>{item.category} · {item.source}</small>
                <h3>{item.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </article>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3>
            <Sparkles size={19} /> Quick Summary
          </h3>
          <ul className="quick-summary">
            <li>This story matches your selected interests.</li>
            <li>It was fetched from NewsAPI through the backend.</li>
            <li>Your session is protected with JWT authentication.</li>
          </ul>
        </div>

        <div className="side-card">
          <h3>
            <TrendingUp size={19} /> Trending News
          </h3>

          {articles.slice(0, 5).map((item, index) => (
            <div className="trend-item" key={item.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.source}</p>
              </div>
            </div>
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

function formatDate(date) {
  if (!date) return "New";
  return new Date(date).toLocaleDateString("en-US");
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

export default NewsDetail;
