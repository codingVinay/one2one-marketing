import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  LogOut, 
  User,
  Star,
  Activity,
  MessageSquare,
  Eye,
  Heart,
  Share2,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/useClientData';
import { useClientPosts } from '@/hooks/useClientPosts';
import { useClientAnalytics } from '@/hooks/useClientAnalytics';
import { toast } from '@/components/ui/use-toast';
import ClientSocialAccounts from '@/components/forms/ClientSocialAccounts';

const ClientDashboard = () => {
  const { user, signOut } = useAuth();
  const { data: clientData, isLoading: clientLoading, error: clientError, refetch } = useClientData();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (clientError || !clientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading your data. Please contact support.</p>
          <Button onClick={() => refetch()}>Retry</Button>
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

  // Group analytics by metric type
  const impressions = analytics.filter(a => a.metric_type === 'impressions');
  const engagement = analytics.filter(a => a.metric_type === 'engagement');
  const reach = analytics.filter(a => a.metric_type === 'reach');
  const shares = analytics.filter(a => a.metric_type === 'shares');

  const totalImpressions = impressions.reduce((sum, m) => sum + m.metric_value, 0);
  const totalEngagement = engagement.reduce((sum, m) => sum + m.metric_value, 0);
  const totalReach = reach.reduce((sum, m) => sum + m.metric_value, 0);
  const totalShares = shares.reduce((sum, m) => sum + m.metric_value, 0);
  const avgEngagement = engagement.length > 0 ? (totalEngagement / engagement.length).toFixed(1) : '0';

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: "bg-blue-500",
      instagram: "bg-pink-500",
      twitter: "bg-sky-500",
      linkedin: "bg-blue-700",
      youtube: "bg-red-500",
      tiktok: "bg-black"
    };
    return colors[platform] || "bg-muted";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return '';
    }
  };

  // Group posts by platform for analytics
  const postsByPlatform = posts.reduce((acc, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {clientData.name}
          </h1>
          <p className="text-muted-foreground">Your social media dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Package Information */}
          {clientData.packages && (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Package className="h-5 w-5" />
                  Your Package: {clientData.packages.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-muted-foreground mb-2">{clientData.packages.description}</p>
                    <p className="text-2xl font-bold text-primary">
                      ${clientData.packages.price}/month
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Platforms</p>
                    <div className="flex gap-2 flex-wrap">
                      {clientData.packages.platforms?.map((platform) => (
                        <Badge key={platform} variant="secondary" className="capitalize">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Features</p>
                    <ul className="text-sm space-y-1">
                      {clientData.packages.features?.slice(0, 3).map((feature, index) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Posts This Month</p>
                    <p className="text-2xl font-bold">{monthlyPosts.length}</p>
                    <p className="text-xs text-muted-foreground">
                      of {clientData.packages?.monthly_posts || clientData.monthly_posts} planned
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Impressions</p>
                    <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Engagement</p>
                    <p className="text-2xl font-bold">{totalEngagement.toLocaleString()}</p>
                  </div>
                  <Heart className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avg Engagement</p>
                    <p className="text-2xl font-bold">{avgEngagement}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getPlatformColor(post.platform)}`} />
                          <p className="font-medium text-sm capitalize">{post.platform}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {post.content.substring(0, 50)}...
                        </p>
                      </div>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                  ))}
                  {posts.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No posts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(postsByPlatform).map(([platform, count]) => (
                    <div key={platform} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getPlatformColor(platform)}`} />
                      <span className="capitalize flex-1">{platform}</span>
                      <span className="font-medium">{count} posts</span>
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPlatformColor(platform)}`}
                          style={{ width: `${(count / posts.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(postsByPlatform).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No platform data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Connect Your Social Media Accounts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Link your accounts to enable automatic analytics tracking and insights.
              </p>
            </CardHeader>
            <CardContent>
              <ClientSocialAccounts 
                clientId={clientData.id} 
                onAccountsChange={() => refetch()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Impressions</p>
                    <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Reach</p>
                    <p className="text-2xl font-bold">{totalReach.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Engagement</p>
                    <p className="text-2xl font-bold">{totalEngagement.toLocaleString()}</p>
                  </div>
                  <Heart className="h-8 w-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Shares</p>
                    <p className="text-2xl font-bold">{totalShares.toLocaleString()}</p>
                  </div>
                  <Share2 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analytics by Post</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Platform</th>
                          <th className="text-left py-3 px-4">Metric</th>
                          <th className="text-right py-3 px-4">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.slice(0, 20).map((metric) => (
                          <tr key={metric.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 text-sm">
                              {new Date(metric.date_recorded).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="capitalize">
                                {metric.platform}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 capitalize">{metric.metric_type}</td>
                            <td className="py-3 px-4 text-right font-medium">
                              {metric.metric_value.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No analytics data available yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect your social accounts to start tracking metrics.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                All Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getPlatformColor(post.platform)}`} />
                            <span className="font-medium capitalize">{post.platform}</span>
                            <Badge className={getStatusColor(post.status)}>
                              {post.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{post.content}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                            {post.scheduled_at && (
                              <span>Scheduled: {new Date(post.scheduled_at).toLocaleDateString()}</span>
                            )}
                            {post.published_at && (
                              <span>Published: {new Date(post.published_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No posts yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your posts will appear here once created.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDashboard;
