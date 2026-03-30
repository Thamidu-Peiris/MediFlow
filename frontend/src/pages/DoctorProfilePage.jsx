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
        }
    };

    if (loading) return <DoctorShell title="My Profile"><p>Loading...</p></DoctorShell>;

    return (
        <DoctorShell title="My Profile" subtitle="Manage your professional details">
            <form onSubmit={handleSubmit} className="mf-form" style={{ maxWidth: "600px", background: "#fff", padding: "2rem", borderRadius: "8px", border: "1px solid #eee" }}>
                <p style={{ color: msg.includes("success") ? "green" : "inherit" }}>{msg}</p>

                <div className="mf-form-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="mf-form-group">
                    <label>Email (Contact)</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                <div className="mf-form-group">
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                    />
                </div>

                <div className="mf-form-group">
                    <label>Specialization</label>
                    <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                    />
                </div>

                <div className="mf-form-group">
                    <label>Qualifications (comma separated)</label>
                    <input
                        type="text"
                        name="qualifications"
                        value={formData.qualifications}
                        onChange={handleChange}
                        placeholder="MBBS, MD"
                    />
                </div>

                <div className="mf-form-group">
                    <label>Consultation Fee (LKR)</label>
                    <input
                        type="number"
                        name="consultationFee"
                        value={formData.consultationFee}
                        onChange={handleChange}
                        min="0"
                    />
                </div>

                <div className="mf-form-group">
                    <label>Bio</label>
                    <textarea
                        name="bio"
                        rows={4}
                        value={formData.bio}
                        onChange={handleChange}
                    />
                </div>

                <button type="submit" className="mf-primary-btn">
                    Save Profile
                </button>
            </form>
        </DoctorShell>
    );
}
