import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import CallModal from './components/CallModal';
import LandingPage from './pages/LandingPage';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      {/* Global incoming call modal */}
      {isAuthenticated && <CallModal />}

      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              !user?.profileSetupComplete ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              !user?.profileSetupComplete ? (
                <Navigate to="/profile-setup" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Register />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireSetup>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:userId"
          element={
            <ProtectedRoute requireSetup>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Default route: Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
