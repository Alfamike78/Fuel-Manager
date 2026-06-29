import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { NotificationsProvider } from './contexts/NotificationsContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import PWAInstallBanner from './components/PWAInstallBanner.jsx';

// Pages
import LandingPage from './pages/landing/LandingPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import SuperAdminDashboard from './pages/superadmin/DashboardPage.jsx';
import SuperAdminCompanies from './pages/superadmin/CompaniesPage.jsx';
import SuperAdminPlans from './pages/superadmin/PlansPage.jsx';
import CompanyDashboard from './pages/company/DashboardPage.jsx';
import TanksPage from './pages/company/tanks/TanksPage.jsx';
import BasesPage from './pages/company/bases/BasesPage.jsx';
import AircraftPage from './pages/company/aircraft/AircraftPage.jsx';
import VehiclesPage from './pages/company/vehicles/VehiclesPage.jsx';
import OperationsPage from './pages/company/operations/OperationsPage.jsx';
import ReportsPage from './pages/company/reports/ReportsPage.jsx';
import UsersPage from './pages/company/users/UsersPage.jsx';
import ProfilePage from './pages/company/profile/ProfilePage.jsx';
import NotificationsPage from './pages/company/notifications/NotificationsPage.jsx';
import SettingsPage from './pages/company/settings/SettingsPage.jsx';
import AuditLogPage from './pages/company/audit/AuditLogPage.jsx';
import InviteAcceptPage from './pages/invite/InviteAcceptPage.jsx';

// Banner visibile quando il superadmin sta operando dentro un'azienda
const ImpersonationBanner = () => {
  const { isImpersonating, user, exitImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    exitImpersonation();
    navigate('/superadmin/companies');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-sm font-semibold flex items-center justify-between px-4 py-2 shadow-lg">
      <span>
        👑 SuperAdmin — Stai operando come <strong>{user?.company_name}</strong>. Tutte le modifiche sono reali.
      </span>
      <button
        onClick={handleExit}
        className="ml-4 px-3 py-1 bg-white text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors"
      >
        ← Esci dall'azienda
      </button>
    </div>
  );
};

// Loading fallback
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Caricamento...</p>
    </div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on actual role
    if (user?.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public route (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    if (user?.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* SuperAdmin portal */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/companies"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <SuperAdminCompanies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/plans"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <SuperAdminPlans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/*"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Company portal (admin + operator) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tanks"
        element={
          <ProtectedRoute>
            <TanksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/bases"
        element={
          <ProtectedRoute>
            <BasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/aircraft"
        element={
          <ProtectedRoute>
            <AircraftPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vehicles"
        element={
          <ProtectedRoute>
            <VehiclesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/operations"
        element={
          <ProtectedRoute>
            <OperationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />

      {/* User management */}
      <Route
        path="/dashboard/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      {/* Profile */}
      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      {/* Audit log */}
      <Route
        path="/dashboard/audit"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      {/* Settings */}
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      {/* Notifications */}
      <Route
        path="/dashboard/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      {/* Invite accept (public) */}
      <Route path="/invite/:token" element={<InviteAcceptPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <ImpersonationBanner />
          <Suspense fallback={<LoadingScreen />}>
            <AppRoutes />
          </Suspense>
          <PWAInstallBanner />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
