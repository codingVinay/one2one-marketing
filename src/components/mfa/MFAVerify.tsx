import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Shield, ArrowLeft } from 'lucide-react';

interface MFAVerifyProps {
  onVerified: () => void;
  onCancel?: () => void;
}

const MFAVerify = ({ onVerified, onCancel }: MFAVerifyProps) => {
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the TOTP factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;

      const totpFactor = factorsData?.totp?.[0];

      if (!totpFactor) {
        throw new Error('No authenticator found. Please contact support.');
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'Verified!',
        description: 'Two-factor authentication successful.',
      });

      onVerified();
    } catch (error: any) {
      const message = error.message || 'Invalid verification code';
      setError(message);
      toast({
        title: 'Verification Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verifyCode.length === 6) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mfaCode">Verification Code</Label>
            <Input
              id="mfaCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => {
                setVerifyCode(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading || verifyCode.length !== 6}
            className="w-full h-11"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full h-11"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Open your authenticator app (Google Authenticator, Authy, etc.) to get your verification code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAVerify;
