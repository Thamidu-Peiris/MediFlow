import { useState } from "react";

export default function AdminNotificationsPage() {
  const [message] = useState(
    "Admin notifications (broadcast announcements) are not wired to backend routes yet. UI scaffolding is ready."
  );

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>Notifications</h3>
        <p style={{ color: "#94a3b8" }}>{message}</p>

        <div style={{ marginTop: 14 }}>
          <div className="pd-form" style={{ gridTemplateColumns: "1fr 200px" }}>
            <input placeholder="Announcement title" />
            <button type="button">Send</button>
          </div>
          <textarea
            placeholder="Write your announcement..."
            style={{ width: "100%", marginTop: 10 }}
          />
        </div>
      </div>
    </section>
  );
}

