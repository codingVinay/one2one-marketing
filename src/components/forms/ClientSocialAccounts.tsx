import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Link, Unlink, Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: string;
  account_name: string;
  is_active: boolean;
  expires_at: string | null;
}

interface ClientSocialAccountsProps {
  clientId?: string; // Optional for new clients
  onAccountsChange?: (accounts: SocialAccount[]) => void;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Link, // TikTok doesn't have a lucide icon, use generic link
};

const platformNames = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

const ClientSocialAccounts = ({ clientId, onAccountsChange }: ClientSocialAccountsProps) => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const { user } = useAuth();

  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

  useEffect(() => {
    if (clientId) {
      fetchSocialAccounts();
    }
  }, [clientId]);

  const fetchSocialAccounts = async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, provider, account_name, is_active, expires_at')
        .eq('client_id', clientId);

      if (error) throw error;

      setAccounts(data || []);
      onAccountsChange?.(data || []);
    } catch (error: any) {
      console.error('Error fetching social accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch social accounts.",
        variant: "destructive",
      });
    }
  };

  const connectAccount = async (provider: string) => {
    if (!user) return;
    if (!clientId && !user.id) {
      toast({
        title: "Error",
        description: "Please save the client first before connecting accounts.",
        variant: "destructive",
      });
      return;
    }

    setConnectingProvider(provider);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/oauth-callback`;
      const currentClientId = clientId || 'temp'; // Use temp for new clients

      const { data, error } = await supabase.functions.invoke('oauth-connect', {
        body: {
          provider,
          clientId: currentClientId,
          redirectUrl,
        },
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(
        data.authUrl,
        'oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnectingProvider(null);
          setLoading(false);
          // Refresh accounts if we have a clientId
          if (clientId) {
            fetchSocialAccounts();
          }
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error connecting account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect account.",
        variant: "destructive",
      });
      setConnectingProvider(null);
      setLoading(false);
    }
  };

  const disconnectAccount = async (accountId: string, provider: string) => {
    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${platformNames[provider as keyof typeof platformNames]} account disconnected.`,
      });

      fetchSocialAccounts();
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect account.",
        variant: "destructive",
      });
    }
  };

  const getAccountForProvider = (provider: string) => {
    return accounts.find(account => account.provider === provider && account.is_active);
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  return (
    <div className="space-y-4">
      <Label className="text-lg font-semibold">Social Media Accounts</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((provider) => {
          const account = getAccountForProvider(provider);
          const Icon = platformIcons[provider as keyof typeof platformIcons];
          const isConnecting = connectingProvider === provider;
          const isExpired = account ? isTokenExpired(account.expires_at) : false;

          return (
            <Card key={provider} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5" />
                  {platformNames[provider as keyof typeof platformNames]}
                  {account && (
                    <Badge variant={isExpired ? "destructive" : "default"} className="ml-auto">
                      {isExpired ? "Expired" : "Connected"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {account ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Connected as: <span className="font-medium">{account.account_name}</span>
                    </p>
                    {isExpired && (
                      <p className="text-sm text-destructive">
                        Token expired. Reconnect to restore functionality.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectAccount(provider)}
                        disabled={loading}
                        className="flex-1"
                      >
                        {isConnecting ? (
                          "Reconnecting..."
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-1" />
                            Reconnect
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => disconnectAccount(account.id, provider)}
                        disabled={loading}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => connectAccount(provider)}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {isConnecting ? (
                      "Connecting..."
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Connect Account
                      </>
                    )}
                  </Button>
                )}
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
    </div>
  );
};

export default ClientSocialAccounts;