
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ClientCard from '@/components/dashboard/ClientCard';
import AddClientForm from '@/components/AddClientForm';
import AddUserForm from '@/components/AddUserForm';
import PendingUsersManager from '@/components/PendingUsersManager';
import { useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const Index = () => {
  const { user, signOut } = useAuth();
  const { data: userRole } = useUserRole();
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching clients for user:', user?.email);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          packages (
            id,
            name,
            monthly_posts,
            price
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      
      console.log('Fetched clients:', data);
      return data;
    },
    enabled: !!user,
  });

  // Fetch engagement metrics for the visible clients to compute average engagement
  const clientIds = clients?.map((c: any) => c.id) || [];
  const { data: engagementMetrics } = useQuery({
    queryKey: ['avgEngagement', clientIds],
    queryFn: async () => {
      let query = supabase
        .from('analytics')
        .select('metric_value, client_id, metric_type')
        .eq('metric_type', 'engagement');

      if (clientIds.length > 0) {
        query = query.in('client_id', clientIds as string[]);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching engagement metrics:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user && Array.isArray(clients),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isSuperuser = userRole === 'superuser';

  // Calculate stats from clients data
  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter(client => client.packages).length || 0;
  const totalPosts = clients?.reduce((sum, client) => sum + (client.monthly_posts || 0), 0) || 0;
  const avgEngagement = (engagementMetrics && engagementMetrics.length > 0)
    ? (
        engagementMetrics.reduce(
          (sum: number, m: { metric_value: number }) => sum + (m.metric_value || 0),
          0
        ) / engagementMetrics.length
      ).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <DashboardHeader 
          userRole={userRole}
          userEmail={user?.email}
          onSignOut={signOut}
        />
        
        <div className="space-y-6">
          <DashboardStats 
            totalClients={totalClients}
            activeClients={activeClients}
            totalPosts={totalPosts}
            avgEngagement={avgEngagement}
            userRole={userRole}
          />
          
          {isSuperuser && (
            <PendingUsersManager />
          )}
          
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Clients</h2>
            <div className="flex gap-2">
              {isSuperuser && (
                <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <AddUserForm onClose={() => setShowAddUser(false)} />
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Client Account Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Client Account Request</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create a new client account request for superuser approval. The client will be able to login and connect their social media accounts once approved.
                    </p>
                  </DialogHeader>
                  <AddClientForm onClose={() => setShowAddClient(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients?.map((client) => (
              <ClientCard 
                key={client.id} 
                client={client} 
                userRole={userRole}
              />
            ))}
          </div>

          {clients?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No clients found</p>
              <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Client Account Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Client Account Request</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create a new client account request for superuser approval. The client will be able to login and connect their social media accounts once approved.
                    </p>
                  </DialogHeader>
                  <AddClientForm onClose={() => setShowAddClient(false)} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
