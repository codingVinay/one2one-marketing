import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Shield, Copy, Check, Smartphone } from 'lucide-react';

interface MFASetupProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const MFASetup = ({ onComplete, onCancel }: MFASetupProps) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Social Media Manager',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      if (data?.totp) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('verify');
      }
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to start MFA enrollment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndActivate = async () => {
    if (verifyCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'MFA Enabled!',
        description: 'Two-factor authentication has been successfully enabled.',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Secret key copied to clipboard',
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">
          {step === 'setup' ? 'Set Up Two-Factor Authentication' : 'Verify Your Authenticator'}
        </CardTitle>
        <CardDescription>
          {step === 'setup'
            ? 'Add an extra layer of security to your account using an authenticator app'
            : 'Scan the QR code with your authenticator app and enter the verification code'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'setup' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Supported Apps</p>
                <p className="text-muted-foreground">
                  Google Authenticator, Microsoft Authenticator, Authy, 1Password, or any TOTP-compatible app
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {onCancel && (
                <Button 
                  variant="outline" 
                  onClick={onCancel} 
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
              )}
              <Button 
                onClick={startEnrollment} 
                disabled={loading}
                className="flex-1 h-11"
              >
                {loading ? 'Setting up...' : 'Continue'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              <div 
                className="p-4 bg-white rounded-lg border"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app
              </p>
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Can't scan? Enter this key manually:
              </Label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs break-all font-mono">
                  {secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-2">
              <Label htmlFor="verifyCode">Enter verification code</Label>
              <Input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                className="h-11 text-center text-lg tracking-widest font-mono"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep('setup');
                  setQrCode('');
                  setSecret('');
                  setFactorId('');
                  setVerifyCode('');
                }}
                className="flex-1 h-11"
              >
                Back
              </Button>
              <Button 
                onClick={verifyAndActivate}
                disabled={loading || verifyCode.length !== 6}
                className="flex-1 h-11"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MFASetup;
