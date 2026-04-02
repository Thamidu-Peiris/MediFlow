import { useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";
import { normalizeReportsList } from "../utils/normalizePatientReports";

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
            setReports(normalizeReportsList(res.data.reports || []));
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
        <DoctorShell>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-1">Patient Reports</h1>
                        <p className="text-on-surface-variant font-body">View patient-uploaded medical reports</p>
                    </div>
                </div>

                {/* Search Form */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl mb-8">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined text-slate-400 absolute left-4 top-1/2 -translate-y-1/2">search</span>
                            <input
                                type="text"
                                placeholder="Enter Patient ID (e.g. 64abc123...)"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                className="w-full bg-white border border-teal-500/10 rounded-xl pl-12 pr-4 py-3 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-primary text-on-primary font-bold px-8 py-3 rounded-xl hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">search</span>
                                    Search
                                </>
                            )}
                        </button>
                    </form>
                    {errorMsg && (
                        <div className="mt-4 flex items-center gap-2 text-error bg-error-container px-4 py-3 rounded-xl">
                            <span className="material-symbols-outlined">error</span>
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Results */}
                {hasSearched && !loading && !errorMsg && (
                    <div>
                        <h3 className="text-xl font-headline font-bold text-on-surface mb-6">Reports for Patient ID: {patientId}</h3>

                        {reports.length === 0 ? (
                            <div className="bg-surface-container-lowest p-12 rounded-2xl text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">folder_open</span>
                                <p className="text-on-surface-variant font-body text-lg">No reports uploaded by this patient.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {reports.map((report) => (
                                    <div 
                                        key={report._id} 
                                        className="bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_20px_40px_rgba(0,29,50,0.06)] hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-4">
                                                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>description</span>
                                            </div>
                                            <h4 className="font-headline font-bold text-on-surface mb-2 break-all">{report.fileName}</h4>
                                            <p className="text-sm text-on-surface-variant mb-4">
                                                Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <a
                                            href={`http://localhost:8081${report.filePath}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-center gap-2 w-full bg-surface-container-high text-primary font-bold py-3 rounded-xl hover:bg-teal-100 transition-all active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                            View / Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DoctorShell>
    );
}
