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
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (clientError || !clientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="text-center">
          <p className="text-destructive mb-4 text-sm">Error loading your data. Please contact support.</p>
          <Button onClick={() => refetch()} className="h-11 sm:h-10">Retry</Button>
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
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  const postsByPlatform = posts.reduce((acc, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <div className="mobile-container py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
              Welcome, {clientData.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your social media dashboard</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground truncate flex-1 sm:flex-initial">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <Button 
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="h-10 sm:h-9 flex-shrink-0"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm py-2">Accounts</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">Analytics</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm py-2">Posts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Package Information */}
            {clientData.packages && (
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-primary text-base sm:text-lg">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    {clientData.packages.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{clientData.packages.description}</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary">
                        ${clientData.packages.price}/mo
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Platforms</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {clientData.packages.platforms?.map((platform) => (
                          <Badge key={platform} variant="secondary" className="capitalize text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Features</p>
                      <ul className="text-xs sm:text-sm space-y-1">
                        {clientData.packages.features?.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            <span className="truncate">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-l-4 border-l-green-500 touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Posts This Month</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{monthlyPosts.length}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        of {clientData.packages?.monthly_posts || clientData.monthly_posts} planned
                      </p>
                    </div>
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Impressions</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
                    </div>
                    <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Engagement</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalEngagement.toLocaleString()}</p>
                    </div>
                    <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500 touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Avg Engagement</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{avgEngagement}</p>
                    </div>
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {posts.slice(0, 5).map((post) => (
                      <div key={post.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPlatformColor(post.platform)}`} />
                            <p className="font-medium text-xs sm:text-sm capitalize">{post.platform}</p>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                            {post.content.substring(0, 40)}...
                          </p>
                        </div>
                        <Badge className={`text-[10px] sm:text-xs flex-shrink-0 ${getStatusColor(post.status)}`}>
                          {post.status}
                        </Badge>
                      </div>
                    ))}
                    {posts.length === 0 && (
                      <p className="text-muted-foreground text-center py-4 text-sm">No posts yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    Platform Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {Object.entries(postsByPlatform).map(([platform, count]) => (
                      <div key={platform} className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${getPlatformColor(platform)}`} />
                        <span className="capitalize flex-1 text-xs sm:text-sm">{platform}</span>
                        <span className="font-medium text-xs sm:text-sm">{count}</span>
                        <div className="w-16 sm:w-20 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getPlatformColor(platform)}`}
                            style={{ width: `${(count / posts.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {Object.keys(postsByPlatform).length === 0 && (
                      <p className="text-muted-foreground text-center py-4 text-sm">No platform data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Social Accounts Tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  Connect Your Accounts
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Link your accounts for automatic analytics tracking.
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
          <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Impressions</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
                    </div>
                    <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Reach</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalReach.toLocaleString()}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Engagement</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalEngagement.toLocaleString()}</p>
                    </div>
                    <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="touch-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Shares</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalShares.toLocaleString()}</p>
                    </div>
                    <Share2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Analytics by Post</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.length > 0 ? (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[500px] px-4 sm:px-0">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Date</th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Platform</th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Metric</th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.slice(0, 20).map((metric) => (
                            <tr key={metric.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                                {new Date(metric.date_recorded).toLocaleDateString()}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">
                                  {metric.platform}
                                </Badge>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 capitalize text-xs sm:text-sm">{metric.metric_type}</td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-xs sm:text-sm">
                                {metric.metric_value.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm">No analytics data available yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connect your social accounts to start tracking.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  All Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {posts.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors touch-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${getPlatformColor(post.platform)}`} />
                              <span className="font-medium capitalize text-sm">{post.platform}</span>
                              <Badge className={`text-[10px] sm:text-xs ${getStatusColor(post.status)}`}>
                                {post.status}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{post.content}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
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
                  <div className="text-center py-6 sm:py-8">
                    <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm">No posts yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your posts will appear here once created.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;
