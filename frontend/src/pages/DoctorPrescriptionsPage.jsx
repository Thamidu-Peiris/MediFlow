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
    const [saving, setSaving] = useState(false);

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
            setSaving(true);
            setMsg("Saving...");
            const medsArray = formData.medicines.split(",").map(m => m.trim()).filter(Boolean);

            await api.post("/doctors/prescriptions", {
                ...formData,
                medicines: medsArray
            }, authHeaders);

            setMsg("Prescription issued successfully!");
            setFormData({ patientId: "", patientName: "", medicines: "", notes: "" });
            fetchPrescriptions();
        } catch (err) {
            setMsg(err.response?.data?.message || "Failed to issue prescription");
        } finally {
            setSaving(false);
        }
    };

    return (
        <DoctorShell>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-1">Clinical Notes</h1>
                        <p className="text-on-surface-variant font-body">Issue and manage prescriptions</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Issue New Prescription Form */}
                    <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-white" style={{fontVariationSettings: "'FILL' 1"}}>edit_note</span>
                            </div>
                            <h3 className="text-xl font-headline font-bold text-on-surface">Issue New Prescription</h3>
                        </div>

                        {msg && (
                            <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-xl ${msg.includes("success") ? "bg-teal-50 text-teal-700" : "bg-error-container text-error"}`}>
                                <span className="material-symbols-outlined text-sm">{msg.includes("success") ? "check_circle" : "error"}</span>
                                {msg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Patient ID</label>
                                <input 
                                    type="text" 
                                    name="patientId" 
                                    value={formData.patientId} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                    placeholder="Enter patient ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Patient Name (Optional)</label>
                                <input 
                                    type="text" 
                                    name="patientName" 
                                    value={formData.patientName} 
                                    onChange={handleChange}
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                    placeholder="Enter patient name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Medicines (Comma separated)</label>
                                <input 
                                    type="text" 
                                    name="medicines" 
                                    value={formData.medicines} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Paracetamol 500mg, Amoxicillin"
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Doctor's Notes</label>
                                <textarea 
                                    name="notes" 
                                    value={formData.notes} 
                                    onChange={handleChange} 
                                    rows="3" 
                                    placeholder="Take after meals..."
                                    className="w-full bg-white border border-teal-500/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all resize-none"
                                ></textarea>
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
                                        <span className="material-symbols-outlined text-sm">prescriptions</span>
                                        Issue Prescription
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Recent Prescriptions */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-headline font-bold text-on-surface mb-4">Recent Prescriptions</h3>
                        {prescriptions.length === 0 ? (
                            <div className="bg-surface-container-lowest p-12 rounded-2xl text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">medication</span>
                                <p className="text-on-surface-variant font-body">No prescriptions issued yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {[...prescriptions].reverse().map((p) => (
                                    <div key={p._id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-headline font-bold text-on-surface">{p.patientName || p.patientId}</h4>
                                                <p className="text-xs text-on-surface-variant">{new Date(p.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-primary">medication</span>
                                        </div>
                                        <div className="mb-3">
                                            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Medicines:</p>
                                            <ul className="list-disc list-inside text-sm text-on-surface">
                                                {p.medicines?.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                        {p.notes && (
                                            <div className="bg-surface-container-high p-3 rounded-lg">
                                                <p className="text-xs text-on-surface-variant">{p.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
