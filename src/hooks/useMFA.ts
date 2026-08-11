import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthMFAGetAuthenticatorAssuranceLevelResponse } from '@supabase/supabase-js';

type AAL = 'aal1' | 'aal2';

interface MFAState {
  currentLevel: AAL | null;
  nextLevel: AAL | null;
  isEnrolled: boolean;
  needsVerification: boolean;
  loading: boolean;
  error: string | null;
}

export const useMFA = () => {
  const [state, setState] = useState<MFAState>({
    currentLevel: null,
    nextLevel: null,
    isEnrolled: false,
    needsVerification: false,
    loading: true,
    error: null,
  });

  const checkMFAStatus = useCallback(async () => {
    try {
      // Get the current assurance level
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) throw aalError;

      // Get enrolled factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;

      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      const isEnrolled = verifiedFactors.length > 0;

      // User needs verification if:
      // 1. They have MFA enrolled (nextLevel is aal2)
      // 2. But current level is only aal1
      const needsVerification = 
        aalData?.currentLevel === 'aal1' && 
        aalData?.nextLevel === 'aal2';

      setState({
        currentLevel: (aalData?.currentLevel as AAL) || null,
        nextLevel: (aalData?.nextLevel as AAL) || null,
        isEnrolled,
        needsVerification,
        loading: false,
        error: null,
      });

      return { isEnrolled, needsVerification };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { isEnrolled: false, needsVerification: false };
    }
  }, []);

  useEffect(() => {
    checkMFAStatus();

    // Re-check when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMFAStatus();
    });

    return () => subscription.unsubscribe();
  }, [checkMFAStatus]);

  return {
    ...state,
    refresh: checkMFAStatus,
  };
};
