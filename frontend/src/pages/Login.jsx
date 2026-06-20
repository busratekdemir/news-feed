import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "busra@test.com",
    password: "123456",
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
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Giriş yapılırken hata oluştu.");
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

        <h2>Hesabına giriş yap</h2>
        <p>Kişiselleştirilmiş haber akışına devam et.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-posta
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ornek@mail.com"
              required
            />
          </label>

          <label>
            Şifre
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
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <span className="auth-link">
          Hesabın yok mu? <Link to="/register">Kayıt ol</Link>
        </span>
      </section>
    </main>
  );
}

export default Login;
