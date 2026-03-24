import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await forgotPassword(email);
      setMessage(
        `${res.message}${res.resetToken ? ` (Demo reset token: ${res.resetToken})` : ""}`
      );
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to send reset link");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-chip">Password Recovery</p>
        <h2>Forgot Password</h2>
        <p className="auth-note">Enter your email to receive a reset link.</p>
        {message ? <p className="muted">{message}</p> : null}
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send Reset Link</button>
        </form>
        <p className="auth-note">
          Remembered password? <Link to="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
