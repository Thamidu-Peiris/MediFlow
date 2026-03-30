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
            setMsg("Saving...");
            // Filter out days with no slots for cleaner storage
            const validSchedule = schedule.filter((s) => s.slots.length > 0);
            await api.put("/doctors/availability", { availability: validSchedule }, authHeaders);
            setMsg("Availability schedule updated successfully.");
        } catch (error) {
            setMsg(error.response?.data?.message || "Failed to save schedule.");
        }
    };

    if (loading) return <DoctorShell title="Availability"><p>Loading...</p></DoctorShell>;

    return (
        <DoctorShell title="Set Availability" subtitle="Manage your weekly consultation schedule">
            <div style={{ background: "#fff", padding: "2rem", borderRadius: "8px", border: "1px solid #eee", maxWidth: "800px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <p style={{ color: msg.includes("success") ? "green" : "red", margin: 0 }}>{msg}</p>
                    <button onClick={handleSave} className="mf-primary-btn">Save Schedule</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {schedule.map((dayItem, dIndex) => (
                        <div key={dayItem.day} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start", padding: "1rem", background: "#f8f9fa", borderRadius: "6px" }}>
                            <div style={{ width: "120px", fontWeight: "600" }}>{dayItem.day}</div>

                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {dayItem.slots.map((slot, sIndex) => (
                                    <div key={sIndex} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <input
                                            type="time"
                                            value={slot.start}
                                            onChange={(e) => updateSlot(dIndex, sIndex, "start", e.target.value)}
                                            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
                                        />
                                        <span>to</span>
                                        <input
                                            type="time"
                                            value={slot.end}
                                            onChange={(e) => updateSlot(dIndex, sIndex, "end", e.target.value)}
                                            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
                                        />
                                        <button
                                            onClick={() => removeSlot(dIndex, sIndex)}
                                            style={{ padding: "0.5rem", background: "#fee", color: "red", border: "1px solid #fcc", borderRadius: "4px", cursor: "pointer" }}
                                            aria-label="Remove slot"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => addSlot(dIndex)}
                                    style={{ alignSelf: "flex-start", padding: "0.25rem 0.75rem", background: "none", border: "1px dashed #666", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
                                >
                                    + Add time slot
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DoctorShell>
    );
}
