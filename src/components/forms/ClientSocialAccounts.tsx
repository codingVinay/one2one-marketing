import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Link as LinkIcon,
  Unlink,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  RefreshCw,
  AlertTriangle,
  Plus,
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: string;
  account_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_synced_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
}

interface ProviderStatus {
  id: string;
  label: string;
  enabled: boolean;
  configured: boolean;
}

interface Candidate {
  account_id: string;
  account_name: string | null;
  username: string | null;
  avatar_url: string | null;
  description: string | null;
}

interface ClientSocialAccountsProps {
  clientId?: string;
  onAccountsChange?: (accounts: SocialAccount[]) => void;
}

const platformIcons: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

const platformNames: Record<string, string> = {
  facebook: 'Facebook Pages',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

const ORDER = ['youtube', 'facebook', 'instagram', 'linkedin', 'twitter'];

const ClientSocialAccounts = ({ clientId, onAccountsChange }: ClientSocialAccountsProps) => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [picker, setPicker] = useState<{
    pendingId: string;
    provider: string;
    candidates: Candidate[];
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [attaching, setAttaching] = useState(false);
  const { user } = useAuth();

  const fetchSocialAccounts = useCallback(async () => {
    if (!clientId) return;
    const { data, error } = await supabase
      .from('social_accounts')
      .select(
        'id, provider, account_name, username, avatar_url, is_active, expires_at, last_synced_at, sync_status, sync_error',
      )
      .eq('client_id', clientId)
      .order('provider');

    if (error) {
      console.error('Error fetching social accounts:', error);
      toast({ title: 'Error', description: 'Failed to fetch social accounts.', variant: 'destructive' });
      return;
    }
    setAccounts((data as SocialAccount[]) || []);
    onAccountsChange?.((data as SocialAccount[]) || []);
  }, [clientId, onAccountsChange]);

  useEffect(() => {
    fetchSocialAccounts();
  }, [fetchSocialAccounts]);

  useEffect(() => {
    supabase.functions
      .invoke('oauth-connect', { body: { action: 'status' } })
      .then(({ data }) => setProviders(data?.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  // The OAuth popup reports back here instead of us polling `popup.closed`.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'social-oauth-result') return;
      setBusyProvider(null);

      if (event.data.needsSelection) {
        setPicker({
          pendingId: event.data.pendingId,
          provider: event.data.provider,
          candidates: event.data.candidates ?? [],
        });
        setSelected([]);
        return;
      }

      toast({
        title: event.data.success ? 'Account connected' : 'Connection failed',
        description: event.data.message,
        variant: event.data.success ? 'default' : 'destructive',
      });
      if (event.data.success) setTimeout(fetchSocialAccounts, 2500);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [fetchSocialAccounts]);

  const connectAccount = async (provider: string) => {
    if (!user || !clientId) {
      toast({
        title: 'Save the client first',
        description: 'Social accounts can be connected once the client exists.',
        variant: 'destructive',
      });
      return;
    }

    setBusyProvider(provider);
    try {
      const { data, error } = await supabase.functions.invoke('oauth-connect', {
        body: { provider, clientId, redirectUrl: `${window.location.origin}/oauth-callback` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const popup = window.open(data.authUrl, 'oauth', 'width=640,height=720,scrollbars=yes,resizable=yes');
      if (!popup) throw new Error('Popup blocked. Allow popups for this site and try again.');
    } catch (error: any) {
      console.error('Error connecting account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start the connection.',
        variant: 'destructive',
      });
      setBusyProvider(null);
    }
  };

  const confirmSelection = async () => {
    if (!picker || selected.length === 0) return;
    setAttaching(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-attach', {
        body: { pendingId: picker.pendingId, accountIds: selected },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const failed = (data?.results ?? []).filter((r: any) => !r.ok);
      toast({
        title: failed.length ? 'Some accounts could not be connected' : 'Accounts connected',
        description: failed.length
          ? failed.map((f: any) => f.error).join(' · ')
          : `Connected ${selected.length} account(s). Syncing data...`,
        variant: failed.length ? 'destructive' : 'default',
      });
      setPicker(null);
      setTimeout(fetchSocialAccounts, 2500);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAttaching(false);
    }
  };

  const disconnectAccount = async (accountId: string, provider: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('social-disconnect', {
        body: { socialAccountId: accountId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Disconnected', description: `${platformNames[provider]} account disconnected.` });
      fetchSocialAccounts();
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      toast({ title: 'Error', description: error.message || 'Failed to disconnect.', variant: 'destructive' });
    }
  };

  const syncNow = async () => {
    if (!clientId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-sync', { body: { clientId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const failed = (data?.synced ?? []).filter((r: any) => !r.ok);
      toast({
        title: failed.length ? 'Sync finished with errors' : 'Sync complete',
        description: failed.length
          ? failed.map((f: any) => `${f.provider}: ${f.error}`).join(' · ')
          : `Refreshed ${data?.synced?.length ?? 0} account(s).`,
        variant: failed.length ? 'destructive' : 'default',
      });
      fetchSocialAccounts();
    } catch (error: any) {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const accountsFor = (provider: string) =>
    accounts.filter((a) => a.provider === provider && a.is_active);

  const isTokenExpired = (expiresAt: string | null) =>
    !!expiresAt && new Date(expiresAt) <= new Date();

  const statusFor = (id: string) => providers.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-lg font-semibold">Social Media Accounts</Label>
        {clientId && accounts.some((a) => a.is_active) && (
          <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync now'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ORDER.map((provider) => {
          const linked = accountsFor(provider);
          const Icon = platformIcons[provider];
          const isBusy = busyProvider === provider;
          const status = statusFor(provider);
          const unavailable = status ? !status.enabled || !status.configured : false;

          return (
            <Card key={provider} className={unavailable && linked.length === 0 ? 'opacity-70' : undefined}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5" />
                  {platformNames[provider]}
                  {linked.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {linked.length} connected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {linked.map((account) => {
                  const expired = isTokenExpired(account.expires_at);
                  return (
                    <div key={account.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {account.username ? `@${account.username}` : account.account_name}
                        </p>
                        <Badge variant={expired ? 'destructive' : 'default'}>
                          {expired ? 'Expired' : 'Connected'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {account.last_synced_at
                          ? `Last synced ${new Date(account.last_synced_at).toLocaleString()}`
                          : 'Not synced yet'}
                      </p>
                      {account.sync_error && (
                        <p className="text-xs text-destructive flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          {account.sync_error}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => connectAccount(provider)}
                          disabled={!!busyProvider}
                          className="flex-1"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Reconnect
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => disconnectAccount(account.id, provider)}
                          disabled={!!busyProvider}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {unavailable && linked.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {status && !status.enabled
                      ? 'Unavailable: this platform\u2019s API is paid and is disabled.'
                      : 'Not configured yet \u2014 API credentials are required.'}
                  </p>
                )}

                <Button
                  onClick={() => connectAccount(provider)}
                  disabled={!!busyProvider || !clientId || unavailable}
                  variant="outline"
                  className="w-full"
                >
                  {isBusy ? (
                    'Connecting...'
                  ) : linked.length > 0 ? (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add another account
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Connect Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!clientId && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 Save the client first to enable social media account connections.
        </div>
      )}

      <Dialog open={!!picker} onOpenChange={(open) => !open && setPicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose accounts to connect</DialogTitle>
            <DialogDescription>
              Your login manages several {picker ? platformNames[picker.provider] : ''} accounts. Pick
              the ones that belong to this client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {picker?.candidates.map((candidate) => (
              <label
                key={candidate.account_id}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(candidate.account_id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) =>
                      checked
                        ? [...prev, candidate.account_id]
                        : prev.filter((id) => id !== candidate.account_id),
                    )
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {candidate.account_name ?? candidate.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {candidate.username ? `@${candidate.username}` : ''}
                    {candidate.username && candidate.description ? ' · ' : ''}
                    {candidate.description ?? ''}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPicker(null)} disabled={attaching}>
              Cancel
            </Button>
            <Button onClick={confirmSelection} disabled={attaching || selected.length === 0}>
              {attaching ? 'Connecting...' : `Connect ${selected.length || ''}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientSocialAccounts;
