import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingScreen } from '@/components/LoadingScreen';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple processing
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        // First, check if there's a session in the URL hash (from OAuth redirect)
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const urlParams = new URLSearchParams(window.location.search);

        // Check for error parameters first
        const error = hashParams.get('error') || urlParams.get('error');
        const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');
        const errorCode = hashParams.get('error_code') || urlParams.get('error_code');

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

        // If no immediate session, wait for auth state change
        if (!data.session) {
          // Set up a one-time listener for auth state changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === 'SIGNED_IN' && session) {
                subscription.unsubscribe();

                // Check if user profile was created successfully
                try {
                  const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                  if (profileError && profileError.code === 'PGRST116') {
                    // No profile found, try to create one manually
                    console.log('No profile found, attempting to create manually...');

                    const { error: insertError } = await supabase
                      .from('user_profiles')
                      .insert({
                        user_id: session.user.id,
                        full_name: session.user.user_metadata?.full_name ||
                                  session.user.user_metadata?.name ||
                                  session.user.email?.split('@')[0] ||
                                  'User',
                        avatar_url: session.user.user_metadata?.avatar_url ||
                                   session.user.user_metadata?.picture ||
                                   null,
                        bio: 'Hello! I\'m new to this platform.',
                        phone: session.user.phone || '',
                        location: 'Location not set'
                      });

                    if (insertError) {
                      console.error('Manual profile creation failed:', insertError);
                      toast.error('Account created but profile setup failed. Please complete your profile in settings.');
                    }
                  }
                } catch (profileError) {
                  console.error('Profile check error:', profileError);
                }

                navigate('/home', { replace: true });
              } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                subscription.unsubscribe();
                toast.error('Authentication failed. Please try again.');
                navigate('/', { replace: true });
              }
            }
          );

          // Set a timeout to prevent infinite waiting
          setTimeout(() => {
            subscription.unsubscribe();
            const currentUser = supabase.auth.getUser();
            if (!currentUser) {
              toast.error('Authentication timeout. Please try again.');
              navigate('/', { replace: true });
            }
          }, 15000); // 15 second timeout
        } else {
          // Session is immediately available
          // Check if user profile exists
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', data.session.user.id)
              .single();

            if (profileError && profileError.code === 'PGRST116') {
              // No profile found, try to create one manually
              console.log('No profile found, attempting to create manually...');

              const { error: insertError } = await supabase
                .from('user_profiles')
                .insert({
                  user_id: data.session.user.id,
                  full_name: data.session.user.user_metadata?.full_name ||
                            data.session.user.user_metadata?.name ||
                            data.session.user.email?.split('@')[0] ||
                            'User',
                  avatar_url: data.session.user.user_metadata?.avatar_url ||
                             data.session.user.user_metadata?.picture ||
                             null,
                  bio: 'Hello! I\'m new to this platform.',
                  phone: data.session.user.phone || '',
                  location: 'Location not set'
                });

              if (insertError) {
                console.error('Manual profile creation failed:', insertError);
                toast.error('Account created but profile setup failed. Please complete your profile in settings.');
              }
            }
          } catch (profileError) {
            console.error('Profile check error:', profileError);
          }

          navigate('/home', { replace: true });
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