
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Eye, Heart, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ClientAnalytics = () => {
  const { id } = useParams();
  const { user } = useAuth();

  // Fetch client data
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) throw new Error('No client ID provided');
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch analytics data for this client
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', id],
    queryFn: async () => {
      if (!id) throw new Error('No client ID provided');
      
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('client_id', id)
        .order('date_recorded', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch posts data for this client
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => {
      if (!id) throw new Error('No client ID provided');
      
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (clientLoading || analyticsLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Process analytics data for charts (fallback to sample data if no real data)
  const processAnalyticsData = () => {
    if (!analyticsData || analyticsData.length === 0) {
      // Return sample data structure for demonstration
      return {
        engagementData: [
          { name: 'Jan', facebook: 0, linkedin: 0, twitter: 0 },
          { name: 'Feb', facebook: 0, linkedin: 0, twitter: 0 },
          { name: 'Mar', facebook: 0, linkedin: 0, twitter: 0 },
          { name: 'Apr', facebook: 0, linkedin: 0, twitter: 0 },
          { name: 'May', facebook: 0, linkedin: 0, twitter: 0 },
          { name: 'Jun', facebook: 0, linkedin: 0, twitter: 0 }
        ],
        followerGrowth: [
          { name: 'Jan', followers: 0 },
          { name: 'Feb', followers: 0 },
          { name: 'Mar', followers: 0 },
          { name: 'Apr', followers: 0 },
          { name: 'May', followers: 0 },
          { name: 'Jun', followers: 0 }
        ],
        platformDistribution: [
          { name: 'Facebook', value: 0, color: '#1877F2' },
          { name: 'LinkedIn', value: 0, color: '#0A66C2' },
          { name: 'Twitter', value: 0, color: '#1DA1F2' }
        ]
      };
    }

    // Process real analytics data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const engagementData = months.map(month => ({
      name: month,
      facebook: analyticsData.filter(a => a.platform === 'facebook' && a.metric_type === 'engagement').reduce((sum, a) => sum + a.metric_value, 0) / 100,
      linkedin: analyticsData.filter(a => a.platform === 'linkedin' && a.metric_type === 'engagement').reduce((sum, a) => sum + a.metric_value, 0) / 100,
      twitter: analyticsData.filter(a => a.platform === 'twitter' && a.metric_type === 'engagement').reduce((sum, a) => sum + a.metric_value, 0) / 100
    }));

    const followerGrowth = months.map(month => ({
      name: month,
      followers: analyticsData.filter(a => a.metric_type === 'followers').reduce((sum, a) => sum + a.metric_value, 0)
    }));

    const platforms = ['facebook', 'linkedin', 'twitter'];
    const totalEngagement = analyticsData.filter(a => a.metric_type === 'engagement').reduce((sum, a) => sum + a.metric_value, 0);
    const platformDistribution = platforms.map(platform => {
      const platformEngagement = analyticsData.filter(a => a.platform === platform && a.metric_type === 'engagement').reduce((sum, a) => sum + a.metric_value, 0);
      return {
        name: platform.charAt(0).toUpperCase() + platform.slice(1),
        value: totalEngagement > 0 ? Math.round((platformEngagement / totalEngagement) * 100) : 0,
        color: platform === 'facebook' ? '#1877F2' : platform === 'linkedin' ? '#0A66C2' : '#1DA1F2'
      };
    });

    return { engagementData, followerGrowth, platformDistribution };
  };

  const { engagementData, followerGrowth, platformDistribution } = processAnalyticsData();

  // Process posts data for top posts section
  const topPosts = postsData ? postsData.slice(0, 3).map(post => ({
    platform: post.platform,
    content: post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content,
    engagement: post.engagement_stats ? (post.engagement_stats as any).engagement_rate || 0 : 0,
    likes: post.engagement_stats ? (post.engagement_stats as any).likes || 0 : 0,
    comments: post.engagement_stats ? (post.engagement_stats as any).comments || 0 : 0,
    shares: post.engagement_stats ? (post.engagement_stats as any).shares || 0 : 0
  })) : [];

  // Calculate key metrics from analytics data
  const totalReach = analyticsData ? analyticsData.filter(a => a.metric_type === 'reach').reduce((sum, a) => sum + a.metric_value, 0) : 0;
  const avgEngagement = analyticsData ? analyticsData.filter(a => a.metric_type === 'engagement').reduce((sum, a) => sum + a.metric_value, 0) / Math.max(analyticsData.filter(a => a.metric_type === 'engagement').length, 1) / 100 : 0;
  const totalFollowers = analyticsData ? analyticsData.filter(a => a.metric_type === 'followers').reduce((sum, a) => sum + a.metric_value, 0) : 0;
  const totalComments = analyticsData ? analyticsData.filter(a => a.metric_type === 'comments').reduce((sum, a) => sum + a.metric_value, 0) : 0;

  const keyMetrics = [
    {
      title: 'Total Reach',
      value: totalReach > 0 ? `${(totalReach / 1000).toFixed(1)}K` : '0',
      change: '+0%',
      trend: 'up' as const,
      icon: Eye
    },
    {
      title: 'Engagement Rate',
      value: `${avgEngagement.toFixed(1)}%`,
      change: '+0%',
      trend: 'up' as const,
      icon: Heart
    },
    {
      title: 'Total Followers',
      value: totalFollowers > 0 ? totalFollowers.toLocaleString() : '0',
      change: '+0%',
      trend: 'up' as const,
      icon: Users
    },
    {
      title: 'Comments',
      value: totalComments.toLocaleString(),
      change: '+0%',
      trend: 'up' as const,
      icon: MessageCircle
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/client/${id}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client Details
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name} - Analytics</h1>
          <p className="text-gray-600">Comprehensive social media performance analytics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {keyMetrics.map((metric, index) => (
          <Card key={index} className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center mt-2">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <metric.icon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="top-posts">Top Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follower Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Follower Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={followerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="followers" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {platformDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {platformDistribution.map((platform, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: platform.color }}
                        />
                        <span className="text-sm">{platform.name}</span>
                      </div>
                      <span className="text-sm font-medium">{platform.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Rate by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="facebook" 
                    stroke="#1877F2" 
                    strokeWidth={2}
                    name="Facebook"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="linkedin" 
                    stroke="#0A66C2" 
                    strokeWidth={2}
                    name="LinkedIn"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="twitter" 
                    stroke="#1DA1F2" 
                    strokeWidth={2}
                    name="Twitter"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Growth Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={followerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="followers" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-posts" className="space-y-6">
          <div className="space-y-4">
            {topPosts.length > 0 ? (
              topPosts.map((post, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${
                            post.platform === 'facebook' ? 'border-blue-500 text-blue-700' :
                            post.platform === 'linkedin' ? 'border-blue-600 text-blue-800' :
                            'border-sky-500 text-sky-700'
                          }`}
                        >
                          {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                        </Badge>
                        <Badge variant="secondary">
                          {post.engagement}% engagement
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-900 mb-4">{post.content}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{post.likes} likes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        <span>{post.comments} comments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span>{post.shares} shares</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No posts available for this client yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientAnalytics;
