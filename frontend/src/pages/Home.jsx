import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Check,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import api from "../api/api";
import {
  articlePath,
  categoryLabel,
  fallbackImage,
  filterArticles,
  formatDate,
  getBookmarks,
  isBookmarked,
  rememberArticleForDetail,
  rememberArticlesForDetail,
  toggleBookmark,
} from "../utils/news";
import {
  buildKeywordDiscoverySection,
  getReadingProfile,
  getRecommendationReason,
  recordInteraction,
  sortArticlesByPersonalization,
  trackArticleClick,
} from "../utils/personalization";

function Home() {
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [sections, setSections] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [readingProfile, setReadingProfile] = useState(() =>
    getReadingProfile()
  );
  const [displayCount, setDisplayCount] = useState(24);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const searchQuery = searchParams.get("q") || "";

  const fetchNews = useCallback(async ({ refresh = false } = {}) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setArticles([]);
        setSections(null);
        setDisplayCount(24);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/api/news");

      const fetchedArticles = response.data.articles || [];

      rememberArticlesForDetail(fetchedArticles);
      setArticles(fetchedArticles);
      setSections(response.data.sections || null);
      setSelectedCategories(response.data.selectedCategories || []);
      setReadingProfile(getReadingProfile());
    } catch (err) {
      setError(err.response?.data?.message || "News could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchNews, 0);
    return () => clearTimeout(timeout);
  }, [fetchNews]);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 700;

      if (nearBottom) {
        setDisplayCount((count) => Math.min(count + 12, articles.length));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [articles.length]);

  const visibleArticles = sortArticlesByPersonalization(
    filterArticles(articles, searchQuery),
    selectedCategories
  );

  const personalizedBase = sections?.personalized?.length
    ? sections.personalized
    : visibleArticles;

  const personalizedArticles = sortArticlesByPersonalization(
    filterArticles(personalizedBase, searchQuery),
    selectedCategories
  );

  const mainArticles = personalizedArticles.slice(0, displayCount);

  const trendArticles = filterArticles(
    sections?.trending || visibleArticles.slice(0, 8),
    searchQuery
  );

  const keywordDiscovery = buildKeywordDiscoverySection(visibleArticles, {
    limit: 6,
  });

  const becauseYouRead = {
    label:
      keywordDiscovery?.label ||
      sections?.becauseYouRead?.label ||
      "Because You Read",
    articles:
      keywordDiscovery?.articles ||
      filterArticles(
        sections?.becauseYouRead?.articles || visibleArticles.slice(8, 16),
        searchQuery
      ),
  };

  const readersLikeYou = filterArticles(
    sections?.readersLikeYou?.length
      ? sections.readersLikeYou
      : visibleArticles.slice(16, 24),
    searchQuery
  );

  const discoveryArticles = filterArticles(
    sections?.discovery?.length
      ? sections.discovery
      : visibleArticles.slice(24, 32),
    searchQuery
  );

  const handleBookmark = (event, article) => {
    event.preventDefault();
    event.stopPropagation();

    setBookmarks(toggleBookmark(article));

    recordInteraction(article, {
      eventType: "bookmark",
      bookmarked: true,
    }).then((profile) => {
      if (profile) setReadingProfile(getReadingProfile());
    });
  };

  const handleArticleOpen = (article) => {
    rememberArticleForDetail(article);

    trackArticleClick(article).then((profile) => {
      if (profile) setReadingProfile(getReadingProfile());
    });

    setReadingProfile(getReadingProfile());
  };

  const recommendationText = (article) =>
    getRecommendationReason(article, selectedCategories);

  const favoriteCategories = getTopProfileItems(
    readingProfile.categoryWeights,
    4
  );
  const favoriteKeywords = getTopProfileItems(readingProfile.keywordWeights, 5);

  return (
    <div className="dashboard-grid">
      <section className="main-content">
        <div className="interest-panel">
          <div>
            <h3>Your Interests</h3>
            <p>
              Your news feed is personalized based on your selected interests.
            </p>
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

        <div className="section-heading-row">
          <SectionTitle title="Personalized For You" />

          <button
            className="secondary-btn"
            type="button"
            onClick={() => fetchNews({ refresh: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>

        {(loading || refreshing) && (
          <div className="state-box">Loading news...</div>
        )}

        {error && <div className="state-box error">{error}</div>}

        {!loading && !error && (
          <>
            {searchQuery && (
              <div className="search-status">
                Showing results for <strong>{searchQuery}</strong>
              </div>
            )}

            {personalizedArticles.length === 0 && (
              <div className="state-box">No stories match your search.</div>
            )}

            <div className="popular-grid">
              {mainArticles.map((news) => (
                <Link
                  to={articlePath(news)}
                  className="popular-card"
                  key={news.id}
                  onClick={() => handleArticleOpen(news)}
                >
                  <SafeImage
                    src={news.imageUrl}
                    category={news.category}
                    alt={news.title}
                  />

                  <button
                    className={`bookmark ${
                      isBookmarked(news.id, bookmarks) ? "saved" : ""
                    }`}
                    type="button"
                    onClick={(event) => handleBookmark(event, news)}
                    aria-label={
                      isBookmarked(news.id, bookmarks)
                        ? "Remove bookmark"
                        : "Save bookmark"
                    }
                  >
                    <Bookmark size={18} />
                  </button>

                  <div>
                    <small>
                      {categoryLabel(news.category)} ·{" "}
                      {formatDate(news.publishedAt)}
                    </small>

                    <h3>{news.title}</h3>

                    <p className="match-text">{recommendationText(news)}</p>
                  </div>
                </Link>
              ))}
            </div>

            <SectionTitle title="Trending" />

            <div className="hot-row">
              {trendArticles.slice(0, 8).map((news) => (
                <Link
                  to={articlePath(news)}
                  className="hot-card"
                  key={news.id}
                  onClick={() => handleArticleOpen(news)}
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
                    <p className="match-text compact">
                      {recommendationText(news)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="bottom-grid">
              <div className="wide-panel">
                <SectionTitle title={becauseYouRead.label} />

                <div className="mini-news-grid">
                  {becauseYouRead.articles.slice(0, 6).map((news) => (
                    <Link
                      to={articlePath(news)}
                      className="mini-news"
                      key={news.id}
                      onClick={() => handleArticleOpen(news)}
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
                      <p>{recommendationText(news)}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="summary-panel">
                <SectionTitle title="Interest Profile" />

                <ul>
                  {(favoriteCategories.length ? favoriteCategories : selectedCategories)
                    .slice(0, 4)
                    .map((category) => (
                      <li key={category}>
                        <strong>{categoryLabel(category)}</strong>
                        <span>
                          Ranking uses your recent and long-term reading
                          behavior.
                        </span>
                      </li>
                    ))}
                </ul>

                {favoriteKeywords.length > 0 && (
                  <div className="interest-keywords">
                    {favoriteKeywords.map((keyword) => (
                      <span key={keyword}>{formatProfileKeyword(keyword)}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <SectionTitle title="Readers Like You" />

            <div className="hot-row">
              {readersLikeYou.slice(0, 8).map((news) => (
                <Link
                  to={articlePath(news)}
                  className="hot-card"
                  key={news.id}
                  onClick={() => handleArticleOpen(news)}
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
                    <p className="match-text compact">
                      {recommendationText(news)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <SectionTitle title="Discover Something New" />

            <div className="popular-grid">
              {discoveryArticles.slice(0, 8).map((news) => (
                <Link
                  to={articlePath(news)}
                  className="popular-card"
                  key={news.id}
                  onClick={() => handleArticleOpen(news)}
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
                    <h3>{news.title}</h3>
                    <p className="match-text">{recommendationText(news)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {displayCount < personalizedArticles.length && (
              <div className="load-more-wrap">
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => setDisplayCount((count) => count + 12)}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <aside className="right-sidebar">
        <div className="side-card">
          <h3>
            <TrendingUp size={19} /> Trending News
          </h3>

          {trendArticles.map((item, index) => (
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

        <div className="side-card saved-card">
          <h3>
            <Bookmark size={19} /> Personalization Info
          </h3>
          <p>
            This feed learns from article clicks, keywords, sources, and your
            selected interests while NewsAPI requests stay protected by the
            backend cache.
          </p>
          <small>
            Articles read: {readingProfile.totalReads || 0}
          </small>
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

function getTopProfileItems(weights = {}, limit = 5) {
  return Object.entries(weights || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function formatProfileKeyword(keyword) {
  const specialCases = {
    ai: "AI",
    openai: "OpenAI",
    iphone: "iPhone",
    ipad: "iPad",
    ios: "iOS",
    macos: "macOS",
    us: "US",
    uk: "UK",
  };

  return (
    specialCases[keyword] ||
    keyword.replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export default Home;
