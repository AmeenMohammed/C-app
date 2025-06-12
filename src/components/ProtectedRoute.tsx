import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Render protected component if authenticated
  return <>{children}</>;
};