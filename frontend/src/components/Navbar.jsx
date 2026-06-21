import { ChevronDown, Search, Newspaper, Bookmark } from "lucide-react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";

function Navbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

        <Link
          to="/saved"
          className="notification"
          title="Saved news"
          aria-label="Saved news"
        >
          <Bookmark size={21} />
        </Link>

        <div className="profile">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop"
            alt="Profile"
          />
          <strong>Büşra</strong>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
