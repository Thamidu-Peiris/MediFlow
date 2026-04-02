import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>Settings</h3>
        <p style={{ color: "#94a3b8" }}>Manage your admin profile and system settings (UI scaffolding).</p>

        {message ? <p className="page muted">{message}</p> : null}

        <div className="pd-grid pd-grid-2" style={{ marginTop: 14 }}>
          <div className="pd-card" style={{ margin: 0 }}>
            <h4>Admin Profile</h4>
            <p style={{ marginTop: 6 }}>
              <strong>Name:</strong> {user?.name || "—"}
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Email:</strong> {user?.email || "—"}
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Role:</strong> admin
            </p>
          </div>

          <div className="pd-card" style={{ margin: 0 }}>
            <h4>Change Password</h4>
            <p style={{ color: "#94a3b8", marginTop: 6 }}>
              Backend password change endpoint is not currently connected.
            </p>

            <div className="pd-form" style={{ marginTop: 12 }}>
              <input placeholder="Current password" type="password" />
              <input placeholder="New password" type="password" />
              <input placeholder="Confirm new password" type="password" />
              <button type="button" onClick={() => setMessage("Password change not implemented in the current backend/API.")}>
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

