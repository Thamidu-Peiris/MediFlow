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
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRoles={["patient", "admin"]}>
            <PatientDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/profile"
        element={
          <ProtectedRoute allowedRoles={["patient", "admin"]}>
            <PatientProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/reports"
        element={
          <ProtectedRoute allowedRoles={["patient", "admin"]}>
            <MedicalReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/history"
        element={
          <ProtectedRoute allowedRoles={["patient", "admin"]}>
            <MedicalHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/prescriptions"
        element={
          <ProtectedRoute allowedRoles={["patient", "admin"]}>
            <PrescriptionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/appointments"
        element={
          <ProtectedRoute allowedRoles={["patient", "admin"]}>
            <AppointmentHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
