import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function DoctorProfilePage() {
    const { authHeaders } = useAuth();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        specialization: "",
        qualifications: "",
        bio: "",
        consultationFee: 0
    });
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get("/doctors/me", authHeaders)
            .then((res) => {
                const d = res.data.doctor;
                if (d) {
                    setFormData({
                        fullName: d.fullName || "",
                        email: d.email || "",
                        phone: d.phone || "",
                        specialization: d.specialization || "",
                        qualifications: d.qualifications?.join(", ") || "",
                        bio: d.bio || "",
                        consultationFee: d.consultationFee || 0
                    });
                }
            })
            .catch((e) => {
                if (e.response?.status !== 404) {
                    console.error("Failed to load profile", e);
                }
            })
            .finally(() => setLoading(false));
    }, [authHeaders]);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMsg("Saving...");
            const qualificationsArray = formData.qualifications
                .split(",")
                .map((q) => q.trim())
                .filter(Boolean);

            await api.put(
                "/doctors/update-profile",
                {
                    ...formData,
                    qualifications: qualificationsArray,
                    consultationFee: Number(formData.consultationFee)
                },
                authHeaders
            );
            setMsg("Profile updated successfully!");
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to save profile");
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
            <div className="p-8 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-1">My Profile</h1>
                        <p className="text-on-surface-variant font-body">Manage your professional details</p>
                    </div>
                </div>

                <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                    {msg && (
                        <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-xl ${msg.includes("success") ? "bg-teal-50 text-teal-700" : "bg-error-container text-error"}`}>
                            <span className="material-symbols-outlined text-sm">{msg.includes("success") ? "check_circle" : "error"}</span>
                            {msg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Specialization</label>
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Qualifications</label>
                                <input
                                    type="text"
                                    name="qualifications"
                                    value={formData.qualifications}
                                    onChange={handleChange}
                                    placeholder="MBBS, MD"
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Consultation Fee (LKR)</label>
                                <input
                                    type="number"
                                    name="consultationFee"
                                    value={formData.consultationFee}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Bio</label>
                            <textarea
                                name="bio"
                                rows={4}
                                value={formData.bio}
                                onChange={handleChange}
                                className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all resize-none"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={saving}
                            className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary-container transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">save</span>
                                    Save Profile
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </DoctorShell>
    );
}
