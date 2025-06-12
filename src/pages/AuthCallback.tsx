import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          toast.error('Authentication failed. Please try again.');
          navigate('/', { replace: true });
          return;
        }

        if (data.session) {
          toast.success('Successfully signed in!');
          // Redirect to home page or intended destination
          navigate('/home', { replace: true });
        } else {
          // No session found, redirect to login
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        toast.error('An unexpected error occurred. Please try again.');
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <LoadingScreen
      message="Completing authentication..."
      fullScreen={true}
    />
  );
};

export default AuthCallback;