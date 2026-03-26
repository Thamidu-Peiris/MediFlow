import { useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function DoctorPatientsPage() {
    const { authHeaders } = useAuth();
    const [patientId, setPatientId] = useState("");
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!patientId.trim()) return;

        setLoading(true);
        setErrorMsg("");
        setHasSearched(true);

        try {
            const res = await api.get(`/doctors/patient-reports/${patientId.trim()}`, authHeaders);
            setReports(res.data.reports || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setErrorMsg("Patient profile not found.");
            } else {
                setErrorMsg("Failed to fetch reports. Ensure the patient ID is correct.");
            }
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DoctorShell title="Patient Reports" subtitle="View patient-uploaded medical reports">
            <div style={{ background: "#fff", padding: "2rem", borderRadius: "8px", border: "1px solid #eee", marginBottom: "2rem" }}>
                <form onSubmit={handleSearch} style={{ display: "flex", gap: "1rem" }}>
                    <input
                        type="text"
                        placeholder="Enter Patient ID (e.g. 64abc123...)"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        style={{ flex: 1, padding: "0.75rem", border: "1px solid #ccc", borderRadius: "4px" }}
                        required
                    />
                    <button type="submit" className="mf-primary-btn" disabled={loading}>
                        {loading ? "Searching..." : "Search"}
                    </button>
                </form>
                {errorMsg && <p style={{ color: "red", marginTop: "1rem" }}>{errorMsg}</p>}
            </div>

            {hasSearched && !loading && !errorMsg && (
                <div>
                    <h3>Reports for Patient ID: {patientId}</h3>

                    {reports.length === 0 ? (
                        <p>No reports uploaded by this patient.</p>
                    ) : (
                        <div className="pd-grid pd-grid-3" style={{ marginTop: "1.5rem" }}>
                            {reports.map((report) => (
                                <div key={report._id} className="pd-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                    <div>
                                        <h4 style={{ margin: "0 0 0.5rem 0", wordBreak: "break-all" }}>{report.fileName}</h4>
                                        <p style={{ fontSize: "0.8rem", color: "#666", margin: "0 0 1rem 0" }}>
                                            Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <a
                                        href={`http://localhost:8081${report.filePath}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mf-secondary-btn"
                                        style={{ textAlign: "center", textDecoration: "none" }}
                                    >
                                        View / Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </DoctorShell>
    );
}
