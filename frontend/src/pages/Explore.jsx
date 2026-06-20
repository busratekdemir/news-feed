import { useEffect, useState } from "react";
import { Hash, Sparkles, TrendingUp, Users } from "lucide-react";
import api from "../api/api";

function Explore() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadExplore();
  }, []);

  const loadExplore = async () => {
    const response = await api.get("/api/news");
    setArticles(response.data.articles || []);
    setCategories(response.data.selectedCategories || []);
  };

  const featured = articles.slice(0, 3);
  const today = articles.slice(3, 7);
  const recommended = articles.slice(7, 10);
  const trends = ["#AI", "#Markets", "#Startups", "#Space", "#Sports", "#Health"];

  return (
    <div className="dashboard-grid">
      <section className="main-content">
        <div className="page-heading">
          <div>
            <h1>Explore</h1>
            <p>Discover trending topics, fresh sources and stories tailored to you.</p>
          </div>
        </div>

        <div className="explore-hero-grid">
          {featured.map((item, index) => (
            <article className="explore-hero-card" key={item.id}>
              <img src={item.imageUrl || fallbackImage(item.category)} />
              <span>{index === 0 ? "TREND" : index === 1 ? "FEATURED" : "RECOMMENDED"}</span>
              <h2>{item.title}</h2>
              <p>{item.source}</p>
            </article>
          ))}
        </div>

        <SectionTitle title="Trending Topics" />

        <div className="topic-row">
          {trends.map((trend) => (
            <div className="topic-card" key={trend}>
              <Hash size={22} />
              <strong>{trend}</strong>
              <span>{Math.floor(Math.random() * 9) + 3}.2K stories</span>
            </div>
          ))}
        </div>

        <SectionTitle title="Today’s Highlights" />

        <div className="popular-grid">
          {today.map((item) => (
            <article className="popular-card" key={item.id}>
              <img src={item.imageUrl || fallbackImage(item.category)} />
              <div>
                <small>{item.category} · {item.source}</small>
                <h3>{item.title}</h3>
              </div>
            </article>
          ))}
        </div>

        <SectionTitle title="Recommended For You" />

        <div className="hot-row">
          {recommended.map((item) => (
            <div className="hot-card" key={item.id}>
              <img src={item.imageUrl || fallbackImage(item.category)} />
              <div>
                <small>{item.category}</small>
                <strong>{item.title}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3><TrendingUp size={19} /> Today’s Trends</h3>
          {articles.slice(10, 15).map((item, index) => (
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
          <h3><Sparkles size={19} /> Your Discovery Profile</h3>
          <p>Your explore page is shaped by:</p>
          <div className="source-list">
            {categories.map((cat) => (
              <span key={cat}>{cat}</span>
            ))}
          </div>
        </div>

        <div className="side-card">
          <h3><Users size={19} /> Sources To Follow</h3>
          <p>Follow trusted publishers to improve recommendations.</p>
          <button className="primary-btn small">Follow Sources</button>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ title }) {
  return <h2 className="section-title">{title}</h2>;
}

function fallbackImage(category) {
  const images = {
    technology: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=360&fit=crop",
    business: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=360&fit=crop",
    sports: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=360&fit=crop",
    science: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=360&fit=crop",
    health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=360&fit=crop",
    general: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&h=360&fit=crop",
    entertainment: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&h=360&fit=crop",
  };

  return images[category] || images.general;
}

export default Explore;
