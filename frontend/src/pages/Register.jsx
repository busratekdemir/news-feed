import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { useAuth } from "../context/useAuth";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
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
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
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

        <h2>Create your account</h2>
        <p>Choose your interests and start a personalized news feed.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Full Name
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Alex Morgan"
              required
            />
          </label>

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
              placeholder="At least 6 characters"
              minLength="6"
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <span className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      </section>
    </main>
  );
}

export default Register;
