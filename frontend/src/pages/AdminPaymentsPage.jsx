import { useState } from "react";

export default function AdminPaymentsPage() {
  const [message] = useState(
    "System-wide payments verification/refunds are not exposed in the current backend routes. UI scaffolding is ready."
  );

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>Payments Management</h3>
        <p style={{ color: "#94a3b8" }}>{message}</p>

        <div style={{ marginTop: 14 }} className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Patient</th>
                <th>Amount</th>
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

