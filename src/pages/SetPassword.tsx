import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Lock, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'validating' | 'ready' | 'invalid';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>('validating');
  const navigate = useNavigate();

  useEffect(() => {
    const validate = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash') ?? params.get('token');
      const type = (params.get('type') ?? 'invite') as 'invite' | 'recovery' | 'signup';

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (!error) {
          setStatus('ready');
          return;
        }
      }

      // Hash-fragment links (#access_token=...) are consumed automatically by the client.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('ready');
      } else {
        setStatus('invalid');
      }
    };

    validate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please make sure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Use at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      toast({
        title: 'Registration complete',
        description: 'Your password has been set. Please sign in to continue.',
      });
      await supabase.auth.signOut();
      navigate('/auth');
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (status !== 'ready') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            {status === 'validating' ? (
              <p className="text-muted-foreground">Validating your registration link...</p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  This registration link is invalid or has expired. Please ask your administrator to
                  send a new invitation.
                </p>
                <Button variant="outline" onClick={() => navigate('/auth')}>
                  Back to sign in
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete your registration</CardTitle>
          <p className="text-muted-foreground">Choose a password to finish setting up your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving password...' : 'Save password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPassword;
