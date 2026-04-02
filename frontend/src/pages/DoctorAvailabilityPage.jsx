import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DoctorAvailabilityPage() {
    const { authHeaders } = useAuth();
    const [schedule, setSchedule] = useState(
        DAYS.map((day) => ({ day, slots: [] }))
    );
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get("/doctors/me", authHeaders)
            .then((res) => {
                const d = res.data.doctor;
                if (d && d.availability?.length > 0) {
                    const merged = DAYS.map((day) => {
                        const existing = d.availability.find((a) => a.day === day);
                        return existing ? existing : { day, slots: [] };
                    });
                    setSchedule(merged);
                }
            })
            .catch((e) => console.log("Missing profile or availability", e))
            .finally(() => setLoading(false));
    }, [authHeaders]);

    const addSlot = (dayIndex) => {
        setSchedule((prev) => {
            const next = [...prev];
            next[dayIndex].slots.push({ start: "09:00", end: "17:00" });
            return next;
        });
    };

    const removeSlot = (dayIndex, slotIndex) => {
        setSchedule((prev) => {
            const next = [...prev];
            next[dayIndex].slots.splice(slotIndex, 1);
            return next;
        });
    };

    const updateSlot = (dayIndex, slotIndex, field, value) => {
        setSchedule((prev) => {
            const next = [...prev];
            next[dayIndex].slots[slotIndex][field] = value;
            return next;
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMsg("Saving...");
            const validSchedule = schedule.filter((s) => s.slots.length > 0);
            await api.put("/doctors/availability", { availability: validSchedule }, authHeaders);
            setMsg("Availability schedule updated successfully.");
        } catch (error) {
            setMsg(error.response?.data?.message || "Failed to save schedule.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <DoctorShell>
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        </DoctorShell>
    );

    return (
        <DoctorShell>
            <div className="p-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-1">Set Availability</h1>
                        <p className="text-on-surface-variant font-body">Manage your weekly consultation schedule</p>
                    </div>
                </div>

                <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                    <div className="flex justify-between items-center mb-6">
                        {msg && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${msg.includes("success") ? "bg-teal-50 text-teal-700" : "bg-error-container text-error"}`}>
                                <span className="material-symbols-outlined text-sm">{msg.includes("success") ? "check_circle" : "error"}</span>
                                {msg}
                            </div>
                        )}
                        {!msg && <div></div>}
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">save</span>
                                    Save Schedule
                                </>
                            )}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {schedule.map((dayItem, dIndex) => (
                            <div key={dayItem.day} className="flex flex-wrap gap-4 items-start p-4 bg-surface-container-high rounded-xl">
                                <div className="w-28 font-headline font-bold text-on-surface pt-2">{dayItem.day}</div>

                                <div className="flex-1 flex flex-col gap-3">
                                    {dayItem.slots.map((slot, sIndex) => (
                                        <div key={sIndex} className="flex gap-3 items-center">
                                            <input
                                                type="time"
                                                value={slot.start}
                                                onChange={(e) => updateSlot(dIndex, sIndex, "start", e.target.value)}
                                                className="bg-white border border-teal-500/10 rounded-lg px-3 py-2 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                                            />
                                            <span className="text-on-surface-variant font-medium">to</span>
                                            <input
                                                type="time"
                                                value={slot.end}
                                                onChange={(e) => updateSlot(dIndex, sIndex, "end", e.target.value)}
                                                className="bg-white border border-teal-500/10 rounded-lg px-3 py-2 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => removeSlot(dIndex, sIndex)}
                                                className="p-2 bg-error-container text-error rounded-lg hover:bg-error/20 transition-all active:scale-95"
                                                aria-label="Remove slot"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => addSlot(dIndex)}
                                        className="self-start flex items-center gap-2 px-4 py-2 border border-dashed border-slate-400 rounded-lg text-slate-600 hover:text-teal-600 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-sm font-medium"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add time slot
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
