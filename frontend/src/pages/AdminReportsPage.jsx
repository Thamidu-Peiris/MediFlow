import { useMemo, useState } from "react";

export default function AdminReportsPage() {
  const [message] = useState(
    "Reports monitoring across all patients is not available in the current backend routes. This page shows the UI framework for moderation workflow."
  );

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
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Reports Monitoring</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      {/* Bento metrics - Placeholder for reports analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">description</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Reports</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">0</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold">Total medical files</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">priority_high</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">High Risk</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">0</div>
          <div className="mt-2 text-xs text-on-surface-variant">Flagged for review</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">verified</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Processed</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">0</div>
          <div className="mt-2 text-xs text-on-surface-variant">Reviewed reports</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 bg-white/50">
          <p className="text-sm text-on-surface-variant font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">info</span>
            {message}
          </p>
        </div>
        
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/50">
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Report Name</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Uploaded At</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Risk Level</th>
              <th className="text-right p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="p-12 text-center text-on-surface-variant font-medium">
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-5xl opacity-20">folder_open</span>
                  <p>No reports found in the system.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

