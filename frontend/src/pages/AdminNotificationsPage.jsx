import { useMemo, useState } from "react";
import api from "../api/client";

export default function AdminNotificationsPage() {
  const [message] = useState(
    "Admin notifications (broadcast announcements) are not wired to backend routes yet. UI scaffolding is ready."
  );

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) + " • " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const [testPayload, setTestPayload] = useState({
    patientEmail: "",
    doctorEmail: "",
    patientPhone: "",
    doctorPhone: "",
  });
  const [testStatus, setTestStatus] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const formatTestResult = (res) => {
    const data = res?.data || {};
    const lines = [data.message || "Request completed."];
    const dispatch = data.dispatch;
    if (dispatch?.hints?.length) {
      lines.push(...dispatch.hints);
    } else if (dispatch && (dispatch.email?.mode !== "live" || dispatch.sms?.mode !== "live")) {
      lines.push(`Channels: email=${dispatch.email?.mode || "?"}, sms=${dispatch.sms?.mode || "?"}.`);
    }
    if (Array.isArray(data.failures) && data.failures.length) {
      lines.push("Failures:");
      for (const f of data.failures) {
        const extra = f.hint ? ` — ${f.hint}` : "";
        lines.push(`• ${f.task}: ${f.message || "Unknown error"}${extra}`);
      }
    }
    return lines.join("\n");
  };

  const handleTriggerTest = async () => {
    setSendingTest(true);
    setTestStatus("");
    try {
      const res = await api.post("/notifications/send", {
        type: "APPOINTMENT_BOOKED",
        patientEmail: testPayload.patientEmail.trim(),
        doctorEmail: testPayload.doctorEmail.trim(),
        patientPhone: testPayload.patientPhone.trim(),
        doctorPhone: testPayload.doctorPhone.trim(),
        payload: {
          date: new Date().toISOString().slice(0, 10),
          time: "10:00 AM",
          patientName: "Test Patient",
          doctorName: "Test Doctor",
        },
      });
      setTestStatus(formatTestResult(res));
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to trigger test notification.";
      setTestStatus(msg);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="font-body text-on-surface pb-10">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Notifications</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      {/* Bento metrics - Placeholder for notification analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">campaign</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Active Announcements</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">0</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold">Live broadcast messages</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">group</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Reach</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">0</div>
          <div className="mt-2 text-xs text-on-surface-variant">Users targetable</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">send</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Sent Total</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">0</div>
          <div className="mt-2 text-xs text-on-surface-variant">Historical notifications</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
                <span className="material-symbols-outlined text-emerald-800">add_comment</span>
              </div>
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Create New Announcement</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Broadcast a message to all system users</p>
              </div>
            </div>

            <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-800 text-sm font-medium">
              <span className="material-symbols-outlined text-[20px]">info</span>
              {message}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">Announcement Title</label>
                <input 
                  type="text" 
                  placeholder="Enter a descriptive title..."
                  className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">Message Content</label>
                <textarea
                  rows="5"
                  placeholder="Write your detailed announcement here..."
                  className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all resize-none"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  className="px-8 py-3 bg-[#0C9100] text-white font-bold rounded-xl shadow-md hover:bg-[#097300] hover:shadow-lg active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">send</span>
                  Broadcast Message
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
                <span className="material-symbols-outlined text-emerald-800">bolt</span>
              </div>
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Trigger Test Notification</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  Sends a sample appointment email (Brevo SMTP) and SMS (Twilio). Twilio trial accounts only deliver SMS to numbers you verify in the Twilio console. Use international format (+94771234567) or set{" "}
                  <span className="font-mono text-[11px]">SMS_DEFAULT_COUNTRY_CODE</span> for local numbers starting with 0.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Patient email"
                value={testPayload.patientEmail}
                onChange={(e) => setTestPayload((p) => ({ ...p, patientEmail: e.target.value }))}
                className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
              />
              <input
                type="email"
                placeholder="Doctor email"
                value={testPayload.doctorEmail}
                onChange={(e) => setTestPayload((p) => ({ ...p, doctorEmail: e.target.value }))}
                className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Patient phone (+94...)"
                value={testPayload.patientPhone}
                onChange={(e) => setTestPayload((p) => ({ ...p, patientPhone: e.target.value }))}
                className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Doctor phone (+94...)"
                value={testPayload.doctorPhone}
                onChange={(e) => setTestPayload((p) => ({ ...p, doctorPhone: e.target.value }))}
                className="w-full bg-white border border-emerald-200/70 rounded-xl py-3 px-4 text-sm text-black placeholder:text-gray-400 shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pt-5">
              <p className="text-xs text-on-surface-variant whitespace-pre-line max-w-[min(100%,42rem)]">{testStatus}</p>
              <button
                type="button"
                onClick={handleTriggerTest}
                disabled={sendingTest}
                className="px-6 py-3 bg-[#0C9100] text-white font-bold rounded-xl shadow-md hover:bg-[#097300] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sendingTest ? "Sending..." : "Send Test Notification"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

