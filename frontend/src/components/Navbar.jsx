import { LogIn, LogOut, Search, Newspaper, Bookmark, UserPlus } from "lucide-react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";

function Navbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (event) => {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      navigate("/");
      return;
    }

    navigate(`/?q=${encodeURIComponent(trimmed)}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const displayName = user?.name || user?.email || "User";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-icon">
          <Newspaper size={22} />
        </div>
        <span>
          News<span>Feed</span>
        </span>
      </div>

      <nav className="nav-menu">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/breaking">Breaking News</NavLink>
        <NavLink to="/categories">Categories</NavLink>
        <NavLink to="/explore">Explore</NavLink>
      </nav>

      <div className="nav-right">
        <form className="search-box" onSubmit={handleSearch}>
          <Search size={18} />
          <input
            placeholder="Search news..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        {user ? (
          <>
            <Link
              to="/saved"
              className="notification"
              title="Saved news"
              aria-label="Saved news"
            >
              <Bookmark size={21} />
            </Link>

            <div className="profile">
              <span className="profile-avatar" aria-hidden="true">
                {initial}
              </span>
              <strong>{displayName}</strong>
            </div>

            <button
              className="nav-auth-btn secondary"
              type="button"
              onClick={handleLogout}
            >
              <LogOut size={17} />
              Log Out
            </button>
          </>
        ) : (
          <div className="nav-auth-actions">
            <Link to="/login" className="nav-auth-btn secondary">
              <LogIn size={17} />
              Log In
            </Link>
            <Link to="/register" className="nav-auth-btn">
              <UserPlus size={17} />
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
