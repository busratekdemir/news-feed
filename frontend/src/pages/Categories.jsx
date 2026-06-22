import { useCallback, useEffect, useState } from "react";
import { Check, Lock, Save, Sparkles, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/useAuth";

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

const fallbackCategories = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
];

function Categories() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const isAuthenticated = Boolean(user);

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    let nextCategories;

    try {
      setMessage("");
      const categoriesResponse = await api.get("/api/news/categories");

      nextCategories = categoriesResponse.data.categories?.length
        ? categoriesResponse.data.categories
        : fallbackCategories;
    } catch {
      nextCategories = fallbackCategories;
    }

    setCategories(nextCategories);

    if (!isAuthenticated) {
      setSelected(["general"]);
      setLoading(false);
      return;
    }

    try {
      const preferencesResponse = await api.get("/api/user/preferences");
      setSelected(preferencesResponse.data.preferences || ["general"]);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.message || "Preferences could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timeout = setTimeout(loadCategories, 0);
    return () => clearTimeout(timeout);
  }, [loadCategories]);

  const toggleCategory = (category) => {
    if (!isAuthenticated) {
      setMessageType("info");
      setMessage("Please log in to select and save categories.");
      return;
    }

    if (selected.includes(category)) {
      if (selected.length === 1) return;
      setSelected(selected.filter((item) => item !== category));
      return;
    }

    setSelected([...selected, category]);
  };

  const savePreferences = async () => {
    if (!isAuthenticated) {
      setMessageType("info");
      setMessage("Please log in to save your category preferences.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await api.put("/api/user/preferences", {
        preferences: selected,
      });

      updateUser(response.data.user);
      setMessageType("success");
      setMessage("Your interests have been updated.");
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.message || "Preferences could not be saved.");
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
            <p>
              {isAuthenticated
                ? "Select your interests to personalize your news feed."
                : "Browse available categories. Log in to save your interests."}
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={savePreferences}
            disabled={saving || !isAuthenticated}
          >
            {isAuthenticated ? <Save size={17} /> : <Lock size={17} />}
            {saving ? "Saving..." : "Save Interests"}
          </button>
        </div>

        {!isAuthenticated && (
          <div className="state-box info auth-required-box">
            <div>
              <strong>Log in to personalize your feed.</strong>
              <span>
                Categories are visible to everyone, but saving interests and
                updating your personalized feed requires an account.
              </span>
            </div>

            <div>
              <Link
                to="/login"
                className="primary-btn"
                state={{ from: location }}
              >
                Log In
              </Link>
              <Link to="/register" className="secondary-btn">
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {message && <div className={`state-box ${messageType}`}>{message}</div>}

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
                  <small>
                    {isAuthenticated
                      ? isSelected
                        ? "Selected"
                        : "Click to follow"
                      : "Log in to follow"}
                  </small>
                </div>

                {isAuthenticated && isSelected && (
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
            <button
              onClick={() => setSelected(["general"])}
              disabled={!isAuthenticated}
            >
              Reset
            </button>
          </div>

          <p className="sidebar-note">
            {isAuthenticated
              ? `${selected.length} of ${categories.length} categories selected.`
              : "Log in to choose the categories that shape your feed."}
          </p>

          <div className="selected-list">
            {(isAuthenticated ? selected : ["general"]).map((item) => (
              <div key={item}>
                <span>{categoryDetails[item]?.icon}</span>
                <strong>{categoryDetails[item]?.title || item}</strong>
                <button
                  onClick={() => toggleCategory(item)}
                  disabled={!isAuthenticated}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="side-card">
          <h3>
            <Sparkles size={19} /> Personalization
          </h3>
          <p>
            {isAuthenticated
              ? "Your homepage and breaking news feed will update based on these selected interests."
              : "Log in to turn these categories into a personalized homepage and breaking news feed."}
          </p>

          <button
            className="primary-btn full"
            onClick={savePreferences}
            disabled={saving || !isAuthenticated}
          >
            {saving
              ? "Saving..."
              : isAuthenticated
                ? "Save and Update Feed"
                : "Log in to Save Interests"}
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
