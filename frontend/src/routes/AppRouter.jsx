import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/DashboardPage';
import HealthPage from '../pages/HealthPage';
import UsersPage from '../pages/admin/UsersPage';
import DepartmentsPage from '../pages/admin/DepartmentsPage';
import CoursesPage from '../pages/admin/CoursesPage';
import EnrollmentPage from '../pages/admin/EnrollmentPage';
import CourseDetailsPage from '../pages/faculty/CourseDetailsPage';
import MarksEntryPage from '../pages/faculty/MarksEntryPage';
import COAttainmentPage from '../pages/faculty/COAttainmentPage';
import FacultyReportsPage from '../pages/faculty/FacultyReportsPage';
import CurriculumOutcomesPage from '../pages/coordinator/CurriculumOutcomesPage';
import COPOMappingPage from '../pages/coordinator/COPOMappingPage';
import ProgrammeReportPage from '../pages/coordinator/ProgrammeReportPage';
import EarlyWarningPage from '../pages/faculty/EarlyWarningPage';
import ModelPage from '../pages/admin/ModelPage';
import CoordinatorsPage from '../pages/admin/CoordinatorsPage';
import MyFacultyPage from '../pages/coordinator/MyFacultyPage';
import DepartmentSetupPage from '../pages/coordinator/DepartmentSetupPage';

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes wrapped in AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/health" element={<HealthPage />} />

            {/* Admin Module */}
            <Route path="/users" element={<UsersPage />} />
            <Route path="/coordinators" element={<CoordinatorsPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            {/* Courses & Faculty Setup */}
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailsPage />} />
            <Route path="/enrollments" element={<EnrollmentPage />} />

            {/* Coordinator & Curriculum Module */}
            <Route path="/my-faculty" element={<MyFacultyPage />} />
            <Route path="/department-setup" element={<DepartmentSetupPage />} />
            <Route path="/outcomes" element={<CurriculumOutcomesPage />} />
            <Route path="/mappings" element={<COPOMappingPage />} />
            <Route path="/curriculum" element={<COPOMappingPage />} />
            <Route path="/programme-report" element={<ProgrammeReportPage />} />

            {/* Faculty & Marks Entry */}
            <Route path="/marks" element={<MarksEntryPage />} />
            <Route path="/attainment" element={<COAttainmentPage />} />
            <Route path="/early-warning" element={<EarlyWarningPage />} />
            <Route path="/reports" element={<FacultyReportsPage />} />

            {/* ML Intelligence Module */}
            <Route path="/model" element={<ModelPage />} />
          </Route>

          {/* Public Landing Route */}
          <Route path="/" element={<HomePage />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
