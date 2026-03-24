import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    try {
      const res = await resetPassword(token, password);
      setMessage(res.message || "Password reset successful");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-chip">Security</p>
        <h2>Reset Password</h2>
        {message ? <p className="muted">{message}</p> : null}
        <form onSubmit={onSubmit}>
          <input
            placeholder="Reset token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit">Reset Password</button>
        </form>
        <p className="auth-note">
          Return to <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
