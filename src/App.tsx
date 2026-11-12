import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'

// Auth Pages
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'
import Signup from '@/pages/Signup'

// Protected App Pages
import Index from '@/pages/Index'
import Funnel from '@/pages/Funnel'
import Conversations from '@/pages/Conversations'
import Agenda from '@/pages/Agenda'
import Tasks from '@/pages/Tasks'
import Automations from '@/pages/Automations'
import Patients from '@/pages/Patients'
import PatientJourney from '@/pages/PatientJourney'
import ImportPatients from '@/pages/ImportPatients'
import Agents from '@/pages/Agents'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import TestScenarios from '@/pages/TestScenarios'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Main CRM Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Index />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="automations" element={<Automations />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/import" element={<ImportPatients />} />
            <Route path="patients/:id" element={<PatientJourney />} />
            <Route path="agents" element={<Agents />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="test-scenarios" element={<TestScenarios />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  )
}
