import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, TrendingUp, Calendar, BarChart3, LogOut, User, Plus, Crown, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/components/ui/use-toast';
import AddClientForm from '@/components/AddClientForm';

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'user':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superuser':
        return 'Super Admin';
      case 'user':
        return 'Admin';
      case 'client':
        return 'Client';
      default:
        return 'User';
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
  const activeClients = clients.filter(c => c.status === "active").length;
  const totalPosts = clients.reduce((sum, client) => sum + (client.monthly_posts || 0), 0);
  const avgEngagement = clients.length > 0 ? 
    (clients.reduce((sum, client) => sum + 4.5, 0) / clients.length).toFixed(1) : '0.0';

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.industry && client.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: "bg-blue-500",
      instagram: "bg-pink-500",
      twitter: "bg-sky-500",
      linkedin: "bg-blue-700",
      youtube: "bg-red-500",
      tiktok: "bg-black"
    };
    return colors[platform as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header with User Info and Logout */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {userRole === 'superuser' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-600">
            {userRole === 'superuser' 
              ? 'Manage all clients and system settings' 
              : 'Manage your digital marketing clients and track their social media performance'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {getRoleIcon(userRole || '')}
            <span>{getRoleLabel(userRole || '')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>
          <Button 
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {userRole === 'superuser' ? 'Total Clients' : 'Your Clients'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Monthly Posts</p>
                <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{avgEngagement}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

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
          <Card key={client.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {client.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {userRole === 'superuser' && (
                    <Badge variant="outline" className="text-xs">
                      ID: {client.user_id?.substring(0, 8)}...
                    </Badge>
                  )}
                  <Badge 
                    variant={client.status === "active" ? "default" : "secondary"}
                    className={client.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {client.status}
                  </Badge>
                </div>
              </div>
              {client.industry && (
                <p className="text-sm text-gray-600">{client.industry}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {client.platforms && client.platforms.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Active Platforms</p>
                  <div className="flex gap-2">
                    {client.platforms.map((platform) => (
                      <div
                        key={platform}
                        className={`w-3 h-3 rounded-full ${getPlatformColor(platform)}`}
                        title={platform}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Posts/Month</p>
                  <p className="font-semibold text-gray-900">{client.monthly_posts || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Followers</p>
                  <p className="font-semibold text-gray-900">{client.followers?.toLocaleString() || 0}</p>
                </div>
                {client.email && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900 text-xs">{client.email}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Link to={`/client/${client.id}`} className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    View Details
                  </Button>
                </Link>
                <Link to={`/client/${client.id}/analytics`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
