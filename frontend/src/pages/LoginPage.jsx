import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", role: "patient" });
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await login(form.email, form.password, form.role);
      if (loggedInUser.role === "patient") {
        navigate("/patient/dashboard");
      } else {
        navigate("/doctors");
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-chip">Welcome Back</p>
        <h2>Login to MediFlow</h2>
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
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            required
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
          <div className="auth-row">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          <button type="submit">Login</button>
        </form>
        <p className="auth-note">
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
