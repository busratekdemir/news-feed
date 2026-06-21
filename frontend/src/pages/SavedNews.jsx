import { useState } from "react";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  articlePath,
  categoryLabel,
  fallbackImage,
  formatDate,
  getBookmarks,
  rememberArticleForDetail,
  toggleBookmark,
} from "../utils/news";

function SavedNews() {
  const [savedArticles, setSavedArticles] = useState(() =>
    getSortedBookmarks()
  );

  const handleOpen = (article) => {
    rememberArticleForDetail(article);
  };

  const handleRemove = (article) => {
    toggleBookmark(article);
    setSavedArticles(getSortedBookmarks());
  };

  return (
    <section className="main-content">
      <div className="page-heading">
        <div>
          <h1>Saved News</h1>
          <p>Your bookmarked stories stay here even when the live feed refreshes.</p>
        </div>
      </div>

      {savedArticles.length === 0 && (
        <div className="state-box">
          <Bookmark size={18} /> No saved articles yet.
        </div>
      )}

      <div className="popular-grid saved-news-grid">
        {savedArticles.map((article) => (
          <article
            className="popular-card"
            key={article.id}
          >
            <img
              src={article.imageUrl || fallbackImage(article.category)}
              alt={article.title}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackImage(article.category);
              }}
            />
            <div>
              <small>
                {categoryLabel(article.category)} · {article.source} ·{" "}
                {formatDate(article.publishedAt)}
              </small>

              <h3>{article.title}</h3>

              <p>{article.description || "Saved article from your news feed."}</p>

              {article.url && (
                <span className="external-note">
                  <ExternalLink size={14} /> Saved {formatDate(article.savedAt)}
                </span>
              )}

              <div className="saved-actions">
                <Link
                  to={articlePath(article)}
                  className="primary-btn"
                  onClick={() => handleOpen(article)}
                >
                  Open detail
                </Link>

                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => handleRemove(article)}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getSortedBookmarks() {
  return getBookmarks().sort(
    (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
  );
}

export default SavedNews;
