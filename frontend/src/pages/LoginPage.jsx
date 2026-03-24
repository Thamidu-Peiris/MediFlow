import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate("/doctors");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <main className="page">
      <section className="form-card">
        <h2>Login</h2>
        {message ? <p className="error">{message}</p> : null}
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p className="muted">
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
