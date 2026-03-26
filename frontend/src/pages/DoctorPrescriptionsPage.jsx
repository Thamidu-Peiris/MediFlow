import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function DoctorPrescriptionsPage() {
    const { authHeaders } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [formData, setFormData] = useState({
        patientId: "",
        patientName: "",
        medicines: "",
        notes: ""
    });
    const [msg, setMsg] = useState("");

    const fetchPrescriptions = () => {
        api.get("/doctors/prescriptions", authHeaders)
            .then((res) => setPrescriptions(res.data.prescriptions || []))
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        fetchPrescriptions();
        // eslint-disable-next-line
    }, [authHeaders]);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setMsg("Saving...");
            const medsArray = formData.medicines.split(",").map(m => m.trim()).filter(Boolean);

            await api.post("/doctors/prescriptions", {
                ...formData,
                medicines: medsArray
            }, authHeaders);

            setMsg("Prescription issued!");
            setFormData({ patientId: "", patientName: "", medicines: "", notes: "" });
            fetchPrescriptions();
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to issue prescription");
        }
    };

    return (
        <DoctorShell title="Prescriptions" subtitle="Issue and view prescriptions">
            <div className="pd-grid pd-grid-2">
                <section>
                    <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #eee" }}>
                        <h3>Issue New Prescription</h3>
                        <p style={{ color: msg.includes("issued") ? "green" : "red" }}>{msg}</p>
                        <form onSubmit={handleSubmit} className="mf-form">
                            <div className="mf-form-group">
                                <label>Patient ID</label>
                                <input type="text" name="patientId" value={formData.patientId} onChange={handleChange} required />
                            </div>
                            <div className="mf-form-group">
                                <label>Patient Name (Optional)</label>
                                <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} />
                            </div>
                            <div className="mf-form-group">
                                <label>Medicines (Comma separated)</label>
                                <input type="text" name="medicines" value={formData.medicines} onChange={handleChange} required placeholder="Paracetamol 500mg, Amoxicillin" />
                            </div>
                            <div className="mf-form-group">
                                <label>Doctor's Notes</label>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Take after meals..."></textarea>
                            </div>
                            <button type="submit" className="mf-primary-btn">Issue Prescription</button>
                        </form>
                    </div>
                </section>

                <section>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {prescriptions.length === 0 ? (
                            <p>No prescriptions issued yet.</p>
                        ) : (
                            [...prescriptions].reverse().map((p) => (
                                <article key={p._id} className="pd-card">
                                    <h4>{p.patientName || p.patientId}</h4>
                                    <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.5rem" }}>
                                        Issued on: {new Date(p.createdAt).toLocaleDateString()}
                                    </p>
                                    <div>
                                        <strong>Medicines:</strong>
                                        <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0" }}>
                                            {p.medicines?.map((m, i) => <li key={i}>{m}</li>)}
                                        </ul>
                                    </div>
                                    {p.notes && (
                                        <p style={{ fontSize: "0.9rem", marginTop: "0.5rem", padding: "0.5rem", background: "#f8f9fa", borderRadius: "4px" }}>
                                            {p.notes}
                                        </p>
                                    )}
                                </article>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </DoctorShell>
    );
}
