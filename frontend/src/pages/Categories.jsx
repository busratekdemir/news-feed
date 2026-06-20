import { useEffect, useState } from "react";
import { Check, Plus, Save, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const categoryDetails = {
  technology: {
    title: "Technology",
    desc: "AI, software, devices, startups and innovation.",
    icon: "💻",
    image:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=700&h=420&fit=crop",
  },
  business: {
    title: "Business",
    desc: "Markets, companies, economy and finance.",
    icon: "📈",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=700&h=420&fit=crop",
  },
  sports: {
    title: "Sports",
    desc: "Matches, leagues, teams and sport highlights.",
    icon: "⚽",
    image:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=700&h=420&fit=crop",
  },
  science: {
    title: "Science",
    desc: "Space, research, discoveries and future studies.",
    icon: "🔬",
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=700&h=420&fit=crop",
  },
  health: {
    title: "Health",
    desc: "Wellness, medicine, public health and lifestyle.",
    icon: "❤️",
    image:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=700&h=420&fit=crop",
  },
  general: {
    title: "General",
    desc: "World, society, daily headlines and global stories.",
    icon: "🌍",
    image:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=700&h=420&fit=crop",
  },
  entertainment: {
    title: "Entertainment",
    desc: "Movies, culture, celebrities, media and events.",
    icon: "🎬",
    image:
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=700&h=420&fit=crop",
  },
};

function Categories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesResponse = await api.get("/api/news/categories");
      const preferencesResponse = await api.get("/api/user/preferences");

      setCategories(categoriesResponse.data.categories || []);
      setSelected(preferencesResponse.data.preferences || []);
    } catch {
      setMessage("Categories could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    if (selected.includes(category)) {
      if (selected.length === 1) return;
      setSelected(selected.filter((item) => item !== category));
      return;
    }

    setSelected([...selected, category]);
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setMessage("");

      await api.put("/api/user/preferences", {
        preferences: selected,
      });

      setMessage("Your interests have been updated.");
      setTimeout(() => navigate("/"), 800);
    } catch {
      setMessage("Preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="state-box">Loading categories...</div>;
  }

  return (
    <div className="categories-layout">
      <section className="categories-main">
        <div className="page-heading">
          <div>
            <h1>Categories</h1>
            <p>Select your interests to personalize your news feed.</p>
          </div>

          <button
            className="primary-btn"
            onClick={savePreferences}
            disabled={saving}
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save Interests"}
          </button>
        </div>

        {message && <div className="state-box">{message}</div>}

        <div className="selected-strip">
          <strong>Selected Interests</strong>

          <div>
            {selected.map((item) => (
              <span key={item}>
                {categoryDetails[item]?.title || item}
                <Check size={14} />
              </span>
            ))}
          </div>
        </div>

        <div className="category-grid">
          {categories.map((category) => {
            const detail = categoryDetails[category] || {
              title: category,
              desc: "Latest news and updates.",
              icon: "📰",
              image:
                "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=700&h=420&fit=crop",
            };

            const isSelected = selected.includes(category);

            return (
              <button
                key={category}
                className={`category-card ${isSelected ? "selected" : ""}`}
                onClick={() => toggleCategory(category)}
              >
                <img src={detail.image} alt={detail.title} />

                <div className="category-icon">{detail.icon}</div>

                <div className="category-body">
                  <h3>{detail.title}</h3>
                  <p>{detail.desc}</p>
                  <small>{isSelected ? "Selected" : "Click to follow"}</small>
                </div>

                {isSelected && (
                  <div className="category-check">
                    <Check size={18} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="categories-sidebar">
        <div className="side-card selected-list-card">
          <div className="side-title-row">
            <h3>Selected Categories</h3>
            <button onClick={() => setSelected(["general"])}>Reset</button>
          </div>

          <div className="selected-list">
            {selected.map((item) => (
              <div key={item}>
                <span>{categoryDetails[item]?.icon}</span>
                <strong>{categoryDetails[item]?.title || item}</strong>
                <button onClick={() => toggleCategory(item)}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <button className="add-category-btn">
            <Plus size={16} />
            Add category
          </button>
        </div>

        <div className="side-card">
          <h3>
            <Sparkles size={19} /> Personalization
          </h3>
          <p>
            Your homepage and breaking news feed will update based on these
            selected interests.
          </p>

          <button className="primary-btn full" onClick={savePreferences}>
            Save and Update Feed
          </button>
        </div>

        <div className="side-card">
          <h3>Popular Tags</h3>
          <div className="tag-cloud">
            {["#AI", "#Markets", "#Space", "#Health", "#Startups", "#Sports"].map(
              (tag) => (
                <span key={tag}>{tag}</span>
              )
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Categories;