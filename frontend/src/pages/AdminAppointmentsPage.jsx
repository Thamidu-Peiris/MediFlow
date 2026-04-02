import { useState } from "react";

export default function AdminAppointmentsPage() {
  const [message] = useState(
    "System-wide appointments management is not available in the current backend routes. This page is UI-ready for your SaaS admin panel."
  );

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>Appointments Management</h3>
        <p style={{ color: "#94a3b8" }}>{message}</p>

        <div style={{ marginTop: 14 }} className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
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

