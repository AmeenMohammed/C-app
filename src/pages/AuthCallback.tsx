import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { toast } from 'sonner';
import { getAuthCallbackUrl } from '@/lib/auth-redirect';
import { isHashRouterMode } from '@/lib/router-mode';

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const getCallbackParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const fragment = isHashRouterMode()
        ? window.location.hash.split('#').slice(2).join('#')
        : window.location.hash.slice(1);

      return {
        fragmentParams: new URLSearchParams(fragment),
        searchParams,
      };
    };

    const clearAuthTimeout = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const ensureUserProfile = async (user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']) => {
      if (!user) return;

      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) return;

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile check error:', profileError);
          return;
        }

        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'User',
            avatar_url:
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null,
            bio: "Hello! I'm new to this platform.",
            phone: user.phone || '',
            location: 'Location not set'
          });

        if (insertError && insertError.code !== '23505') {
          console.error('Manual profile creation failed:', insertError);
          toast.error('Account created but profile setup failed. Please complete your profile in settings.');
        }
      } catch (error) {
        console.error('Profile setup error:', error);
      }
    };

    const finishAuthSuccess = async (user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']) => {
      if (!isMounted) return;

      clearAuthTimeout();
      await ensureUserProfile(user);

      if (isMounted) {
        navigate('/home', { replace: true });
      }
    };

    const handleAuthCallback = async () => {
      // Prevent multiple processing
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        const { fragmentParams, searchParams } = getCallbackParams();

        // Check for error parameters first
        const error = fragmentParams.get('error') || searchParams.get('error');
        const errorDescription =
          fragmentParams.get('error_description') ||
          searchParams.get('error_description');
        const errorCode =
          fragmentParams.get('error_code') ||
          searchParams.get('error_code');

        if (error) {
          console.error('OAuth error:', error, errorDescription, errorCode);

          // Handle specific database error for new user creation
          if (error === 'server_error' && errorDescription?.includes('Database error saving new user')) {
            toast.error('There was an issue creating your account. Please try again, or contact support if the problem persists.');
            console.error('Database user creation error - this might be due to missing triggers or functions');
          } else {
            toast.error(errorDescription || 'Authentication failed. Please try again.');
          }

          navigate('/', { replace: true });
          return;
        }

        const accessToken =
          fragmentParams.get('access_token') ||
          searchParams.get('access_token');
        const refreshToken =
          fragmentParams.get('refresh_token') ||
          searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error('Set session error:', setSessionError);
            toast.error('Authentication failed. Please try again.');
            navigate('/', { replace: true });
            return;
          }

          window.history.replaceState(
            null,
            '',
            getAuthCallbackUrl()
          );
        }

        // Let Supabase handle the OAuth callback automatically
        // This processes the tokens in the URL
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);

          // Handle specific session errors
          if (sessionError.message?.includes('Database error')) {
            toast.error('Account creation failed. Please try signing in again.');
          } else {
            toast.error('Authentication failed. Please try again.');
          }

          navigate('/', { replace: true });
          return;
        }

        if (data.session?.user) {
          await finishAuthSuccess(data.session.user);
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              subscription.unsubscribe();
              await finishAuthSuccess(session.user);
            } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
              subscription.unsubscribe();
              clearAuthTimeout();
              toast.error('Authentication failed. Please try again.');
              navigate('/', { replace: true });
            }
          }
        );

        timeoutRef.current = window.setTimeout(async () => {
          subscription.unsubscribe();
          const { data: userData } = await supabase.auth.getUser();

          if (!userData.user) {
            toast.error('Authentication timeout. Please try again.');
            navigate('/', { replace: true });
          }
        }, 15000);
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        toast.error('An unexpected error occurred. Please try again.');
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
      clearAuthTimeout();
    };
  }, [navigate]);

  return (
    <LoadingScreen
      message="Completing authentication..."
      fullScreen={true}
    />
  );
};

export default AuthCallback;
