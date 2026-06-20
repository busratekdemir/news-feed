import { Bell, ChevronDown, Search, Newspaper } from "lucide-react";
import { NavLink } from "react-router-dom";

function Navbar() {
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
        <div className="search-box">
          <Search size={18} />
          <input placeholder="Search news..." />
        </div>

        <div className="notification">
          <Bell size={21} />
          <span>3</span>
        </div>

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