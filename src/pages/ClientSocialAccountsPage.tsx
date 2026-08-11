import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import ClientSocialAccounts from '@/components/forms/ClientSocialAccounts';

const ClientSocialAccountsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading, error } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, industry, status')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold">Client not available</h2>
            <p className="text-sm text-muted-foreground">
              This client doesn't exist or you don't have access to manage it.
            </p>
            <Button onClick={() => navigate('/client-management')} className="w-full">
              Back to Client Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-1">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <h1 className="text-2xl font-bold truncate">{client.name}</h1>
            <p className="text-sm text-muted-foreground">Social Media Accounts</p>
          </div>
          <Link to={`/client/${client.id}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </Button>
          </Link>
        </div>

        <ClientSocialAccounts clientId={client.id} />
      </div>
    </div>
  );
};

export default ClientSocialAccountsPage;
