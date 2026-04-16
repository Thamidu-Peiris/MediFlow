import { useEffect, useRef, useState } from "react";
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
    const [imagePreview, setImagePreview] = useState("");
    const fileInputRef = useRef(null);
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
                    if (d.image) setImagePreview(d.image);
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

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        const inputEl = e.target;
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setMsg("Image must be under 2MB");
            inputEl.value = "";
            return;
        }
        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);

        // Upload to Cloudinary via backend
        try {
            setSaving(true);
            setMsg("Uploading image...");
            const formPayload = new FormData();
            formPayload.append("image", file);
            const res = await api.post("/doctors/upload-image", formPayload, {
                ...authHeaders,
                timeout: 60000
            });
            setImagePreview(res.data.imageUrl);
            setMsg("Image uploaded successfully!");
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to upload image");
        } finally {
            setSaving(false);
            inputEl.value = "";
        }
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
            <div className="max-w-6xl mx-auto space-y-10 p-2 md:p-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CBF79D]/20 text-[#437A00] text-[10px] font-bold uppercase tracking-widest border border-[#CBF79D]/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#437A00] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#437A00]"></span>
                            </span>
                            Live Practitioner Profile
                        </div>
                        <h1 className="text-4xl font-headline font-black text-[#043927] tracking-tight">Professional Profile</h1>
                        <p className="text-[#043927]/50 font-medium text-lg">Curate your medical presence and clinical expertise.</p>
                    </div>
                    {msg && (
                        <div className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] shadow-lg shadow-[#043927]/5 animate-in fade-in slide-in-from-top-6 duration-500 border ${msg.includes("success") ? "bg-white text-[#356600] border-[#CBF79D]/50" : "bg-white text-red-600 border-red-100"}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.includes("success") ? "bg-[#CBF79D]/20 text-[#437A00]" : "bg-red-50 text-red-500"}`}>
                                <span className="material-symbols-outlined text-2xl">{msg.includes("success") ? "verified" : "error"}</span>
                            </div>
                            <span className="text-sm font-bold pr-2">{msg}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Sidebar Column: 4/12 */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Profile Identity Card */}
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-[#043927]/10 border border-[#356600]/5 flex flex-col items-center text-center relative overflow-hidden group">
                            {/* Decorative background element */}
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#CBF79D]/10 to-transparent -z-0"></div>

                            <div className="relative z-10">
                                <div className="relative">
                                    <div className="w-48 h-48 rounded-[3rem] overflow-hidden border-[6px] border-white shadow-2xl ring-1 ring-[#043927]/5 transition-all duration-500 group-hover:scale-[1.02]">
                                        <img
                                            src={imagePreview || "/doctor-placeholder.svg"}
                                            alt="Profile"
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-4 -right-4 bg-[#437A00] text-white rounded-[1.5rem] p-5 shadow-xl hover:bg-[#043927] transition-all duration-300 hover:rotate-12 active:scale-90 ring-4 ring-white"
                                        title="Change photo"
                                    >
                                        <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </div>

                                <div className="mt-10 space-y-2">
                                    <h2 className="text-2xl font-headline font-black text-[#043927]">Dr. {formData.fullName || "Practitioner"}</h2>
                                    <div className="inline-block px-4 py-1.5 bg-[#CBF79D] text-[#043927] rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        {formData.specialization || "Medical Specialist"}
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-1 gap-4 mt-10 pt-8 border-t border-[#356600]/10">
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#fcfdfa] border border-[#356600]/5 hover:border-[#CBF79D]/50 transition-colors group/item">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#437A00] group-hover/item:bg-[#437A00] group-hover/item:text-white transition-all">
                                            <span className="material-symbols-outlined text-xl">alternate_email</span>
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-[10px] font-bold text-[#043927]/40 uppercase tracking-tighter">Primary Email</p>
                                            <p className="text-sm font-bold text-[#043927] truncate">{formData.email || "Not provided"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#fcfdfa] border border-[#356600]/5 hover:border-[#CBF79D]/50 transition-colors group/item">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#437A00] group-hover/item:bg-[#437A00] group-hover/item:text-white transition-all">
                                            <span className="material-symbols-outlined text-xl">phone_iphone</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold text-[#043927]/40 uppercase tracking-tighter">Contact Number</p>
                                            <p className="text-sm font-bold text-[#043927]">{formData.phone || "Not provided"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Action Card */}
                        <div className="bg-gradient-to-br from-[#043927] to-[#1a4d3a] p-8 rounded-[3rem] text-white shadow-xl shadow-[#043927]/20 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#CBF79D]/10 rounded-full blur-2xl"></div>
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                        <span className="material-symbols-outlined text-[#CBF79D]">verified</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[#CBF79D] uppercase tracking-[0.2em]">Clinical Status</p>
                                        <p className="text-lg font-headline font-bold">Verified Practitioner</p>
                                    </div>
                                </div>
                                <p className="text-sm text-white/70 leading-relaxed italic">
                                    Your professional data is visible to thousands of patients across the MediFlow network.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Column: 8/12 */}
                    <div className="lg:col-span-8">
                        <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl shadow-[#043927]/5 border border-[#356600]/5">
                            <form onSubmit={handleSubmit} className="space-y-12">
                                {/* Section 1: Professional Details */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4 border-b border-[#356600]/10 pb-4">
                                        <div className="w-8 h-8 rounded-lg bg-[#437A00]/10 flex items-center justify-center text-[#437A00]">
                                            <span className="material-symbols-outlined text-xl">medical_information</span>
                                        </div>
                                        <h3 className="text-xl font-headline font-black text-[#043927]">Clinical Identity</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Full Legal Name</label>
                                            <div className="relative group/field">
                                                <input
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Medical Specialization</label>
                                            <input
                                                type="text"
                                                name="specialization"
                                                value={formData.specialization}
                                                onChange={handleChange}
                                                className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Board Qualifications</label>
                                            <input
                                                type="text"
                                                name="qualifications"
                                                value={formData.qualifications}
                                                onChange={handleChange}
                                                placeholder="e.g. MBBS, MD, FRCS"
                                                className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Consultation Fee (LKR)</label>
                                            <div className="relative">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none border-r border-[#356600]/10 pr-4">
                                                    <span className="text-[#437A00] font-black text-xs">LKR</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    name="consultationFee"
                                                    value={formData.consultationFee}
                                                    onChange={handleChange}
                                                    min="0"
                                                    className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl pl-20 pr-6 py-4 text-[#043927] font-black text-lg focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contact Hub */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4 border-b border-[#356600]/10 pb-4">
                                        <div className="w-8 h-8 rounded-lg bg-[#437A00]/10 flex items-center justify-center text-[#437A00]">
                                            <span className="material-symbols-outlined text-xl">contact_mail</span>
                                        </div>
                                        <h3 className="text-xl font-headline font-black text-[#043927]">Communication Hub</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Official Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Personal Phone Number</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Professional Biography */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4 border-b border-[#356600]/10 pb-4">
                                        <div className="w-8 h-8 rounded-lg bg-[#437A00]/10 flex items-center justify-center text-[#437A00]">
                                            <span className="material-symbols-outlined text-xl">history_edu</span>
                                        </div>
                                        <h3 className="text-xl font-headline font-black text-[#043927]">Clinical Narrative</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Professional Experience & Philosophy</label>
                                        <textarea
                                            name="bio"
                                            rows={6}
                                            value={formData.bio}
                                            onChange={handleChange}
                                            placeholder="Detail your clinical journey, research interests, and approach to patient care..."
                                            className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-3xl px-6 py-6 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all resize-none shadow-sm leading-relaxed"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-8">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="group relative flex items-center gap-4 bg-[#043927] text-white font-black px-12 py-5 rounded-[2rem] hover:bg-[#437A00] transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-2xl shadow-[#043927]/20"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white/30 border-t-[#CBF79D]"></div>
                                                <span className="tracking-wide">Syncing Profile...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110 group-hover:rotate-12">save_as</span>
                                                <span className="tracking-wide">Confirm & Save Changes</span>
                                            </>
                                        )}
                                        <div className="absolute inset-0 rounded-[2rem] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
