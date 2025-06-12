import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseAuthGuardOptions {
  redirectTo?: string;
  showErrorMessage?: boolean;
  errorMessage?: string;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    redirectTo = '/',
    showErrorMessage = true,
    errorMessage = 'Please sign in to access this page'
  } = options;

  useEffect(() => {
    if (!loading && !user) {
      if (showErrorMessage) {
        toast.error(errorMessage);
      }
      navigate(redirectTo, {
        state: { from: location },
        replace: true
      });
    }
  }, [user, loading, navigate, location, redirectTo, showErrorMessage, errorMessage]);

  return {
    user,
    loading,
    isAuthenticated: !!user
  };
};