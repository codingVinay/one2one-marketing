
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import ClientBasicInfo from './forms/ClientBasicInfo';
import ClientPlatforms from './forms/ClientPlatforms';
import ClientSocialLinks from './forms/ClientSocialLinks';
import ClientPackageSelection from './forms/ClientPackageSelection';
import ClientMetrics from './forms/ClientMetrics';

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
    website: '',
    description: '',
    status: 'active',
    platforms: [] as string[],
    monthly_posts: 0,
    followers: 0,
    package_id: null as string | null,
    social_links: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      tiktok: '',
    },
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

  const handleBasicInfoChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMetricsChange = (field: string, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      platforms: checked 
        ? [...prev.platforms, platform]
        : prev.platforms.filter(p => p !== platform)
    }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value,
      },
    }));
  };

  const handlePackageChange = (packageId: string | null) => {
    setFormData(prev => ({ ...prev, package_id: packageId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .insert([{
          ...formData,
          user_id: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Client Added",
        description: "New client has been successfully added.",
      });

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add client.",
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

        <ClientPlatforms
          platforms={platforms}
          selectedPlatforms={formData.platforms}
          onPlatformChange={handlePlatformChange}
        />

        <ClientSocialLinks
          platforms={platforms}
          socialLinks={formData.social_links}
          onSocialLinkChange={handleSocialLinkChange}
        />

        <ClientMetrics
          monthlyPosts={formData.monthly_posts}
          followers={formData.followers}
          onChange={handleMetricsChange}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Adding...' : 'Add Client'}
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
