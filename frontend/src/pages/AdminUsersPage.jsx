import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminUsersPage() {
  const { authHeaders, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search, filter, and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "patient", isDoctorVerified: false });

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

  const handleView = async (userId) => {
    try {
      setActionLoading(true);
      const res = await api.get(`/auth/admin/users/${userId}`, authHeaders);
      setSelectedUser(res.data.user);
      setViewModalOpen(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load user details");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = async (userId) => {
    try {
      setActionLoading(true);
      const res = await api.get(`/auth/admin/users/${userId}`, authHeaders);
      const u = res.data.user;
      setSelectedUser(u);
      setEditForm({
        name: u.name || "",
        email: u.email || "",
        role: u.role || "patient",
        isDoctorVerified: u.isDoctorVerified || false
      });
      setEditModalOpen(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load user details");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      const payload = { ...editForm };
      if (payload.role !== "doctor") {
        delete payload.isDoctorVerified;
      }
      await api.patch(`/auth/admin/users/${selectedUser._id}`, payload, authHeaders);
      setMessage("User updated successfully");
      setEditModalOpen(false);
      loadUsers();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (targetUser) => {
    if (targetUser._id === user?.id) {
      setMessage("Cannot delete your own account");
      return;
    }
    setSelectedUser(targetUser);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await api.delete(`/auth/admin/users/${selectedUser._id}`, authHeaders);
      setMessage("User deleted successfully");
      setDeleteModalOpen(false);
      loadUsers();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) + " • " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const doctors = users.filter(u => u.role === 'doctor').length;
    const patients = users.filter(u => u.role === 'patient').length;
    return { total, doctors, patients };
  }, [users]);

  // Filtered and Paginated logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "-";
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
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">User Management</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      {/* Bento metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">group</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Registered</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{stats.total}</div>
          <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-semibold">
            All registered accounts
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">medical_services</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Doctors</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{stats.doctors}</div>
          <div className="mt-2 text-xs text-on-surface-variant">Professional specialists</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">person</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Patients</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{stats.patients}</div>
          <div className="mt-2 text-xs text-on-surface-variant">Registered patients</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="search"
            className="w-full bg-white border border-emerald-200/70 rounded-xl py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="bg-white border border-emerald-200/70 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm cursor-pointer appearance-none min-w-[140px]"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="patient">Patients</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/50">
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Name</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Email</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Role</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Doctor Verified</th>
              <th className="text-right p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {paginatedUsers.map((item) => (
              <tr key={item._id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 font-semibold text-on-surface">{item.name}</td>
                <td className="p-4 text-on-surface-variant font-medium">{item.email}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    item.role === 'doctor' ? 'bg-emerald-100 text-emerald-800' : 
                    item.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {item.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  {item.role === "doctor" ? (
                    item.isDoctorVerified ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <span className="material-symbols-outlined text-[18px]">verified</span> Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold">
                        <span className="material-symbols-outlined text-[18px]">pending</span> Pending
                      </span>
                    )
                  ) : (
                    <span className="text-on-surface-variant/50 font-bold">-</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95"
                      onClick={() => handleView(item._id)}
                      disabled={actionLoading}
                      title="View Details"
                    >
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95"
                      onClick={() => handleEditClick(item._id)}
                      disabled={actionLoading}
                      title="Edit User"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                      onClick={() => handleDeleteClick(item)}
                      disabled={actionLoading || item._id === user?.id}
                      title="Delete User"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-4xl block mb-2 opacity-20">group_off</span>
                  No users found matching your criteria.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 bg-emerald-50/30 border-t border-emerald-100">
            <p className="text-xs text-emerald-900 font-bold">
              Showing <span className="text-emerald-700">{Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="text-emerald-700">{Math.min(filteredUsers.length, currentPage * itemsPerPage)}</span> of <span className="text-emerald-700">{filteredUsers.length}</span> users
            </p>
            <div className="flex gap-2">
              <button
                className={`p-2 rounded-lg border border-emerald-200 transition-all ${
                  currentPage === 1 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-emerald-700 hover:bg-emerald-100 active:scale-95 shadow-sm'
                }`}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button
                className={`p-2 rounded-lg border border-emerald-200 transition-all ${
                  currentPage === totalPages 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-emerald-700 hover:bg-emerald-100 active:scale-95 shadow-sm'
                }`}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">User Details</h3>
                <button onClick={() => setViewModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
                  {selectedUser.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{selectedUser.name}</h4>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Role</span>
                  <p className={`font-semibold ${
                    selectedUser.role === 'doctor' ? 'text-emerald-700' : 
                    selectedUser.role === 'admin' ? 'text-purple-700' : 'text-blue-700'
                  }`}>
                    {selectedUser.role.toUpperCase()}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Joined</span>
                  <p className="font-semibold text-gray-700">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
              {selectedUser.role === "doctor" && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase font-bold">Verification Status</span>
                  <p className={`font-semibold ${selectedUser.isDoctorVerified ? 'text-emerald-600' : 'text-red-500'}`}>
                    {selectedUser.isDoctorVerified ? "Verified" : "Pending Verification"}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setViewModalOpen(false)}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
                <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editForm.role === "doctor" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDoctorVerified"
                    checked={editForm.isDoctorVerified}
                    onChange={(e) => setEditForm({ ...editForm, isDoctorVerified: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="isDoctorVerified" className="text-sm font-semibold text-gray-700">
                    Doctor Verified
                  </label>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User?</h3>
              <p className="text-gray-500 mb-1">Are you sure you want to delete</p>
              <p className="font-semibold text-gray-900 mb-6">{selectedUser.name}?</p>
              <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

