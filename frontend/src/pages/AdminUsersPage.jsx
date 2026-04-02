import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminUsersPage() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notSupported = () => setMessage("This action is not implemented in the current backend/API.");

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>User Management</h3>
        <p style={{ color: "#94a3b8", marginBottom: 14 }}>
          View/edit/delete/block UI scaffolding. Backend currently supports listing users + doctor verification.
        </p>

        {loading ? <p className="page muted">Loading...</p> : null}
        {message ? <p className="page muted">{message}</p> : null}

        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Doctor Verified</th>
                <th style={{ width: 280 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td style={{ fontWeight: 800 }}>{item.role}</td>
                  <td>{item.role === "doctor" ? (item.isDoctorVerified ? "Yes" : "No") : "-"}</td>
                  <td>
                    <div className="pd-actions">
                      <button type="button" onClick={notSupported}>
                        View
                      </button>
                      <button type="button" onClick={notSupported}>
                        Edit
                      </button>
                      <button type="button" onClick={notSupported}>
                        Delete
                      </button>
                      <button type="button" onClick={notSupported}>
                        Block / Unblock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "#94a3b8" }}>
                    No users found.
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

