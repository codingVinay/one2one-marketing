import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, ShieldOff, Trash2, Plus } from 'lucide-react';
import MFASetup from './MFASetup';

interface MFAFactor {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
}

const MFASettings = () => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [factorToRemove, setFactorToRemove] = useState<MFAFactor | null>(null);

  const loadFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      // Combine all factor types
      const allFactors: MFAFactor[] = [
        ...(data?.totp || []),
      ];
      
      setFactors(allFactors.filter(f => f.status === 'verified'));
    } catch (error: any) {
      console.error('Failed to load MFA factors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleRemoveFactor = async () => {
    if (!factorToRemove) return;

    setRemovingFactorId(factorToRemove.id);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorToRemove.id,
      });

      if (error) throw error;

      toast({
        title: 'MFA Removed',
        description: 'Two-factor authentication has been disabled.',
      });

      setFactors(prev => prev.filter(f => f.id !== factorToRemove.id));
    } catch (error: any) {
      toast({
        title: 'Failed to Remove',
        description: error.message || 'Could not remove authenticator',
        variant: 'destructive',
      });
    } finally {
      setRemovingFactorId(null);
      setShowRemoveDialog(false);
      setFactorToRemove(null);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    loadFactors();
  };

  const hasMFA = factors.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showSetup) {
    return (
      <MFASetup 
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasMFA ? (
                <ShieldCheck className="h-5 w-5 text-primary" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  {hasMFA 
                    ? 'Your account is protected with 2FA'
                    : 'Add an extra layer of security'
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasMFA ? 'default' : 'secondary'}>
              {hasMFA ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {factors.length > 0 ? (
            <div className="space-y-3">
              {factors.map((factor) => (
                <div 
                  key={factor.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">
                        {factor.friendly_name || 'Authenticator App'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(factor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFactorToRemove(factor);
                      setShowRemoveDialog(true);
                    }}
                    disabled={removingFactorId === factor.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Protect your account with an authenticator app like Google Authenticator or Authy.
              </p>
            </div>
          )}

          <Button 
            onClick={() => setShowSetup(true)}
            variant={hasMFA ? 'outline' : 'default'}
            className="w-full h-11"
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasMFA ? 'Add Another Authenticator' : 'Set Up Authenticator App'}
          </Button>
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Authenticator?</DialogTitle>
            <DialogDescription>
              This will disable two-factor authentication for your account. 
              You can set it up again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveDialog(false);
                setFactorToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFactor}
              disabled={removingFactorId !== null}
            >
              {removingFactorId ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MFASettings;
