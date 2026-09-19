import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import Dashboard from '../pages/Dashboard';
import CoursesPage from '../pages/CoursesPage';
import CourseDetailPage from '../pages/CourseDetailPage';
import AssessmentDetailPage from '../pages/AssessmentDetailPage';
import AssessmentsPage from '../pages/AssessmentsPage';
import AttainmentPage from '../pages/AttainmentPage';
import ReportsPage from '../pages/ReportsPage';

/**
 * AppRoutes — central route definitions.
 *
 * Public routes (AuthLayout):
 *   /login, /register
 *
 * Protected routes (AppLayout — redirects to /login if unauthenticated):
 *   /dashboard, /courses, /assessments, /attainment, /reports
 *
 * Root (/) redirects to /dashboard.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Auth Routes ──────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* ── Protected App Routes ────────────────────────────────────── */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/courses/:courseId/assessments/:assessmentId" element={<AssessmentDetailPage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/attainment" element={<AttainmentPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      {/* ── Redirects ───────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
