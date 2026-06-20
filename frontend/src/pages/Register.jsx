import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
      setError(err.response?.data?.message || "Kayıt olurken hata oluştu.");
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

        <h2>Yeni hesap oluştur</h2>
        <p>İlgi alanlarını seçerek sana özel haber akışını başlat.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Ad Soyad
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Büşra Tekdemir"
              required
            />
          </label>

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
              placeholder="En az 6 karakter"
              minLength="6"
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button disabled={loading}>
            {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
          </button>
        </form>

        <span className="auth-link">
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </span>
      </section>
    </main>
  );
}

export default Register;
