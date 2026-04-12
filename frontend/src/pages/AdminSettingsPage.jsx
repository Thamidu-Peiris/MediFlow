import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) + " • " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  return (
    <div className="font-body text-on-surface pb-10">
      {message ? (
        <p className="mb-4 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm font-medium border border-red-100">{message}</p>
      ) : null}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Settings</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Section */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
                <span className="material-symbols-outlined text-emerald-800">admin_panel_settings</span>
              </div>
              <h3 className="text-xl font-bold font-headline text-on-surface">Admin Profile</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Full Name</p>
                <p className="text-base font-bold text-on-surface">{user?.name || "—"}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Email Address</p>
                <p className="text-base font-bold text-on-surface">{user?.email || "—"}</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">System Role</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  ADMINISTRATOR
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Security Section */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
                <span className="material-symbols-outlined text-emerald-800">lock_reset</span>
              </div>
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Security Settings</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Manage your account authentication</p>
              </div>
            </div>

            <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-800 text-sm font-medium">
              <span className="material-symbols-outlined text-[20px]">info</span>
              Backend password change endpoint is not currently connected.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">Current Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  className="px-8 py-3 bg-[#0C9100] text-white font-bold rounded-xl shadow-md hover:bg-[#097300] hover:shadow-lg active:scale-[0.98] transition-all flex items-center gap-2"
                  onClick={() => setMessage("Password change not implemented in the current backend/API.")}
                >
                  <span className="material-symbols-outlined">save</span>
                  Update Security
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

