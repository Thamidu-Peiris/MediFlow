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
      {/* Page Canvas with Theme Background */}
      <div className="min-h-screen bg-[#c0fc92] p-4 md:p-8">
        {/* Main Content White Container */}
        <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-xl shadow-[#043927]/5 border border-[#356600]/10 p-6 md:p-10">
          {/* Greeting & Stats Section */}
          <section className="mb-12">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#CBF79D] text-[#043927] text-[10px] font-bold uppercase tracking-widest mb-4">
                  Clinical Overview
                </span>
                <h1 className="text-4xl font-headline font-extrabold text-[#043927]">
                  Good Morning, <span className="text-[#437A00]">Dr. {doctorInfo?.fullName || user?.name?.split(" ")[0] || "Doctor"}</span>
                </h1>
                <p className="text-[#043927]/60 font-medium">Practice oversight and clinical metrics for today.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 bg-[#CBF79D] text-[#043927] font-bold rounded-xl shadow-sm border border-[#356600]/10 flex items-center gap-2 transition-all hover:bg-[#b5f07a] active:scale-[0.98]">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Daily Summary
                </button>
                <Link to="/doctor/appointments" className="px-4 py-2 bg-[#437A00] text-white font-semibold rounded-xl shadow-md hover:bg-[#043927] active:scale-[0.98] transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Consultation
                </Link>
              </div>
            </div>

            {/* Bento Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Appointments */}
              <div className="bg-white p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all hover:shadow-md border border-[#356600]/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80 text-emerald-800">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>calendar_month</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#043927]/60">Total</span>
                </div>
                <div className="text-4xl font-black font-headline tracking-tight text-[#043927]">{appointments.length}</div>
                <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  Lifetime records
                </div>
              </div>

              {/* Today's Consultations */}
              <div className="bg-white p-6 rounded-xl shadow-sm transition-all hover:shadow-md border border-[#356600]/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg ring-1 ring-blue-200/80 text-blue-800">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>medical_information</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#043927]/60">Today</span>
                </div>
                <div className="text-4xl font-black font-headline tracking-tight text-[#043927]">{todayAppointments.length}</div>
                <div className="mt-2 text-xs text-blue-600 font-semibold">{todayAppointments.length} remaining</div>
              </div>

              {/* Pending Requests */}
              <div className="bg-white p-6 rounded-xl shadow-sm transition-all hover:shadow-md border border-[#356600]/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg ring-1 ring-red-200/80 text-red-800">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>pending_actions</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#043927]/60">Requests</span>
                </div>
                <div className="text-4xl font-black font-headline tracking-tight text-[#043927]">{pending.length}</div>
                <div className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">notification_important</span>
                  Awaiting review
                </div>
              </div>

              {/* Monthly Earnings */}
              <div className="bg-white p-6 rounded-xl shadow-sm col-span-1 relative overflow-hidden transition-all hover:shadow-md border border-[#356600]/10">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="p-2 bg-[#CBF79D] rounded-lg ring-1 ring-[#356600]/10 text-[#043927]">
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>payments</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#043927]/60">Earnings</span>
                </div>
                <div className="text-3xl font-black font-headline tracking-tight text-[#043927] relative truncate">
                  LKR {monthlyEarnings.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="mt-2 text-xs text-[#437A00] font-semibold flex items-center gap-1 relative">
                  <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                  Monthly Revenue
                </div>
              </div>
            </div>
          </section>

          {/* Main Content: Timeline & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: Schedule Timeline (66%) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-headline font-bold text-[#043927]">Today's Schedule</h2>
                <div className="flex items-center gap-2 text-[#043927]/60 text-sm font-medium">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {todayStr}
                </div>
              </div>

              <div className="space-y-4">
                {todayAppointments.length === 0 && (
                  <div className="group flex gap-6 p-10 bg-[#fcfdfa] border border-dashed border-[#356600]/10 rounded-[2rem] items-center opacity-60">
                    <div className="flex-1 text-center text-[#043927]/40">
                      <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
                      <p className="text-sm font-body font-bold italic">No appointments scheduled for today</p>
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
                      <div key={appt._id} className="group flex gap-6 p-6 bg-red-50 border border-red-100 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:shadow-red-900/5 items-center">
                        <div className="w-20 shrink-0">
                          <p className="text-lg font-headline font-bold text-red-600">{hour}</p>
                          <p className="text-xs text-red-600 font-bold uppercase tracking-tighter">{period}</p>
                        </div>
                        <div className="w-px h-12 bg-red-200"></div>
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-red-200">
                              <img
                                alt={appt.patientName}
                                className="w-full h-full object-cover"
                                src={appt.patientImage || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-headline font-extrabold text-[#043927]">{appt.patientName || "Patient"}</h4>
                                <span className="text-[9px] uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">Urgent</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-xs text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full">
                                  <span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>monitor_heart</span>
                                  {appt.reason || "Consultation"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Link to="/doctor/appointments" className="bg-red-600 text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20">
                            Emergency Review
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={appt._id} className="group flex gap-6 p-6 bg-[#fcfdfa] border border-[#356600]/5 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/5 items-center">
                      <div className="w-20 shrink-0">
                        <p className="text-lg font-headline font-bold text-[#043927]">{hour}</p>
                        <p className="text-xs text-[#043927]/40 font-bold uppercase tracking-tighter">{period}</p>
                      </div>
                      <div className="w-px h-12 bg-[#356600]/10"></div>
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#356600]/10">
                            <img
                              alt={appt.patientName}
                              className="w-full h-full object-cover"
                              src={appt.patientImage || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"}
                            />
                          </div>
                          <div>
                            <h4 className="font-headline font-extrabold text-[#043927]">{appt.patientName || "Patient"}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-[10px] text-[#437A00] font-bold bg-[#CBF79D]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>
                                  {isPending ? "pending_actions" : "event_available"}
                                </span>
                                {isPending ? "Pending" : "Confirmed"}
                              </span>
                              {appt.reason && (
                                <span className="text-xs font-medium text-[#043927]/40">{appt.reason}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link to="/doctor/patients" className="text-[#437A00] text-xs font-bold px-6 py-2.5 rounded-full border border-[#437A00]/20 hover:bg-[#CBF79D]/20 transition-all active:scale-95">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Available Slot placeholder */}
                {todayAppointments.length < 3 && (
                  <div className="group flex gap-6 p-6 bg-[#fcfdfa]/50 border border-dashed border-[#356600]/10 rounded-[2rem] items-center opacity-40">
                    <div className="w-20 shrink-0">
                      <p className="text-lg font-headline font-bold text-slate-400">--:--</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">--</p>
                    </div>
                    <div className="w-px h-12 bg-slate-200"></div>
                    <div className="flex-1">
                      <p className="text-sm font-body text-slate-400 font-bold italic">Available for Appointment Slot</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Activity & Shortcuts (33%) */}
            <div className="space-y-8">
              {/* Recent Activity */}
              <div className="bg-[#fcfdfa] p-6 rounded-[2rem] border border-[#356600]/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-headline font-extrabold text-[#043927]">Patient Activity</h3>
                  <Link to="/doctor/appointments" className="text-[#437A00] text-xs font-bold hover:underline">History</Link>
                </div>
                <div className="space-y-8">
                  {recentActivity.length === 0 && (
                    <p className="text-sm text-[#043927]/30 text-center py-4 font-bold italic">No recent activity</p>
                  )}
                  {recentActivity.map((appt, i) => (
                    <div key={appt._id} className="flex gap-4 relative">
                      {i < recentActivity.length - 1 && (
                        <div className="w-0.5 bg-[#356600]/10 rounded-full h-12 absolute left-[15px] top-10"></div>
                      )}
                      <div className={`z-10 w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${
                        appt.status === "completed" ? "bg-blue-50 text-blue-600" :
                        appt.status === "accepted" ? "bg-emerald-50 text-emerald-600" :
                        "bg-amber-50 text-amber-600"
                      }`}>
                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>
                          {appt.status === "completed" ? "task_alt" :
                           appt.status === "accepted" ? "event_available" : "pending_actions"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#043927] leading-tight mb-1">
                          <span className="text-[#437A00]">{appt.patientName || "Patient"}</span>{" "}
                          {appt.status === "completed" ? "consultation done" :
                           appt.status === "accepted" ? "confirmed" :
                           appt.status === "cancelled" || appt.status === "rejected" ? "cancelled" :
                           "booked a slot"}
                        </p>
                        <p className="text-[10px] text-[#043927]/30 font-bold uppercase tracking-widest">
                          {timeAgo(appt.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Shortcuts */}
              <div className="space-y-4">
                <h3 className="text-lg font-headline font-extrabold text-[#043927] px-2">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <Link to="/doctor/prescriptions" className="flex items-center justify-between p-4 bg-[#043927] text-white rounded-2xl transition-all hover:translate-x-2 active:scale-95 text-left group shadow-lg shadow-[#043927]/20">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined bg-white/10 p-2.5 rounded-xl" style={{fontVariationSettings: "'FILL' 1"}}>prescriptions</span>
                      <span className="font-headline font-extrabold text-sm">Issue Prescription</span>
                    </div>
                    <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity mr-2">chevron_right</span>
                  </Link>
                  <Link to="/doctor/patients" className="flex items-center justify-between p-4 bg-white border border-[#356600]/10 text-[#043927] rounded-2xl transition-all hover:translate-x-2 active:scale-95 text-left group shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined bg-[#fcfdfa] p-2.5 rounded-xl text-[#437A00]" style={{fontVariationSettings: "'FILL' 1"}}>badge</span>
                      <span className="font-headline font-extrabold text-sm">Patient Registry</span>
                    </div>
                    <span className="material-symbols-outlined text-[#356600]/30 opacity-0 group-hover:opacity-100 transition-opacity mr-2">chevron_right</span>
                  </Link>
                </div>
              </div>

              {/* Referral Banner */}
              <div className="bg-[#CBF79D] p-8 rounded-[2.5rem] text-[#043927] border border-[#356600]/10 relative overflow-hidden shadow-sm">
                <div className="relative z-10">
                  <h4 className="font-headline font-extrabold text-xl mb-2">Research Hub</h4>
                  <p className="text-xs font-medium mb-6 opacity-70 leading-relaxed max-w-[180px]">Access latest clinical papers and case studies.</p>
                  <button className="bg-[#043927] text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-[#065036] transition-all shadow-lg shadow-[#043927]/10">
                    Launch Portal
                  </button>
                </div>
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12">science</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DoctorShell>
  );
}
