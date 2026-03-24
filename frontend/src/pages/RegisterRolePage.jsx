import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterRolePage() {
  const { role } = useParams();
  const selectedRole = useMemo(() => (role === "doctor" ? "doctor" : "patient"), [role]);
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await register({ ...form, role: selectedRole });
      if (user.role === "patient") navigate("/patient/dashboard");
      else navigate("/doctors");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-chip">{selectedRole === "patient" ? "Patient Account" : "Doctor Account"}</p>
        <h2>Create {selectedRole} account</h2>
        {message ? <p className="error">{message}</p> : null}
        <form onSubmit={onSubmit}>
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
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
          <button type="submit">Create Account</button>
        </form>
        <p className="auth-note">
          Need other account type? <Link to="/register">Switch registration option</Link>
        </p>
      </section>
    </main>
  );
}
