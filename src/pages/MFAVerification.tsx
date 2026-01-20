import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MFAVerify from '@/components/mfa/MFAVerify';

const MFAVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVerified = () => {
    // Navigate to the appropriate dashboard after MFA verification
    navigate('/');
  };

  const handleCancel = async () => {
    // Sign out and go back to auth page
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <MFAVerify 
      onVerified={handleVerified}
      onCancel={handleCancel}
    />
  );
};

export default MFAVerification;
