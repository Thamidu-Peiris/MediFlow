import { useState } from "react";

export default function AdminReportsPage() {
  const [message] = useState(
    "Reports monitoring across all patients is not available in the current backend routes. This page shows the UI framework for moderation workflow."
  );

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>Reports Monitoring</h3>
        <p style={{ color: "#94a3b8" }}>{message}</p>

        <div style={{ marginTop: 14 }} className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Patient</th>
                <th>Uploaded At</th>
                <th>Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{ color: "#94a3b8" }}>
                  No data to display.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

