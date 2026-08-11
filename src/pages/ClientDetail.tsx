import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, Link2, Building } from 'lucide-react';

const PROVIDERS = ['instagram', 'facebook', 'youtube', 'linkedin', 'twitter'] as const;
const PROVIDER_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
};

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['clientDetail', id],
    queryFn: async () => {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*, packages ( id, name, price, monthly_posts )')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;

      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('id, provider, account_name, username, is_active')
        .eq('client_id', id);

      return { client, accounts: accounts || [] };
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

  if (!data?.client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold">Client not available</h2>
            <p className="text-sm text-muted-foreground">
              This client doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const client: any = data.client;
  const accounts = data.accounts;

  return (
    <div className="min-h-screen bg-background p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>{client.status}</Badge>
            {client.industry && <Badge variant="outline">{client.industry}</Badge>}
            {client.packages && <Badge variant="outline">{client.packages.name}</Badge>}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link to={`/client/${client.id}/social-accounts`}>
            <Button size="sm">
              <Link2 className="h-4 w-4 mr-1.5" />
              Social Accounts
            </Button>
          </Link>
          <Link to={`/client/${client.id}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium truncate">{client.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{client.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Posts / month</p>
              <p className="font-medium">{client.monthly_posts ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(client.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connected Social Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PROVIDERS.map((provider) => {
              const linked = accounts.filter((a: any) => a.provider === provider && a.is_active);
              return (
                <div key={provider} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span>{PROVIDER_LABELS[provider]}</span>
                  <span className="text-muted-foreground truncate max-w-[60%] text-right">
                    {linked.length > 0
                      ? linked.map((a: any) => (a.username ? `@${a.username}` : a.account_name)).join(', ')
                      : '—'}
                  </span>
                </div>
              );
            })}
            <Link to={`/client/${client.id}/social-accounts`} className="block pt-2">
              <Button variant="outline" size="sm" className="w-full">Manage social accounts</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDetail;
