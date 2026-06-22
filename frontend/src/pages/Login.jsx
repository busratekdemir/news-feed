import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { useAuth } from "../context/useAuth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon">
            <Newspaper size={24} />
          </div>
          <h1>NewsFeed</h1>
        </div>

        <h2>Sign in to your account</h2>
        <p>Continue to your personalized news feed.</p>

        {location.state?.registered && (
          <div className="auth-success">
            Account created. Please sign in to continue.
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <span className="auth-link">
          Do not have an account? <Link to="/register">Create one</Link>
        </span>
      </section>
    </main>
  );
}

export default Login;
