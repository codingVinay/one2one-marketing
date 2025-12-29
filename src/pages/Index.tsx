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
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isSuperuser = userRole === 'superuser';
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
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <main className="max-w-7xl mx-auto py-4 sm:py-6 mobile-container">
        <DashboardHeader 
          userRole={userRole}
          userEmail={user?.email}
          onSignOut={signOut}
        />
        
        <div className="space-y-4 sm:space-y-6">
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
          
          {/* Header with actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              Your Clients
            </h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              {isSuperuser && (
                <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-10 sm:h-9 whitespace-nowrap">
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                    </DialogHeader>
                    <AddUserForm onClose={() => setShowAddUser(false)} />
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 sm:h-9 whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Create Client Request</span>
                    <span className="sm:hidden">Add Client</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Create Client Account Request</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create a new client account request for superuser approval.
                    </p>
                  </DialogHeader>
                  <AddClientForm onClose={() => setShowAddClient(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Client grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {clients?.map((client) => (
              <ClientCard 
                key={client.id} 
                client={client} 
                userRole={userRole}
              />
            ))}
          </div>

          {/* Empty state */}
          {clients?.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <p className="text-muted-foreground text-base sm:text-lg mb-4">No clients found</p>
              <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogTrigger asChild>
                  <Button className="h-11 sm:h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
                  <DialogHeader>
                    <DialogTitle>Create Client Account Request</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create a new client account request for superuser approval.
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
