import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Finishing the connection...');

  useEffect(() => {
    const finish = (ok: boolean, text: string, provider?: string) => {
      setStatus(ok ? 'done' : 'error');
      setMessage(text);
      window.opener?.postMessage(
        { type: 'social-oauth-result', success: ok, message: text, provider },
        window.location.origin,
      );
      setTimeout(() => window.close(), ok ? 1200 : 4000);
    };

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const oauthError =
        searchParams.get('error_description') ??
        searchParams.get('error_message') ??
        searchParams.get('error');

      if (oauthError) return finish(false, oauthError);
      if (!code || !state) return finish(false, 'Missing authorization code or state.');

      try {
        // Only code + state are sent — the server resolves provider, client and
        // PKCE verifier from its own single-use state record.
        const { data, error } = await supabase.functions.invoke('oauth-callback', {
          body: { code, state },
        });
        if (error) {
          const details = 'context' in error ? await (error as any).context?.text?.() : null;
          throw new Error(details ? JSON.parse(details).error ?? details : error.message);
        }
        if (data?.error) throw new Error(data.error);

        finish(true, `${data?.account?.name ?? 'Account'} connected. Syncing data...`, data?.provider);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        finish(false, err.message || 'Failed to complete authentication.');
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-sm">
        {status === 'working' && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        )}
        {status === 'done' && <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />}
        {status === 'error' && <XCircle className="h-10 w-10 text-destructive mx-auto" />}
        <p className="mt-4 text-muted-foreground">{message}</p>
        {status === 'error' && (
          <p className="mt-2 text-xs text-muted-foreground">You can close this window.</p>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
