import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { Box, CircularProgress } from '@mui/material';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const NewRequest = lazy(() => import('./pages/NewRequest'));
const OfficerDashboard = lazy(() => import('./pages/OfficerDashboard'));
const PRDetail = lazy(() => import('./pages/PRDetail'));
const VendorComparison = lazy(() => import('./pages/VendorComparison'));
const AddVendor = lazy(() => import('./pages/AddVendor'));
const VendorManagement = lazy(() => import('./pages/VendorManagement'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const Analytics = lazy(() => import('./pages/Analytics'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AvatarStudio = lazy(() => import('./pages/AvatarStudio'));
const Profile = lazy(() => import('./pages/Profile'));
const VendorQuoteForm = lazy(() => import('./pages/VendorQuoteForm'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );
}

function LazyPage({ Component, ...props }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component {...props} />
    </Suspense>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'officer') return <Navigate to="/officer-dashboard" replace />;
  return <Navigate to="/manager-dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LazyPage Component={Login} />} />
      <Route path="/accept-invite/:token" element={<LazyPage Component={AcceptInvite} />} />
      <Route path="/" element={<LazyPage Component={LandingPage} />} />
      <Route path="/vendor-quote/:token" element={<LazyPage Component={VendorQuoteForm} />} />

      {/* Protected routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/manager-dashboard" element={
          <ProtectedRoute roles={['manager', 'admin']}>
            <LazyPage Component={ManagerDashboard} />
          </ProtectedRoute>
        } />
        <Route path="/new-request" element={
          <ProtectedRoute roles={['manager', 'admin']}>
            <LazyPage Component={NewRequest} />
          </ProtectedRoute>
        } />
        <Route path="/officer-dashboard" element={
          <ProtectedRoute roles={['officer', 'admin']}>
            <LazyPage Component={OfficerDashboard} />
          </ProtectedRoute>
        } />
        <Route path="/pr/:id" element={<LazyPage Component={PRDetail} />} />
        <Route path="/pr/:id/compare" element={
          <ProtectedRoute roles={['officer', 'admin']}>
            <LazyPage Component={VendorComparison} />
          </ProtectedRoute>
        } />
        <Route path="/add-vendor" element={
          <ProtectedRoute roles={['officer', 'admin']}>
            <LazyPage Component={AddVendor} />
          </ProtectedRoute>
        } />
        <Route path="/manage-vendors" element={
          <ProtectedRoute roles={['officer', 'admin']}>
            <LazyPage Component={VendorManagement} />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <LazyPage Component={AdminPanel} />
          </ProtectedRoute>
        } />
        <Route path="/activity-log" element={
          <ProtectedRoute roles={['admin', 'officer']}>
            <LazyPage Component={ActivityLog} />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={<LazyPage Component={Analytics} />} />
        <Route path="/avatar-studio" element={<LazyPage Component={AvatarStudio} />} />
        <Route path="/profile" element={<LazyPage Component={Profile} />} />
      </Route>

      <Route path="*" element={<LazyPage Component={NotFound} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
