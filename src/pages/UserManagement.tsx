
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building, Shield, UserX, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserHierarchy {
  id: string;
  email: string;
  user_created_at: string;
  role: string;
  full_name: string | null;
  client_info: any;
  managed_clients: any[];
}

const UserManagement = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const queryClient = useQueryClient();

  const { data: userHierarchy, isLoading } = useQuery({
    queryKey: ['userHierarchy'],
    queryFn: async () => {
      // Get all user roles
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (userRolesError) throw userRolesError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;

      // Combine the data
      const combinedData = userRoles.map(userRole => {
        const profile = profiles.find(p => p.id === userRole.user_id);
        const userClients = clients.filter(c => c.user_id === userRole.user_id);
        const clientInfo = userRole.role === 'client' 
          ? clients.find(c => c.client_user_id === userRole.user_id) 
          : null;

        return {
          id: userRole.user_id,
          email: profile?.email || 'No email',
          user_created_at: profile?.created_at || new Date().toISOString(),
          role: userRole.role,
          full_name: profile?.full_name || null,
          client_info: clientInfo,
          managed_clients: userClients
        };
      });

      return combinedData as UserHierarchy[];
    },
    enabled: !!user && userRole === 'superuser',
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Update clients table directly
      const { error: clientError } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .or(`client_user_id.eq.${userId},user_id.eq.${userId}`);
      
      if (clientError) throw clientError;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userHierarchy'] });
      toast({ title: "User deactivated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deactivating user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Update clients table directly
      const { error: clientError } = await supabase
        .from('clients')
        .update({ status: 'active' })
        .or(`client_user_id.eq.${userId},user_id.eq.${userId}`);
      
      if (clientError) throw clientError;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userHierarchy'] });
      toast({ title: "User reactivated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error reactivating user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (userRole !== 'superuser') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <CardContent className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Only superusers can access user management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user hierarchy...</p>
        </div>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superuser': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isUserActive = (userItem: UserHierarchy) => {
    if (userItem.client_info && userItem.client_info.status === 'inactive') return false;
    return true;
  };

  const superusers = userHierarchy?.filter(u => u.role === 'superuser') || [];
  const users = userHierarchy?.filter(u => u.role === 'user') || [];
  const clients = userHierarchy?.filter(u => u.role === 'client') || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage all users and clients in the system</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="superusers">Superusers ({superusers.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    Superusers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{superusers.length}</div>
                  <p className="text-sm text-gray-500">System administrators</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-sm text-gray-500">Service providers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-green-600" />
                    Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clients.length}</div>
                  <p className="text-sm text-gray-500">Business clients</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="superusers" className="space-y-4">
            {superusers.map((userItem) => (
              <Card key={userItem.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{userItem.full_name || userItem.email}</h3>
                        <p className="text-sm text-gray-500">{userItem.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getRoleColor(userItem.role)}>
                            {userItem.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Joined: {new Date(userItem.user_created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {users.map((userItem) => (
              <Card key={userItem.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{userItem.full_name || userItem.email}</h3>
                        <p className="text-sm text-gray-500">{userItem.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getRoleColor(userItem.role)}>
                            {userItem.role}
                          </Badge>
                          {userItem.managed_clients && userItem.managed_clients.length > 0 && (
                            <Badge variant="outline">
                              Manages {userItem.managed_clients.length} client(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        Joined: {new Date(userItem.user_created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Active:</span>
                        <Switch
                          checked={isUserActive(userItem)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              reactivateUserMutation.mutate(userItem.id);
                            } else {
                              deactivateUserMutation.mutate(userItem.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {userItem.managed_clients && userItem.managed_clients.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Managed Clients:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {userItem.managed_clients.map((client: any) => (
                          <div key={client.id} className="p-2 bg-gray-50 rounded">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{client.name}</span>
                              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                {client.status}
                              </Badge>
                            </div>
                            {client.industry && (
                              <p className="text-sm text-gray-500">{client.industry}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            {clients.map((userItem) => (
              <Card key={userItem.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{userItem.full_name || userItem.email}</h3>
                        <p className="text-sm text-gray-500">{userItem.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getRoleColor(userItem.role)}>
                            {userItem.role}
                          </Badge>
                          {userItem.client_info && (
                            <Badge variant={userItem.client_info.status === 'active' ? 'default' : 'secondary'}>
                              {userItem.client_info.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        Joined: {new Date(userItem.user_created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Active:</span>
                        <Switch
                          checked={isUserActive(userItem)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              reactivateUserMutation.mutate(userItem.id);
                            } else {
                              deactivateUserMutation.mutate(userItem.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {userItem.client_info && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Client Information:</h4>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Business Name:</span>
                            <p className="font-medium">{userItem.client_info.name}</p>
                          </div>
                          {userItem.client_info.industry && (
                            <div>
                              <span className="text-sm text-gray-500">Industry:</span>
                              <p className="font-medium">{userItem.client_info.industry}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserManagement;
