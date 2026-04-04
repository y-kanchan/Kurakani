import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSetup?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireSetup = false }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireSetup && !user?.profileSetupComplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
