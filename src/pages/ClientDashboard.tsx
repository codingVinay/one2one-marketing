
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  LogOut, 
  User,
  Star,
  Activity,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/useClientData';
import { useClientPosts } from '@/hooks/useClientPosts';
import { useClientAnalytics } from '@/hooks/useClientAnalytics';
import { toast } from '@/components/ui/use-toast';

const ClientDashboard = () => {
  const { user, signOut } = useAuth();
  const { data: clientData, isLoading: clientLoading, error: clientError } = useClientData();
  const { data: posts = [], isLoading: postsLoading } = useClientPosts();
  const { data: analytics = [], isLoading: analyticsLoading } = useClientAnalytics();

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

  if (clientLoading || postsLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (clientError || !clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading your data. Please contact support.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyPosts = posts.filter(post => {
    const postDate = new Date(post.created_at);
    return postDate.getMonth() === currentMonth && postDate.getFullYear() === currentYear;
  });

  const totalEngagement = analytics.reduce((sum, metric) => sum + metric.metric_value, 0);
  const avgEngagement = analytics.length > 0 ? (totalEngagement / analytics.length).toFixed(1) : '0';

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
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {clientData.name}
          </h1>
          <p className="text-gray-600">Your social media dashboard</p>
        </div>
        <div className="flex items-center gap-4">
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

      {/* Package Information */}
      {clientData.packages && (
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Package className="h-5 w-5" />
              Your Package: {clientData.packages.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-600 mb-2">{clientData.packages.description}</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${clientData.packages.price}/month
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Platforms</p>
                <div className="flex gap-2">
                  {clientData.packages.platforms?.map((platform) => (
                    <div
                      key={platform}
                      className={`w-4 h-4 rounded-full ${getPlatformColor(platform)}`}
                      title={platform}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Features</p>
                <ul className="text-sm space-y-1">
                  {clientData.packages.features?.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Posts This Month</p>
                <p className="text-2xl font-bold text-gray-900">{monthlyPosts.length}</p>
                <p className="text-xs text-gray-500">
                  of {clientData.packages?.monthly_posts || clientData.monthly_posts} planned
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Followers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientData.followers?.toLocaleString() || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{avgEngagement}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {posts.slice(0, 5).map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{post.platform}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {post.content.substring(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    variant={post.status === 'published' ? 'default' : 'secondary'}
                    className={post.status === 'published' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {post.status}
                  </Badge>
                </div>
              ))}
              {posts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No posts yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.slice(0, 5).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{metric.platform}</p>
                    <p className="text-xs text-gray-600">{metric.metric_type}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(metric.date_recorded).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{metric.metric_value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {analytics.length === 0 && (
                <p className="text-gray-500 text-center py-4">No analytics data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
