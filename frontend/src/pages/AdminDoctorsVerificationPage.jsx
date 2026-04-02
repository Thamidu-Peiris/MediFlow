import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminDoctorsVerificationPage() {
  const { authHeaders } = useAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.get("/auth/admin/users", authHeaders);
      setUsers(res.data.users || []);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const pendingDoctors = useMemo(
    () => users.filter((u) => u.role === "doctor" && !u.isDoctorVerified),
    [users]
  );

  const verifyDoctor = async (id, verified) => {
    try {
      setMessage("");
      await api.patch(`/auth/admin/doctors/${id}/verify`, { verified }, authHeaders);
      await loadUsers();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update doctor verification");
    }
  };

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>Doctors Verification</h3>
        <p style={{ color: "#94a3b8", marginBottom: 14 }}>
          Approve or reject pending doctor registrations.
        </p>

        {loading ? <p className="page muted">Loading...</p> : null}
        {message ? <p className="page muted">{message}</p> : null}

        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingDoctors.map((doc) => (
                <tr key={doc._id}>
                  <td style={{ fontWeight: 900 }}>{doc.name}</td>
                  <td>{doc.email}</td>
                  <td>
                    <span style={{ color: "#ef4444", fontWeight: 800 }}>Pending</span>
                  </td>
                  <td>
                    <div className="pd-actions">
                      <button type="button" onClick={() => verifyDoctor(doc._id, true)}>
                        Approve
                      </button>
                      <button type="button" onClick={() => verifyDoctor(doc._id, false)}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && pendingDoctors.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "#94a3b8" }}>
                    No pending doctor verifications.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

