
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import ClientBasicInfo from './forms/ClientBasicInfo';
import ClientPackageSelection from './forms/ClientPackageSelection';

interface AddClientFormProps {
  onClose: () => void;
}

const AddClientForm = ({ onClose }: AddClientFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    email: '',
    phone: '',
    password: '',
    package_id: null as string | null,
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  

  const handleBasicInfoChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handlePackageChange = (packageId: string | null) => {
    setFormData(prev => ({ ...prev, package_id: packageId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.email || !formData.password || !formData.name) {
      toast({
        title: "Missing Information",
        description: "Please provide client name, email, and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create a pending user request for client account
      const { error } = await supabase
        .from('pending_users')
        .insert([{
          email: formData.email,
          full_name: formData.name,
          password_hash: formData.password, // In production, this should be hashed
          requested_role: 'client',
          requested_by_user_id: user.id,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Client Account Request Created",
        description: "Client account request has been submitted for superuser approval.",
      });

      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create client account request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <ClientBasicInfo
          formData={formData}
          onChange={handleBasicInfoChange}
        />

        <ClientPackageSelection
          selectedPackageId={formData.package_id}
          onPackageChange={handlePackageChange}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating Request...' : 'Create Client Account Request'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddClientForm;
