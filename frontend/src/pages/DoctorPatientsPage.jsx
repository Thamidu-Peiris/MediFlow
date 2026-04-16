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
            <div className="max-w-6xl mx-auto space-y-10 p-2 md:p-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CBF79D]/20 text-[#437A00] text-[10px] font-bold uppercase tracking-widest border border-[#CBF79D]/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#437A00] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#437A00]"></span>
                            </span>
                            Patient Directory
                        </div>
                        <h1 className="text-4xl font-headline font-black text-[#043927] tracking-tight">Medical Records</h1>
                        <p className="text-[#043927]/50 font-medium text-lg">Retrieve and review patient-uploaded medical reports.</p>
                    </div>
                </div>

                {/* Search Hub */}
                <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-[#043927]/5 border border-[#356600]/5">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-5">
                        <div className="relative flex-1 group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#CBF79D]/10 rounded-xl flex items-center justify-center text-[#437A00] transition-colors group-focus-within:bg-[#CBF79D]/30">
                                <span className="material-symbols-outlined text-2xl">person_search</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter Patient ID (e.g. 64abc123...)"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-[2rem] pl-20 pr-8 py-5 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm placeholder-[#043927]/30"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="group relative flex items-center justify-center gap-3 bg-[#043927] text-white font-black px-12 py-5 rounded-[2rem] hover:bg-[#437A00] transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-xl shadow-[#043927]/20"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white/30 border-t-[#CBF79D]"></div>
                                    <span className="tracking-wide">Scanning...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110 group-hover:rotate-12">search</span>
                                    <span className="tracking-wide">Retrieve Reports</span>
                                </>
                            )}
                        </button>
                    </form>
                    
                    {errorMsg && (
                        <div className="mt-6 flex items-center gap-3 bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-4">
                            <span className="material-symbols-outlined text-xl">error_outline</span>
                            <span className="text-sm font-bold">{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {hasSearched && !loading && !errorMsg && (
                    <div className="space-y-8 px-2">
                        <div className="flex items-center justify-between border-b border-[#356600]/10 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#437A00] shadow-sm border border-[#356600]/5">
                                    <span className="material-symbols-outlined">folder_shared</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-headline font-black text-[#043927]">Records Found</h3>
                                    <p className="text-xs font-bold text-[#437A00] uppercase tracking-widest italic">Patient ID: {patientId}</p>
                                </div>
                            </div>
                            <span className="px-4 py-1.5 bg-[#CBF79D] text-[#043927] rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-[#043927]/10">
                                {reports.length} Reports
                            </span>
                        </div>

                        {reports.length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] text-center border border-[#356600]/5 shadow-xl shadow-[#043927]/5">
                                <div className="w-24 h-24 bg-[#fcfdfa] rounded-[2.5rem] flex items-center justify-center text-[#043927]/10 mx-auto mb-8">
                                    <span className="material-symbols-outlined text-6xl">folder_off</span>
                                </div>
                                <h4 className="text-2xl font-headline font-black text-[#043927]">No reports available</h4>
                                <p className="text-[#043927]/40 font-medium max-w-sm mx-auto mt-2 italic">This patient profile currently has no uploaded medical documentation for review.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {reports.map((report) => (
                                    <article 
                                        key={report._id} 
                                        className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-[#043927]/5 border border-[#356600]/5 transition-all duration-300 hover:shadow-2xl hover:shadow-[#043927]/10 hover:-translate-y-2 group"
                                    >
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div className="w-16 h-16 bg-[#CBF79D] rounded-[1.5rem] flex items-center justify-center text-[#043927] shadow-sm group-hover:scale-110 transition-transform duration-500">
                                                    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>description</span>
                                                </div>
                                                <div className="px-3 py-1 bg-[#fcfdfa] border border-[#356600]/10 rounded-lg">
                                                    <p className="text-[10px] font-black text-[#043927]/40 uppercase tracking-tighter">Verified</p>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-lg font-headline font-black text-[#043927] group-hover:text-[#437A00] transition-colors line-clamp-2 min-h-[3.5rem] break-all">
                                                    {report.fileName}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#356600]/5">
                                                    <span className="material-symbols-outlined text-sm text-[#043927]/30">event_note</span>
                                                    <p className="text-[11px] font-bold text-[#043927]/40 uppercase tracking-widest italic">
                                                        Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <a
                                                href={`http://localhost:8081${report.filePath}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group/btn flex items-center justify-center gap-3 w-full bg-[#fcfdfa] border border-[#356600]/10 text-[#043927] font-black py-4 rounded-2xl hover:bg-[#CBF79D] hover:border-[#043927]/10 transition-all duration-300 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-xl transition-transform group-hover/btn:scale-110">visibility</span>
                                                <span className="tracking-wide">Review Document</span>
                                            </a>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DoctorShell>
    );
}
