
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/components/ui/use-toast';
import AddClientForm from '@/components/AddClientForm';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ClientCard from '@/components/dashboard/ClientCard';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const { user, signOut } = useAuth();
  const { data: clients = [], isLoading, error } = useClients();
  const { data: userRole } = useUserRole();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading clients</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.packages !== null).length;
  const totalPosts = clients.reduce((sum, client) => sum + (client.monthly_posts || 0), 0);
  const avgEngagement = clients.length > 0 ? 
    (clients.reduce((sum, client) => sum + 4.5, 0) / clients.length).toFixed(1) : '0.0';

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.industry && client.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <DashboardHeader
        userRole={userRole}
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />

      <DashboardStats
        totalClients={totalClients}
        activeClients={activeClients}
        totalPosts={totalPosts}
        avgEngagement={avgEngagement}
        userRole={userRole}
      />

      {/* Add Client Button and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <ClientCard key={client.id} client={client} userRole={userRole} />
        ))}
      </div>

      {filteredClients.length === 0 && clients.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No clients found matching your search.</p>
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first client to track their social media performance.</p>
            <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Client
            </Button>
          </div>
        </div>
      )}

      {/* Add Client Form Modal */}
      {showAddForm && (
        <AddClientForm onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
};

export default Index;
