import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { useAuth } from "../context/useAuth";

const INITIAL_NEWS_LIMIT = 12;
const NEWS_BATCH_SIZE = 10;

function Home() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [sections, setSections] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [readingProfile, setReadingProfile] = useState(() =>
    getReadingProfile()
  );
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const searchQuery = searchParams.get("q") || "";
  const isAuthenticated = Boolean(user);

  const fetchNews = useCallback(async ({ refresh = false } = {}) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setArticles([]);
        setSections(null);
        setPagination(null);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/api/news", {
        params: {
          offset: 0,
          limit: INITIAL_NEWS_LIMIT,
          refresh: refresh ? "true" : undefined,
          ts: refresh ? Date.now() : undefined,
        },
      });

      const fetchedArticles = response.data.articles || [];

      rememberArticlesForDetail(fetchedArticles);
      setArticles(fetchedArticles);
      setSections(response.data.sections || null);
      setSelectedCategories(response.data.selectedCategories || []);
      setPagination(response.data.pagination || null);
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

  const loadMoreNews = async () => {
    if (loadingMore || !pagination?.hasMore) return;

    try {
      setLoadingMore(true);
      setError("");

      const response = await api.get("/api/news", {
        params: {
          offset: pagination.nextOffset ?? articles.length,
          limit: NEWS_BATCH_SIZE,
        },
      });
      const fetchedArticles = response.data.articles || [];

      rememberArticlesForDetail(fetchedArticles);
      setArticles((currentArticles) => {
        const existingIds = new Set(currentArticles.map((article) => article.id));
        const nextArticles = fetchedArticles.filter(
          (article) => !existingIds.has(article.id)
        );

        return [...currentArticles, ...nextArticles];
      });
      setSections(response.data.sections || sections);
      setSelectedCategories(response.data.selectedCategories || selectedCategories);
      setPagination(response.data.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || "More news could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredArticles = filterArticles(articles, searchQuery);
  const visibleArticles = isAuthenticated
    ? sortArticlesByPersonalization(filteredArticles, selectedCategories)
    : filteredArticles;

  const personalizedArticles = visibleArticles;
  const hasMorePersonalized = Boolean(pagination?.hasMore);

  const trendArticles = filterArticles(
    sections?.trending || visibleArticles.slice(0, 8),
    searchQuery
  );

  const keywordDiscovery = isAuthenticated
    ? buildKeywordDiscoverySection(visibleArticles, {
        limit: 6,
      })
    : null;

  const becauseYouRead = {
    label:
      keywordDiscovery?.label ||
      sections?.becauseYouRead?.label ||
      (isAuthenticated ? "Because You Read" : "More Headlines"),
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

    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }

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

    if (!isAuthenticated) {
      return;
    }

    trackArticleClick(article).then((profile) => {
      if (profile) setReadingProfile(getReadingProfile());
    });

    setReadingProfile(getReadingProfile());
  };

  const recommendationText = (article) =>
    isAuthenticated
      ? getRecommendationReason(article, selectedCategories)
      : "Sign in to personalize stories like this.";

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
            <h3>{isAuthenticated ? "Your Interests" : "Top Headlines"}</h3>
            <p>
              {isAuthenticated
                ? "Your news feed is personalized based on your selected interests."
                : "Read the latest stories now. Sign in to personalize your feed."}
            </p>
          </div>

          {isAuthenticated ? (
            <Link to="/categories" className="edit-btn">
              <SlidersHorizontal size={17} />
              Edit Interests
            </Link>
          ) : (
            <div className="guest-auth-actions">
              <Link
                to="/login"
                className="edit-btn"
                state={{ from: location }}
              >
                Log In
              </Link>
              <Link to="/register" className="primary-btn">
                Sign Up
              </Link>
            </div>
          )}

          <div className="interest-tags">
            {(isAuthenticated ? selectedCategories : ["general"]).map(
              (tag, index) => (
                <span className={index === 0 ? "active" : ""} key={tag}>
                  {categoryLabel(tag)}
                  <Check size={15} />
                </span>
              )
            )}
          </div>
        </div>

        <div className="section-heading-row">
          <SectionTitle
            title={isAuthenticated ? "Personalized For You" : "Latest Headlines"}
          />

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

            {personalizedArticles.length > 0 && (
              <>
                <div className="news-catalog-grid">
                  {personalizedArticles.map((news, index) =>
                    index === 0 && !searchQuery ? (
                      <FeatureStoryCard
                        key={news.id}
                        news={news}
                        bookmarks={bookmarks}
                        onArticleOpen={handleArticleOpen}
                        onBookmark={handleBookmark}
                        recommendationText={recommendationText(news)}
                      />
                    ) : (
                      <NewsListCard
                        key={news.id}
                        news={news}
                        bookmarks={bookmarks}
                        onArticleOpen={handleArticleOpen}
                        onBookmark={handleBookmark}
                        recommendationText={recommendationText(news)}
                      />
                    )
                  )}
                </div>

                {hasMorePersonalized && (
                  <div className="load-more-wrap">
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={loadMoreNews}
                      disabled={loadingMore}
                    >
                      {loadingMore ? "Loading..." : `Show ${NEWS_BATCH_SIZE} more news`}
                    </button>
                  </div>
                )}
              </>
            )}

            <SectionTitle title="Trending" />

            <div className="compact-news-grid">
              {trendArticles.map((news) => (
                <CompactNewsCard
                  key={news.id}
                  news={news}
                  onArticleOpen={handleArticleOpen}
                  recommendationText={recommendationText(news)}
                />
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

            <div className="compact-news-grid">
              {readersLikeYou.slice(0, 8).map((news) => (
                <CompactNewsCard
                  key={news.id}
                  news={news}
                  onArticleOpen={handleArticleOpen}
                  recommendationText={recommendationText(news)}
                />
              ))}
            </div>

            <SectionTitle title="Discover Something New" />

            <div className="popular-grid">
              {discoveryArticles.slice(0, 8).map((news) => (
                <NewsTile
                  key={news.id}
                  news={news}
                  bookmarks={bookmarks}
                  onArticleOpen={handleArticleOpen}
                  onBookmark={handleBookmark}
                  recommendationText={recommendationText(news)}
                />
              ))}
            </div>

          </>
        )}
      </section>

      <aside className="right-sidebar">
        <div className="right-sidebar-inner">
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
            <Bookmark size={19} />{" "}
            {isAuthenticated ? "Personalization Info" : "Member Features"}
          </h3>
          <p>
            {isAuthenticated
              ? "This feed learns from article clicks, keywords, sources, and your selected interests while NewsAPI requests stay protected by the backend cache."
              : "Create an account to save stories, choose categories, and get a personalized feed."}
          </p>
          {isAuthenticated ? (
            <small>Articles read: {readingProfile.totalReads || 0}</small>
          ) : (
            <Link to="/register" className="primary-btn small">
              Sign Up
            </Link>
          )}
        </div>

        <div className="side-card sidebar-topics">
          <h3>
            <Check size={19} /> {isAuthenticated ? "Your Topics" : "General Topics"}
          </h3>

          <div className="interest-keywords">
            {(isAuthenticated && favoriteCategories.length
              ? favoriteCategories
              : isAuthenticated
                ? selectedCategories
                : ["general", "business", "technology", "sports", "health"])
              .slice(0, 5)
              .map((category) => (
                <span key={category}>{categoryLabel(category)}</span>
              ))}

            {isAuthenticated &&
              favoriteKeywords.slice(0, 4).map((keyword) => (
                <span key={keyword}>{formatProfileKeyword(keyword)}</span>
              ))}
          </div>
        </div>

        <div className="side-card sidebar-brief">
          <h3>Latest in Your Feed</h3>

          {personalizedArticles.slice(1, 3).map((item) => (
            <Link
              to={articlePath(item)}
              className="sidebar-brief-item"
              key={item.id}
              onClick={() => handleArticleOpen(item)}
            >
              <SafeImage
                src={item.imageUrl}
                category={item.category}
                alt={item.title}
              />
              <div>
                <small>{categoryLabel(item.category)}</small>
                <strong>{item.title}</strong>
              </div>
            </Link>
          ))}
        </div>

        <div className="side-card sidebar-brief">
          <h3>Discover Picks</h3>

          {discoveryArticles.slice(0, 2).map((item) => (
            <Link
              to={articlePath(item)}
              className="sidebar-brief-item"
              key={item.id}
              onClick={() => handleArticleOpen(item)}
            >
              <SafeImage
                src={item.imageUrl}
                category={item.category}
                alt={item.title}
              />
              <div>
                <small>{item.source}</small>
                <strong>{item.title}</strong>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </aside>
    </div>
  );
}

function NewsTile({
  news,
  bookmarks,
  onArticleOpen,
  onBookmark,
  recommendationText,
}) {
  return (
    <Link
      to={articlePath(news)}
      className="popular-card"
      onClick={() => onArticleOpen(news)}
    >
      <SafeImage
        src={news.imageUrl}
        category={news.category}
        alt={news.title}
      />

      <BookmarkButton news={news} bookmarks={bookmarks} onBookmark={onBookmark} />

      <div>
        <small>
          {categoryLabel(news.category)} · {formatDate(news.publishedAt)}
        </small>

        <h3>{news.title}</h3>

        <p className="match-text">{recommendationText}</p>
      </div>
    </Link>
  );
}

function FeatureStoryCard({
  news,
  bookmarks,
  onArticleOpen,
  onBookmark,
  recommendationText,
}) {
  return (
    <Link
      to={articlePath(news)}
      className="feature-story-card"
      onClick={() => onArticleOpen(news)}
    >
      <SafeImage
        src={news.imageUrl}
        category={news.category}
        alt={news.title}
      />

      <BookmarkButton news={news} bookmarks={bookmarks} onBookmark={onBookmark} />

      <div>
        <small>
          {categoryLabel(news.category)} · {formatDate(news.publishedAt)}
        </small>
        <h3>{news.title}</h3>
        <p>{news.description || recommendationText}</p>
        <span className="match-text">{recommendationText}</span>
      </div>
    </Link>
  );
}

function NewsListCard({
  news,
  bookmarks,
  onArticleOpen,
  onBookmark,
  recommendationText,
}) {
  return (
    <Link
      to={articlePath(news)}
      className="news-list-card"
      onClick={() => onArticleOpen(news)}
    >
      <SafeImage
        src={news.imageUrl}
        category={news.category}
        alt={news.title}
      />

      <BookmarkButton news={news} bookmarks={bookmarks} onBookmark={onBookmark} />

      <div>
        <small>
          {categoryLabel(news.category)} · {formatDate(news.publishedAt)}
        </small>
        <h3>{news.title}</h3>
        <p className="match-text compact">{recommendationText}</p>
      </div>
    </Link>
  );
}

function CompactNewsCard({ news, onArticleOpen, recommendationText }) {
  return (
    <Link
      to={articlePath(news)}
      className="compact-news-card"
      onClick={() => onArticleOpen(news)}
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
        <p className="match-text compact">{recommendationText}</p>
      </div>
    </Link>
  );
}

function BookmarkButton({ news, bookmarks, onBookmark }) {
  const saved = isBookmarked(news.id, bookmarks);

  return (
    <button
      className={`bookmark ${saved ? "saved" : ""}`}
      type="button"
      onClick={(event) => onBookmark(event, news)}
      aria-label={saved ? "Remove bookmark" : "Save bookmark"}
    >
      <Bookmark size={18} />
    </button>
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
