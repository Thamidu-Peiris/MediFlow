import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

function todayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseTimeMins(timeStr) {
  if (!timeStr) return 9999;
  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 9999;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h === 12) h = 0;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + min;
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return { hour: "--:--", period: "" };
  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { hour: timeStr, period: "" };
  return { hour: `${String(m[1]).padStart(2, "0")}:${m[2]}`, period: m[3].toUpperCase() };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff} secs ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
}

export default function DoctorDashboardPage() {
  const { authHeaders, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [today] = useState(new Date());

  useEffect(() => {
    api.get("/doctors/me", authHeaders).then((res) => {
      setDoctorInfo(res.data.doctor || {});
    }).catch(() => {});

    api.get("/appointments/doctor", authHeaders).then((res) => {
      setAppointments(res.data.appointments || []);
    }).catch(() => setAppointments([]));
  }, [authHeaders]);

  const todayKey = todayDateKey();
  const pending = appointments.filter((a) => a.status === "pending");
  const todayAppointments = appointments
    .filter((a) => a.date === todayKey && a.status !== "rejected" && a.status !== "cancelled")
    .sort((a, b) => parseTimeMins(a.time) - parseTimeMins(b.time));

  // Monthly earnings: completed appointments this month × consultationFee
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();
  const completedThisMonth = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    const d = new Date(a.createdAt || a.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const monthlyEarnings = completedThisMonth.length * (doctorInfo?.consultationFee || 0);

  // Recent activity: 3 most recently created appointments
  const recentActivity = [...appointments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const todayStr = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <DoctorShell>
      {/* Page Canvas */}
      <div className="p-8 max-w-7xl mx-auto">
        {/* Greeting & Stats Section */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-1">
                Good Morning, Dr. {doctorInfo?.fullName || user?.name?.split(" ")[0] || "Doctor"}
              </h1>
              <p className="text-on-surface-variant font-body">Here is what is happening with your practice today.</p>
            </div>
            <div className="flex gap-3">
              <button className="bg-surface-container-lowest text-primary font-bold px-6 py-2.5 rounded-full border border-teal-500/10 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                <span className="material-symbols-outlined text-sm">download</span>
                Daily Summary
              </button>
              <Link to="/doctor/appointments" className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full shadow-lg shadow-teal-700/20 flex items-center gap-2 hover:bg-primary-container transition-all active:scale-95">
                <span className="material-symbols-outlined text-sm">add</span>
                New Consultation
              </Link>
            </div>
          </div>

          {/* Bento Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Appointments */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)] group hover:translate-y-[-4px] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>calendar_month</span>
                </div>
                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">+12%</span>
              </div>
              <p className="text-label-md text-on-surface-variant mb-1 uppercase tracking-wider text-[10px] font-bold">Total Appointments</p>
              <p className="text-3xl font-headline font-extrabold text-on-surface">{appointments.length}</p>
            </div>

            {/* Today's Consultations */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)] group hover:translate-y-[-4px] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>medical_information</span>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{todayAppointments.length} remaining</span>
              </div>
              <p className="text-label-md text-on-surface-variant mb-1 uppercase tracking-wider text-[10px] font-bold">Today's Consultations</p>
              <p className="text-3xl font-headline font-extrabold text-on-surface">{todayAppointments.length}</p>
            </div>

            {/* Pending Requests */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)] group hover:translate-y-[-4px] transition-all duration-300 border-l-4 border-error/20">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>pending_actions</span>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">New</span>
              </div>
              <p className="text-label-md text-on-surface-variant mb-1 uppercase tracking-wider text-[10px] font-bold">Pending Requests</p>
              <p className="text-3xl font-headline font-extrabold text-on-surface">{pending.length}</p>
            </div>

            {/* Monthly Earnings */}
            <div className="bg-primary text-on-primary p-6 rounded-xl shadow-[0px_20px_40px_rgba(0,101,102,0.15)] group hover:translate-y-[-4px] transition-all duration-300 overflow-hidden relative">
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white mb-4">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
                </div>
                <p className="text-label-md text-teal-50/70 mb-1 uppercase tracking-wider text-[10px] font-bold">Monthly Earnings</p>
                <p className="text-2xl font-headline font-extrabold">
                  LKR {monthlyEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined text-[100px]">monetization_on</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content: Timeline & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Schedule Timeline (66%) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold text-on-surface">Today's Schedule</h2>
              <div className="flex items-center gap-2 text-on-surface-variant text-sm font-medium">
                <span className="material-symbols-outlined text-sm">schedule</span>
                {todayStr}
              </div>
            </div>

            <div className="space-y-4">
              {todayAppointments.length === 0 && (
                <div className="group flex gap-6 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl items-center opacity-60">
                  <div className="flex-1 text-center">
                    <p className="text-sm font-body text-slate-500 font-medium italic">No appointments scheduled for today</p>
                  </div>
                </div>
              )}

              {todayAppointments.map((appt) => {
                const { hour, period } = formatTimeDisplay(appt.time);
                const isUrgent = String(appt.reason || "").toLowerCase().includes("urgent") ||
                  String(appt.notes || "").toLowerCase().includes("urgent");
                const isPending = appt.status === "pending";

                if (isUrgent) {
                  return (
                    <div key={appt._id} className="group flex gap-6 p-6 bg-error-container/30 border border-error/10 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-red-900/5 items-center">
                      <div className="w-20 shrink-0">
                        <p className="text-lg font-headline font-bold text-error">{hour}</p>
                        <p className="text-xs text-error font-bold uppercase tracking-tighter">{period}</p>
                      </div>
                      <div className="w-px h-12 bg-error/20"></div>
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-error">
                            <img
                              alt={appt.patientName}
                              className="w-full h-full object-cover"
                              src={appt.patientImage || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-headline font-bold text-on-surface">{appt.patientName || "Patient"}</h4>
                              <span className="text-[9px] uppercase tracking-widest bg-error text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">Urgent</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>monitor_heart</span>
                                {appt.reason || "Consultation"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Link to="/doctor/appointments" className="bg-error text-white text-sm font-bold px-5 py-2 rounded-full hover:opacity-90 transition-all active:scale-95">
                          Emergency Review
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={appt._id} className="group flex gap-6 p-6 bg-surface-container-lowest rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/5 items-center">
                    <div className="w-20 shrink-0">
                      <p className="text-lg font-headline font-bold text-on-surface">{hour}</p>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tighter">{period}</p>
                    </div>
                    <div className="w-px h-12 bg-slate-100"></div>
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <img
                            alt={appt.patientName}
                            className="w-full h-full object-cover"
                            src={appt.patientImage || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"}
                          />
                        </div>
                        <div>
                          <h4 className="font-headline font-bold text-on-surface">{appt.patientName || "Patient"}</h4>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-full">
                              <span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>
                                {isPending ? "pending_actions" : "event_available"}
                              </span>
                              {isPending ? "Pending" : "Confirmed"}
                            </span>
                            {appt.reason && (
                              <span className="text-xs text-on-surface-variant">{appt.reason}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link to="/doctor/patients" className="text-primary text-sm font-bold px-5 py-2 rounded-full border border-primary hover:bg-teal-50 transition-all active:scale-95">
                        View Profile
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Available Slot placeholder when fewer than 3 real slots */}
              {todayAppointments.length < 3 && (
                <div className="group flex gap-6 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl items-center opacity-60">
                  <div className="w-20 shrink-0">
                    <p className="text-lg font-headline font-bold text-slate-400">--:--</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">--</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200"></div>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-body text-slate-500 font-medium italic">Available for Appointment Slot</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Activity & Shortcuts (33%) */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-headline font-bold text-on-surface">Recent Patient Activity</h3>
                <Link to="/doctor/appointments" className="text-primary text-xs font-bold hover:underline">See All</Link>
              </div>
              <div className="space-y-6">
                {recentActivity.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center py-4">No recent activity</p>
                )}
                {recentActivity.map((appt, i) => (
                  <div key={appt._id} className="flex gap-4 relative">
                    {i < recentActivity.length - 1 && (
                      <div className="w-2 bg-teal-500/20 rounded-full h-full absolute left-[15px] top-8"></div>
                    )}
                    <div className={`z-10 w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                      appt.status === "completed" ? "bg-blue-100 text-blue-700" :
                      appt.status === "accepted" ? "bg-teal-100 text-teal-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {appt.status === "completed" ? "task_alt" :
                         appt.status === "accepted" ? "event_available" : "pending_actions"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        <span className="font-bold">{appt.patientName || "Patient"}</span>{" "}
                        {appt.status === "completed" ? "completed a consultation" :
                         appt.status === "accepted" ? "appointment confirmed" :
                         appt.status === "cancelled" || appt.status === "rejected" ? "cancelled appointment" :
                         "booked an appointment"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
                        {timeAgo(appt.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="space-y-4">
              <h3 className="text-lg font-headline font-bold text-on-surface px-2">Quick Shortcuts</h3>
              <div className="grid grid-cols-1 gap-3">
                <Link to="/doctor/prescriptions" className="flex items-center justify-between p-4 bg-primary text-on-primary rounded-xl transition-all hover:translate-x-2 active:scale-95 text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined bg-white/20 p-2 rounded-lg" style={{fontVariationSettings: "'FILL' 1"}}>prescriptions</span>
                    <span className="font-headline font-bold text-sm">Add Prescription</span>
                  </div>
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                </Link>
                <Link to="/doctor/patients" className="flex items-center justify-between p-4 bg-white border border-teal-500/10 text-teal-900 rounded-xl transition-all hover:translate-x-2 active:scale-95 text-left group shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined bg-teal-50 p-2 rounded-lg text-teal-600" style={{fontVariationSettings: "'FILL' 1"}}>badge</span>
                    <span className="font-headline font-bold text-sm">View Patient Registry</span>
                  </div>
                  <span className="material-symbols-outlined text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                </Link>
                <Link to="/doctor/availability" className="flex items-center justify-between p-4 bg-white border border-teal-500/10 text-teal-900 rounded-xl transition-all hover:translate-x-2 active:scale-95 text-left group shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined bg-teal-50 p-2 rounded-lg text-teal-600" style={{fontVariationSettings: "'FILL' 1"}}>event_available</span>
                    <span className="font-headline font-bold text-sm">Set Availability</span>
                  </div>
                  <span className="material-symbols-outlined text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                </Link>
              </div>
            </div>

            {/* Referral Banner */}
            <div className="bg-gradient-to-br from-tertiary-container to-tertiary p-6 rounded-2xl text-on-tertiary-container relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-headline font-bold mb-2">Internal Research Hub</h4>
                <p className="text-xs mb-4 opacity-90 leading-relaxed">Access latest oncology papers and collaborative case studies from Aura Network.</p>
                <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:bg-white/30 transition-all">
                  Launch Portal
                </button>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl opacity-10">science</span>
            </div>
          </div>
        </div>
      </div>
    </DoctorShell>
  );
}
