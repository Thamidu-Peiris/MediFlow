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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) + " • " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const pendingDoctors = useMemo(
    () => users.filter((u) => u.role === "doctor" && !u.isDoctorVerified),
    [users]
  );

  const totalDoctors = useMemo(() => users.filter(u => u.role === 'doctor').length, [users]);

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
    <div className="font-body text-on-surface pb-10">
      {message ? (
        <p className="mb-4 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm font-medium border border-red-100">{message}</p>
      ) : null}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Doctors Verification</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      {/* Bento metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">medical_services</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Doctors</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{totalDoctors}</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold">Registered specialists</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-red-600 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg ring-1 ring-red-100">
              <span className="material-symbols-outlined text-red-700">pending_actions</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Pending Verifications</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-red-600">{pendingDoctors.length}</div>
          <div className="mt-2 text-xs text-red-500 font-semibold">Awaiting review</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/50">
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Doctor Name</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Email</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Status</th>
              <th className="text-right p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {pendingDoctors.map((doc) => (
              <tr key={doc._id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-semibold text-on-surface">{doc.name}</td>
                <td className="p-4 text-on-surface-variant font-medium">{doc.email}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    <span className="material-symbols-outlined text-[16px]">schedule</span> PENDING
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                      onClick={() => verifyDoctor(doc._id, true)}
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span> Approve
                    </button>
                    <button
                      type="button"
                      className="px-4 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition-all active:scale-95 flex items-center gap-1"
                      onClick={() => verifyDoctor(doc._id, false)}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && pendingDoctors.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-on-surface-variant font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-5xl opacity-20">verified_user</span>
                    <p>No pending doctor registrations found.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

