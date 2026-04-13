import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterRolePage from "./pages/RegisterRolePage";
import DoctorsPage from "./pages/DoctorsPage";
import DoctorDetailsPage from "./pages/DoctorDetailsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import PatientAppointmentsPage from "./pages/PatientAppointmentsPage";
import PatientProfilePage from "./pages/PatientProfilePage";
import MedicalReportsPage from "./pages/MedicalReportsPage";
import MedicalHistoryPage from "./pages/MedicalHistoryPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import AppointmentHistoryPage from "./pages/AppointmentHistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminBootstrapPage from "./pages/AdminBootstrapPage";
import AdminShell from "./components/AdminShell";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDoctorsVerificationPage from "./pages/AdminDoctorsVerificationPage";
import AdminAppointmentsPage from "./pages/AdminAppointmentsPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminNotificationsPage from "./pages/AdminNotificationsPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AICheckerPage from "./pages/AICheckerPage";
import AboutUsPage from "./pages/AboutUsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ContactUsPage from "./pages/ContactUsPage";
import PatientDoctorsPage from "./pages/PatientDoctorsPage";
import PatientDoctorBookingPage from "./pages/PatientDoctorBookingPage";
import PatientPaymentPage from "./pages/PatientPaymentPage";
import PatientTelemedicinePage from "./pages/PatientTelemedicinePage";

// Doctor Portal Pages
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import DoctorAvailabilityPage from "./pages/DoctorAvailabilityPage";
import DoctorAppointmentsPage from "./pages/DoctorAppointmentsPage";
import DoctorPrescriptionsPage from "./pages/DoctorPrescriptionsPage";
import DoctorPatientsPage from "./pages/DoctorPatientsPage";
import TelemedicinePage from "./pages/TelemedicinePage";
import VideoCallPage from "./pages/VideoCallPage";

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
      <Route path="/about" element={<AboutUsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/contact" element={<ContactUsPage />} />

      {/* Admin Routes */}
      <Route path="/admin/bootstrap" element={<AdminBootstrapPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminDashboardPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminUsersPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/doctors-verification"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminDoctorsVerificationPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminAppointmentsPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminPaymentsPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminReportsPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminNotificationsPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminAnalyticsPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminShell>
              <AdminSettingsPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />

      {/* Patient Routes */}
      <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientDashboardPage /></ProtectedRoute>} />
      <Route path="/patient/doctors" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientDoctorsPage /></ProtectedRoute>} />
      <Route path="/patient/doctors/booking" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientDoctorBookingPage /></ProtectedRoute>} />
      <Route path="/patient/payment" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientPaymentPage /></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientAppointmentsPage /></ProtectedRoute>} />
      <Route path="/patient/telemedicine" element={<ProtectedRoute allowedRoles={["patient", "doctor", "admin"]}><PatientTelemedicinePage /></ProtectedRoute>} />
      <Route path="/patient/profile" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PatientProfilePage /></ProtectedRoute>} />
      <Route path="/patient/reports" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><MedicalReportsPage /></ProtectedRoute>} />
      <Route path="/patient/history" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><MedicalHistoryPage /></ProtectedRoute>} />
      <Route path="/patient/prescriptions" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><PrescriptionsPage /></ProtectedRoute>} />
      <Route path="/ai-checker" element={<ProtectedRoute allowedRoles={["patient", "admin"]}><AICheckerPage /></ProtectedRoute>} />

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorDashboardPage /></ProtectedRoute>} />
      <Route path="/doctor/profile" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorProfilePage /></ProtectedRoute>} />
      <Route path="/doctor/availability" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorAvailabilityPage /></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorAppointmentsPage /></ProtectedRoute>} />
      <Route path="/doctor/prescriptions" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorPrescriptionsPage /></ProtectedRoute>} />
      <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><DoctorPatientsPage /></ProtectedRoute>} />
      <Route path="/doctor/telemedicine" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><TelemedicinePage /></ProtectedRoute>} />
      <Route path="/video-call" element={<ProtectedRoute allowedRoles={["patient", "doctor", "admin"]}><VideoCallPage /></ProtectedRoute>} />

      {/* Public Doctor Routes */}
      <Route path="/doctors/:id" element={<DoctorDetailsPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
