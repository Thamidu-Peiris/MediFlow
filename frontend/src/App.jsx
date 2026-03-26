import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterRolePage from "./pages/RegisterRolePage";
import DoctorsPage from "./pages/DoctorsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import PatientProfilePage from "./pages/PatientProfilePage";
import MedicalReportsPage from "./pages/MedicalReportsPage";
import MedicalHistoryPage from "./pages/MedicalHistoryPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import AppointmentHistoryPage from "./pages/AppointmentHistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

// Doctor Portal Pages
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import DoctorAvailabilityPage from "./pages/DoctorAvailabilityPage";
import DoctorAppointmentsPage from "./pages/DoctorAppointmentsPage";
import DoctorPrescriptionsPage from "./pages/DoctorPrescriptionsPage";
import DoctorPatientsPage from "./pages/DoctorPatientsPage";
import TelemedicinePage from "./pages/TelemedicinePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/:role" element={<RegisterRolePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/doctors" element={<DoctorsPage />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboardPage /></ProtectedRoute>} />

      {/* Patient Routes */}
      <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientDashboardPage /></ProtectedRoute>} />
      <Route path="/patient/profile" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientProfilePage /></ProtectedRoute>} />
      <Route path="/patient/reports" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><MedicalReportsPage /></ProtectedRoute>} />
      <Route path="/patient/history" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><MedicalHistoryPage /></ProtectedRoute>} />
      <Route path="/patient/prescriptions" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PrescriptionsPage /></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><AppointmentHistoryPage /></ProtectedRoute>} />

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorDashboardPage /></ProtectedRoute>} />
      <Route path="/doctor/profile" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorProfilePage /></ProtectedRoute>} />
      <Route path="/doctor/availability" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorAvailabilityPage /></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorAppointmentsPage /></ProtectedRoute>} />
      <Route path="/doctor/prescriptions" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorPrescriptionsPage /></ProtectedRoute>} />
      <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorPatientsPage /></ProtectedRoute>} />
      <Route path="/doctor/telemedicine" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><TelemedicinePage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
