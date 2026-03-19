import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const EmployeeDashboardPage = lazy(() => import('./pages/employee/EmployeeDashboardPage'));
const AttendancePage = lazy(() => import('./pages/employee/AttendancePage'));
const TaskListPage = lazy(() => import('./pages/employee/TaskListPage'));
const DailyReportPage = lazy(() => import('./pages/employee/DailyReportPage'));
const EmployeeProfilePage = lazy(() => import('./pages/employee/EmployeeProfilePage'));
const LeavePage = lazy(() => import('./pages/employee/LeavePage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminEmployeesPage = lazy(() => import('./pages/admin/AdminEmployeesPage'));
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage'));
const AdminTaskAssignmentPage = lazy(() => import('./pages/admin/AdminTaskAssignmentPage'));
const AdminAttendancePage = lazy(() => import('./pages/admin/AdminAttendancePage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

function DefaultRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/employee'} replace />;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <LoadingSpinner text="Loading page..." />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<DefaultRoute />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeDashboardPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="report" element={<DailyReportPage />} />
          <Route path="profile" element={<EmployeeProfilePage />} />
          <Route path="leaves" element={<LeavePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="employees" element={<AdminEmployeesPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="tasks" element={<AdminTaskAssignmentPage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
