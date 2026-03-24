import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboardPage() {
  const { authHeaders, user, logout } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [overviewRes, usersRes] = await Promise.all([
        api.get("/auth/admin/overview", authHeaders),
        api.get("/auth/admin/users", authHeaders)
      ]);
      setMetrics(overviewRes.data.metrics);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load admin data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const verifyDoctor = async (id, verified) => {
    try {
      await api.patch(`/auth/admin/doctors/${id}/verify`, { verified }, authHeaders);
      loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update doctor verification");
    }
  };

  return (
    <main className="pd-page">
      <header className="pd-topbar">
        <div className="pd-brand">
          <h1>MediFlow Admin Dashboard</h1>
          <p>Manage users, doctor verification and platform overview</p>
        </div>
        <div className="pd-topbar-actions">
          <span>{user?.name || user?.email}</span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {message ? <p className="page muted">{message}</p> : null}

      <section className="pd-layout-admin">
        <div className="pd-grid pd-grid-4">
          <article className="pd-card">
            <h4>Total Users</h4>
            <p>{metrics?.totalUsers ?? 0}</p>
          </article>
          <article className="pd-card">
            <h4>Pending Doctor Verifications</h4>
            <p>{metrics?.pendingDoctorVerifications ?? 0}</p>
          </article>
          <article className="pd-card">
            <h4>Financial Transactions Today</h4>
            <p>{metrics?.financialTransactionsToday ?? 0}</p>
          </article>
          <article className="pd-card">
            <h4>Gross Revenue (LKR)</h4>
            <p>{metrics?.grossRevenueLkr ?? 0}</p>
          </article>
        </div>

        <article className="pd-card">
          <h3>User Account Management</h3>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Doctor Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>{item.role === "doctor" ? (item.isDoctorVerified ? "Yes" : "No") : "-"}</td>
                    <td>
                      {item.role === "doctor" ? (
                        <div className="pd-actions">
                          <button type="button" onClick={() => verifyDoctor(item._id, true)}>
                            Verify
                          </button>
                          <button type="button" onClick={() => verifyDoctor(item._id, false)}>
                            Revoke
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
