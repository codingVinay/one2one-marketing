
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
  const { user } = useAuth();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <DashboardStats clients={clients || []} />
          
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
                    <AddUserForm onSuccess={() => setShowAddUser(false)} />
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                  </DialogHeader>
                  <AddClientForm onSuccess={() => setShowAddClient(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients?.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>

          {clients?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No clients found</p>
              <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                  </DialogHeader>
                  <AddClientForm onSuccess={() => setShowAddClient(false)} />
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
