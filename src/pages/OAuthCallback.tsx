import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const provider = searchParams.get('provider');
      const clientId = searchParams.get('client_id');
      const error = searchParams.get('error');

      if (error) {
        toast({
          title: "Authentication Error",
          description: error,
          variant: "destructive",
        });
        window.close();
        return;
      }

      if (!code || !state || !provider) {
        toast({
          title: "Error",
          description: "Missing required parameters",
          variant: "destructive",
        });
        window.close();
        return;
      }

      try {
        const { data, error: callbackError } = await supabase.functions.invoke('oauth-callback', {
          body: {
            code,
            state,
            provider,
            clientId,
            userId: user?.id,
          },
        });

        if (callbackError) throw callbackError;

        toast({
          title: "Success",
          description: `${provider} account connected successfully!`,
        });

        // Close the popup window
        window.close();

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to complete authentication",
          variant: "destructive",
        });
        window.close();
      }
    };

    handleCallback();
  }, [searchParams, user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;